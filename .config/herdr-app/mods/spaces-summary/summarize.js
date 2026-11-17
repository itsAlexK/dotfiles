// The goal each space's and tab's agents are working toward: once for every tab
// at start, then whenever an agent ends a turn, its space's requests, recaps and
// screens go to a small Claude model, which answers with a one-line goal and a
// short name for the space and each tab, and for each tab what its last turn
// leaves for the person (attention.js). Spaces and tabs
// nobody named take those names; a name the person gave is never touched.
// Kept in shared("summaries") = { spaces: {id: {name, summary}}, tabs: {id: {name,
// summary, state, note, at: when its screen was read, turn: its agent's turn then}},
// auto: {id: the name this gave it} }.

import { exec, hc, spaces, panes, terminals, machines, run, shared, setShared, home } from "herdr";

// Which LLM answers the summary. Bedrock is the default; a machine sets
// HERDR_SUMMARY_PROVIDER=deepseek in its shell config (this laptop, ~/.zsh/work)
// to use DeepSeek's Anthropic-compatible API instead. exec() runs `claude` with
// the app's own environment, not the interactive shell's, so each provider lists
// the variables its subprocess needs, and `model` is what --model sends.
const PROVIDERS = {
  bedrock: {
    model: "haiku", // the alias: a pinned id breaks when Bedrock retires it
    env: { CLAUDE_CODE_USE_BEDROCK: "1" },
  },
  deepseek: {
    model: "deepseek-flash", // fallback; the shell's own Haiku model is used below
    // Endpoint, token and Haiku model are the shell's own (ANTHROPIC_BASE_URL,
    // ANTHROPIC_AUTH_TOKEN, ANTHROPIC_DEFAULT_HAIKU_MODEL in ~/.zsh/work), read
    // back below, never written here.
    env: {},
  },
};
const DEFAULT_PROVIDER = "bedrock";
const VERSION = 6; // summaries made by an older prompt are made again
const LINES = 1500; // screen and history lines read from each agent
const ASKS = 2500; // chars of each tab's requests and recaps sent
const TAIL = 2500; // chars of the end of each tab's terminal sent
const TOTAL = 30000; // chars sent per space
const SETTLE = 3000; // ms after a turn ends, so its last output is on screen
const GAP = 30000; // ms between two summaries of one space
const RETRY = 300000; // ms before a space that failed is tried again
const KEY = "summaries";

const SYSTEM = `You label a sidebar for a person running many coding agents at once, so they see at a glance what each is working on. You get one space (a project) and, for each of its tabs, the person's requests and the agent's recaps (oldest first), then the end of its terminal.

Reply with JSON only, no prose, no code fence:
{"space":{"name":"...","summary":"..."},"tabs":[{"tab":1,"name":"...","summary":"...","state":"...","note":"..."}]}

- summary: the goal, at most 45 characters (two short lines in the sidebar): what the person wants this work to achieve, like "Port ontology loader to Rust for offline use". Not the latest step, command or file: the reason behind them. The requests say it best; if the goal moved on, say the current one.
- state: what the agent's last message leaves for the person, one of:
  "ask": it needs the person now: a question, a choice, an approval, a login, something only they can do, or an error it can't get past.
  "waiting": it waits on something it watches by itself (a build, deploy, CI, merge, a monitor or background job, a scheduled check) and will carry on without the person. Only when it asks nothing of them now.
  "done": it finished what was asked; there is a result to read and nothing is asked.
  A running dev server or watcher it only started is "done", not "waiting".
- note: at most 24 characters, so it fits on one sidebar line and the person remembers without opening the tab. For "ask", what it wants from them ("Approve the MPA review"); for "waiting", what it waits on ("VS merge build"); for "done", the result ("Status update ready to paste").
- name: that goal in 1-4 words, lowercase-kebab-case, like "ontology-rust-port". Each tab's current name is given: if it still fits the goal, return it unchanged.
- The space's name and summary give the aim shared by all of its tabs.
- Use only what the text shows. Never include secrets, tokens or personal data.`;

const EMPTY = { spaces: {}, tabs: {}, auto: {} };
export const summaries = () => shared(KEY) ?? EMPTY;

// A tab's agent: the first pane reporting a status, else running a known agent.
export function leadAgent(tab, ps) {
  const mine = ps.filter((p) => p.tab === tab.id && p.terminal);
  return mine.find((p) => p.status) ?? mine.find((p) => p.program?.agent) ?? null;
}

