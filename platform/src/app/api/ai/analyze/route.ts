import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export const runtime = "nodejs";

const AiSchema = z.object({
  summary: z
    .string()
    .describe(
      "One paragraph, plain English, that a nurse could read at a glance. Explain what the pressure/turn/vital picture means clinically."
    ),
  reasoning: z
    .array(z.string())
    .max(6)
    .describe(
      "Up to 6 short bullet points citing the specific signals that drove the summary (e.g. 'Peak 112 mmHg on left hip for 6 min above capillary closing pressure')."
    ),
  actions: z
    .array(
      z.object({
        title: z.string().describe("Imperative action, e.g. 'Turn to right lateral 30°'"),
        body: z.string().describe("Why + how, one or two sentences."),
        tone: z
          .enum(["info", "warn", "danger"])
          .describe("Urgency: info = routine, warn = due within 30 min, danger = act now"),
      })
    )
    .min(1)
    .max(6),
  escalate: z
    .boolean()
    .describe("True only when the patient needs a clinician now — sustained ischemia, sepsis-like temp, off-load failure."),
});

const SYSTEM_PROMPT = `You are UlcerShield AI, a clinical decision-support model that interprets bedside pressure-injury sensor streams. You are NOT a certified medical device. Every recommendation must be conservative, defensible, and actionable by a caregiver at the bedside.

Signals you receive:
- Two Force-Sensitive Resistors (FSR A left, FSR B right) reporting force (N), pressure (mmHg), and grams-equivalent
- Center-of-Pressure (CoP) between -1 (fully left) and +1 (fully right)
- Turns detected, minutes since last turn (2-hour repositioning guideline)
- MLX90614 IR skin temperature (°C) and DHT22 humidity (%RH)
- A 100-point risk score decomposed into pressure / immobility / moisture / temperature / asymmetry

Clinical thresholds (literature-inspired, must be validated):
- 32 mmHg  = capillary closing pressure
- 60 mmHg  = elevated risk
- 100 mmHg = critical peak — offload immediately
- 120 min  = 2-hour repositioning rule
- 37.5 °C  = elevated skin temperature (inspect for redness)
- 65 % RH  = moisture rising (maceration risk)
- 75 % RH  = act now

Rules of engagement:
1. Always ground each recommendation in a specific measured value from the payload.
2. Prefer non-invasive positioning changes before escalation.
3. If any signal is missing, say so — never fabricate numbers.
4. Language must be clear, non-alarmist, culturally neutral.
5. Return output that matches the caller's requested JSON schema exactly. No extra text.`;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is not set on the server. Add it to .env.local to enable AI analysis.",
      },
      { status: 501 }
    );
  }

  let body: {
    state?: unknown;
    patient?: unknown;
    lang?: "en" | "ar" | "ko";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const state = body.state;
  const patient = body.patient;
  const lang = body.lang ?? "en";
  if (!state) {
    return NextResponse.json({ error: "state is required" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const langInstruction: Record<string, string> = {
    en: "Respond in English.",
    ar: "Respond in Modern Standard Arabic. Numbers may remain in Western digits.",
    ko: "Respond in Korean.",
  };

  try {
    const response = await client.messages.parse({
      model,
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: {
        format: zodOutputFormat(AiSchema),
        effort: "medium",
      },
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Patient context (may be partial): ${JSON.stringify(patient ?? {})}
Language: ${langInstruction[lang] ?? langInstruction.en}
Current sensor snapshot:
${JSON.stringify(state, null, 2)}

Return the schema-conformant JSON only.`,
            },
          ],
        },
      ],
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      return NextResponse.json(
        { error: "Model returned a response that could not be parsed." },
        { status: 502 }
      );
    }
    return NextResponse.json(parsed);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Rate limited — try again in a moment." },
        { status: 429 }
      );
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Invalid Anthropic API key on the server." },
        { status: 500 }
      );
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API error ${err.status}: ${err.message}` },
        { status: err.status ?? 500 }
      );
    }
    return NextResponse.json(
      { error: (err as Error).message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
