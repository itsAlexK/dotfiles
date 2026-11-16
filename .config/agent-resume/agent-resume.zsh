# agent-resume.zsh: source at the end of ~/.zshrc.
#
# When herdr-core recovers a kept terminal (core restart, crash, reboot), it
# starts a lone shell with the terminal's labels. At that shell's first prompt
# this resumes the Claude Code or Codex session the labels name (see
# agent-session). At every later prompt it clears the labels: an agent that
# hands the prompt back has ended, so nothing should resume it. A reboot never
# shows a prompt before the machine goes down, so the labels survive it.
[[ -o interactive && -n ${HC_TERMINAL_ID-} ]] || return 0
(( $+commands[hc] && $+commands[jq] )) || return 0
typeset -g _agent_session=${${(%):-%x}:A:h}/agent-session
[[ -x $_agent_session ]] || return 0

# First prompt only.
_agent_resume() {
  add-zsh-hook -d precmd _agent_resume
  add-zsh-hook precmd _agent_after_command
  local -a plan=("${(@0)$("$_agent_session" plan $$)}")
  (( ${#plan} >= 3 )) || return 0
  cd -- "${plan[1]}" || return 0
  print -P "%F{8}↻ resuming ${plan[2]} session ${plan[-1][1,8]} in %~%f"
  "$_agent_session" log "resume ${plan[2,-1]}"
  # Give the agent the terminal itself, past any prompt theme holding output.
  "${(@)plan[2,-1]}" <$TTY >$TTY 2>&1
  # The agent ran inside this hook, so no later prompt sees it end.
  _agent_ended $?
}

# An agent handed the prompt back. One a signal ended (a core stop hangs up
# the agent before its shell) is kept for the next recovery.
_agent_ended() { # <exit status>
  if (( $1 > 128 )); then
    "$_agent_session" log "kept: agent ended by signal $(( $1 - 128 ))"
  else
    "$_agent_session" clear "agent exited ($1)"
  fi
}

# Every later prompt: an agent started from this prompt has ended. Only the
# terminal's root shell acts; a nested shell has another pid.
_agent_after_command() {
  local rc=$?
  local -a f=("${(@f)$(hc get --json "$HC_TERMINAL_ID" 2>/dev/null |
    jq -r '.pid, .labels["agent.session"] // ""')}")
  [[ ${f[1]-} == $$ && -n ${f[2]-} ]] && _agent_ended $rc
}

autoload -Uz add-zsh-hook
add-zsh-hook precmd _agent_resume
