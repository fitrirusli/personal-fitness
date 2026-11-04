# Purpose and user guide

## The problem

Arriving at the gym without a plan makes progressive overload difficult to assess. Food tracking is similarly misleading when portions, preparation, or missing nutrients are ignored. Personal Fitness puts a small, understandable training plan next to an honest food record.

The primary workflow is deliberately small: choose your exercises, log the actual work, check protein, and keep records. A weekly program is optional. Body weight is optional unless you choose to use it for a nutrition estimate.

## A normal week

1. Enter a name. The weekly schedule supports 1–7 chosen days and named workout slots; frequency does not select a mandatory split. Two days can be upper/lower. Multiple slots can share a day, and extra sessions are always allowed after finishing the active one.
2. Check in with sleep, energy, soreness, and any pain concern.
3. Open **Today** and choose leg, pull, push, upper, or a mixed workout. Pick exercises, change their order, and enter sets, target reps, and starting weights. Blank weights can be chosen while logging. You can also create a personally named exercise. Day types filter the list; they do not forbid other movements.
4. Warm up appropriately. **Guide me** shows one exercise and one set at a time. Confirm the weight/reps and save; the actual values carry into the next set. The plain-language effort choice is optional. **All exercises & tools** contains exact RIR, warm-ups, extra sets, swaps, and editing/undo. Changes still save locally after each logged set.
5. Finish the session. Incomplete sets remain unlogged. A custom workout does not advance the optional automatic program. Repeat a previous workout to reuse its exercises and actual loads; new session/set IDs ensure it starts with fresh, uncompleted sets.
6. Set a protein target directly in Today or Food, without filling calorie/macronutrient settings. Enter your chosen grams or explicitly request a body-weight estimate. Log food using familiar portions, grams, labels, or weighed recipes. The protein card shows the known logged amount, remaining grams, and reached status; it warns when food protein is unknown.
7. Review **Progress** over several comparable sessions. Update nutrition targets deliberately in **Profile**; body measurements do not silently change them.
8. Export an encrypted backup regularly and before reinstalling or changing devices.

You can also press **Start workout timer** first and add exercises as you go. Open **Reorder or remove exercises** to change the active list; saved sets must be undone before removing an exercise. Before finishing, name the session and choose whether to remove untouched exercises and remember the actual work for next time. The timer uses the saved start/finish times and includes rests and time spent away from the app. Multiple completed sessions remain distinct; weekly muscle frequency still counts each date once.

Choose kg or lb beside a load field. Pound entries display the converted kg value and keep the original input in history, backup, and reusable workouts. **Photo meal** is an offline diary aid: choose/capture a picture, select real food references, confirm gram portions, and save. The image does not generate nutrition values. See [detailed behavior](WORKOUTS-AND-PHOTO-MEALS.md).

Use **Today → Weekly muscle check** to track a goal such as two direct training days per group. Gym and home count together; completed sets provide the evidence. Set individual targets and home equipment in **Targets & reminders**, then choose gym/home exercise ideas for groups below target. Optional Android reminders check unfinished weekly targets on selected days and times. The web edition shows gaps while open. See the [counting rules and notification limits](WEEKLY-MUSCLES.md).

## Pages

| Page     | Purpose                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------- |
| Today    | Choose exercises, daily protein, the current week, and quick record links                                      |
| Train    | Choose or repeat workouts, log actual sets, add personal exercises, rest timer, and history                    |
| Food     | Dated meal diary, custom foods, recipes, favorites, known nutrient amounts, and a full-day checkbox            |
| Progress | Eight-week attendance, working sets, comparable exercise loads/reps, optional measurements, and cardio history |
| Profile  | Schedule, nutrition preferences, manual targets, allergy settings, backup/restore, and journal deletion        |

## Food details

The default library shows familiar Malaysian foods: rice, lauk, roti, kuih, drinks, and calculated reference plates. Choose a portion shortcut or type a count. Roti canai uses one piece as its reference serving. For a custom meal, save the nutrition you know for one portion and log any multiple of that portion. Protein alone is enough. Weight-based entry is available for foods with weight-based reference data. Search also finds the USDA ingredient library and your custom foods. Portion sizes and recipes vary between shops; these are references, not restaurant-specific analyses. Raw and cooked preparations remain distinct. Nutrient values stay unknown when not supplied. See [food data notes](FOOD-DATA.md).

Recipes sum weighed ingredients and divide by the final cooked yield. Example: ingredients containing 40 g protein and a final yield of 400 g produce 10 g protein per 100 g. Changing a saved food later does not rewrite previous meal snapshots.

The full-day checkbox is your own completeness claim. It resets when meals are added, copied, or removed. A complete diary can still contain foods with unknown nutrients. Reference values are context, not a diagnosis or a guarantee that needs are met.

## Common questions

**Is this AI?** No external model is involved. Recommendations use auditable JavaScript rules and recorded sets. Each new plan stores its reasoning.

**Will it choose an arbitrary first weight?** No. Enter a manageable baseline yourself. Different exercises and machines should not share loads automatically.

**Does it work without the internet?** The installed Android edition has bundled assets. The production web app works offline after its shell is cached. No laptop server is required. External source links need a connection.

**Can I use my phone and laptop together?** Each app/browser origin has its own journal. Transfer it using encrypted backup/restore; automatic sync is not implemented.

**What if I have pain?** Flag it and pause the movement. The app does not prescribe an alternative injury treatment. Review suitable activity with a qualified professional.

**Are foods certified allergy-safe or halal?** No. Check ingredients, labels, preparation, and cross-contact yourself. Automatic food ideas pause when an allergy is selected because the starter catalog does not certify allergens.

**Can I publish it on Android?** The local debug APK is for testing. A store release needs a maintained application ID, release signing, device testing, and store privacy/content declarations. None of those are implied by a successful debug build.

## Current boundaries

This version stores data locally. It has no accounts, cloud backup service, social feed, photo analysis, barcode service, wearable connection, or Health Connect integration. The default timezone is Malaysia/Singapore (UTC+8). The charts show recorded observations, not body-fat estimates, diagnoses, or predicted physiques.
