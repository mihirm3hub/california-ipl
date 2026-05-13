# IPL World WebAR Experience

`ipl-world` powers California Almonds' 2026 IPL season campaign experience, "AlmondWin". The experience runs at `AlmondWin.com` and gives fans an interactive in-match AR game where they scan their surroundings, collect virtual California Almonds, earn points, and compete for match-ticket rewards through May 24, 2026.

The campaign positions California Almonds as a power-packed superfood for cricket season, with messaging focused on performance, recovery, sustained energy, and the broader nutritional value of almonds. This repository contains the gameplay logic, campaign pages, reward flow, backend integration, and deployment setup behind that experience.

## What The App Does

- Runs the `AlmondWin` interactive mobile campaign for the 2026 IPL season.
- Lets users scan their surroundings to find virtual California Almonds and collect points.
- Awards 10 points for regular almonds and 50 points for Golden Almonds during key match moments such as 4s, 6s, and wickets.
- Connects gameplay to live match state so the experience is active during relevant in-match windows.
- Tracks points, reward progression, and unlocked almond-benefit content through local state and backend APIs.
- Supports companion campaign pages for inactivity recovery, benefit collection, and end-of-match summary/share moments.

## Main User Flow

1. `src/index.html` loads the main AR experience.
2. `src/app.js` boots the loader sequence, registers A-Frame components, and starts the scene lifecycle.
3. `src/components/entity-spawner.js` controls almond spawning, live-match polling, Power Play timing, score submission, and game-end redirect behavior.
4. `src/components/main.js` manages non-scene UI state such as weekly points, reward copy, unlocked benefit persistence, idle redirect, and menu behavior.
5. `src/pages/benefit-collection.html` shows the collected benefit cards.
6. `src/pages/missing-out.html` is the inactivity recovery page.
7. `src/pages/super.html` is the end-of-match results and share snapshot page.

## Project Structure

```text
config/                  Webpack configuration and loaders
external/                8th Wall and XR runtime assets copied as static files
scripts/                 Build-time validation helpers
src/                     Application source
  app.js                 Bundle entry and loader orchestration
  index.html             Main WebAR game page
  assets/
    ar-assets/           PNG and GLB assets used by the experience
    images/              Non-AR static assets such as favicon files
  components/
    entity-spawner.js    Core gameplay and live-match logic
    main.js              UI state, reward content, redirects, backend user sync
    lib/                 Match, API, and reward helper modules
  css/
    styles.css           Shared page stylesheet
  pages/
    benefit-collection.html
    missing-out.html
    super.html
dist/                    Generated production output
```

## Tech Stack

- 8th Wall WebAR runtime
- A-Frame 1.5
- Vanilla JavaScript
- Webpack 5
- Netlify static hosting

## Requirements

- Node.js 20 or newer
- npm
- Git LFS enabled for repositories or deploy sources that fetch LFS-tracked assets
- A device/browser supported by 8th Wall for camera-based AR testing

## Local Development

```bash
npm install
npm run serve
```

The dev server is configured through `config/webpack.config.js` and serves from the repository root while bundling `src/app.js`.

## Environment File

Do not commit `.env` with real API keys, runtime tokens, or project secrets. Keep `.env` local-only and gitignored.

Recommended usage:

- create or maintain `.env` locally on your machine only
- store machine-specific or secret variants in ignored local env files such as `.env.local`
- never paste real credentials into tracked files or public pull requests

To replace placeholders with real values locally:

1. Create a local `.env` file in the repository root if it does not already exist.
2. Open the file and replace each placeholder with the real value from your Cricket API or deployment provider.
3. Save the file and restart the local dev server so any local tooling picks up the updated values.

Expected keys:

- `VITE_CRICKET_API_KEY`: your Cricket API key
- `VITE_CRICKET_PROJECT_KEY`: your Cricket project key
- `VITE_CRICKET_RS_TOKEN`: your runtime service token, if your environment uses one
- `VITE_CRICKET_IPL_TOURNAMENT_KEY`: the IPL tournament key used for featured match selection

Example local-only file:

```env
VITE_CRICKET_API_KEY=your_real_api_key
VITE_CRICKET_PROJECT_KEY=your_real_project_key
VITE_CRICKET_RS_TOKEN=your_real_runtime_token
VITE_CRICKET_IPL_TOURNAMENT_KEY=your_real_tournament_key
```

## Production Build

