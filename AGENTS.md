# Instructions for Codex and repository agents

## Read at the start of every session

Read [CLAUDE.md](CLAUDE.md) and
[session-craft](.claude/skills/session-craft/SKILL.md) before planning or changing this game.
Read [the retrospective](docs/retrospective.md), then the design and testing documents relevant
to the task. CLAUDE.md remains the detailed source of project rules and owner decisions;
this file is the Codex entry point and translates the workflow to the tools available here.
Current explicit user instructions take precedence over repository guidance.

These instructions persist with the repository; they are not global model memory.
When working in the sibling SouthOfTethys repository, read its own instructions too.

## Mandatory branch and merge checks

The owner requires checking whether previous work has merged before starting new work.
Repeat the check immediately before every commit and push, including commits made through
GitHub file or Git-data tools: a PR can merge during a session.

1. Inspect the working tree, current branch, local commits and remotes. Preserve existing user
   edits and unmerged work. In a connector-only session, inspect the corresponding remote branch,
   its head SHA and PRs instead; do not imply that a local checkout was inspected.
2. Refresh the default branch and working branch from the remote. Use GitHub to inspect the PR
   for the exact head repository/branch and base, including closed PRs and the previous session's
   PR link when available. If a branch name was reused, distinguish each PR by its head SHA.
3. Record the PR number/link, state, head SHA, merge timestamp and merge commit when available.
   Compare the reviewed/merged head with the commits being carried forward; a merged PR does not
   prove that commits subsequently pushed onto its branch landed.
4. Use the following decision table. A missing branch, successful push, closed PR, or green CI
   alone never proves a merge.

| Verified state | Action |
| --- | --- |
| Open PR, compatible work | Continue related work on that branch and update the existing PR. |
| Merged PR | Start a fresh branch from updated main and open a new PR. Carry over only work verified not to have landed. |
| Closed without merging | Treat its commits as unmerged. Inspect why it closed; preserve the work and do not revive rejected work without authorization. |
| No PR | Inspect the branch's commits before deciding whether to continue it or open a PR. |
| Status unavailable or ambiguous | Report it as unknown. Continue independent inspection, but do not push onto a possibly merged branch or discard/replay uncertain commits. |

Use both PR metadata and commit evidence. For a local checkout, fetch first, then use
`git merge-base --is-ancestor <commit> origin/main` for ancestry and
`git cherry origin/main <branch>` for individual patch equivalence. A multi-commit squash
may match none of its original commit patches: check the merged PR and resulting diff rather
than declaring the work absent solely from `git cherry`. Connector sessions can use GitHub's
PR, commit and compare endpoints for the same evidence.

Feature branches only; never commit directly to main. Keep compatible work on one branch and
one PR per repository, as CLAUDE.md requires. Split only for a genuine dependency, reversal,
urgency or repository boundary. Preserve local work before any branch recovery. Before a
necessary force push, inspect remote-only commits and patch equivalence; use force-with-lease,
never a blind force push. Do not relax branch protections to get work through.

**Claude's hook is not a Codex hook.** [.claude/hooks/push-gate.sh](.claude/hooks/push-gate.sh)
is configured for Claude's tool lifecycle and does not automatically intercept Codex shell
commands or connector writes. It also cannot detect every multi-commit squash merge. These
explicit checks are mandatory regardless of whether that hook ran.

After publishing work, open or update the PR using available GitHub tools. Report its actual
URL and verified state (open, merged, closed unmerged, or unknown). A compare link is a fallback
only when PR creation is unavailable, and only after the branch exists remotely. Do not merge
merely because work was pushed or checks passed. At the next session, verify the status again.

## Preserve the game's decisions

- Keep the peaceful naturalist game: no combat or experience points. The diary is progression;
  observation, understanding, relationships and settling are its core. Read recorded rulings
  before proposing systems or reviving declined ideas.
- Keep deterministic rules in world/ and content/, with no React or Phaser imports, wall-clock
  randomness or Math.random(). Preserve seeded call ordering and the world's seed contract.
- Phaser belongs in game/; React owns the surrounding DOM. Communicate through EventBus,
  not scene references or direct React state calls from a scene.
- Never hand-edit data/canon/. Edit canon in its repository and use its exporter.
  data/making/ belongs to the game. Keep the adapter boundary and cross-repository ID checks.
  When both repositories change, verify the actual exported bundle against canon; its local
  lock alone does not prove the two repositories agree.
- Preserve accepted art and its manifest. Read the art handover and relevant briefs before
  touching it; inspect source and built images visually, retain reproducible build inputs,
  and prove the game loads the intended asset rather than a fallback.
- Respect the existing dock, modal, accessibility and map-space budgets. Measure at the
  affected device sizes before changing layout thresholds. Guidance pointers must respect fog.
- Preserve save compatibility deliberately. Read the current save implementation and the
  separate ground and knowledge version rules before changing either. UI preferences belong
  in preferences.ts; do not discard progress to remember a toggle.
- Pages is deployed only by pages.yml. An itch.io release or tag is a separate, explicitly
  requested action; pushing ordinary work is not a release request.

## Verification and environment translation

Read [docs/testing.md](docs/testing.md) before changing tests. Verify real callers and the
player-visible path: a pure function passing its own tests does not prove gameplay uses it.
For visual changes, inspect actual images/screenshots as well as runtime loading and console
errors. Never claim a playthrough, screenshot or test that was not performed.

Use current package.json and CI workflows as the command authority. Typical checks are
`npm run typecheck`, `npm test`, `npm run build`, `npm run check:data` and
`npm run check:size` (after building). Run relevant browser tests for gameplay/UI wiring;
local fast subsets do not replace required CI checks. Check both push and pull-request
runs for the exact head SHA; a passing PR run can coexist with a failed push run. Documentation-only changes need link,
command and policy consistency checks rather than new gameplay tests.

Measure a failure before changing a threshold. When adding a meaningful regression guard,
verify it fails for the defect it claims to catch, then restore the implementation. For
CI-only browser failures, use the repository's CI reproduction guidance with the current
pinned browser version and runner resources; do not weaken tests based on speculation.
For deployment checks, build and preview with the same DEPLOY_BASE.

Session-craft contains lessons from a different runtime. Keep the lessons, but recheck the
environment before applying its commands:
- Discover available GitHub tools and prefer them for repository/PR operations. Do not assume
  gh is missing, GraphQL is blocked, or branch deletion/artifact downloads are forbidden here.
- Inspect installed browser versions and executables; use a compatible browser or install
  through the current environment's supported process. Do not blindly symlink a different
  build into the version Playwright expects.
- Inspect Docker availability and current runtime instructions before reproducing CI.
- Use available image-viewing and browser tools instead of assuming Claude's Read tool exists.
- Browser automation changes some game defaults. Explicitly enable the documented front-door,
  first-event and conversation options when reviewing those player experiences. A narrow
  viewport alone is not touch emulation; use touch capability when testing touch behavior.

Keep durable new owner decisions in the appropriate repository document and link them here
when needed. Avoid duplicating historical counts, machine paths, tool names or version numbers
as permanent facts.
