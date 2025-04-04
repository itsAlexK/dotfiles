#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title aerospace sketchybar reload configs
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 🤖

osascript -e 'quit app "AeroSpace"'
pkill sketchybar

open /Applications/AeroSpace.app