```bash
npm run build
```

Build output is emitted to `dist/`.

The build runs `scripts/verify-lfs-assets.js` first. That script blocks the build if critical runtime files are still unresolved Git LFS pointer files.

## Deployment

This project is configured for Netlify via [netlify.toml](./netlify.toml):

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `20`

Additional response headers are configured for:

- `index.html` revalidation
- `bundle.js` cache control
- long-lived immutable caching for `external/*`
- baseline security headers

## Branching And Release Flow

This project should follow a simple three-environment branch model:

- `dev`: active development branch for feature integration, day-to-day testing, and early gameplay or UI changes.
- `staging`: pre-production validation branch used to test work that has already passed development review and is ready for stakeholder or QA verification.
- `main`: production branch used for deployment-ready code only.

Recommended promotion flow:

1. Create feature branches from `dev`.
2. Merge validated feature work back into `dev`.
3. Promote tested `dev` changes into `staging` for broader validation.
4. After staging sign-off, merge `staging` into `main` for production deployment.

Practical intent of each branch:

- `dev` is where gameplay tuning, API integration changes, asset swaps, and page-level UX work move fastest.
- `staging` is where the full WebAR flow should be checked end-to-end, including live-match polling, reward popups, benefit unlock persistence, and Netlify-ready build output.
- `main` should stay stable and map to the live deployed experience.

If Netlify branch-based deploys are enabled, the expected mapping is:

- `dev` -> development preview deploy
- `staging` -> staging preview deploy
- `main` -> production deploy

Because environment configuration is not fully externalized yet, branch promotion should include an explicit check of hardcoded runtime values such as the API base URL, tournament key, and any deployment-specific routes.

## Backend And Runtime Dependencies

The frontend expects the following backend capabilities:

- featured match lookup
- tournament featured matches
- match detail lookup
- ball-by-ball match feed
- user profile data
- gameplay progress submission

Current API base:

- `https://api.almondwin.com`

Current gameplay assumptions in source:

- the featured tournament key is hardcoded in `src/components/entity-spawner.js`
- score submission uses `sessionStorage.authToken`
- user stats and benefit unlocks are fetched from `/api/user/userData`
- gameplay progress posts to `/api/gameplay/progress/submit`

## Configuration Notes

There may be a local `.env` file for developer convenience, but the current webpack/browser code does not consume those `VITE_*` variables. The live API base and tournament selection are hardcoded in source today:

- API base: [`src/components/lib/cricketApi.js`](./src/components/lib/cricketApi.js)
- tournament key usage: [`src/components/entity-spawner.js`](./src/components/entity-spawner.js)

If you want environment-specific builds, wire those values into the bundling process instead of relying on `.env` as-is.

## Gameplay Behavior Summary

- Idle almonds spawn every 10 seconds and currently award 10 points.
- Match-event almonds award 50 points.
- Ball-by-ball polling runs on a 10-second interval.
- Match completion stops spawning, tears down live polling, clears Power Play runtime state, and redirects to the summary page.
- Inactivity for 5 minutes redirects the player to `missing-out.html`.
- Benefit unlock state is persisted in local storage and supplemented from backend user data.

## Assets

The repository includes large runtime assets such as:

- 8th Wall runtime assets under `external/`
- branded PNG and GLB assets under `src/assets/ar-assets/`
- additional static assets under `src/assets/`

Because some assets are managed with Git LFS, clone and deployment environments need LFS support to avoid broken runtime files.

## Observations From The Current Codebase

- `game/` appears to be a checked-in built/exported output snapshot and is separate from the webpack-managed `dist/` directory.
- Some page markup still contains sample-era or temporary text variations.
- Several UI strings and path conventions assume deployment behind a larger site that owns routes like `/home`, `/profile`, `/benefits`, and similar pages.
- Power Play eligibility is currently stubbed as always enabled in `src/components/entity-spawner.js`.

## Recommended Next Improvements

- Move API base URL and tournament key into real environment-based configuration.
- Keep `.env` and any real secret handling out of git, and use ignored local env files or proper deployment configuration.
- Decide whether `game/` is still required; if not, remove it to reduce duplication.
- Centralize route/path handling for standalone static hosting versus embedded-site hosting.
- Add a short architecture note or API contract document for backend endpoints.

## License

This repository includes an MIT `LICENSE` file. Review bundled third-party runtime assets under `external/` for their own license terms before redistribution.
