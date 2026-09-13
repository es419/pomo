# Pomo

PWA focus timer and study analytics app built with React, TypeScript, Vite and Firebase.

## Stack

- React + TypeScript + Vite
- Firebase Authentication (Email/Password)
- Cloud Firestore
- Recharts
- Vite PWA

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Firestore collections

Collections are created automatically when data is first saved:

- `projects`
- `tasks`
- `focusSessions`

## Firebase security

The Firestore rules used by the app are in `firestore.rules`.

## Timer model

Pomo does not rely on a background process to keep time. Every running focus session stores its `started_at` timestamp in Firestore. The UI derives elapsed time from the current clock, so the timer stays accurate after closing or reopening the PWA.
