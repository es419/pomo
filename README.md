# Pomo

PWA focus timer and study analytics app built with React, TypeScript, Firebase and Firestore.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## GitHub Pages

This repository is configured to deploy automatically from `main` using GitHub Actions.

After pushing, open **GitHub → Settings → Pages** and make sure **Source** is set to **GitHub Actions**.

The production URL for this repository is expected to be:

`https://es419.github.io/pomo/`


## Latest UI
- Animated launch splash using the Pomo icon
- Delete tasks with their focus history
- Delete projects with their tasks and related focus history
- Active timers are protected from accidental task/project deletion

## Weekly push summary (no Firebase Blaze required)

Pomo can send a weekly Web Push summary every Saturday at 20:00 (Asia/Jerusalem) using Firebase Cloud Messaging and a scheduled GitHub Action.

The notification is intentionally deep-linked to:

`/pomo/?tab=stats&period=week&source=weekly-notification`

So tapping it opens the weekly statistics screen rather than the focus/home tab.

### One-time setup

1. In Firebase Console -> Project settings -> Cloud Messaging -> Web Push certificates, generate a Web Push key pair.
2. In GitHub -> Settings -> Secrets and variables -> Actions -> Variables, add:
   - The public Web Push VAPID key is already included in `.env.production`, so no GitHub variable is required.
3. In Firebase/Google Cloud, create or use a service account that can read Firestore and send Firebase Cloud Messaging messages, then create a JSON key.
4. In GitHub -> Settings -> Secrets and variables -> Actions -> Secrets, add:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = the full JSON key contents.
5. Deploy the updated Firestore rules once:

```bash
firebase deploy --only firestore:rules
```

6. Push to `main`. GitHub Pages will rebuild automatically with the included public VAPID key.
7. Open Pomo -> Statistics and enable weekly notifications on each device that should receive them.

On iPhone/iPad, Web Push requires Pomo to be installed to the Home Screen and opened from there.

### Testing

GitHub -> Actions -> `Send weekly Pomo summary` -> Run workflow.

The scheduled workflow also runs automatically every Saturday at 20:00 in the `Asia/Jerusalem` timezone.