// Work Claude Code shows still running after a turn: "· 1 monitor still running" on
// its last turn line, "· 2 shells" in its footer. Often the agent waits on it
// (a monitor, a poll), but not always (a dev server it started): a hint, not proof.
export function background(text) {
  const lines = text.split("\n").map((l) => l.trim());
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!/·\s*done\b/.test(lines[i])) continue;
    const m = lines[i].match(/·\s*([^·]*still running)\s*$/);
    if (m) return m[1].trim();
    break;
  }
  const m = lines.slice(-6).join(" ").match(/·\s*(\d+\s+(?:monitors?|shells?|tasks?))(?=\s*(?:·|$))/);
  return m ? m[1] : "";
}

// Only lines with words in them: no rules, boxes, blank lines or hc's notes.
const ASK = /^(❯|>)\s+\S|^※ recap:/;
const tidy = (text) => text.split("\n").filter((l) => !l.startsWith("[hc]") && /[\p{L}\p{N}]/u.test(l)).map((l) => l.trimEnd()).join("\n");
const clip = (v, n) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");
const machineOf = (id) => (id.includes("/") ? id.split("/")[0] : null);

// Where `claude` is: the app's PATH lacks what the person's interactive shell adds.
let found = null;
async function claude() {
  if (!found) {
    const r = await exec("/bin/sh", ["-c", '"${SHELL:-sh}" -ic "command -v claude"']);
    found = r.stdout.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("/")).pop() ?? "claude";
  }
  return found;
}

// Which provider this machine wants (HERDR_SUMMARY_PROVIDER) and the shell
// variables the deepseek provider needs. Asked through the interactive shell for
// the same reason as `claude()` above.
let chosen = null;
async function provider() {
  if (!chosen) {
    const ask = '"${SHELL:-sh}" -ic \'printf "%s\\n%s\\n%s\\n%s" "${HERDR_SUMMARY_PROVIDER:-}" "${ANTHROPIC_BASE_URL:-}" "${ANTHROPIC_AUTH_TOKEN:-}" "${ANTHROPIC_DEFAULT_HAIKU_MODEL:-}"\'';
    const r = await exec("/bin/sh", ["-c", ask]);
    const [name, base, token, haiku] = r.stdout.split("\n").map((l) => l.trim());
    const p = PROVIDERS[name] ? name : DEFAULT_PROVIDER;
    const env = { ...PROVIDERS[p].env };
    let model = PROVIDERS[p].model;
    if (p === "deepseek") {
      if (base) env.ANTHROPIC_BASE_URL = base;
      if (token) env.ANTHROPIC_AUTH_TOKEN = token;
      if (haiku) model = haiku;
    }
    chosen = { model, env };
  }
  return chosen;
}

export class Summarizer {
  constructor() {
    this.last = {}; // tab -> its status at the last tick
    this.dirty = {}; // space -> when it was asked for
    this.next = {}; // space -> not before then
    this.tried = new Set(); // tabs without a summary already asked for once
    this.ended = new Set(); // spaces where a turn ended: they go before the rest
    this.turned = {}; // tab -> the turn already asked for after one ended unseen
    this.busy = false;
  }

  // Which spaces need a summary: an agent there just ended a turn, or a tab with
  // an agent has none yet. One space at a time.
  tick(cx) {
    const now = Date.now();
    const d = summaries();
    const ps = panes();
    const turns = new Map(terminals().map((k) => [k.address, k.turn ?? 0]));
    for (const s of spaces()) {
      for (const t of s.tabs) {
        const was = this.last[t.id];
        this.last[t.id] = t.status;
        const lead = leadAgent(t, ps);
        if (!lead) continue;
        // A turn ended, or it stopped to ask (blocked, maybe straight from idle): read why.
        const ended = (was === "working" && t.status !== "working") || (was !== undefined && was !== "blocked" && t.status === "blocked");
        const missing = d.tabs[t.id]?.v !== VERSION && !this.tried.has(t.id);
        if (missing) this.tried.add(t.id);
        // A turn ended while this window wasn't watching (closed, or just started): read it once.
        const turn = turns.get(lead.terminal) ?? 0;
        const behind = t.status !== "working" && d.tabs[t.id]?.turn != null && d.tabs[t.id].turn !== turn && this.turned[t.id] !== turn;
        if (behind) this.turned[t.id] = turn;
        if (ended || missing || behind) this.dirty[s.id] ??= now;
        if (ended || behind) this.ended.add(s.id);
      }
    }
    if (this.busy) return;
    const due = Object.keys(this.dirty).filter((k) => now - this.dirty[k] >= SETTLE && now >= (this.next[k] ?? 0));
    const id = due.find((k) => this.ended.has(k)) ?? due[0];
    if (!id) return;
    delete this.dirty[id];
    this.ended.delete(id);
    this.next[id] = now + GAP;
    this.busy = true;
    cx.spawn(async () => {
      try {
        await this.summarize(id);
      } catch (e) {
        this.dirty[id] = Date.now();
        this.next[id] = Date.now() + RETRY;
        console.log(`spaces-summary: ${id}: ${e}`);
      }
      this.busy = false;
    });
  }

