# Contributing to InterChangabletrade-fricks

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

## Code of conduct

Participation in this project is governed by our
[Code of Conduct](CODE_OF_CONDUCT.md) (Contributor Covenant v2.1).
By contributing you agree to uphold it; abusive, harassing, or otherwise
unacceptable behavior can be reported by opening a private security
advisory on GitHub.
