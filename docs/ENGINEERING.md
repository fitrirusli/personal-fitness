# Architecture and development

## Stack

React 19 with JavaScript/JSX, Vite 8, React Router hash routes, IndexedDB through `idb`, Lucide SVG icons, Vitest, and Playwright. Capacitor adapts the shared web application to an ignored private Android project. There is no required API, database server, paid service, or remote AI dependency.

Hash routes avoid server rewrite requirements and work with the bundled native origin. The UI uses local system fonts and icons, so no CDN is needed during use.

```text
React pages → journal provider → IndexedDB transaction → versioned journal
     │                              │
     ├── pure training rules        └── BroadcastChannel revision notification
     ├── pure nutrient calculations
     └── encrypted backup → web download / native share sheet
```

## Source map

| Path                               | Responsibility                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `src/pages/`                       | Today, training, food, progress, profile, and onboarding                      |
| `src/components/ui.jsx`            | Accessible fields, buttons, cards, dialogs, and async form feedback           |
| `src/domain/training.js`           | Rotation, history, progression, set validation, session completion, cardio    |
| `src/domain/nutrition.js`          | Optional targets, nutrient coverage, recipes, and food ideas                  |
| `src/domain/dates.js`              | Explicit UTC+8 day/week arithmetic                                            |
| `src/lib/journal.js`               | Journal schema validation and atomic IndexedDB writes                         |
| `src/lib/store.jsx`                | React state, isolated demo mode, and cross-tab refresh                        |
| `src/lib/backup.js`                | Password-based backup encryption and export/restore                           |
| `src/data/`                        | Exercise catalog, actual USDA composition data, fictional demo generator      |
| `scripts/create-sw.mjs`            | Content-versioned production offline shell                                    |
| `scripts/import-usda.py`           | Reproducible extraction of the starter foods from official USDA JSON          |
| `tests/`                           | Domain/persistence tests and browser journeys                                 |
| `src/components/GuidedSession.jsx` | One exercise and set at a time, with explicit optional effort choices         |
| `src/components/PlanSettings.jsx`  | Shared schedule editor used from Today, Train, and Profile                    |
| `src/data/local-foods.js`          | Attributed Malaysian food references, portion defaults, and calculated plates |

## Persistence contract

Version 0.5.2 adds confirmed corrections of completed exercise history without a record-shape change. `domain/history.js` removes an entry by session/entry IDs, refreshes only routines with a matching source session, and clears deleted routine references if no actual working sets remain. `SessionHistory` reads current provider state instead of retaining a stale session snapshot. Atomic writes and an expected-session-removal check protect against a concurrent change broadening the deletion beyond the displayed confirmation.

Version 0.5.1 adds optional active-session `pendingStopAt`. Stop captures the click timestamp before awaiting storage, freezes elapsed time, and survives reload. Completing uses that timestamp and removes the pending field; continuing removes it while retaining the original start. Discard is guarded to active session IDs and does not delete completed history or routines. Set logging is blocked during a pending stop decision.

Version 0.5 adds optional `workoutTemplates`, `weeklySchedule`, and `mealPhotos` collections, session template/slot references, and original set input units alongside canonical kg. Active sessions may have zero exercises while the timer runs. Completed sessions retain actual start/finish times; frequency counters distinguish dates from session totals. Photo bytes are bounded JPEG base64 split into small validated chunks, shared by food-entry references, and covered by encrypted backups. Export size is checked before encryption to keep generated files within the restore limit. See [workout and photo contracts](WORKOUTS-AND-PHOTO-MEALS.md).

Journal schema version 1 contains profile, sessions, meal snapshots, custom foods, cardio, water, measurements, dated check-ins, full-day flags, favorites, and the rest timer deadline. A revision and update timestamp accompany every committed change.

