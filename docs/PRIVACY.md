# Privacy, backup, and repository boundaries

## On-device records

The app sends no workout, food, recovery, or body record to a server. There are no accounts, analytics, advertisements, or remote model calls. External nutrition reference links open only when selected. Public web hosting still receives ordinary requests for static assets; that does not include journal contents.

IndexedDB stores the journal inside the app/browser's origin. This is not a separate encrypted database or an app PIN. A person or process with access to the device/profile, developer tools, or malicious same-origin code may access it. Host the web build on an origin you control and keep dependencies maintained.

Browser data clearing, storage eviction, app uninstall, an origin change, or device loss can remove records. Local storage is not a backup. Web and Android are separate journals unless you transfer an encrypted backup.

## Encrypted backups

Exports use AES-256-GCM with a random 16-byte salt, random 12-byte nonce, and a key derived using PBKDF2-SHA256 with 210,000 iterations. Passwords must have at least 10 characters; choose a strong one. The key/password is not stored. Authentication rejects modified ciphertext and incorrect passwords. Forgotten passwords cannot be recovered.

Restore accepts the versioned encrypted format up to 20 MB, decrypts, validates schema/values/IDs/exercise references, rejects dangerous object keys, and only then replaces the journal after the user types `REPLACE`. Failed restoration keeps the existing records. Deletion requires typing `DELETE`.

Web exports use a browser download. Android uses an encrypted temporary cache file and the system share sheet; the user chooses a destination. Temporary files are removed after sharing. Exported destinations are controlled by the user, including any cloud storage they choose.

The native configuration disables automatic app backup and excludes app data from Android backup/device transfer rules. Actual behavior should still be checked on target Android/OEM versions. Explicit encrypted export is the supported transfer mechanism.

## Git boundaries

Optional meal photos are processed locally into bounded JPEG copies, without source-image EXIF metadata, and stored with the local journal. Saved photos are included in explicit encrypted backups; unsaved camera review is not uploaded or submitted to a recognition service. A photo can be removed while keeping its food records. Android camera/gallery handling and temporary files are covered in the [photo workflow](WORKOUTS-AND-PHOTO-MEALS.md). Neither photos nor personal routine data are written into the public repository by normal use.

Weekly muscle goals, home-equipment preferences, reminder preferences, and personal exercise mappings are stored locally and included in explicit encrypted backups. Optional Android notifications are scheduled on the device without a server. Their text is generic and the notification channel hides content on the lock screen. Android permission and alarm state do not transfer as part of journal backups. Demo mode cancels personal pending reminders; the web edition does not send background push notifications. See [reminder behavior and limits](WEEKLY-MUSCLES.md).

Allowed: React/JavaScript source, styling, general documentation, actual public-domain food data, fictional demo generators, tests, and package locks.

Ignored: `.private/`, `.local/`, `android/`, `ios/`, Capacitor configurations, APK/AAB builds, signing keys and keystores, credentials, local toolchains/caches, personal exports/backups, runtime data, and test reports.

The local development server also blocks private/native paths from HTTP access and excludes toolchains and native build folders from file watching. These paths were checked to return HTTP 403.

Before publishing, inspect the candidate files and ignore rules:

```sh
git status --short
git check-ignore capacitor.config.json android/app/build/outputs/apk/debug/app-debug.apk .private/releases/PersonalFitness-debug.apk
git diff --cached --stat
```

No personal records are committed by running the app. Do not place exports, screenshots with real records, keys, or secrets into public source folders. Use the clearly labeled fictional demo for portfolio screenshots. The current implementation has no remote configured and has not been pushed as part of the initial build.
