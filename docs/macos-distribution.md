# macOS Distribution and Notarization Readiness

## Packaging commands
- Unpacked app: `npm run package:mac:dir`
- Unsigned release artifacts: `npm run package:mac`
- Signed/notarized-ready release attempt: `npm run package:mac:signed`

Artifacts are written to `release/`.

## Notarization env vars
The build is configured to notarize automatically **only** when these are present:
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

If any are missing, packaging still succeeds but notarization is skipped.

## Signing note
- The default packaging commands intentionally disable auto-discovered signing so local packaging is reliable even without the correct Developer ID certificate.
- Use `npm run package:mac:signed` only when the machine has the correct Apple signing setup for distribution.

## Signing / readiness check
Run:
- `npm run package:prereqs` for local prerequisites only
- `npm run package:readiness` for strict release readiness

This checks:
- `ffmpeg`
- `ffprobe`
- local code-signing identities
- notarization env presence
- strict release readiness additionally requires:
  - a `Developer ID Application` identity
  - `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`

## Smoke testing
Source-app smoke test:
- `npm run start:smoke`

Packaged-app smoke test:
- `npm run package:mac:dir`
- `npm run package:smoke`

Both smoke paths require:
- `OPENAI_API_KEY` in the shell environment
- optional `SMOKE_VIDEO_PATH` (defaults to `testvideo/MCP_SHORT.mp4`)

## Current release caveat
The packaged app still depends on `ffmpeg` / `ffprobe` being available on the target Mac. This build is distribution-ready for controlled environments and notarization-ready, but a fully self-contained consumer release would still benefit from bundling media binaries in a later pass.

## Packaging implementation note
- `asar` is currently disabled because Remotion's packaged compositor/bundler executables need direct filesystem execution in the packaged app.
- Re-enabling `asar` later is possible, but it requires a validated `asarUnpack` strategy for all Remotion runtime binaries.