Version 0.3 adds optional `customExercises` and protein-target profile fields. Reads and replacements merge defaults so older version-one journals remain usable without deleting records. Custom sessions use `kind: custom` with null `programDays`/`templateIndex`; generated sessions retain their program references. Older app versions cannot interpret new custom-exercise backups, so restore them with the updated app. Definitions are private journal data, resolved consistently in logging, history, and charts.

Every mutation reads the latest journal inside a read-write IndexedDB transaction, applies a synchronous mutator, validates the result, increments the revision, and writes it back. IndexedDB serializes concurrent writes. A completed set submitted twice is a no-op. A rejected mutation aborts the transaction and consumes the rejected completion promise without losing the previous journal.

`BroadcastChannel` notifies other tabs to reread. React ignores older revision updates. Personal and fictional demo records use separate databases. LocalStorage stores only the chosen mode; it does not contain health records, credentials, or tokens.

Meals snapshot their food composition at log time. Active sessions snapshot their plan; changing the profile/check-in does not quietly rewrite a session in progress. Exercise swaps use the replacement exercise's history. No collection contains authorization tokens.

## Offline deployment

`npm run build` creates `dist/` and a service worker containing the actual built asset list. The cache name includes a hash of asset contents. Activation removes older app caches. Same-origin cached assets serve offline; API URLs and external origins are not precached. The worker does not cache runtime responses or journal data. An update activates after existing clients close, avoiding forced replacement during a workout.

Deploy the content of `dist/` at the site root over HTTPS. Keep the same origin to preserve browser records. Local development uses port 5174; production preview uses 4174. They intentionally have separate browser storage. Dev mode does not register the service worker.

On Android, Capacitor uses packaged `dist/` assets and a local secure origin. No `server.url` points at a development computer. Native output/configuration, the local build helper, SDK/JDK, Gradle caches, APKs, and keys remain ignored. Native sharing writes only an encrypted temporary backup to cache and removes it after the share sheet returns.

## Food data reproduction

Download the official [USDA SR Legacy JSON dataset](https://fdc.nal.usda.gov/download-datasets/) into `.local/` and extract it there. Then run:

```sh
python scripts/import-usda.py .local/path/to/FoodData_Central_sr_legacy_food_json_2018-04.json
```

The script selects explicit FDC IDs, maps nutrient IDs without inventing values, preserves portions with gram weights, and writes the small public catalog. FoodData Central data are [public-domain/CC0](https://fdc.nal.usda.gov/api-guide/). Per-food provenance remains in the catalog and food picker. Allergen-certification flags are deliberately false.

## Verification

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Unit tests cover conservative load changes, assistance direction, missing RIR, pain/readiness, rotation, duplicate submissions, nutrient unknowns, cooked recipe yield, target eligibility, serialized writes, rollback, schema rejection, and encrypted backup integrity. Browser journeys cover a new user, demo separation, reload during a workout, food/recipe entry, production offline reload, backup restore, and mobile widths. GitHub Actions runs the public web checks only.

The lockfile fixes installed dependencies. Tested overrides update Capacitor CLI's transitive glob/minimatch tooling to patched versions; do not use `npm audit fix --force` to downgrade the native stack. Recheck the overrides when upgrading Capacitor.

## Future changes

Version 0.4 adds optional root `muscleSettings` (per-group day targets, home equipment, and reminder preferences), optional personal-exercise `primaryMuscles`, and optional session `location`. Old version-1 records remain valid and receive derived defaults without resetting history. Classification is explicit in `data/muscles.js`; weekly coverage and reminder planning are pure domain functions. Native reconciliation is serialized, checks permission without prompting, and cancels only the reserved reminder IDs before rebuilding a 28-day schedule. The private Android build removes exact-alarm permission and supplies a monochrome notification icon. See [weekly muscle design](WEEKLY-MUSCLES.md).

Introduce explicit schema migrations before changing persisted record shapes. A future remote sync service must be opt-in, authenticated, and conflict-aware; copying the journal to an unauthenticated endpoint is not acceptable. Device testing is needed for native lifecycle, keyboard, file sharing, and storage behavior before a release APK is distributed broadly.
