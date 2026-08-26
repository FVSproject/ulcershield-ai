# UlcerShield AI — Remaining Safe Tissue Time (RSTT) algorithm

*Version 2 · adds age / BMI / comorbidity / medication / treatment
personalization and adult-vs-baby thresholds.*

> **Not a medical device.** All thresholds and modifier weights below are
> derived from published clinical literature but the resulting number is a
> decision-support estimate, not a diagnosis. Clinical judgment supersedes
> the algorithm.

---

## 1. Where the base curve comes from

The core question — *"how much longer can this tissue tolerate the current
pressure?"* — has been studied experimentally since the 1930s. Two results
underpin the algorithm:

- **Landis (1930)** measured the capillary closing pressure of skin at
  **~32 mmHg**. Sustained loads above this figure collapse the
  microcirculation and start the ischemic cascade that ends in a
  pressure injury.
- **Kosiak (1959, 1961)** and **Reswick & Rogers (1976)** established an
  **inverse pressure-time damage curve** in tissue. In plain words:
  the higher the pressure, the sooner damage begins.

A pragmatic hyperbolic fit to Reswick-Rogers gives:

```
baseSafeMin(P) = K / max(1, P − P_cap)         (bounded at 240 min)
```

with the working constants:

| Parameter | Adult | Baby (< 2 y) | Source |
| --- | --- | --- | --- |
| `P_cap` capillary closing pressure | **32 mmHg** | **20 mmHg** | Landis 1930; pediatric review (Baharestani 2007) |
| `K` tissue-tolerance constant | **4200** | **2500** | Reswick-Rogers-derived; scaled for pediatric skin (Willock 2007) |
| ceiling | **240 min** | **180 min** | Practical monitoring horizon |

Worked examples on an adult:

| Pressure at region | Base safe time |
| ---:| ---:|
| 32 mmHg (capillary closing) | 240 min (ceiling) |
| 40 mmHg | 240 min (ceiling) |
| 60 mmHg | 150 min |
| 80 mmHg | 87 min |
| 100 mmHg | 62 min |
| 150 mmHg | 36 min |
| 200 mmHg | 25 min |

The same curve on a baby with `P_cap = 20`, `K = 2500`:

| Pressure at region | Base safe time |
| ---:| ---:|
| 30 mmHg | 180 min (ceiling) |
| 40 mmHg | 125 min |
| 60 mmHg | 62 min |
| 80 mmHg | 42 min |
| 100 mmHg | 31 min |
| 150 mmHg | 19 min |

---

## 2. Personalization — modifier cascade

Two of the most widely-used bedside risk instruments — the **Braden Scale**
(Bergstrom 1987) and the **Waterlow Score** (1985) — evaluate the patient
across a fixed set of axes: age, mobility, mental status, nutrition,
moisture, comorbidities, and medications. UlcerShield AI applies the same
axes as **multiplicative modifiers** to the base safe time.

The order matters only for the audit trail; the effect is a product.

```
finalSafeMin =
  baseSafeMin(P)
    × ageFactor
    × bmiFactor
    × sexFactor
    × ∏ comorbidityFactor
    × ∏ medicationFactor
    × ∏ treatmentFactor
    × microclimateFactor
```

After the product is computed we `clamp(0.20, 1.20)` — so no single input
can drive the estimate to zero on its own (it would take genuine
high-pressure loading to do that), and equally, no combination of "healthy"
factors can push tolerance past the base curve.

### 2.1 Age factor

Based on the age-cohort risk observed in **Waterlow** (1985) and multiple
NPUAP prevalence surveys:

| Age band | Factor | Rationale |
| --- | ---:| --- |
| < 2 y (infant) | **× 0.55** | Immature skin, low mobility, medical devices |
| 2–5 y (toddler) | × 0.70 | Developing collagen |
| 6–12 y (child) | × 0.80 | |
| 13–17 y | × 0.95 | Approaching adult tolerance |
| 18–40 y | **× 1.00** | Reference cohort |
| 41–64 y | × 0.90 | Early skin-thinning |
| 65–79 y (elderly) | × 0.75 | Reduced perfusion, thinner dermis |
| 80 y + | × 0.55 | Fragile skin, comorbidities common |

### 2.2 BMI factor

BMI = weight (kg) / height (m)². Both **underweight** (bony prominences
exposed) and **class II+ obese** (excess shear, moisture in skin folds,
difficulty repositioning) are known independent risk factors — see NPUAP
2019 guideline synthesis.

| BMI band | Factor |
| --- | ---:|
| < 18.5 (underweight) | × 0.75 |
| 18.5 – 24.9 (normal) | **× 1.00** |
| 25 – 29.9 (overweight) | × 0.95 |
| 30 – 34.9 (obese I) | × 0.85 |
| ≥ 35 (obese II+) | × 0.70 |

For babies, weight-for-age is used instead: birth weight < 2.5 kg gives
× 0.65 (prematurity and low-birth-weight are strong pediatric risk factors
per Baharestani 2007).

### 2.3 Sex factor

Sex has a small and inconsistent effect in the literature. We keep it at
**× 1.00** for both, with an optional × 0.98 tweak for post-menopausal
skin thinning at 65 y +. This is intentionally conservative — over-weighting
sex could bias the model.

