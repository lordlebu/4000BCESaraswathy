#!/usr/bin/env bash
#
# Refuse a `git push` onto a branch whose pull request has already merged.
#
# **Why this exists.** PR #183 merged at 6fdb5ff; a commit was then pushed onto the same branch,
# where nothing tracked it -- the PR was closed, so the commit sat on the remote branch belonging
# to no review and reaching no `main`. It was found by hand, and it was not the first time. The
# habit "check whether the last branch merged before committing onto it" is written in both
# CLAUDE.md files and was still forgotten, which is the definition of a rule that wants enforcing
# rather than remembering.
#
# **It asks git, not GitHub.** `gh` is not installed and a hook cannot call the MCP tools, so the
# question "has this PR merged?" is answered locally: a branch whose tip is contained in the
# default branch has landed. That is exactly true for a merge-commit workflow, which is what both
# repositories use.
#
#   A  origin/<branch> exists                      -- an unpushed branch has no PR to have merged
#   B  origin/<branch> has landed in origin/<base> -- contained in it, or every commit has an
#                                                     equivalent patch there (a rebase merge, or
#                                                     a squash of a single commit)
#   D  HEAD carries commits origin/<branch> lacks  -- there is actually something new to push
#   C  origin/<base> is an ancestor of HEAD        -- the new work is rebuilt on the merged base
#
# **C decides which of two things this is, and it is why the gate is usable.** A merged branch
# with new commits is one of two situations, and only one of them is the bug:
#
#   * C false -- the commits sit on the *pre-merge* tip. This is the incident: they reach no
#     pull request and no base branch, and they are invisible until somebody looks. Refused.
#   * C true  -- the branch was restarted from the merged base and carries the new work on top.
#     This is the recovery, and blocking it would block the fix the refusal above asks for. It
#     is allowed -- with one reminder, because the merged pull request cannot be reused and a
#     new one has to be opened. The reminder fires exactly once: the push itself moves the
#     remote branch past the base, so B is false from then on and the gate goes quiet.
#
# **What it does not catch**, said plainly rather than hoped away: a squash merge of a branch
# carrying more than one commit. Squashing N commits into one produces a patch matching none of
# them, so `git cherry` still reports them as absent and the gate stays quiet. Both repositories
# merge with merge commits, where the containment test is exact, so this is a gap in a workflow
# neither uses -- but it is a gap, and a gate believed to be total is worse than one whose edge
# is known.
#
# Escape hatch: put ALLOW_MERGED_PUSH=1 anywhere in the command to push anyway.

set -uo pipefail

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0

# Silence is consent: a PreToolUse hook that exits 0 saying nothing leaves the normal flow alone.
case "$cmd" in *"git push"*) ;; *) exit 0 ;; esac
case "$cmd" in *--dry-run*|*ALLOW_MERGED_PUSH=1*) exit 0 ;; esac

git rev-parse --git-dir >/dev/null 2>&1 || exit 0
branch=$(git branch --show-current 2>/dev/null) || exit 0
[[ -n "$branch" ]] || exit 0

base=$(git symbolic-ref -q --short refs/remotes/origin/HEAD 2>/dev/null)
base=${base#origin/}
base=${base:-main}

# Best effort, and bounded: a gate that hangs on a slow fetch is worse than one reading a
# slightly stale ref, and every condition below still means something against the last fetch.
timeout 20 git fetch --quiet origin "$base" "$branch" >/dev/null 2>&1 || true

git rev-parse --verify -q "origin/$branch" >/dev/null || exit 0   # A
git rev-parse --verify -q "origin/$base"   >/dev/null || exit 0

landed=""                                                          # B
if git merge-base --is-ancestor "origin/$branch" "origin/$base" 2>/dev/null; then
  landed="is contained in origin/$base, so its pull request merged"
else
  cherry=$(git cherry "origin/$base" "origin/$branch" 2>/dev/null || true)
  if [[ -n "$cherry" ]] && ! printf '%s\n' "$cherry" | grep -q '^+'; then
    landed="has every commit already in origin/$base as an equivalent patch, so it was squashed or rebased in"
  fi
fi
[[ -n "$landed" ]] || exit 0

ahead=$(git rev-list --count "origin/$branch..HEAD" 2>/dev/null || echo 0)
[[ "$ahead" -gt 0 ]] || exit 0                                     # D

if git merge-base --is-ancestor "origin/$base" HEAD 2>/dev/null; then                 # C true
  jq -cn --arg m "The pull request for $branch has already merged, and this push restarts the branch from origin/$base with $ahead new commit(s) on top -- which is the right shape. Remember the merged pull request cannot be reused: open a NEW one for this work." \
    '{systemMessage:$m}'
  exit 0
fi

jq -cn --arg r "Push refused: origin/$branch $landed. Its pull request is closed, so the $ahead commit(s) on HEAD that origin/$base does not have are built on the pre-merge tip -- they would land on a branch nothing tracks, reaching no review and no $base.

Restart the branch from the merged base, keeping the new work:

  git fetch origin $base
  git rebase --onto origin/$base origin/$branch $branch
  git push --force-with-lease -u origin $branch

Then open a NEW pull request -- the merged one cannot be reused. To push anyway, put ALLOW_MERGED_PUSH=1 in front of the command." \
  '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