  async summarize(id) {
    const s = spaces().find((x) => x.id === id);
    if (!s) return;
    const ps = panes();
    const items = [];
    let room = TOTAL;
    for (const t of s.tabs) {
      const lead = leadAgent(t, ps);
      if (!lead || room <= 0) continue;
      const at = Date.now();
      const turn = terminals().find((k) => k.address === lead.terminal)?.turn ?? 0;
      // A terminal that doesn't answer (its machine is busy) only leaves itself out.
      const r = await hc(["read", lead.terminal, "--lines", String(LINES)]).catch(() => null);
      if (r?.code !== 0) continue;
      const lines = tidy(r.stdout).split("\n");
      // The first requests set the goal, the last ones where it went.
      const asks = lines.map((l) => l.trim()).filter((l) => ASK.test(l)).map((l) => clip(l, 300));
      const kept = asks.length > 10 ? [...asks.slice(0, 2), "...", ...asks.slice(-8)] : asks;
      const text = `Requests and recaps:\n${kept.join("\n").slice(-ASKS) || "(none)"}\n\nEnd of the terminal:\n${lines.join("\n").slice(-TAIL)}`.slice(-room);
      room -= text.length;
      items.push({ t, lead, text, at, turn, bg: background(r.stdout) });
    }
    if (!items.length) return;

    const prompt = [`Space now called "${s.name}", folder ${s.folder || "~"}${s.machine ? ` on ${s.machine}` : ""}.`];
    items.forEach(({ t, lead, text, bg }, n) => {
      prompt.push("", `=== Tab ${n + 1}, now called "${t.name}", ${lead.program?.name ?? "agent"}, ${t.status ?? "unknown"}${bg ? `, still running: ${bg}` : ""} ===`, text);
    });
    const { model, env } = await provider();
    const argv = [...Object.entries(env).map(([k, v]) => `${k}=${v}`), await claude(), "-p", "--bare", "--model", model, "--tools", "", "--strict-mcp-config", "--no-session-persistence", "--system-prompt", SYSTEM, prompt.join("\n")];
    const r = await exec("/usr/bin/env", argv, { cwd: home() });
    if (r.code !== 0) throw new Error(clip(r.stderr || r.stdout, 300) || `exit ${r.code}`);
    const out = JSON.parse(r.stdout.slice(r.stdout.indexOf("{"), r.stdout.lastIndexOf("}") + 1));

    // A fresh copy: the person or another space's summary may have changed it meanwhile.
    const d = JSON.parse(JSON.stringify(summaries()));
    for (const o of Array.isArray(out.tabs) ? out.tabs : []) {
      const it = items[o.tab - 1];
      if (!it) continue;
      const state = ["ask", "waiting", "done"].includes(o.state) ? o.state : null;
      d.tabs[it.t.id] = { name: clip(o.name, 40), summary: clip(o.summary, 120), state, note: clip(o.note, 60), at: it.at, turn: it.turn, v: VERSION };
      this.rename("tab", it.t.id, d.tabs[it.t.id].name, d);
    }
    if (out.space) {
      d.spaces[s.id] = { name: clip(out.space.name, 40), summary: clip(out.space.summary, 120) };
      this.rename("space", s.id, d.spaces[s.id].name, d);
    }
    this.prune(d);
    setShared(KEY, d);
  }

  // Names it only while nobody else has: unnamed, or still the name this gave it.
  rename(kind, id, name, d) {
    const live = kind === "space" ? spaces().find((x) => x.id === id) : spaces().flatMap((x) => x.tabs).find((x) => x.id === id);
    if (!live || !name || /^\d+$/.test(name)) return;
    // Never a name another space on its machine already has: two would look the same.
    if (kind === "space" && spaces().some((x) => x.id !== id && (x.machine ?? null) === (live.machine ?? null) && x.name.toLowerCase() === name.toLowerCase())) return;
    if (live.named && d.auto[id] !== live.name) {
      delete d.auto[id];
      return;
    }
    if (live.name !== name) run(`${kind}.rename`, { id, name });
    d.auto[id] = name;
  }

  // Forgets spaces and tabs that are gone, on machines whose layout it can see.
  prune(d) {
    const ready = new Set(machines().filter((m) => m.layout === "ready").map((m) => m.name));
    const known = new Set(spaces().flatMap((s) => [s.id, ...s.tabs.map((t) => t.id)]));
    for (const m of [d.spaces, d.tabs, d.auto]) {
      for (const id of Object.keys(m)) if (!known.has(id) && ready.has(machineOf(id))) delete m[id];
    }
  }
}
