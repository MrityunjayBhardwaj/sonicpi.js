# Release Runbook

This document is the sole source of truth for cutting a SonicPi.js release. Follow it top-to-bottom. Every step is observable — don't trust that commands "worked," verify what the consumer actually sees.

Full rationale for the criteria below lives in dharana §10 (Release Engineering Boundary) — this file is the executable procedure, the dharana entry is the theory.

---

## The non-negotiables

1. **One version string, all surfaces.** `package.json`, `src/app/version.ts`, git tag, GitHub release title, CHANGELOG header, npm dist-tag target — all identical. No "human-friendly" renaming (`beta 1` in copy while `package.json` says `beta.0`). That drift IS the silent failure this runbook prevents.
2. **Prereleases publish with `--tag beta` or `--tag next`. Never bare `npm publish` on a prerelease version.** Default behavior silently promotes the prerelease to `latest`, breaking every existing installer of the stable line.
3. **No force push on `main`, ever. No `--no-verify` on release commits.** Release commits must pass CI before merge.

---

## Version string convention

Follow semver prerelease suffixes, zero-indexed:

```
alpha cycle:  1.N.0-alpha.0 → 1.N.0-alpha.1 → ...
beta cycle:   1.N.0-beta.0  → 1.N.0-beta.1  → ...
rc cycle:     1.N.0-rc.0    → 1.N.0-rc.1    → ...
stable:       1.N.0
patch:        1.N.1, 1.N.2, ...
```

**First beta = `.0`. First RC = `.0`. Same string everywhere.**

---

## Cycle transition gates (from dharana §10)

### Beta → RC — ALL FOUR must hold
1. **Curve flat:** zero new bugs reported in the last 2 consecutive beta cycles
2. **Severity clear:** zero P0 and zero P1 bugs in the open issue list
3. **No pending architectural changes:** no open refactors in flight
4. **Real-world suite green:** the 56-composition test corpus still passes 100% in Chromium capture

### RC → stable — ALL THREE must hold
1. **RC clean window:** at least one full RC cycle with zero P0/P1 bug reports from community use
2. **Minimum time on clock:** at least 1 week of community exposure on the RC
3. **Zero code change from last RC to stable:** the stable release is a version bump + retag of the RC commit

### Upper bound (escape hatch)
- Soft ceiling: ~3-5 betas is normal
- Hard signal: if cutting beta.6+ and bug discovery rate has NOT decelerated, STOP. The problem is structural, not release-process. Return to diagnosis, restart from alpha if needed.

### Regression path
- RC breaks → RC.N+1 (not stable)
- Multiple P0s at RC → back to beta.N+1
- Structural problem surfaces → back to alpha

---

## Prerelease procedure (`1.X.Y-beta.N` or `1.X.Y-rc.N`)

### 1. Cut the release branch
```bash
git checkout main
git pull origin main
git checkout -b chore/v1.X.Y-beta.N
```

### 2. Update ALL version surfaces in a single commit
Edit each of these to the new version string (same literal string in all five):
- [ ] `package.json` → `"version": "1.X.Y-beta.N"`
- [ ] `src/app/version.ts` → `export const APP_VERSION = '1.X.Y-beta.N'`
- [ ] `CHANGELOG.md` → add `## v1.X.Y-beta.N` section at top with bugfix list
- [ ] `ROADMAP.md` → update the Released table row if applicable
- [ ] `README.md` → update if the version is referenced inline (usually not)

Composition pair (dharana §10): `package.json` and `src/app/version.ts` MUST change in the same commit. If the diff shows only one, the UI footer will lie.

### 3. Verify locally
```bash
npx tsc --noEmit             # zero errors
npx vitest run               # all tests pass, including version composition pair
npm run build:single         # production single-file app build succeeds
npm run build:lib            # library bundle (ESM + CJS) build succeeds
npx tsx tools/capture.ts "play 60; sleep 0.5; sample :bd_haus"
#                            ^ smoke test — inspect .captures/*.md for issues
```

The vitest run includes `src/app/__tests__/version.test.ts` which enforces the `package.json` ↔ `src/app/version.ts` composition pair from dharana §10. If you bumped one file and forgot the other, this test fails immediately. Do not skip it, do not `--no-verify` around it.

Both build commands must be run — `build:single` produces the sonicpi.cc deploy artifact, `build:lib` produces the npm package. A release that passes one but not the other ships a broken half-product.

### 4. Commit and push
```bash
git add package.json src/app/version.ts CHANGELOG.md ROADMAP.md
git commit -m "🚀 chore(release): v1.X.Y-beta.N

$(cat <<'EOF'
Problem: [short context for why this release is being cut]
Fix: Bump version across package.json, src/app/version.ts, CHANGELOG,
     ROADMAP in lockstep. Beta publishes with --tag beta to protect latest.
EOF
)"
git push -u origin chore/v1.X.Y-beta.N
```

