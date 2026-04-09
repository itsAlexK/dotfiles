#!/bin/bash

set -euo pipefail

DOTFILES="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_SRC="$DOTFILES/resources/agents/skills"

link_skills() {
  local target="$1"
  local parent
  parent="$(dirname "$target")"

  if [ -L "$target" ]; then
    local current
    current="$(readlink "$target")"
    if [ "$current" = "$SKILLS_SRC" ]; then
      echo "  [skip] $target already points to canonical location"
    else
      echo "  [warn] $target is a symlink to '$current' — skipping"
    fi
    return
  fi

  if [ -d "$target" ]; then
    if [ -z "$(ls -A "$target")" ]; then
      echo "  [replace] removing empty directory $target"
      rmdir "$target"
    else
      echo "  [warn] $target is a non-empty directory — skipping"
      return
    fi
  fi

  mkdir -p "$parent"
  ln -s "$SKILLS_SRC" "$target"
  echo "  [ok] $target -> $SKILLS_SRC"
}

echo "Setting up agent skills symlinks..."
echo "  source: $SKILLS_SRC"
echo ""

link_skills "$HOME/.claude/skills"
link_skills "$HOME/.agents/skills"

echo ""
echo "Done."