### 2.4 Comorbidity factors

Braden and Waterlow both weight the following heavily:

| Comorbidity | Factor | Rationale |
| --- | ---:| --- |
| Diabetes | × 0.75 | Microvascular disease, neuropathy |
| Peripheral vascular disease | × 0.65 | Reduced tissue perfusion |
| Cardiac disease | × 0.85 | Global perfusion issues |
| Renal failure | × 0.85 | Fluid shifts, uremic skin |
| Malnutrition | × 0.70 | Reduced tissue repair |
| Spinal cord injury / paraplegia | × 0.60 | Total immobility + denervation |
| Incontinence | × 0.80 | Chronic moisture exposure |
| Dementia | × 0.85 | Reduced awareness of discomfort |
| Active cancer | × 0.85 | Cachexia, chemotherapy interaction |

Multiple comorbidities stack multiplicatively (a patient with both
diabetes and PVD has 0.75 × 0.65 = 0.49 combined, before other factors).

### 2.5 Medication factors

| Drug class | Factor | Rationale |
| --- | ---:| --- |
| Corticosteroids (chronic) | × 0.85 | Skin thinning, delayed healing |
| Vasoconstrictors (e.g. noradrenaline) | × 0.75 | Local ischemia at pressure points |
| Anticoagulants | × 0.90 | Bruising / bleeding into loaded tissue |
| Chronic sedatives | × 0.80 | Immobility |
| Chronic NSAIDs | × 0.95 | Small perfusion effect |

### 2.6 Treatment factors

Interventions that either immobilize the patient or compromise skin:

| Treatment | Factor |
| --- | ---:|
| Mechanical ventilation | × 0.70 |
| Dialysis | × 0.85 |
| Chemotherapy (active) | × 0.75 |
| Radiation therapy (to skin field) | × 0.80 |
| Cast / traction | × 0.75 |
| Feeding tube / NGT (skin-adjacent) | × 0.90 |

### 2.7 Microclimate factor (live from sensors)

Read every second from the ESP32 rig:

- **Skin temperature > 37.5 °C** → × 0.90 (perfusion is compromised).
- **Humidity 65–75 %** → × 0.85 (maceration accelerator).
- **Humidity > 75 %** → × 0.75 (severe maceration risk).

---

## 3. Adult vs baby mode

Two flags flow through the whole model when the patient is registered as a
**baby**:

1. `P_cap` drops to 20 mmHg, `K` drops to 2500, ceiling to 180 min.
2. Age factor pins to × 0.55.
3. Region-influence weights change (**occiput** becomes the primary spot,
   not the sacrum — infants have proportionally larger, heavier heads and
   soft skulls). The body-map card and the 3D model swap the adult
   mannequin for a baby mannequin.

The 3D baby is anatomically-proportioned (head:body ≈ 1:4 vs 1:8 in
adults), wearing a diaper, with the occiput highlighted as the primary
pressure landmark.

---

## 4. Worked example

**Patient**: 74-year-old woman, 58 kg / 162 cm (BMI 22.1, normal),
type-2 diabetes, incontinence, on corticosteroids. Sacral pressure has
just reached 85 mmHg, skin 37.7 °C, humidity 68 %.

1. Base safe time: `4200 / (85 − 32) = 79 min`.
2. Age (65–79): × 0.75.
3. BMI 22 (normal): × 1.00.
4. Sex: × 1.00.
5. Diabetes: × 0.75.
6. Incontinence: × 0.80.
7. Steroids: × 0.85.
8. Skin > 37.5 °C: × 0.90.
9. Humidity 68 %: × 0.85.

Combined modifier = 0.75 × 0.75 × 0.80 × 0.85 × 0.90 × 0.85 ≈ **0.29**.

`finalSafeMin = round(79 × 0.29) = 23 min`.

The card would show **23 min · immediate** with the "Why?" list unpacking
each modifier and its contribution.

---

## 5. References

Landis EM. *Micro-injection studies of capillary blood pressure in human
skin.* Heart, 1930.

Kosiak M. *Etiology and pathology of ischemic ulcers.* Arch Phys Med
Rehabil, 1959.

Reswick JB, Rogers JE. *Experience at Rancho Los Amigos hospital with
devices and techniques to prevent pressure sores.* In: Bedsore
biomechanics, 1976.

Bergstrom N, Braden BJ, Laguzza A, Holman V. *The Braden scale for
predicting pressure sore risk.* Nurs Res, 1987.

Waterlow J. *A risk assessment card.* Nursing Times, 1985.

Baharestani MM. *An overview of neonatal and pediatric wound care
knowledge and considerations.* Ostomy Wound Manage, 2007.

Willock J, Baharestani MM, Anthony D. *A risk assessment scale for
pressure ulcers in children.* Nurs Times, 2007.

National Pressure Injury Advisory Panel, EPUAP, PPPIA. *Prevention and
Treatment of Pressure Ulcers/Injuries: Clinical Practice Guideline.*
3rd ed., 2019.

Gefen A. *Reswick and Rogers pressure–time curve for pressure ulcer risk.*
Nurs Stand, 2009.
