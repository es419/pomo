# Pomo PWA – Firebase edition

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Firebase already configured

This build is connected to the Firebase web app for project `pomo-f1093`.
It uses:
- Firebase Authentication (Email/Password)
- Cloud Firestore

Required collections are created automatically when the first records are added:
- `projects`
- `tasks`
- `focusSessions`

## Security Rules

The required rules are included in `firestore.rules`. Publish the same rules in Firebase Console → Firestore Database → Rules.

## Timer model

The timer does not depend on a background process. A focus session stores `started_at`. The UI derives elapsed time from the current clock, so closing/reopening the PWA keeps the timer accurate.
