# Weekly muscle tracking and reminders

## Purpose and everyday use

The weekly check answers: which muscle groups have recorded direct work, how often, and what is still below the user's chosen goal? It combines gym and home sessions and offers exercise choices for gaps. It does not measure recovery, muscle growth, or the adequacy of training volume.

Open **Today → Weekly muscle check**. The default tracking goal is two separate training days per group per week. Choose **Targets & reminders** to change each goal, turn individual groups off, and select equipment available at home. These are editable user goals; setting a high frequency does not establish that it is appropriate.

Tap any group to see the exercise, date, location, and completed working sets behind its count. Previous weeks remain available using the arrows. Counts are recomputed against the current goals, so changing a goal also changes how past weeks compare with that goal.

In **Ideas for your next workout**, choose gym or home and optionally focus on one group. Home suggestions use only the selected equipment. Choose an exercise to open the usual workout builder, review the sets/reps/load, and start or add it to an active workout. Exercises remain freely selectable outside these suggestions. Record gym/home when creating a workout; older sessions with no location still count and are labelled accordingly.

## What a direct day means

- Weeks run Monday–Sunday in Malaysia/Singapore time (UTC+08:00).
- A completed workout with at least one completed, non-warm-up working set with positive repetitions qualifies for the exercise's mapped direct groups. Active sessions and plans alone do not qualify.
- A group counts at most once on a calendar date, including multiple gym/home sessions. Actual working sets and exercise evidence are retained separately.
- Only records through the current date count. Unlogged exercise is unknown; a zero means no qualifying saved record, not proof that the person did nothing.
- Skipping the rest of an exercise does not erase working sets already performed. A pain flag remains visible and constrains subsequent suggestions.
- Ten broad groups are tracked: chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, and core. This is not a complete anatomical model.
- Built-in direct/secondary classifications are explicit in `src/data/muscles.js`. For example, bench press counts directly for chest; triceps and shoulders are shown as assistance. Assistance is not converted into invented fractional sets or direct days. Squats can map directly to quads and glutes.
- Personal exercises use explicit direct-group checkboxes. Free text is not guessed. Unmapped recorded exercises are flagged and can be mapped later in settings; their saved records then contribute without being recreated.

A frequency counter is a practical log, not a claim that a single set provides enough stimulus. General adult guidance includes muscle-strengthening activity for all major muscle groups on at least two days a week; the exact program still depends on the person. See [CDC adult activity guidance](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html). The app's direct/secondary classification is a product convention, not a medical rule from that guidance.

## How suggestions work

Candidates must map to a group below target and fit the selected home equipment when applicable. Suggestions are held when today's check-in flags pain, low energy, or high soreness. A movement with a pain flag in the preceding seven days is excluded. Groups directly trained today or yesterday are excluded, including across a Sunday/Monday boundary. This date-spacing check does not establish full recovery.

Results favor remaining goals and present varied muscle groups before repeated alternatives. They are options, not a combined workout prescription. There is no automatic catch-up session, doubling of volume, or instruction to train through pain. Load and rep decisions continue to use the existing explainable training rules and the user's own entries. Bands with unknown resistance use notes and zero as a log placeholder; they do not receive invented kilograms or automatic load increases.

## Android notifications

Notifications are optional and off by default. In the APK, enable reminders, choose days and a time, save, and grant Android notification permission. The default reminder days are Thursday and Sunday at 20:00 Malaysia/Singapore time. The web edition displays the weekly check while open but does not implement background browser push notifications.

The [Capacitor Local Notifications API](https://capacitorjs.com/docs/apis/local-notifications) schedules notifications on the device without a server. The app schedules only selected future times within the next 28 days for weeks with unfinished enabled goals. It cancels and rebuilds its own pending schedule after journal changes, mode changes, app visibility/resume, and hourly while open. When all enabled targets are met, pending reminders for that week disappear. Turning reminders off, clearing the journal, or entering demo mode cancels owned pending reminders. Denied permission is shown and does not trigger an automatic permission request during background reconciliation.

Future weeks initially have no recorded activity. Saving a workout refreshes those weeks before their reminder dates. Open the app at least once within each 28-day window to renew the schedule. With no server or background training-data import, the app cannot observe exercise that was never logged.

Notifications contain a generic prompt to review saved weekly targets, not personal nutrition values, weights, exercise names, or a stale list of missing groups. Tapping one opens Today. Android notification visibility is configured as secret on the lock screen. Exact alarms are not requested: notifications use inexact scheduling, so Android battery restrictions, permission settings, force-stop, and OEM behavior can affect delivery time. Physical-device delivery and reboot acceptance testing remain necessary.

## Data and verification

Targets, home equipment, reminder preferences, and personal exercise mappings stay in the local journal and are included in encrypted backups. Permission grants and Android's pending alarm storage are device state, not portable backup contents. Demo records remain isolated and do not schedule personal notifications. Older version-1 journals without the new optional fields use defaults and retain their records.

Tests cover distinct dates, direct versus assisted work, excluded plans/warm-ups/active/future records, week rollover, equipment and recovery checks, personal mappings and encrypted restoration, invalid imports, reminder planning, permission denial, and owned-ID cancellation. Browser journeys exercise gym/home logging, persisted targets/evidence, mapped personal exercises, and mobile layout. Native scheduling is tested with an API adapter; actual Android notification delivery has not been exercised on a phone.
