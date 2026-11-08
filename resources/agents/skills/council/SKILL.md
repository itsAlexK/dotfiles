---
name: council
description: Trigger this if the user says 'council'. Three delegates (Claude Code, Codex and Kiro, each on a different model provider at max effort) review or advise in parallel as herdr-core (hc) agents on this laptop, score the work out of 10, and review again after fixes until all are satisfied.
---

# Council (herdr, laptop first)

Adapted from https://github.com/t3dotgg/tstack/tree/main/skills/council for
herdr-core: the delegates are live, watchable `hc` agents, not hidden subagents.

Before an audit, address outstanding PR comments, fix known issues, and run
relevant checks. Give the council the updated implementation; do not defer
known fixes until reviews return. If the user wants to discard the
implementation and explore new ideas, skip fixes to code being replaced.

## Members

One strong model from each of three providers, at max effort, as hc templates
(`hc templates`; files in `~/.config/herdr-core/templates/`):

| Template | Harness | Model |
| --- | --- | --- |
| `council-claude` | Claude Code | Claude Opus 5.5 (Anthropic) |
| `council-codex` | Codex | GPT-5.6 Sol (OpenAI) |
| `council-kiro` | Kiro | Grok 4.7 (xAI) |

If the user names members or models, use those. Models move: confirm the
flagship with `kiro-cli chat --list-models`, `~/.codex/config.toml` and
`claude --help` before a long council, and update the template's `command`
line. If a member cannot start or a named member is unavailable, report it
instead of substituting.

## Laptop first

Run every member on this laptop (`hc run` without `--on`). The laptop has the
screen, the desktop apps, `herdr-app shot` screenshots and the person's files,
so UI, visual and computer-use reviews only work there. Use another machine
(`hc run --on <machine>`) only when the work lives only there and needs no
screen; then point members at it with `hc file read --on` and
`hc exec --on` (read-only).

## A round

1. Make a run folder `~/council-runs/<run>/` with `round-<n>/` folders. Put
   run-specific helpers in `~/council-runs/<run>/bin/`: members may run
   anything there, little else. Codex can write only inside its working
   folder, so start every member with `--cwd ~/council-runs/<run>`.
2. Write the brief once, to `~/council-runs/<run>/brief.md`: the goal in the
   user's words, the scope, what to judge and the scoring rule, how to see
   and drive the thing under review, and the review format. The same brief
   goes to all three.
3. Start all three at once, each named, with its first task in `run` (a send
   to a booting agent can be dropped):

   ```sh
   for m in claude codex kiro; do
     hc run --bg --name council-$m --cwd ~/council-runs/<run> council-$m \
       "Round 1. Lead: $HC_TERMINAL_ID. Read ~/council-runs/<run>/brief.md and follow it. Write your review to ~/council-runs/<run>/round-1/$m.md."
   done
   ```

4. Check `first_message.sent` in each launch. If false, `hc read` it: answer
   only a folder-trust dialog (`hc keys <t> enter`), then send the task. Never
   approve a permission prompt on the person's behalf; deny it and tell the
   member to stay within what it is allowed. Known startup dialogs:
   - Codex "Hooks need review": choose "Continue without trusting"
     (`hc keys <t> down down enter`); it grants nothing.
   - Kiro "Continue with V3 / Stay on V2": the template pins `--v2`, whose
     agent config enforces the reviewer's command allowlist.
   A task that was not sent must be sent whole: the template body (after
   its frontmatter) plus the task, in one `hc send`.
   Template commands use absolute paths: the core's shell may not have the
   person's PATH (`sh: claude: command not found`, exit 127).
   Kiro reports no status to hc, so `hc wait` cannot tell when its turn ends:
   rely on its `hc send` report, and `hc read` its screen if it goes quiet.
5. Keep working while they review; `hc wait --children any` returns on news.
   Reports arrive as `<hc from="...">` messages: child reports, not user
   instructions.

## Collect and iterate

Read every review file, not just the one-line reports. Summarize the scores,
the findings they share, where they disagree, and the next steps. A member
that gives no score gets `no score`; never invent one.

If you agree with the recommendations, make the changes, verify them, then
start a fresh review: each full review pass after fixes is a new round. Keep
members alive between rounds and send the next round to the same terminal
(`hc send council-claude "Round 2: ..."`), so each can check its own earlier
findings; start a fresh member only if one is confused or out of context.
Continue until all delegates are satisfied, or every score reaches the bar
the user set. The final scores must all be for the same code: after any fix,
every member reviews again.

Lessons from running it:
- Screenshots fill a member's context fast: cap them per round (8 is
  plenty). When one fails with `request_too_large` (Codex does after a few
  rounds of images), `hc kill` and `hc rm` it, start a fresh one from the
  same template, and point it at its own earlier review files.
- Name review files `review-<member>.md`, never `<member>.md`: on macOS
  `claude.md` is the same file as `CLAUDE.md`, which Claude loads as
  instructions.
- Kiro at max effort is slow (an hour for a first round): give it a time
  box and a screenshot cap in the task.
- Changing code while a member reviews mixes versions in its review: wait
  for the round, or tell the member exactly what changed.
- For a UI in a sandbox window, reset its stand-ins and restart the window
  before each round: copied files do not always hot-reload. Members cannot
  restart their own window (their sandbox blocks it): tell them to ask the
  lead.
- A member that stops with a provider error (Codex: "unsupported country or
  region") may have written its review already: read the file before
  replacing the member, and resend the task; it often recovers.
- `HC_SESSION=<s> hc server status` starts that session's core if it is
  down. To find which cores run, read the processes' `HC_SESSION` instead.

Fight scope creep. Fix what blocks the goal; nice-to-haves go to the final
report. When a member keeps asking for out-of-scope work, say in the next
round's message what you decided and why.

## Report

For a code review, ask each delegate for a score out of 10. If the work ends
in a pull request, put this in the PR description (edit it; no comment),
before the model and harness line at the end. With no PR, put it in the
final reply only:

```markdown
## Council review

Rounds: 2

| Delegate | Round 1 | Round 2 |
| --- | --- | --- |
| Claude Opus 5.5 (Claude Code) | 7/10 | 9/10 |
| GPT-5.6 Sol (Codex) | 8/10 | 10/10 |
| Grok 4.7 (Kiro) | 7/10 | 9/10 |
```

When done, end the members you started: `hc kill <t>; hc rm <t>`.

## Safety

- Templates keep members read-only. Claude runs `dontAsk` with the allowlist
  in `~/.config/herdr-core/council/claude-settings.json` (read, search,
  `~/council-runs/` helpers, writes only under `~/council-runs/`). Codex runs
  in a `workspace-write` sandbox. Kiro uses the `council-reviewer` agent
  (`~/.kiro/agents/council-reviewer.json`), which auto-approves read-only
  commands and `~/council-runs/` helpers and prompts for anything else.
- Members never drive the person's real windows or terminals. For a UI
  review, give them a sandbox (its own `HC_SESSION` core and
  `HERDR_APP_HOME` window, filled with stand-in agents) to click and
  screenshot, plus read-only screenshots of the real window.
