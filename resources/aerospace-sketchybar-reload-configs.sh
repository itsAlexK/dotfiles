#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title aerospace sketchybar reload configs
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 🤖

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AEROSPACE=/opt/homebrew/bin/aerospace
SKETCHYBAR=/opt/homebrew/bin/sketchybar
BORDERS=/opt/homebrew/bin/borders

# Kill sketchybar and borders FIRST, while the AeroSpace server is still up:
# in-flight aerospace queries from sketchybar hang forever if the server
# dies under them (the CLI has no timeout), leaving orphaned processes.
pkill sketchybar
pkill borders

osascript -e 'quit app "AeroSpace"'

# osascript returns as soon as the quit event is delivered — AeroSpace may
# still be shutting down. If we reopen it too early, `open` just activates
# the still-running instance and the startup callbacks never rerun.
for _ in {1..50}; do
  pgrep -x AeroSpace >/dev/null || break
  sleep 0.2
done

open /Applications/AeroSpace.app

# Wait until the server is actually responding before starting the bar. Each
# poll attempt is bounded by a 3s alarm because a query that hits the server
# mid-initialization can block forever.
for _ in {1..100}; do
  if perl -e 'alarm 3; exec @ARGV' "$AEROSPACE" list-workspaces --focused >/dev/null 2>&1; then break; fi
  sleep 0.2
done

# Wait for the startup session to settle: AeroSpace's server answers queries
# before its startup session finishes dumping and re-detecting windows, so
# wait until two window snapshots taken 1s apart are identical.
prev=""
for _ in {1..20}; do
  cur=$("$AEROSPACE" list-windows --monitor all --format '%{window-id} %{workspace}' 2>/dev/null | sort)
  if [ -n "$cur" ] && [ "$cur" = "$prev" ]; then break; fi
  prev="$cur"
  sleep 1
done

# Deterministically re-apply the on-window-detected placement rules: windows
# detected outside the startup session silently skip their
# during-aerospace-startup rules.
if [ -x /opt/homebrew/bin/python3 ]; then
  AEROSPACE="$AEROSPACE" /opt/homebrew/bin/python3 "$SCRIPT_DIR/aerospace-apply-placement.py"
elif command -v python3 >/dev/null 2>&1; then
  AEROSPACE="$AEROSPACE" python3 "$SCRIPT_DIR/aerospace-apply-placement.py"
fi

if ! pgrep -x sketchybar >/dev/null; then
  "$SKETCHYBAR" >/dev/null 2>&1 &
fi

if ! pgrep -x borders >/dev/null; then
  "$BORDERS" active_color=0xff188bc2 inactive_color=0xff494d64 width=10.0 >/dev/null 2>&1 &
fi
