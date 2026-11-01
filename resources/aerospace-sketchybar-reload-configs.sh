#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title aerospace sketchybar reload configs
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 🤖

osascript -e 'quit app "AeroSpace"'

# osascript returns as soon as the quit event is delivered — AeroSpace may
# still be shutting down. If we reopen it too early, `open` just activates
# the still-running instance and after-startup-command never reruns.
for _ in {1..50}; do
  pgrep -x AeroSpace >/dev/null || break
  sleep 0.2
done

# Kill sketchybar only after AeroSpace is fully gone: in-flight aerospace
# queries from sketchybar hang forever if the server dies under them.
pkill sketchybar
pkill borders

open /Applications/AeroSpace.app

# AeroSpace 0.20.3-Beta does not run after-startup-command, so start the bar
# and borders here — but only once the server is actually responding, since
# aerospace CLI queries hang forever if they hit it mid-initialization.
for _ in {1..100}; do
  if aerospace list-workspaces --focused >/dev/null 2>&1; then break; fi
  sleep 0.2
done

if ! pgrep -x sketchybar >/dev/null; then
  sketchybar >/dev/null 2>&1 &
fi

if ! pgrep -x borders >/dev/null; then
  borders active_color=0xff188bc2 inactive_color=0xff494d64 width=10.0 >/dev/null 2>&1 &
fi
