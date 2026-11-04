# Validation record

Checked locally on 2 November 2026 with Node.js 24, Windows, Chromium, and the private Android toolchain.

| Check                                              | Result                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Source formatting                                  | Passed                                                                                     |
| Vitest domain/persistence/backup tests             | 70 passed                                                                                  |
| Playwright browser journeys                        | 21 passed                                                                                  |
| Production Vite build and offline asset generation | Passed                                                                                     |
| Dependency audit                                   | No known vulnerabilities reported by npm at verification time                              |
| Private Android debug build                        | Passed                                                                                     |
| APK signature verification                         | Passed, APK Signature Scheme v2                                                            |
| Native manifest                                    | Android API 24 minimum, target 36; automatic backup disabled                               |
| Git exclusions                                     | Native source/config, APK, toolchain, keystore, exports, and test output confirmed ignored |

The browser journeys verify a fresh personal journal without measurements, demo separation, workout set persistence after reload, a persistent rest timer, completed history, custom food with unknown nutrients, recipe yield calculations, production offline reload, encrypted download/restore with a wrong-password rejection, navigation at a 360-pixel mobile width, five-day setup and schedule changes, one-tap workout start, guided set carry-forward, completed-day recovery, and Malaysian portion logging. Desktop and mobile screenshots were visually reviewed using fictional demo data.

The APK has not been installed or exercised on a physical phone. Native share sheets, Android Back/lifecycle behavior, OEM backup behavior, keyboard placement, and long-term WebView storage need device acceptance testing. The private native workspace contains those acceptance steps. Keep Android System WebView current. A debug build is not a Play Store release.

The web repository's GitHub Actions workflow runs the formatting, unit, production build, and browser checks. Android packaging is validated separately.

Version 0.3 additionally verifies self-selected workout order and targets, adding movements mid-session, personal exercise definitions through encrypted restore, custom-exercise history/charts, backward-compatible old journals, and protein-only target updates with reached/remaining states. Saving is acknowledged before reload tests check persistence.

Version 0.4 verifies distinct weekly muscle days across gym/home, direct versus assisted work, unmapped personal exercises, recovery/equipment checks, historical week rollover, encrypted restoration of mappings and goals, and local reminder planning/cancellation with permission denial. The final debug APK reports version 0.4.0 (code 400), passes v2 signature verification, includes notification permission and the local notification plugin, and excludes exact-alarm permission. Android-bundled web assets match the production entry. Actual phone notification delivery remains untested.

Version 0.4.1 adds the fitrirusli copyright notice, reserved-rights license, and author metadata. The notice was checked at 1440px and 390px widths without horizontal overflow. The Android debug build (code 401) and signature verification passed; bundled web entry matches the production build. This change does not submit a MyIPO notification.

Version 0.5.1 includes flexible exercise editing, kg/lb entry, reusable actual-work routines, personal calendar slots, multiple daily sessions, persisted elapsed times, and manually confirmed offline photo meals. Stop-session regressions verify accidental-start discard without history, confirmation before discarding saved work, continue without losing sets, persisted stop decisions after reload, and an explicit save using the original stop click timestamp. A recipe reload journey now waits for the save acknowledgement before reloading. The Android APK reports version 0.5.1 (code 501), passes v2 signature verification, and bundles the matching production entry. Stop controls were visually checked at 390px with no horizontal overflow. Native camera, Android lifecycle/Back, notification delivery, and in-place update acceptance remain phone checks.

Version 0.5.2 adds confirmed removal of mistakenly recorded exercises from completed history. Unit and browser checks verify cancellation, retention of other exercises/notes/times, persistence through reload and encrypted backup, recalculated muscle/strength history, source-scoped routine correction, last-working-exercise cleanup, planned-link cleanup, and rejection of a stale confirmation that would broaden deletion. The correction UI was visually reviewed at 390px using fictional records with no page errors or horizontal overflow. On 3 November 2026 the final APK metadata (0.5.2 / code 502), v2 signature, and bundled production entry were verified; its SHA256 file was refreshed. Actual records in the owner's phone have not been edited by these desktop checks.

Version 0.5.3 adds portion counts for food and photo meals and lets users save a custom meal with only the nutrients they know. The 70 unit tests and 22 browser tests passed locally, including fractional portions, protein-only entries, and encrypted restoration of records with grams or portions. The Android APK metadata (0.5.3 / code 503), matching web entry, and v2 signature were verified.
