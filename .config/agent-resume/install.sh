#!/usr/bin/env bash
# Sets up agent-resume on this machine, or on another herdr-core machine:
#
#   ~/.config/agent-resume/install.sh               here
#   ~/.config/agent-resume/install.sh --on <machine> there (see `hc machine ls`)
#
# Adds the hooks to ~/.claude/settings.json and ~/.codex/hooks.json,
# sources agent-resume.zsh from ~/.zshrc, then labels the Claude sessions that
# are already running. Running it again changes nothing.
set -euo pipefail
PATH="$HOME/.local/bin:$PATH"
here=$(cd "$(dirname "$0")" && pwd)

if [[ ${1-} == --on ]]; then
  m=${2:?machine}
  for f in agent-session agent-resume.zsh install.sh; do
    hc file write --on "$m" .config/agent-resume/$f <"$here/$f" >/dev/null
  done
  hc exec --on "$m" chmod +x .config/agent-resume/agent-session .config/agent-resume/install.sh
  exec hc exec --on "$m" --timeout 120 bash .config/agent-resume/install.sh
fi

dir="$HOME/.config/agent-resume"
[[ $here -ef $dir ]] || { echo "install.sh must run from $dir" >&2; exit 1; }

# Adds `agent-session <args>` as an <event> hook to a hooks file (Claude's
# settings.json and Codex's hooks.json share the format).
add_hook() { # <file> <event> <args>
  local file=$1 event=$2 cmd="\"\$HOME/.config/agent-resume/agent-session\" $3" tmp
  [[ -d $(dirname "$file") ]] || return 0 # agent not installed here
  [[ -f $file ]] || echo '{}' >"$file"
  if jq -e --arg e "$event" --arg c "$cmd" '[.hooks[$e][]?.hooks[]?.command] | index($c)' "$file" >/dev/null; then
    echo "$file: $event hook already there"
    return 0
  fi
  [[ -f $file.agent-resume-backup ]] || cp -p "$file" "$file.agent-resume-backup"
  tmp=$(mktemp "$file.XXXXXX")
  jq --arg e "$event" --arg c "$cmd" '.hooks[$e] += [{hooks: [{type: "command", command: $c, timeout: 15}]}]' \
    "$file" >"$tmp"
  cat "$tmp" >"$file" # keeps the file's mode and any symlink
  rm -f "$tmp"
  echo "$file: added $event hook"
}
add_hook "$HOME/.claude/settings.json" SessionStart "record claude"
add_hook "$HOME/.claude/settings.json" SessionEnd forget
add_hook "$HOME/.codex/hooks.json" SessionStart "record codex"

line='[[ -r ~/.config/agent-resume/agent-resume.zsh ]] && source ~/.config/agent-resume/agent-resume.zsh'
if grep -qF "$line" "$HOME/.zshrc"; then
  echo "~/.zshrc: already sources agent-resume.zsh"
else
  printf '\n# Resume Claude Code / Codex sessions in recovered herdr-core terminals\n%s\n' "$line" >>"$HOME/.zshrc"
  echo "~/.zshrc: sources agent-resume.zsh"
fi

"$dir/agent-session" adopt
