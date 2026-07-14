# Contributing to InterChangableTrade-Fricks

Thanks for your interest in contributing! This document outlines the local
setup and conventions for the frontend.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs at http://localhost:3000.

## Scripts

| Script              | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the dev server                 |
| `npm run build`     | Production build                     |
| `npm run start`     | Serve the production build           |
| `npm run lint`      | Run ESLint                           |
| `npm run type-check`| Type-check with `tsc --noEmit`       |

## Project structure

```
src/
  app/         Next.js App Router routes
  components/   Reusable UI components
  hooks/        Client-side React hooks
  lib/          Framework-agnostic helpers
  services/     Data access (mock + API client)
  types/        Shared TypeScript types
```

## Conventions

- TypeScript strict mode is enforced.
- Presentational components live in `components/`; data fetching stays in
  `services/`.
- Run `npm run lint` and `npm run build` before opening a pull request.
