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
