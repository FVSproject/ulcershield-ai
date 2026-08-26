# Deploying UlcerShield AI

The platform is pre-configured for **Vercel** (Next.js 16 first-class host).
Deployment takes **~2 minutes** after you have a Vercel account.

## What's already done

- ✅ SEO metadata (title/description, Open Graph, Twitter card, robots, sitemap)
- ✅ Branded favicon + Apple touch icon derived from `data/logo.jpeg`
- ✅ Dynamic Open Graph image (`app/opengraph-image.tsx` — renders at 1200×630 on demand)
- ✅ Prod-silent logger — `console.log/warn` fires in dev only
- ✅ `.env.local` populated for local dev (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`)
- ✅ Claude API route reads `ANTHROPIC_MODEL` from env (defaults to `claude-sonnet-4-6`)
- ✅ Robots + sitemap use `NEXT_PUBLIC_SITE_URL` when set

## Prerequisites

- Node 20.9+
- A [Vercel account](https://vercel.com/signup) (free tier is fine)

## Deploy to Vercel — 4 commands

Run these from the `platform/` folder on **your** machine (not the sandbox —
`vercel login` opens a browser OAuth flow):

```bash
cd platform

# 1. Install the Vercel CLI (one-time, global)
npm i -g vercel

# 2. Sign in (opens your browser, one-time)
vercel login

# 3. Link this folder to a new Vercel project (interactive; accept defaults,
#    project name → "ulcershield-ai" or whatever you like)
vercel link

# 4. Push a production deployment
vercel deploy --prod
```

Vercel prints your live URL when the build finishes:
`https://ulcershield-ai.vercel.app` (or your chosen name).

## Add secrets on Vercel

The `.env.local` file only covers **local** dev — Vercel needs the same
values in its own environment. Two ways:

**A. CLI (fastest):**

```bash
# Pipe the value straight in — one command per var per environment.
printf "sk-ant-YOUR-KEY-HERE" | vercel env add ANTHROPIC_API_KEY production
printf "claude-sonnet-4-6"     | vercel env add ANTHROPIC_MODEL   production

# Optional: also set them for preview deployments
printf "sk-ant-YOUR-KEY-HERE" | vercel env add ANTHROPIC_API_KEY preview
printf "claude-sonnet-4-6"     | vercel env add ANTHROPIC_MODEL   preview

# Redeploy so the new env vars are picked up
vercel deploy --prod
```

**B. Dashboard:**

Vercel Dashboard → your project → **Settings** → **Environment Variables** →
Add:
- `ANTHROPIC_API_KEY` = your secret · **Production**
- `ANTHROPIC_MODEL` = `claude-sonnet-4-6` · **Production**

Then hit **Redeploy** on the latest deployment.

## Custom domain (optional)

1. Vercel Dashboard → **Settings** → **Domains** → **Add**
2. Point your DNS as instructed (CNAME or nameservers)
3. Vercel auto-provisions the TLS cert
4. Set `NEXT_PUBLIC_SITE_URL` to `https://yourdomain.com` in env vars and
   redeploy so canonical URLs, sitemap, OG images use the correct host.

## Two known browser limits — worth telling users

- **Web Bluetooth needs a secure context.** HTTPS is required. Vercel gives
  you that automatically. The `/connect` page will disable the "Pair device"
  button and show a banner on iOS Safari (which has never shipped Web
  Bluetooth). The simulator still works everywhere.
- **IndexedDB is per-browser-per-origin.** Patient records live in the
  browser — they don't sync across devices. If you later want cross-device,
  add Supabase or Firebase.

## After deploy — verify checklist

Hit the live URL and confirm:

- [ ] Landing renders, hero animation plays
- [ ] Language switch (top-right) cycles EN → AR (RTL flips) → KO
- [ ] Theme toggle flips dark ↔ light
- [ ] Register + login (client-side, IndexedDB)
- [ ] Dashboard shows the 3D anatomical body on the bed
- [ ] "Ask Claude" button on the AI card returns a response (validates env
      var is wired). If you see HTTP 501 → env var is missing. If HTTP 401 →
      the API key is invalid or was rotated.
- [ ] `curl -I https://your-url.vercel.app/opengraph-image` returns
      `content-type: image/png`
- [ ] Share the URL on WhatsApp or Slack — link preview shows the branded
      OG image

## Rotating the Anthropic key

Because the key was posted in chat earlier, **regenerate it**:

1. https://console.anthropic.com/settings/keys → **Create Key** → copy
2. Revoke the old key on the same page
3. Update Vercel:
   ```bash
   vercel env rm  ANTHROPIC_API_KEY production
   printf "sk-ant-NEW-KEY" | vercel env add ANTHROPIC_API_KEY production
   vercel deploy --prod
   ```
4. Update `platform/.env.local` with the new key for local dev

## Cost expectations

- **Vercel**: free tier is plenty for a demo. Bandwidth free up to 100 GB/mo.
  Serverless function invocations free up to 100k/mo.
- **Anthropic (Claude Sonnet 4.6)**: $3/M input tokens, $15/M output tokens.
  Each "Ask Claude" call sends ~1.5k input tokens (cached after the first
  request) + generates ~600 output tokens ≈ **$0.01 per analysis**. 100
  analyses/day ≈ $30/month.
