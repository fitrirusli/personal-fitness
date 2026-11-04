# Flexible workouts and offline photo meals

## Start, edit, and finish a session

Press **Start workout timer** in Today or Train to begin immediately, even before selecting movements. The empty active session saves locally. Use **Add exercises**, search the complete library, select the movements, and press **Add N to workout**. Sets, reps, and loads can be reviewed in the builder or entered while logging.

**Reorder or remove exercises** exposes up/down and remove controls during an active workout. Reordering preserves exercise and set IDs and all saved work. Untouched movements can be removed immediately. Active movements with saved sets require undoing those sets first, so an order change cannot silently delete performed work.

To correct an exercise mistakenly saved in a completed workout, open **Train → Session history → the workout → Remove exercise** beside that movement. Review the confirmation and select **Remove from history**, or **Keep exercise** to cancel. This works even when sets were saved, such as an accidental bench-press entry. Only the selected entry is removed; other recorded exercises, notes, and start/finish times stay saved while working sets remain. The history view reads the current journal so edits appear immediately and persist after reload and encrypted backup/restore. Progress, strength history, and weekly muscle coverage recompute from the corrected records.

A saved routine is refreshed only when its `sourceSessionId` is the corrected workout. A routine sourced from a different or newer workout is not rewritten. If removing the entry leaves no working sets, the confirmation explains that the otherwise empty completed workout and its generated routine will be removed; linked planned slots retain their names and return to choosing exercises. This prevents false attendance and empty saved routines. If concurrent changes would turn a confirmed exercise-only correction into removal of the whole session, the operation stops and asks the user to review again.

Set **Active workout location** to gym or home. This is stored with the session and appears in weekly muscle evidence. Finish shows the session name and two options: remove exercises with no saved sets, and remember the completed work for next time. Both are on by default. Partly completed exercises retain their actual saved sets; unfinished sets do not count as performed.

The elapsed timer derives from `startedAt` and the current time, then from `completedAt` after finishing. It survives reloads/backgrounding and includes rests and time away from the app; it is not a sensor measurement of active exercise. Press **Stop session** beside the timer to freeze the display and choose **Save & finish**, **Discard session**, or **Continue workout**. An accidental start with no saved sets can be discarded immediately and creates no history or routine. Discarding a session with any saved sets requires a second confirmation. Saving requires at least one working set.

The stop decision is persisted as optional `pendingStopAt`, so reopening the app still presents the choice with a stopped timer. Save uses the time Stop was pressed, rather than time spent deciding. Continue removes that pending stop and keeps the original session/start time; elapsed time again includes the break as rest. Closing the decision dialog also continues. Discard removes only the active session and clears its rest timer; completed history and existing saved routines remain. There is no forced save when stopping.

One session is active at a time; any number of sequential morning/afternoon/evening sessions may be recorded on a date. Each has its own ID, start/finish times, duration, and history. Training-day and muscle-frequency counters deduplicate dates; session totals do not.

## Your schedule and reusable workouts

Training frequency is a calendar preference, not a mandatory exercise split. The 1–7-day selector does not force full-body sessions. In **Edit plan**, add named slots such as Monday Upper, Thursday Lower, and Monday Evening Mobility. Multiple slots can share a weekday. When slots are filled, their distinct weekdays set the planned-day count. Empty slots are unnecessary. Calendar entries never block a workout on another day.

Each slot can link to a saved workout or start with **Build this workout**. Completing a workout started from a slot associates its remembered routine with that slot. Saved workouts contain the order and actual last working loads/reps, including original units, and appear under **Your workouts, ready again**. Review before starting; copying a routine creates new session/entry/set IDs and no completed sets. Explicitly reused routines update from the new actual work. Unused exercises are not silently added to the next suggestion. The library holds up to 500 routines; further sessions still save without adding another routine at the limit.

The optional built-in 2–5-session examples and conservative progression remain available separately. Frequencies of 1, 6, or 7 days use the three-session example if that optional section is opened; it does not redefine the personal calendar.

## Kilograms and pounds

Load fields provide kg/lb selection and show a live kg equivalent for lb input. The conversion uses **1 lb = 0.45359237 kg**, the international avoirdupois pound ([NIST](https://www.nist.gov/system/files/documents/calibrations/sp250-31.pdf)). Canonical stored kilograms are rounded to six decimals; the display rounds to two. The entered unit and original numeric load are retained, including in backups and saved workouts. For example, 100 lb records 45.359237 kg and displays 45.36 kg alongside the original 100 lb.

Changing the unit converts the displayed amount; it does not reinterpret the same number as a different load. Blank first loads remain blank rather than becoming zero. Bodyweight/assistance conventions remain unchanged. Machine readings still need consistent equipment/settings for useful comparisons; a unit conversion does not estimate cable leverage or resistance curves. Suggested load increments remain reviewable, not promises that a machine offers a particular stack increment.

## Offline photo meal workflow

Open **Food → Photo meal**, take a picture or select one, select the foods visible in it, confirm the number of portions, then press **Confirm foods & save meal**. Multiple foods share one photo. Nutrients are calculated from the selected food snapshots and portions, using the existing Malaysian/USDA/custom references. Unknown values remain unknown. The image is a diary attachment, not an automatic food classifier, portion scale, hidden-oil detector, or source of measured macros/micros.

Images are processed on the device, resized to at most 960 pixels on the longest edge, and re-encoded as JPEG at no more than 90 KB. This removes embedded source-image metadata from the stored copy. JPEG, PNG, and WebP inputs up to 10 MB are supported. The local journal holds at most 100 photos. Photos are included in encrypted backups once saved. Before export, a size guard prevents creating a backup larger than the supported restore envelope; older photos can be removed while retaining all food records.

Tap a diary thumbnail to review or remove only its photo. Deleting a food removes a shared photo only after its last reference disappears. Copying a previous day's food does not duplicate the old photograph as evidence of today's meal. No photo is uploaded and no API key, remote AI, or per-photo payment is required.

Android uses [Capacitor Camera](https://capacitorjs.com/docs/apis/camera) with camera/gallery selection and no save-to-gallery request. Compressed copies are saved only after confirmation. An interrupted Android camera result can reopen the food-photo review; restored results still require manual food/portion confirmation. Camera, gallery, cancellation, background/lifecycle, and in-place APK upgrade behavior need acceptance testing on the actual phone.

## Data compatibility and validation

Version-one journals gain optional `workoutTemplates`, `weeklySchedule`, `mealPhotos`, session routine/slot references, exercise display units, and set input-unit fields. Older journals without these fields retain their records. Empty exercise lists are permitted only for active sessions. Imports validate referenced routines, foods/photos, valid units and conversions, bounded image encoding, and existing collection limits before replacement. New backups should be restored using this version or newer.

Domain tests cover editing safeguards, kg/lb consistency and encrypted restoration, distinct same-day sessions, durations, actual-work templates, personal slots, image sharing/deletion/encoding, and older journals. Browser journeys cover the complete editing/remember/reuse flow, a personal upper/lower calendar, and a confirmed photo meal that survives offline reload. Actual Android camera capture and notification delivery remain physical-device checks.