Gitmoji convention used in this repo: `🐛 fix:`, `📝 docs:`, `⬆️ chore:`, `♻️ refactor:`. Release commits use `🚀 chore(release):` to pair a rocket with the existing `chore:` convention.

### 5. Open PR, wait for CI
```bash
gh pr create --title "🚀 release: v1.X.Y-beta.N" --body "Release notes in CHANGELOG.md"
```
CI must go green before merge. **Never `--no-verify`.**

### 6. Merge to main
```bash
gh pr merge --squash --delete-branch
git checkout main
git pull origin main
```

### 7. Tag the release commit
```bash
git tag -a v1.X.Y-beta.N -m "v1.X.Y-beta.N"
git push origin v1.X.Y-beta.N
```

### 8. Publish to npm with beta tag (CRITICAL)
```bash
npm run build:lib              # build the library bundle
npm publish --tag beta         # <-- --tag beta IS NON-NEGOTIABLE
```

If you forget `--tag beta`, the prerelease becomes `latest` and breaks every existing installer. Recovery:
```bash
npm dist-tag add @mjayb/sonicpijs@1.X.(Y-1) latest   # the previous stable
npm dist-tag add @mjayb/sonicpijs@1.X.Y-beta.N beta
```

### 9. Verify what the registry actually serves (observation, not inference)
```bash
npm view @mjayb/sonicpijs dist-tags
# Expected output:
#   latest: 1.X.(Y-1)        <-- previous stable, unchanged
#   beta:   1.X.Y-beta.N     <-- new prerelease
```
**If `latest` moved, STOP and fix before proceeding.**

### 10. Verify sonicpi.cc deploy
- Open sonicpi.cc in a fresh incognito window
- Read the version label in the top-right of the menu bar
- It MUST display `v1.X.Y-beta.N`
- If the old version shows, the Vercel deploy failed or is cached — investigate before announcing

### 11. Cut the GitHub release
```bash
gh release create v1.X.Y-beta.N \
  --title "v1.X.Y-beta.N" \
  --notes-file CHANGELOG.md \
  --prerelease                 # <-- mark as prerelease
```

### 12. Announcement (deferred to a separate step — NOT in this runbook)
- For betas: forum post at in-thread.sonic-pi.net + optional Sam Aaron courtesy message
- For stable: forum post + README update + social

Drafts for these live in `~/.anvideck/projects/sonicPiWeb/drafts/` (outside the repo).

---

## Stable release procedure (`1.X.Y`)

Same as prerelease, with three changes:

1. **Version string has no suffix** (e.g., `1.5.0`, not `1.5.0-rc.N`)
2. **`npm publish` runs WITHOUT `--tag`** — default `latest` is what you want for stable
3. **GitHub release is NOT marked `--prerelease`**

**Critical: zero code change from the last RC.** If you change any code between the last clean RC and the stable release, it's RC.N+1, not stable. The stable release is a retag of the RC commit with a new version string. Preserve the test evidence.

---

## Patch release (`1.X.Y+1`)

For critical fixes on a released stable line:

1. Cut a branch from the last stable tag: `git checkout -b fix/critical v1.X.Y`
2. Cherry-pick the fix commits
3. Bump version in `package.json` and `src/app/version.ts` to `1.X.Y+1`
4. Add CHANGELOG entry
5. PR, merge, tag, publish (with default `latest` tag for patch on stable line)

---

## Checklist — paste this into the PR description

```
Release: v1.X.Y-beta.N

Source-of-truth sync (dharana §10 composition pair):
- [ ] package.json version
- [ ] src/app/version.ts APP_VERSION
- [ ] CHANGELOG.md header
- [ ] ROADMAP.md released table (if applicable)

Pre-merge verification:
- [ ] npx tsc --noEmit — zero errors
- [ ] npx vitest run — all tests pass
- [ ] npx tsx tools/capture.ts smoke test — clean
- [ ] CI green

Post-merge (after this PR is in main):
- [ ] Tag pushed: v1.X.Y-beta.N
- [ ] npm publish --tag beta
- [ ] npm view dist-tags verified (latest unchanged, beta points to new version)
- [ ] sonicpi.cc incognito check — footer shows new version
- [ ] GitHub release created with --prerelease flag
- [ ] Announcement (separate step)
```

---

## Known gaps in this runbook (TODO)

- [ ] Pre-publish guard script that refuses `npm publish` on prerelease versions without an explicit `--tag` flag (dharana §10 known silent failure mode)
- [ ] Automated check that `package.json.version` and `src/app/version.ts`'s `APP_VERSION` match — currently enforced by release discipline
- [ ] Second Vercel deploy target for `beta.sonicpi.cc` — deferred until after v1.5.0 stable (dharana §10 Distribution Channels subsection)
