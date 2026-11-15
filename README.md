# Roam With Justin

Roam With Justin is a Vue 2 single-page application (SPA) for travel stories,
trip galleries, gear recommendations, and related content. The site is
published at [roamwithjustin.com](https://roamwithjustin.com) using GitHub
Pages.

## Repository structure

This repository contains two branches with different histories:

| Branch  | Contents                                                                | Purpose                         |
| ------- | ----------------------------------------------------------------------- | ------------------------------- |
| `main`  | Vue source, public assets, build configuration, and deployment workflow | The source of truth             |
| `pages` | An older snapshot of generated HTML, CSS, JavaScript, and images        | Legacy manual deployment output |

The branches have separate histories (there is no shared merge base). Do not
merge `pages` into `main`: that would mix generated bundles with the source
code. The automated deployment flow is:

```text
push main -> GitHub Actions -> npm ci -> npm run build -> dist/ artifact -> GitHub Pages
```

Make application changes only on `main`. Once the Actions deployment has been
enabled and verified, the `pages` branch is no longer needed.

## Documentation

Start with [`docs/README.md`](docs/README.md). It separates verified as-built
architecture from active implementation work, future proposals, references,
audits, and archived briefs. Source code and tests remain authoritative for
what is implemented.

After managed documentation changes, run:

```bash
npm run docs:audit
```

## Local development

### Requirements

- Node.js 20.9 or newer (as declared in `package.json` and required by Sharp)
- npm
- Git

Install the exact dependencies recorded in `package-lock.json`:

```bash
npm ci
```

Start the Vue development server for this computer only:

```bash
npm run serve
```

Open <http://localhost:8080>. The development server includes SPA history
fallback, so routes such as `/trips` and `/gear` should work when opened
directly.

To test from another phone or computer on the same local network, bind the
development server to the primary private LAN address:

```bash
npm run serve --network
```

The launcher prefers a physical Ethernet or Wi-Fi adapter over common VPN and
virtual adapters, then prints the selected interface and address. Open the
`Network` URL printed by Vue, such as `http://192.168.1.25:8080`. Allow Node.js
through the Windows administrator prompt. On Windows, the launcher temporarily
allows the Node.js process on TCP port 8080 for Private networks and devices on
the local subnet only. Press `Ctrl+C` in the elevated server window to stop the
server and remove that firewall rule. The local network origin must also be
included in the MapTiler key's allowed HTTP origins for the Atlas map to load.

On Windows PowerShell, use `npm.cmd` and `npx.cmd` if the PowerShell execution
policy blocks `npm.ps1`:

```powershell
npm.cmd ci
npm.cmd run serve
npm.cmd run serve --network
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
`main` because its contents are generated. After Vue CLI finishes, npm
automatically runs `scripts/prepare-pages.js`, which replaces `dist/404.html`
with a copy of the generated `dist/index.html`. Vue CLI also copies
`public/CNAME` and `public/.nojekyll` into `dist/`.

To preview the built site with SPA fallback:

```bash
npx serve -s dist -l 5000
```

Then open <http://localhost:5000>.

## Interactive Travel Atlas

The experimental atlas is isolated at `/atlas` and is lazy-loaded separately
from the existing site. Its components, data, persistence, map configuration,
environment setup, content instructions, and removal checklist are documented
in [`src/features/atlas/README.md`](src/features/atlas/README.md).

The atlas works locally with a basic preview map. Satellite imagery and 3D
terrain require `VUE_APP_MAPTILER_KEY`; copy `.env.example` to an uncommitted
`.env.local` and add a MapTiler browser key. Production reads the key from the
GitHub Actions secret `MAPTILER_API_KEY`. Save the raw key without quotes or
surrounding whitespace and allow `https://roamwithjustin.com` as an HTTP origin
in MapTiler.

## Image optimization

GitHub Pages serves the files in `public/` without resizing or recompressing
them. Image optimization therefore happens before deployment, and optimized
images are committed to the source branch so local development, CI, and
production all use the same assets.

The project uses [Sharp](https://sharp.pixelplumbing.com/) as a development
dependency for deterministic image processing. This re-encodes the existing
pixels; it does not use generative AI or recreate the photographs.

The default in-place optimization policy is:

- resize photographs to a maximum width or height of 2560 pixels without
  enlarging smaller images;
- auto-orient images before removing unnecessary camera metadata;
- encode JPEG files at quality 82 with MozJPEG and progressive scans;
- optimize PNG files losslessly and preserve transparency;
- preserve existing filenames, extensions, and public URLs so application
  references do not need to change;
- write each result to a temporary file and replace the source only when the
  result is smaller; and
- provide a dry-run report showing the original and estimated output sizes
  before changing any files.

Preview the changes without modifying any images:

```bash
npm run images:optimize:dry
```

Review the reported dimensions and potential savings. Then optimize the
committed images:

```bash
npm run images:optimize
```

The optimizer only processes JPEG and PNG files whose width or height exceeds
2560 pixels. Images already within that limit are skipped, making repeat runs
safe from repeated lossy JPEG encoding. An oversized file is also left
unchanged when the optimized output would be larger than its current file.
Run the production build after an optimization pass and visually review the
main galleries before committing the binary changes.

### Create compressed, numbered copies in a source directory

The optimizer also has a copy mode for preparing a directory of new images.
Pass the source directory and a filename tag at run time:

```bash
npm run images:optimize:copies -- --source "path/to/photos" --tag "puerto-rico"
```

This reads the JPEG and PNG files directly inside the source directory in
alphabetical order and writes the compressed copies back to that same
directory as `puerto-rico-1.jpg`, `puerto-rico-2.png`, and so on. It does not
scan subdirectories, and the original files are left unchanged. Images are
auto-oriented, reduced to a maximum width or height of 2560 pixels, and
re-encoded using the same settings as the in-place optimizer. If re-encoding
would make an image larger, the numbered output is instead a byte-for-byte
copy of the original.

When `--tag` is supplied, the tool compares it with the repository's canonical
Journey IDs, public journey slugs and titles, plus the IDs, names and aliases
of Places visited on each journey. It reports the closest match with a
heuristic confidence score and suggests a canonical filename label. For
example, `usvi` resolves to the St. John journey, while `trunk bay` suggests
`usvi-trunk-bay`. The score measures deterministic text similarity; it is not
proof that the photographs actually depict the matched place.

Suggestions are advisory by default: the exact label supplied to `--tag` is
still used. Add `--use-suggested-tag` to adopt a medium- or high-confidence,
unambiguous suggestion:

```bash
npm run images:optimize:copies -- --source "path/to/photos" --tag "trunk bay" --use-suggested-tag
```

The command stops without writing files when `--use-suggested-tag` is requested
but the match is weak or ambiguous. A more specific tag, such as a complete
journey or place name, produces safer results.

Preview the filenames and savings without keeping any output files by adding
`--dry-run`:

```bash
npm run images:optimize:copies -- --source "path/to/photos" --tag "puerto-rico" --dry-run
```

Copy mode refuses to overwrite an existing numbered output. Choose a new tag
or move the existing output files before running it again.

Filename matching in numbered-copy mode does not register or publish an asset.
For a complete, validated workflow, use the separate Journey package and
publication ingestor documented in
[the Journey media ingestion guide](docs/implementation/journey-media-ingestion.md).
It prepares a manifest, uploads only its listed local media through the
authenticated R2 Worker, verifies stored checksums, adds generated canonical
Media records idempotently, and places them in a Journey's additive
**Photography and video** collection without overwriting curated hero or
gallery content. JPEG/PNG packages use the image optimizer; MP4-only packages
preserve the original bytes and use versioned `videos/` keys. Automatic video
transcoding is intentionally not performed.
A Place/Visit package supplies that stop's default card and Atlas image only
when no curated hero exists; stops without verified photography remain empty
instead of borrowing the Journey cover.
Worker deployment and credential setup are documented in
[the R2 Worker upload runbook](docs/implementation/r2-worker-media-upload.md).

### Command-line help

The script contains its complete command reference. Display it with any of
these help flags:

```bash
node scripts/optimize-images.js --help
node scripts/optimize-images.js --h
node scripts/optimize-images.js -h
```

The same help is available through npm:

```bash
npm run images:optimize -- --help
```

## Gear ingestion

Canonical Gear and journey usage can be added from constrained Markdown or
strict JSON without editing Journey modules. Start with a dry run:

```bash
npm run gear:journeys
npm run gear:list
npm run gear:ingest -- --journey usvi-st-john-2025 --source ./gear-inbox/usvi.md --dry-run
```

See [the Gear ingestion CLI guide](docs/reference/gear-ingestion-cli.md) for the
input contract, publication safeguards, selectors, examples, and complete
operating workflow.

## How production works

Production is a static site; GitHub Pages does not run Node, Express, Docker,
or `npm run serve`.

The workflow at `.github/workflows/deploy-pages.yml` runs after every push to
`main` and can also be started manually from the Actions tab. It:

1. checks out `main`;
2. installs the locked npm dependencies on Node 22;
3. runs `npm run build`, including the automatic `postbuild` fallback step;
4. uploads `dist/` as a GitHub Pages artifact; and
5. deploys that artifact to the `github-pages` environment.

Generated files are not committed to `main` or copied to another branch.

Vue Router uses history mode, producing clean URLs such as `/trips/utah`.
GitHub Pages has no configurable server rewrite rule, so a direct request for
one of those URLs falls through to `404.html`. Making `404.html` match the
built `index.html` loads Vue, after which Vue Router handles the route.

The custom domain remains configured in GitHub under **Settings > Pages**.
`public/CNAME` is included in each build, but the file does not replace the
repository's Pages custom-domain setting or its DNS records.

## Enable the automated deployment

The workflow is committed with the source, but GitHub must be told to use it:

1. Push the workflow and current `main` changes to GitHub.
2. Open **Settings > Pages** in the GitHub repository.
3. Under **Build and deployment**, change **Source** to **GitHub Actions**.
4. Confirm that the custom domain is still `roamwithjustin.com`.
5. Open the **Actions** tab and watch **Deploy to GitHub Pages** complete.
6. Verify the homepage, a direct nested URL such as `/trips`, and the favicon.
7. After the Actions deployment is confirmed, archive or delete the legacy
   `pages` branch.

Do not delete `pages` before the first Actions deployment succeeds; it remains
the rollback path for the currently published site.

## Known gaps

- The repository still has a legacy `pages` branch until the first Actions
  deployment is verified.
- The `start` script is currently `node server server.js`; it should be reviewed
  before use. The Express server also lacks history-mode fallback for direct
  SPA routes.
- ESLint is configured with `plugin:vue/vue3-recommended`, although the project
  uses Vue 2.
- Existing Windows checkouts may still contain CRLF files until they are
  refreshed. The repository now uses `.gitattributes` to require LF for future
  checkouts and commits.
- Docker installs Vue CLI globally without pinned versions even though the
  project already declares local CLI dependencies.
- Vue 2 and Vue CLI are legacy dependencies and should eventually be upgraded.
- A small number of already-compressed images remain larger than 2560 pixels
  because resizing and re-encoding them would increase their file size.

## Recommended next steps

1. **Enable and verify GitHub Actions Pages deployment.** Change the publishing
   source in the repository settings, push `main`, and test the deployed site.
2. **Retire the legacy branch.** Delete `pages` only after the new deployment
   works and the custom domain is confirmed.
3. **Keep deployment support in the build.** Preserve `public/CNAME`,
   `public/.nojekyll`, and the post-build SPA fallback when deployment is moved
   into GitHub Actions.
4. **Repair the local tooling.** Correct or remove the `start` script, align
   ESLint with Vue 2, add a repository line-ending policy, and pin a supported
   Node version.
5. **Review optimized images.** Visually check the main galleries and random
   backgrounds, then commit the Sharp script and optimized binaries as a
   dedicated change.
6. **Modernize separately.** After deployment is reliable, plan the Vue 2/Vue
   CLI migration without combining it with deployment or image changes.

The branches do not need to be merged. The target state is one maintained
source branch plus an automated Pages artifact that can be recreated at any
time.

New-NetFirewallRule -Name "VueDevServer80" -DisplayName "Vue Dev Server 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Profile Private -RemoteAddress LocalSubnet

New-NetFirewallRule -Name "VueDevServer8080" -DisplayName "Vue Dev Server 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -Profile Private -RemoteAddress LocalSubnet

Remove-NetFirewallRule -Name "VueDevServer80"

Get-NetFirewallRule -Name "VueDevServer8080" | Get-NetFirewallPortFilter | Format-List Protocol,LocalPort

Get-NetFirewallRule -Name "VueDevServer8080" | Get-NetFirewallAddressFilter | Format-List RemoteAddress

Get-NetFirewallRule -PolicyStore ActiveStore -Name "VueDevServer8080" | Format-List Enabled,Profile,EnforcementStatus

Get-NetFirewallProfile -PolicyStore ActiveStore -Name Private | Format-List Enabled,AllowInboundRules,AllowLocalFirewallRules,DefaultInboundAction

Set-NetFirewallProfile -Name Private -AllowInboundRules True

Get-NetFirewallRule -PolicyStore ActiveStore -Name "VueDevServer8080" | Format-List EnforcementStatus

Get-CimInstance -Namespace root/SecurityCenter2 -ClassName FirewallProduct | Format-Table displayName,productState -AutoSize

Get-NetFirewallProfile -PolicyStore ActiveStore -Name Private | Format-List DisabledInterfaceAliases

ping -n 1 192.168.86.247 arp -a | findstr 192.168.86.247

Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess

Get-NetFirewallRule -DisplayName "Roam With Justin\*" | Get-NetFirewallApplicationFilter | Select-Object Program

Get-NetFirewallRule -DisplayName "Roam With Justin\*" | Select-Object Name, Enabled, Direction, Action, Profile

Get-NetFirewallRule -Name "RoamWithJustinDevServer-\*" | Remove-NetFirewallRule

Get-NetFirewallRule -Name "RoamWithJustinDevServer-26220" | Get-NetFirewallAddressFilter | Format-List

New-NetFirewallRule `    -DisplayName "Node 8080 Diagnostic"`
-Direction Inbound `    -Protocol TCP`
-LocalPort 8080 `    -Action Allow`
-Profile Private `
-RemoteAddress Any
