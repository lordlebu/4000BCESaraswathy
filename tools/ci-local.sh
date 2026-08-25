#!/usr/bin/env bash
#
# Run the browser suite the way CI runs it, on this machine.
#
# **Why this exists.** Four CI failures in a row were diagnosed by reading a log and reasoning about
# it, because the suite passed locally every time. Three commits went out against a failure nobody
# could reproduce, and one of them broke `main`. The fourth attempt tried standing in for CI with
# 4x CPU throttling and *disproved itself*: the version that had just failed CI passed under the
# throttle in 84 seconds, faster than the fix did at 99. Throttling a CPU does not emulate a
# software renderer, so the simulation was measuring the wrong thing entirely.
#
# The difference that matters is the renderer. A developer machine draws through a real GPU; the
# GitHub runner has none and falls back to SwiftShader, which draws the same frames on the CPU. The
# official Playwright image is the same Ubuntu, the same headless Chromium build and the same
# fallback, so a failure that only happens there happens here too -- which turns guessing into
# looking.
#
# Usage:
#   tools/ci-local.sh                      # the whole suite
#   tools/ci-local.sh e2e/playthrough.spec.ts
#   tools/ci-local.sh --grep "walk from"
#
# Anything passed through lands on `playwright test` unchanged.

set -euo pipefail

cd "$(dirname "$0")/.."

# The image has to match the Playwright the repo is pinned to. A mismatch means a different
# Chromium than the one CI drives, which is the whole thing this is trying to avoid, so it is read
# from the lockfile rather than written down here where it would rot.
VERSION="$(node -p "require('@playwright/test/package.json').version")"
IMAGE="mcr.microsoft.com/playwright:v${VERSION}-noble"

# Linux dependencies cannot live in the checkout, because the checkout already holds this machine's.
# `rolldown` and `esbuild` ship native binaries per platform, so a Windows or macOS `node_modules`
# mounted into Linux fails on the first import. A named volume shadows it at exactly that path:
# the container gets Linux modules, the host keeps its own, and neither can see the other.
VOLUME="sot-node-modules-${VERSION}"

# The runner's *size*, which is most of why CI fails where a laptop does not.
#
# The image alone is not enough. A first attempt at this ran the suite in the right container on a
# machine offering it sixteen cores, and everything passed comfortably -- proving only that a
# sixteen-core Linux box is not a GitHub runner.
#
# Four and 16 GB is `ubuntu-latest` for a public repository, which this one is. **Two and 7 was
# tried first and is wrong**: at two cores, three of the four tests in `hours.spec.ts` fail, and
# those tests pass on real CI every time. A reproduction that is harsher than the thing it
# reproduces invents failures nobody has, which is its own kind of useless -- the point is to see
# what CI sees, not to see something worse. Calibrated by running a spec that CI passes and
# tightening until it stops passing: four is the number where local behaviour matches observed CI
# behaviour.
#
# Override to squeeze harder, or for a private repo's smaller runner:
#   CI_CPUS=2 CI_MEMORY=7g tools/ci-local.sh
CPUS="${CI_CPUS:-4}"
MEMORY="${CI_MEMORY:-16g}"

# Docker on Windows needs a native path, and Git Bash rewrites anything that looks like one unless
# told not to. `pwd -W` gives the Windows form; MSYS_NO_PATHCONV stops the rewrite.
if command -v cygpath >/dev/null 2>&1; then
  HOST_DIR="$(pwd -W)"
  export MSYS_NO_PATHCONV=1
else
  HOST_DIR="$(pwd)"
fi

echo "  image   ${IMAGE}"
echo "  volume  ${VOLUME}"
echo "  limits  ${CPUS} cpus, ${MEMORY} memory"
echo

# `npm ci` wipes node_modules before installing, so it cannot be the thing that decides whether to
# install. A marker inside the volume survives between runs and makes the first run slow and every
# run after it immediate.
# `-t` only when there is a terminal to attach to. Without the guard this refuses to start under
# any automation, which is exactly where it is most useful.
TTY_FLAG=""
[ -t 1 ] && TTY_FLAG="-t"

docker run --rm ${TTY_FLAG} \
  --cpus="${CPUS}" \
  --memory="${MEMORY}" \
  -v "${HOST_DIR}:/w" \
  -v "${VOLUME}:/w/node_modules" \
  -w /w \
  -e CI=true \
  "${IMAGE}" \
  bash -lc '
    set -euo pipefail
    if [ ! -f node_modules/.ci-local-ready ]; then
      echo "  installing Linux dependencies into the volume (first run only)"
      npm ci --no-audit --no-fund
      touch node_modules/.ci-local-ready
    fi
    # CI=true matters: it is what makes playwright.config stop reusing a running dev server and
    # start its own, and what turns retries on -- both of which change what a failure looks like.
    npx playwright test "$@"
  ' bash "$@"
