# Recommendation rules and evidence

These are transparent product heuristics for general adult fitness. They are not a validated clinical algorithm. The app does not promise to optimize an individual's physiology or diagnose a problem.

## Training

The default workflow is self-selected. The user chooses the session name/type, movements, order, sets, target reps, and loads. These are recorded choices, not an automatic prescription. Blank first loads stay blank. A personal exercise uses a consistent load unit and has no automatic load increment unless configured in a future version. Custom sessions do not advance the optional weekly template rotation. The rules below apply to suggested programs and history-based hints.

- Rotate through a selected 2/3-day full-body, 4-day upper/lower, or 5-day upper/lower + push/pull/legs template. The default five-day schedule is Monday, Tuesday, Thursday, Friday, and Saturday, with Wednesday/Sunday for recovery. These days are editable. Complete at least one working set to finish a session and advance it.
- Use the last comparable working load for that exercise. No history means no invented external load. Warm-ups are excluded from progression.
- Suggest the configured smallest increment after **two consecutive sessions** with all required working sets at the upper rep target, the same load, recorded RIR of at least 2, and no pain flag. Assistance machines move in the opposite direction: less assistance is harder. Bodyweight movements receive a technique/variation review instead of invented added load.
- Otherwise keep the load and build controlled reps. Missing effort information does not authorize an increase. Two sessions with reps below the range trigger a review of rest, technique, and recovery.
- Low energy (1–2/5) or high soreness (4–5/5) suggests one fewer working set. Sleep is recorded for context; no unsupported sleep formula changes a load.
- A pain check-in or recent movement pain removes the prescribed load and requests a review. A movement currently flagged painful is paused for set logging.

The exact two-session threshold, increments, rep ranges, readiness thresholds, and templates are application design choices. They should be reviewed with real usage and a qualified trainer. They are informed by broad principles of consistent resistance training and individualization, not claimed as ACSM's exact prescribed algorithm. See [ACSM's 2026 resistance training update](https://acsm.org/resistance-training-guidelines-update-2026/).

## Cardio

Show a manageable next session up to the user's chosen weekly goal and usual session duration. The initial 60-minute weekly goal is a starter setting, **not** a claim that 60 minutes meets public-health guidance. Vigorous minutes count twice for moderate-equivalent weekly totals. A pain check-in pauses the suggestion. Cardio does not add estimated exercise calories to food targets.

[WHO guidance](https://www.who.int/europe/publications/i/item/9789240014886) recommends 150–300 moderate aerobic minutes per week for adults, or an equivalent vigorous combination, with activity adapted to ability and increased gradually.

## Optional energy and macros

A protein-only target can be set independently of calorie or macro settings. An explicit daily protein target takes priority in the protein card and logged-gap calculation. The optional weight-based helper uses the same 1.6 g/kg starting assumption described below; it is shown only when requested. A reached status means known logged food meets the chosen target, not that every nutritional need has been measured or met. Unknown food protein is excluded from the known subtotal and disclosed.

Estimated resting energy uses the [Mifflin–St Jeor equation](https://pubmed.ncbi.nlm.nih.gov/2305711/):

```text
10 × weightKg + 6.25 × heightCm − 5 × age + sexConstant
sexConstant = 5 (male) or −161 (female)
```

Chosen activity factors (1.4/1.55/1.7), optional 5% energy reduction, 1.6 g/kg protein, and 25% energy from fat are product starting assumptions. The remaining energy is assigned to carbohydrate. Activity multipliers and the deficit are not part of the original resting-energy equation. This is an estimate that requires review; it is not measured expenditure. The [NIH exercise and athletic performance fact sheet](https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/) discusses athlete protein intakes around 1.2–2.0 g/kg/day.

Automatic estimates are restricted to ages 18–70, supported height/weight inputs, the equation's male/female categories, BMI of at least 18.5, and resulting energy of at least 1,200 kcal. These software bounds do not establish an individually safe intake. Missing or unsupported details return no target. Users can choose manual/clinician targets or disable targets. Medical needs, pregnancy, breastfeeding, and eating-disorder care need individual professional guidance.

## Nutrient context

Catalog portions use the reference serving weight and the portion count. A custom meal with nutrition entered per portion uses the portion count directly. Weight-based logs use grams eaten divided by 100. Each total retains its known-food count, total-food count, and completeness flag. If no food has a value, display **Unknown**. If only some foods have a value, display the known subtotal, not an assumed complete intake. Recipe nutrients remain unknown if any ingredient is missing that nutrient.

For non-clinician profiles aged 19–50 with a specified reference sex, the app displays these general daily reference values:

| Nutrient    | Male     | Female   | Interpretation                        |
| ----------- | -------- | -------- | ------------------------------------- |
| Fiber       | 38 g     | 25 g     | Adequate intake                       |
| Sodium      | 2,300 mg | 2,300 mg | General limit; not a minimum to reach |
| Calcium     | 1,000 mg | 1,000 mg | Recommended intake                    |
| Iron        | 8 mg     | 18 mg    | Recommended intake                    |
| Potassium   | 3,400 mg | 2,600 mg | Adequate intake                       |
| Vitamin D   | 15 µg    | 15 µg    | Recommended intake                    |
| Vitamin B12 | 2.4 µg   | 2.4 µg   | Recommended intake                    |
| Vitamin C   | 90 mg    | 75 mg    | Recommended intake                    |

Sources: [NIH reference overview](https://ods.od.nih.gov/HealthInformation/nutrientrecommendations/), [fiber guidance](https://medlineplus.gov/ency/patientinstructions/000193.htm), [National Academies sodium/potassium reference](https://nap.nationalacademies.org/resource/25353/030519DRISodiumPotassium.pdf), and NIH fact sheets for [calcium](https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/), [iron](https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/), [potassium](https://ods.od.nih.gov/factsheets/Potassium-HealthProfessional/), [vitamin D](https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/), [B12](https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/), and [vitamin C](https://ods.od.nih.gov/factsheets/VitaminC-HealthProfessional/).

These US/Canadian reference values provide context and are labeled general references; they are not individualized Malaysian dietary prescriptions. A low diary value is not proof of deficiency, and a high known subtotal is not an automated clinical assessment. No supplement advice is generated. Unsupported profiles display records without guessed reference targets.

## Weekly muscle tracking

The weekly frequency ledger uses explicit direct and assisted group mappings and completed working sets. It counts distinct dates, combines gym/home work, and never treats assistance as invented fractional direct sets. User targets default to two direct days and can be changed or disabled per group. Gap-based exercise choices honor home equipment, recent direct work, and pain/readiness checks; they do not double a session to catch up. Android reminders are opt-in local notifications based on saved records. Detailed definitions, evidence context, scheduling, and limitations are in [Weekly muscle tracking and reminders](WEEKLY-MUSCLES.md).

## Food ideas

When a protein target exists and at least some protein is logged, suggest up to three catalog options toward the remaining logged gap. Favor saved favorites, respect vegetarian preferences, and show quantities/energy. Portions are bounded practical options, not mandatory portions. Allergy selections suppress unverified suggestions. The app does not infer a full-day intake from a partial diary or label a food as certified allergen-safe.
