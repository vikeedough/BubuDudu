#!/bin/bash

set -euo pipefail

# Keep Finder-launched Terminal windows open on both success and failure.
on_exit() {
  local exit_status=$?
  trap - EXIT
  if [ "$exit_status" -ne 0 ]; then
    echo "❌ Installation stopped because a command or validation failed." >&2
  fi
  echo ""
  if [ -t 0 ]; then
    read -r -p "Press Enter to close this window..." || true
  fi
  exit "$exit_status"
}
trap on_exit EXIT

# === CONFIG ===
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# === SCRIPT ===
echo "🚀 Reinstalling your iOS app with Expo..."
cd "$PROJECT_DIR" || {
  echo "❌ Project directory not found: $PROJECT_DIR"
  exit 1
}

printf 'Project directory: %s\n' "$PROJECT_DIR"
if [ "$(git rev-parse --is-inside-work-tree 2>/dev/null)" != "true" ]; then
  echo "❌ Project directory is not a Git working tree." >&2
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"
CURRENT_COMMIT="$(git rev-parse HEAD)"
printf 'Current branch: %s\nCurrent commit: %s\n' \
  "${CURRENT_BRANCH:-DETACHED HEAD}" "$CURRENT_COMMIT"

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "❌ The origin remote is missing." >&2
  exit 1
fi

# Fetch explicitly into origin/main, independent of configured fetch mappings.
git fetch origin refs/heads/main:refs/remotes/origin/main

WORKTREE_STATUS="$(git status --porcelain --untracked-files=all)"
if [ -n "$WORKTREE_STATUS" ]; then
  echo "❌ Local tracked or untracked changes exist. Resolve them before retrying; nothing will be stashed or discarded." >&2
  exit 1
fi

if ! git show-ref --verify --quiet refs/heads/main; then
  echo "❌ Local main branch does not exist. Installation stopped." >&2
  exit 1
fi

git switch main
git merge --ff-only origin/main

BUILD_COMMIT="$(git rev-parse HEAD)"
REMOTE_COMMIT="$(git rev-parse refs/remotes/origin/main)"
if [ "$BUILD_COMMIT" != "$REMOTE_COMMIT" ]; then
  echo "❌ Local main does not match fetched origin/main. Installation stopped; local commits will not be discarded." >&2
  exit 1
fi

BUILD_MESSAGE="$(git log -1 --format=%s)"
printf 'Building BubuDudu from:\n  branch: main\n  commit: %s\n  message: %s\n' \
  "$BUILD_COMMIT" "$BUILD_MESSAGE"

npm install

npx expo prebuild --clean

npx expo run:ios --device --configuration Release

echo "✅ App successfully reinstalled!"
