#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title autopep8 python clipboard
# @raycast.mode silent

pbpaste >/tmp/aerospace-python-autopep8-contents && autopep8 /tmp/aerospace-python-autopep8-contents | pbcopy
