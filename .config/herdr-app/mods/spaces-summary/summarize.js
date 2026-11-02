// The goal each space's and tab's agents are working toward: once for every tab
// at start, then whenever an agent ends a turn, its space's requests, recaps and
// screens go to a small Claude model, which answers with a one-line goal and a
// short name for the space and each tab. Spaces and tabs
// nobody named take those names; a name the person gave is never touched.
// Kept in shared("summaries") = { spaces: {id: {name, summary}}, tabs: {...},
// auto: {id: the name this gave it} }.

import { exec, hc, spaces, panes, machines, run, shared, setShared, home } from "herdr";

const MODEL = "claude-haiku-4-5";
const VERSION = 3; // summaries made by an older prompt are made again
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
{"space":{"name":"...","summary":"..."},"tabs":[{"tab":1,"name":"...","summary":"..."}]}

- summary: the goal, at most 45 characters (two short lines in the sidebar): what the person wants this work to achieve, like "Port ontology loader to Rust for offline use". Not the latest step, command or file: the reason behind them. The requests say it best; if the goal moved on, say the current one. Only if room is left, a few words of where it stands ("; waiting on you" when it asks the person something).
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

export class Summarizer {
  constructor() {
    this.last = {}; // tab -> its status at the last tick
    this.dirty = {}; // space -> when it was asked for
    this.next = {}; // space -> not before then
    this.tried = new Set(); // tabs without a summary already asked for once
    this.busy = false;
  }

  // Which spaces need a summary: an agent there just ended a turn, or a tab with
  // an agent has none yet. One space at a time.
  tick(cx) {
    const now = Date.now();
    const d = summaries();
    const ps = panes();
    for (const s of spaces()) {
      for (const t of s.tabs) {
        const was = this.last[t.id];
        this.last[t.id] = t.status;
        if (!leadAgent(t, ps)) continue;
        const ended = was === "working" && t.status !== "working";
        const missing = d.tabs[t.id]?.v !== VERSION && !this.tried.has(t.id);
        if (missing) this.tried.add(t.id);
        if (ended || missing) this.dirty[s.id] ??= now;
      }
    }
    if (this.busy) return;
    const id = Object.keys(this.dirty).find((k) => now - this.dirty[k] >= SETTLE && now >= (this.next[k] ?? 0));
    if (!id) return;
    delete this.dirty[id];
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
      // A terminal that doesn't answer (its machine is busy) only leaves itself out.
      const r = await hc(["read", lead.terminal, "--lines", String(LINES)]).catch(() => null);
      if (r?.code !== 0) continue;
      const lines = tidy(r.stdout).split("\n");
      // The first requests set the goal, the last ones where it went.
      const asks = lines.map((l) => l.trim()).filter((l) => ASK.test(l)).map((l) => clip(l, 300));
      const kept = asks.length > 10 ? [...asks.slice(0, 2), "...", ...asks.slice(-8)] : asks;
      const text = `Requests and recaps:\n${kept.join("\n").slice(-ASKS) || "(none)"}\n\nEnd of the terminal:\n${lines.join("\n").slice(-TAIL)}`.slice(-room);
      room -= text.length;
      items.push({ t, lead, text });
    }
    if (!items.length) return;

    const prompt = [`Space now called "${s.name}", folder ${s.folder || "~"}${s.machine ? ` on ${s.machine}` : ""}.`];
    items.forEach(({ t, lead, text }, n) => {
      prompt.push("", `=== Tab ${n + 1}, now called "${t.name}", ${lead.program?.name ?? "agent"}, ${t.status ?? "unknown"} ===`, text);
    });
    const r = await exec(await claude(), ["-p", "--bare", "--model", MODEL, "--tools", "", "--strict-mcp-config", "--no-session-persistence", "--system-prompt", SYSTEM, prompt.join("\n")], { cwd: home() });
    if (r.code !== 0) throw new Error(clip(r.stderr || r.stdout, 300) || `exit ${r.code}`);
    const out = JSON.parse(r.stdout.slice(r.stdout.indexOf("{"), r.stdout.lastIndexOf("}") + 1));

    // A fresh copy: the person or another space's summary may have changed it meanwhile.
    const d = JSON.parse(JSON.stringify(summaries()));
    for (const o of Array.isArray(out.tabs) ? out.tabs : []) {
      const it = items[o.tab - 1];
      if (!it) continue;
      d.tabs[it.t.id] = { name: clip(o.name, 40), summary: clip(o.summary, 120), v: VERSION };
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
