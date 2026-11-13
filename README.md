# Roam With Justin

Roam With Justin is a Vue 2 single-page application (SPA) for travel stories,
trip galleries, gear recommendations, and related content. The site is
published at [roamwithjustin.com](https://roamwithjustin.com) using GitHub
Pages.

## Repository structure

This repository currently uses two branches with different jobs:

| Branch | Contents | Purpose |
| --- | --- | --- |
| `main` | Vue components, routes, source assets, and build configuration | The editable source code |
| `pages` | Generated HTML, CSS, JavaScript bundles, images, and Pages support files | The static production site served by GitHub Pages |

The branches have separate histories (there is no shared merge base). Do not
merge `pages` into `main`: that would mix generated bundles with the source
code. The intended flow appears to be:

```text
main source -> npm build -> dist/ -> pages branch root -> GitHub Pages
```

The source branch is the place to make application changes. The `pages` branch
should be treated as generated deployment output.

## Local development

### Requirements

- Node.js 17 or newer (as declared in `package.json`)
- npm
- Git

Install the exact dependencies recorded in `package-lock.json`:

```bash
npm ci
```

Start the Vue development server:

```bash
npm run serve
```

Open <http://localhost:8080>. The development server includes SPA history
fallback, so routes such as `/trips` and `/gear` should work when opened
directly.

On Windows PowerShell, use `npm.cmd` and `npx.cmd` if the PowerShell execution
policy blocks `npm.ps1`:

```powershell
npm.cmd ci
npm.cmd run serve
```

If `vue-cli-service` is reported as missing, the dependencies are not installed
or `node_modules` is incomplete. Run `npm ci` again.

### Docker development

The included Docker configuration also runs the Vue development server:

```bash
docker compose up --build
```

Open <http://localhost:8080>. Stop and remove the container with:

```bash
docker compose down
```

This is a development container with a bind-mounted source directory. It is
not the GitHub Pages production environment.

## Checks and production build

Run the linter:

```bash
npm run lint
```

Create an optimized static build:

```bash
npm run build
```

Vue CLI writes the result to `dist/`. That directory is ignored by Git on
`main` because its contents are generated.

To preview the built site with SPA fallback:

```bash
npx serve -s dist -l 5000
```

Then open <http://localhost:5000>.

## How production works

Production is a static site; GitHub Pages does not run Node, Express, Docker,
or `npm run serve`.

The current `pages` branch contains:

- `index.html`, which starts the Vue application;
- hashed files under `js/` and `css/`, produced by Vue CLI;
- images and other static assets;
- `CNAME`, containing `roamwithjustin.com`;
- `.nojekyll`, which tells GitHub Pages to serve the files directly; and
- `404.html`, currently a copy of the built `index.html`.

Vue Router uses history mode, producing clean URLs such as `/trips/utah`.
GitHub Pages has no configurable server rewrite rule, so a direct request for
one of those URLs falls through to `404.html`. Making `404.html` match the
built `index.html` loads Vue, after which Vue Router handles the route.

The repository contains no GitHub Actions workflow and no deploy script in
`package.json`. Based on the branch contents and history, production builds
have been copied to the root of `pages` and committed manually. GitHub Pages
must be configured in the repository settings to publish from the root of the
`pages` branch.

## Current manual deployment requirements

Until deployment is automated, a release needs to do all of the following:

1. Check out `main`, install dependencies, lint, and run `npm run build`.
2. Replace `dist/404.html` with a copy of the generated `dist/index.html`.
   The current `public/404.html` is copied as a plain HTML file and does not
   receive Vue CLI's generated script and stylesheet tags.
3. Add `dist/CNAME` containing exactly `roamwithjustin.com`.
4. Add an empty `dist/.nojekyll` file.
5. Publish the contents of `dist/` to the root of `pages`--not to a nested
   `dist/` directory.
6. Commit and push `pages`, then verify the home page and a direct nested URL
   such as `/trips`.

The `CNAME` and `.nojekyll` files currently exist only on `pages`, so a full
replacement of that branch can accidentally remove the custom domain or change
routing behavior. Preserve or regenerate them on every deployment.

## Known gaps

- Deployment is manual and its original command or procedure is not recorded.
- `main` and `pages` can drift because nothing links a source commit to a
  deployed build.
- `public/404.html` is not automatically converted into the required built SPA
  fallback.
- `CNAME` and `.nojekyll` are production requirements but are absent from the
  source branch.
- The `start` script is currently `node server server.js`; it should be reviewed
  before use. The Express server also lacks history-mode fallback for direct
  SPA routes.
- ESLint is configured with `plugin:vue/vue3-recommended`, although the project
  uses Vue 2.
- Prettier requires LF line endings while the system Git configuration may
  check files out as CRLF, causing thousands of `Delete CR` lint errors on
  Windows.
- Docker installs Vue CLI globally without pinned versions even though the
  project already declares local CLI dependencies.
- Vue 2 and Vue CLI are legacy dependencies and should eventually be upgraded.
- The deployment branch tracks generated source maps and large media files,
  which makes the repository and its history unusually large.

## Recommended next steps

1. **Automate deployment from `main`.** Add a GitHub Actions workflow that runs
   `npm ci`, linting, and the production build, prepares `404.html`, `CNAME`,
   and `.nojekyll`, and deploys the resulting artifact to GitHub Pages.
2. **Keep one source of truth.** Retain `main` as the editable source branch and
   treat `pages` as disposable generated output. Do not manually edit minified
   files or source maps on `pages`.
3. **Move deployment support into the build.** Store `CNAME` and `.nojekyll`
   under `public/`, and generate the SPA fallback after the build so every
   artifact is complete before deployment.
4. **Repair the local tooling.** Correct or remove the `start` script, align
   ESLint with Vue 2, add a repository line-ending policy, and pin a supported
   Node version.
5. **Modernize separately.** After deployment is reliable, plan the Vue 2/Vue
   CLI migration and optimize oversized images without combining those changes
   with the deployment repair.

The branches do not need to be merged to simplify this. The safer end state is
one maintained source branch plus an automated Pages deployment whose generated
artifacts can be recreated at any time.
