// Workspace spaces, grouped by machine when more than one is known: worktrees
// under their checkout, stable colored avatars, the repo and branch in the
// space's tooltip. Click to switch, right-click for its menu, drag to reorder.
//
// Each space is a card in its own faint color: its row, then its agents' tabs
// hanging from its avatar on a guide line in that color, with the helpers they
// started (sub-agents) under them. Every space, tab and helper always has a row:
// nothing is hidden for lack of room. A space folds only when you fold it (its
// chevron), and then still shows how many there ask you and are new.
// What needs you (attention.js decides) takes a second line: what it wants or
// found, how long it has waited, a check to put it away; a helper that asks you is
// its own item. The header counts what asks you and what finished, and steps
// through each; agent.next follows the same order, and the status bar shows the
// same counts. When it all wouldn't fit, rows get tighter (what needs you still
// keeps its name and its words; past that the list scrolls, and a line at
// its bottom (or top) says what needs you out of sight ("↓ 3 ask · 1 new"); a click
// on it, or on a header chip, scrolls that row into view. It gets roomier again only
// with room to spare.
// summarize.js writes the goals and names the spaces and tabs nobody named.

import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, machines, panes, agents, terminals, run, openOverlay, exec, hc, theme, shared, setShared, setAgentOrder, watchFolder, window, layout, settings } from "herdr";
import { Summarizer, summaries, leadAgent } from "./summarize.js";
import { Attention, attention, stateOf, asking } from "./attention.js";
import { look } from "./look.js";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// The sidebar's rail goes by its width, not a flag: dragging its edge narrows it too.
const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;

// To the rail (on macOS wide enough for the traffic lights), or back to the width it had.
function toggleSidebar() {
  const width = find(layout(), "sidebar")?.size?.px;
  if (!narrow()) setShared("sidebar.width", width);
  // Mods edited before the rail went by width still read the flag.
  setShared("sidebar.collapsed", !narrow());
  run("layout.resize", { id: "sidebar", px: narrow() ? (shared("sidebar.width") ?? 268) : window()?.platform === "macos" ? 76 : 44 });
}

// Where a space is now: its first terminal's live folder, else where it was made.
// `ps`: panes(), read once by the caller (each read copies every pane).
function place(s, ps) {
  const tabs = new Set((s.tabs ?? []).map((c) => c.id));
  return ps.find((p) => tabs.has(p.tab) && p.cwd)?.cwd || s.folder;
}
const where = (s, ps) => JSON.stringify([s.machine ?? null, place(s, ps)]);
const base = (path) => path.replace(/\/+$/, "").split("/").pop();
// Changes made outside Herdr (an editor's save, a commit in another app): looked
// for this often, in repos the list shows, while the window is in front.
const FALLBACK = 60000;

// What a stored color name looks like on an avatar (the same in every mod
// that draws space avatars): one strong color per hue, light and dark alike.
// The sidebar draws it as a letter on a faint tile, so it never reads as a state.
// Seven hues, every pair 46° or more apart, so two different colors never look alike.
const MARK = { ansi3: "#e3814f", olive: "#a9b83a", ansi2: "#4caf50", ansi6: "#22a99a", ansi4: "#5b8def", ansi5: "#a66cf0", ansi1: "#d9649a" };
const PALETTE = ["ansi6", "ansi3", "ansi4", "ansi1", "ansi2", "ansi5", "olive"];
// A color's hue, in degrees.
function hueOf(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const apart = (a, b) => { const d = Math.abs(hueOf(MARK[a] ?? a) - hueOf(MARK[b] ?? b)); return Math.min(d, 360 - d); };

// Most urgent first, for what stands for several tabs (the rail, a helper's tab).
const RANK = { ask: 6, read: 5, pending: 4, working: 3, waiting: 2, quiet: 1 };
const urgent = (states) => states.reduce((m, s) => ((RANK[s] ?? 0) > (RANK[m] ?? 0) ? s : m), "quiet");
const needs = (state) => state === "ask" || state === "read";

// A tab's state (attention.js): "!" asks you, a dot finished, a spinner works, a
// clock waits on its own work, a ring is idle; a faint dot while its last turn is read.
function mark(t, state) {
  if (state === "working") return svg("mods/workspace-chrome/spinner.svg").size(11).flex_none().text_color(t.working).spin(900);
  if (state === "ask") return div().size(14).flex_none().rounded(4).bg(t.blocked + "26").text_size(10.5).font_bold().text_color(t.blocked).flex().items_center().justify_center().child("!");
  if (state === "read") return div().size(7).flex_none().rounded(4).bg(t.done);
  if (state === "pending") return div().size(7).flex_none().rounded(4).bg(t.dim + "99");
  if (state === "waiting") return svg("mods/workspace-chrome/clock.svg").size(11).flex_none().text_color(t.dim);
  return div().size(7).flex_none().rounded(4).border(1.5).border_color(t.idle ?? t.dim);
}

// A helper's own word as a tab state: an error asks you too; its done is its parent's news.
const kidState = (k) => (k.status === "working" ? "working" : k.status === "blocked" || k.status === "error" ? "ask" : "quiet");
// Programs that report a status when they run as agents (the program table's keys).
const AGENTS = new Set(["claude", "codex", "kiro", "pi", "gemini", "opencode", "cursor-agent", "amp", "goose", "aider"]);
const kidName = (k) => k.name || k.template || k.program?.name || k.address;

// How long it has waited for you: "now", "12m", "3h", "2d"; "3h+" when that is
// only a lower bound (it started before this window saw it).
function age(ms, exact = true) {
  const m = Math.floor(ms / 60000);
  const text = m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
  return exact || m < 1 ? text : `${text}+`;
}
// What a helper that asks wants, from its own report.
const kidNote = (k) => (k.status === "error" ? "Stopped with an error" : k.report?.msg || asking(k.report?.kind));

// Row heights, to know before drawing whether it all fits. Levels change how rows
// look, never which rows there are: 0 roomy, with the shown tab's goal and the shown
// space's aim; 1 tighter rows. Past level 1 the list scrolls. What needs you always
// keeps its tab's name and, under it, what it wants.
const H = { machine: 26, space: [28, 24], worktree: [26, 24], tab: [26, 24], note: 15, kid: 22, about: 18, header: 31, foot: 14 };
const LEVELS = [0, 1];
const SPARE = 48; // px free before it goes back to a roomier level: no flapping
const PIN = 28; // px a pinned "out of sight" line covers at the list's top or bottom
const px = (table, level) => table[level >= 1 ? 1 : 0];
const INDENT = 16; // px a space's tabs sit right of its row, on a guide line under its avatar

export default class Spaces extends View {
  init(_props, cx) {
    this.git = {}; // where() -> { name, branch, ahead, behind, repo, linked }, null: not a repo
    this.checked = {}; // where() -> when it was last looked at
    this.unsure = new Set(); // where()s git couldn't answer for (a machine away)
    this.pending = new Set(); // where()s to look at next
    this.busy = {}; // pane -> an agent working or a program in front of its shell
    this.ready = {}; // machine -> its layout was readable at the last look
    this.at = {}; // space -> its where() at the last look
    this.watching = new Set(); // local repos' git folders
    // Spaces made while this runs wait (at most a moment) for their git, so a
    // worktree appears under its repo instead of jumping there.
    this.shown = new Set(spaces().map((s) => s.id));
    this.appeared = {}; // space -> when this first saw it
    this.born = {}; // space -> when it was made: one that appears on a machine up a while
    this.upAt = {}; // machine -> when this saw its layout readable (spaces then are loads)
    this.machines = [];
    this.folded = new Set(JSON.parse(localStorage.getItem("machines.folded") ?? "[]"));
    this.refreshMachines(cx);
    cx.timer.every(15000, cx => this.refreshMachines(cx));
    // `git status` walks the whole tree, on another machine a process there:
    // only when its answer could have changed (see `due`).
    cx.timer.every(250, (cx) => this.checkNew(cx));
    this.summarizer = new Summarizer();
    cx.timer.every(1000, (cx) => this.summarizer.tick(cx));
    this.attention = new Attention();
    cx.timer.every(1000, (cx) => this.attention.tick(cx));
    cx.timer.every(60000, (cx) => cx.notify()); // how long things have waited for you
    this.hovered = null; // the tab row under the pointer: it shows the put-away check
    this.height = 0; // this block's height, once laid out (zoomed px)
    this.width = 0; // and its width, at zoom 1
    this.level = 0; // how dense the list is drawn (see LEVELS)
    this.offset = 0; // how far the list is scrolled (zoom 1 px)
    this.stepped = {}; // kind -> the item the header chip showed last
    // Spaces the person folded (their chevron), kept until they unfold them.
    this.shut = new Set(JSON.parse(localStorage.getItem("spaces.folded") ?? "[]"));
    // When each space last ran ({since, until}), for the order; and whether the
    // pointer is over the list (the order holds still then).
    this.runs = JSON.parse(localStorage.getItem("spaces.runs") ?? "{}");
    this.wasWorking = new Map(); // tab or helper -> working at the last look
    this.startSeen = new Map(); // tab or helper -> when this saw it start working
    this.firstSeen = {}; // space -> when noteRuns first saw it
    this.overList = false;
    // The counts the status bar shows, even while this block is hidden (no draws then);
    // and the order's hold let go when the window goes to the back (no hover-out comes).
    cx.timer.every(1000, (cx) => {
      this.compute();
      if (this.overList && !window().active) { this.overList = false; cx.notify(); }
    });
  }

  checkNew(cx) {
    const now = Date.now();
    const sp = spaces();
    for (const m of machines()) if (m.layout === "ready") this.upAt[m.name] ??= now; else delete this.upAt[m.name];
    for (const s of sp) this.appear(s, now);
    const due = this.due(now, sp, panes());
    if (due.size) this.refreshGit(due, cx);
    if (sp.some((s) => !this.shown.has(s.id))) cx.notify();
  }

  // A space this hasn't seen: made just now if its machine was up a while (it starts
  // at the top), else part of that machine's load (it sorts by when it last changed).
  appear(s, now) {
    if (this.shown.has(s.id) || s.id in this.appeared) return;
    this.appeared[s.id] = now;
    const up = this.upAt[s.machine ?? null];
    if (up != null && now - up > 5000) this.born[s.id] = now;
  }

  // Places whose git could have changed: new ones (a new space, a cd), where a
  // command or an agent's turn just ended (a checkout, a commit, edits), those on
  // a machine that is back, and repos in view whose fallback is due.
  due(now, sp, ps) {
    // Moved there: what it knew of that place may be old.
    const at = {};
    for (const s of sp) at[s.id] = where(s, ps);
    const keys = new Set(Object.values(at).filter((k) => JSON.parse(k)[1]));
    const due = new Set([...keys].filter((k) => !(k in this.git)));
    for (const [id, k] of Object.entries(at)) if (this.at[id] && this.at[id] !== k && keys.has(k)) due.add(k);
    this.at = at;
    const spaceOf = {};
    for (const s of sp) for (const t of s.tabs ?? []) spaceOf[t.id] = s;
    const busy = {};
    for (const p of ps) {
      if (!p.terminal || !spaceOf[p.tab]) continue;
      busy[p.pane] = p.status === "working" || !(p.program?.shell || p.program?.agent);
      if (this.busy[p.pane] && !busy[p.pane]) this.sameRepo(at[spaceOf[p.tab].id], keys).forEach((k) => due.add(k));
    }
    this.busy = busy;
    for (const m of machines()) {
      const ready = m.layout === "ready";
      if (ready && this.ready[m.name] === false) for (const k of keys) if (JSON.parse(k)[0] === m.name) due.add(k);
      this.ready[m.name] = ready;
    }
    if (window().active) {
      for (const k of keys) {
        const asks = this.git[k] || this.unsure.has(k);
        if (asks && !this.folded.has(JSON.parse(k)[0]) && now - (this.checked[k] ?? 0) > FALLBACK) due.add(k);
      }
    }
    return due;
  }

  // `key` and the other places in its repo (a commit there moves their ahead/behind).
  sameRepo(key, keys) {
    const repo = this.git[key]?.repo;
    return [key, ...(repo ? [...keys].filter((k) => this.git[k]?.repo === repo) : [])];
  }

  refreshMachines(cx) {
    cx.spawn(async cx => {
      try { const r = await hc(["machine", "ls", "--json"]); if (r.code === 0) this.machines = (JSON.parse(r.stdout).machines ?? []).filter((m) => !m.temporary); } catch {}
      cx.notify();
    });
  }

  // One look at a time, each place once however often it was asked for meanwhile.
  refreshGit(keys, cx) {
    for (const k of keys) this.pending.add(k);
    if (this.refreshing) return;
    this.refreshing = true;
    cx.spawn(async (cx) => {
      while (this.pending.size) {
        const keys = [...this.pending];
        this.pending.clear();
        for (const key of keys) await this.check(key, cx);
      }
      const used = new Set(Object.values(this.git).filter(Boolean).map((g) => JSON.parse(g.repo)).filter(([on]) => !on).map(([, repo]) => repo));
      for (const repo of this.watching) if (!used.has(repo)) this.watching.delete(repo);
      this.refreshing = false;
      cx.notify();
    });
  }

  // One place's git: branch, ahead/behind, its repo.
  async check(key, cx) {
    const [on, cwd] = JSON.parse(key);
    this.checked[key] = Date.now();
    this.unsure.delete(key);
    try {
      // No optional locks: a status that touched the index would wake the watch again.
      // Writes nothing under .git (index lock, fsmonitor cookie): watch() would wake on it.
      const r = await exec("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", "status", "--porcelain=v2", "--branch"], { cwd, on });
      if (r.code !== 0) {
        // Only git's own "no" is remembered as no repo; anything else is asked again.
        if (!/not a git repository/i.test(r.stderr)) this.unsure.add(key);
        this.git[key] = null;
        return;
      }
      // The repo's own .git folder names it; a worktree's top differs from it.
      const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on });
      const common = await exec("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd, on });
      const repo = common.stdout.trim();
      const name = repo.endsWith("/.git") ? base(repo.slice(0, -5)) : base(repo).replace(/\.git$/, "");
      const info = { name, branch: null, ahead: 0, behind: 0, repo: JSON.stringify([on, repo]), linked: repo !== `${top.stdout.trim()}/.git` };
      for (const line of r.stdout.split("\n")) {
        if (line.startsWith("# branch.head ")) info.branch = line.slice(14);
        else if (line.startsWith("# branch.ab ")) {
          const [a, b] = line.slice(12).split(" ");
          info.ahead = Math.abs(parseInt(a, 10)) || 0;
          info.behind = Math.abs(parseInt(b, 10)) || 0;
        }
      }
      this.git[key] = info;
      if (!on) this.watch(repo, cx);
    } catch {
      // Couldn't ask (the machine is away): keep what it showed, look again later.
      this.git[key] ??= null;
      this.unsure.add(key);
    }
  }

  watch(repo, cx) {
    if (this.watching.has(repo)) return;
    this.watching.add(repo);
    cx.spawn(async (cx) => {
      try {
        while (this.watching.has(repo)) {
          await watchFolder(repo);
          const mine = JSON.stringify([null, repo]);
          if (this.watching.has(repo)) this.refreshGit(Object.keys(this.git).filter((k) => this.git[k]?.repo === mine), cx);
        }
      } catch { this.watching.delete(repo); }
    });
  }

  menu(w) {
    // A popup is as tall as its items; height is only the most.
    openOverlay({ mod: "menu", kind: "popup", width: 200, height: 260, props: { tab: "space", target: { id: w.id } } });
  }

  // When each space last ran. A busy stretch starts when an agent (or a helper) in it
  // starts working and ends when none is; while it lasts its key only goes up, to the
  // newest start seen (a tab's working_since, else when this saw it start), and when
  // it ends the key is the stop time. A space not running keeps when a tab in it last
  // finished or asked, by that tab's own clock (not a connect's stamp). Kept across restarts: one already working in the
  // first 3 s this sees its space (the snapshot after a restart, or when its machine
  // first connects, which can come over a few polls) keeps the open stretch's key;
  // one first seen later is new, so it starts now.
  noteRuns() {
    const now = Date.now();
    const sp = spaces();
    const stamped = this.attention.stamped(sp);
    let dirty = false;
    for (const w of sp) {
      const r = this.runs[w.id];
      const open = r && r.until == null ? r.key ?? r.since ?? 0 : null;
      const snapshot = now - (this.firstSeen[w.id] ??= now) < 3000;
      const starts = [];
      const note = (id, is, since) => {
        const was = this.wasWorking.get(id);
        if (is && !was) this.startSeen.set(id, was === undefined && snapshot && open != null ? open : now);
        this.wasWorking.set(id, is);
        if (is) starts.push(since ?? this.startSeen.get(id));
      };
      for (const t of w.tabs) note("tab:" + t.id, t.status === "working", t.working_since ?? null);
      for (const k of (this.view?.tabs.get(w.id) ?? []).flatMap((x) => x.subs)) note("kid:" + k.address, k.status === "working", null);
      const busy = starts.length > 0;
      const newest = busy ? Math.max(...starts) : 0;
      const ended = Math.max(0, ...w.tabs.filter((t) => (t.status === "done" || t.status === "blocked") && t.changed_at != null && !stamped.has(t.id)).map((t) => t.changed_at));
      // A stretch found over when this first looks (it ended while the app was shut)
      // ended when its tabs did, not now.
      const stop = snapshot ? Math.max(open ?? 0, ended) : now;
      if (busy && open == null) { this.runs[w.id] = { key: newest, until: null }; dirty = true; }
      else if (busy && newest > open) { this.runs[w.id] = { ...r, key: newest }; dirty = true; }
      else if (!busy && open != null) { this.runs[w.id] = { key: stop, until: stop }; dirty = true; }
      else if (!busy && ended > (r?.until ?? 0)) { this.runs[w.id] = { key: ended, until: ended }; dirty = true; }
    }
    if (dirty) localStorage.setItem("spaces.runs", JSON.stringify(this.runs));
  }

  // Most recent first: spaces running now (the newest start first), then by when
  // they last stopped (or a tab in them finished or asked); one just made by when it
  // was made, above any that stopped before; the rest last.
  recency(w) {
    const r = this.runs[w.id];
    if (r && r.until == null) return [1, r.key ?? r.since ?? 0];
    return [0, Math.max(r?.until ?? 0, this.born[w.id] ?? 0)];
  }

  // Spaces in order, each worktree space moved under its main checkout's: most
  // recently run first, within each machine. While the pointer is over the list the
  // order holds still, so a row never jumps away from under it.
  ordered() {
    const sp = spaces(), ps = panes();
    const ready = (w) => where(w, ps) in this.git || Date.now() - this.appeared[w.id] > 1500;
    for (const w of sp) if (!this.shown.has(w.id)) { this.appear(w, Date.now()); if (ready(w)) this.shown.add(w.id); }
    const keyed = sp.map((w, i) => ({ w, i, k: this.recency(w) }));
    const fresh = [...keyed].sort((x, y) => y.k[0] - x.k[0] || y.k[1] - x.k[1] || x.i - y.i).map((x) => x.w.id);
    const holding = this.overList && window().active && this.held && sp.every((w) => this.held.includes(w.id));
    if (!holding) this.held = fresh;
    this.holding = Boolean(holding);
    const rank = new Map(this.held.map((id, n) => [id, n]));
    const order = [...sp.map((w, i) => ({ w, i }))].sort((x, y) => (rank.get(x.w.id) ?? 1e6 + x.i) - (rank.get(y.w.id) ?? 1e6 + y.i));
    const list = order.map(({ w, i }) => ({ w, i, g: this.git[where(w, ps)] ?? null })).filter((r) => this.shown.has(r.w.id));
    const mains = new Set(list.filter((r) => r.g && !r.g.linked).map((r) => r.g.repo));
    const nested = (r) => r.g?.linked && mains.has(r.g.repo);
    const out = [];
    const placed = new Set(); // repos whose worktrees are listed (under the first of its spaces)
    for (const r of list) {
      if (nested(r)) continue;
      out.push({ ...r, tree: null });
      if (!r.g || r.g.linked || placed.has(r.g.repo)) continue;
      placed.add(r.g.repo);
      const kids = list.filter((k) => nested(k) && k.g.repo === r.g.repo);
      kids.forEach((k, n) => out.push({ ...k, tree: n === kids.length - 1 ? "└─" : "├─" }));
    }
    return out;
  }

  // The rows, under a header per machine once one isn't this computer.
  grouped(t, collapsed, level) {
    const rows = this.ordered();
    const draw = (r) => (collapsed ? this.compact(r, t) : this.row(r, t, level));
    const remote = this.remotes(rows);
    const loading = m => {
      const layout = machines().find(k => k.name === m)?.layout;
      return layout === "loading" || (!layout && this.machines.some(k => k.name === m && k.state === "connected"))
        || spaces().some(s => (s.machine ?? null) === m && !this.shown.has(s.id));
    };
    const loadingRow = m => div().id(`machine-loading-${m ?? "local"}`).h(28).flex_none().px(8).text_size(12).text_color(t.dim).child(collapsed ? "…" : "Loading…");
    if (!remote.length) return loading(null) && !rows.length ? [loadingRow(null)] : rows.map(draw);
    const machineNames = [null, ...remote];
    return machineNames.flatMap((m) => {
      const mine = rows.filter((r) => (r.w.machine ?? null) === m);
      const machine = this.machines.find(k => k.name === m);
      const connected = !m || machine?.state === "connected";
      const folded = this.folded.has(m);
      // Folded, what needs you there still shows, in its own colors.
      const there = folded ? this.view.need.filter((x) => (x.w.machine ?? null) === m) : [];
      const asks = there.filter((x) => x.state === "ask").length;
      const mh = look().machine ?? {};
      const head = h_flex().id(`machine-${m ?? "local"}`).h(H.machine).flex_none().px(collapsed ? 2 : 8).gap(7).items_center()
        .text_size(mh.size ?? 11).text_color(mh.color === "muted" ? t.muted : t.dim)
        .when(mh.weight === "medium", (el) => el.font_medium())
        .when(Boolean(mh.gapAbove) && m !== null && !collapsed, (el) => el.mt(mh.gapAbove))
        .cursor_pointer().hover(s => s.bg(t.hover))
        .on_click((_e, cx) => {
          folded ? this.folded.delete(m) : this.folded.add(m);
          localStorage.setItem("machines.folded", JSON.stringify([...this.folded]));
          cx.notify();
        })
        .child(svg(`mods/workspace-chrome/${m ? "server" : "monitor"}.svg`).size(13).flex_none())
        .when(!collapsed, el => el.child(div().flex_1().truncate().child(m ?? "This computer"))
          .when(!connected, el => el.child(div().flex_none().child((machine?.state ?? "asleep").replace(/_/g, " "))))
          .when(asks > 0, el => el.child(this.badge(String(asks), t.blocked)))
          .when(there.length > asks, el => el.child(this.badge(String(there.length - asks), t.done)))
          .when(connected, el => el.child(div().id(`machine-add-${m ?? "local"}`).flex_none().px(4).rounded(4).hover(s => s.bg(t.hover).text_color(t.foreground))
            .tooltip(`New space on ${m ?? "this computer"}`)
            .on_click((_e, cx) => { cx.stop_propagation(); run("space.new", { machine: m ?? "" }); }).child("+")))
          .child(div().size(6).rounded(3).flex_none().bg(connected ? t.ansi2 : t.dim))
          .child(svg(`mods/workspace-chrome/chevron-${folded ? "right" : "down"}.svg`).size(11).flex_none()));
      const empty = h_flex().id(`machine-new-${m ?? "local"}`).h(28).flex_none().px(8).gap(7).items_center().rounded(7)
        .text_size(12).text_color(t.dim).hover(s => s.bg(t.hover).text_color(t.foreground))
        .on_click(() => run("space.new", { machine: m ?? "" }))
        .child(svg("mods/workspace-chrome/plus.svg").size(12)).when(!collapsed, el => el.child("New space there"));
      return [head, ...(folded ? [] : mine.length ? mine.map(draw) : [loading(m) ? loadingRow(m) : empty])];
    });
  }

  // Other machines with spaces or added here: each gets a header, this computer too.
  remotes(rows) {
    return [...new Set([...rows.map(r => r.w.machine).filter(Boolean), ...this.machines.map(m => m.name)])].sort();
  }

  // Where every row of the list sits at a level (zoom 1 px from its top), walking
  // the same rows the list draws: machines, spaces, tabs and helpers; and its height.
  positions(level) {
    const rows = this.ordered();
    const remote = this.remotes(rows);
    const out = { machine: new Map(), space: new Map(), tab: new Map(), kid: new Map(), height: 0 };
    let y = 0;
    const card = (r) => {
      const c = look().card;
      const top = y;
      y += (c.border ?? 0) + c.pad;
      y += r.tree ? px(H.worktree, level) : px(H.space, level);
      const head = y;
      if (!this.shut.has(r.w.id)) {
        const tabs = this.view.tabs.get(r.w.id) ?? [];
        if (this.about(r.w, tabs, level)) y += H.about;
        for (const x of tabs) {
          const t0 = y;
          y += px(H.tab, level) + (this.line(r.w, x, level) ? H.note : 0);
          out.tab.set(x.tab.id, [t0, y]);
          for (const k of x.subs) {
            const k0 = y;
            y += H.kid + (kidState(k) === "ask" ? H.note : 0);
            out.kid.set(k.address, [k0, y]);
          }
        }
      }
      out.space.set(r.w.id, [top, head]);
      y += c.padBottom + (c.border ?? 0) + c.gap;
    };
    if (!remote.length) rows.forEach(card);
    else for (const m of [null, ...remote]) {
      if (m !== null) y += look().machine?.gapAbove ?? 0;
      out.machine.set(m, [y, y + H.machine]);
      y += H.machine;
      if (this.folded.has(m)) continue;
      const mine = rows.filter((r) => (r.w.machine ?? null) === m);
      if (mine.length) mine.forEach(card);
      else y += 28;
    }
    out.height = y + 26 + H.foot; // Add machine, then the bottom padding
    return out;
  }

  // How tall the list would be at a level.
  measure(level) {
    return this.positions(level).height;
  }

  // Where a thing that needs you is drawn: its row, else its folded space's or
  // folded machine's row.
  where(item, pos) {
    if (item.kid && pos.kid.has(item.kid.address)) return pos.kid.get(item.kid.address);
    if (pos.tab.has(item.tab.id)) return pos.tab.get(item.tab.id);
    if (pos.space.has(item.w.id)) return pos.space.get(item.w.id);
    return pos.machine.get(item.w.machine ?? null) ?? [0, 0];
  }

  // Scrolls so a row is in view, a third of the way down.
  reveal(range) {
    const [top, bottom] = range;
    const view = this.viewH ?? 0;
    const [above, below] = this.band ?? [0, 0];
    if (top >= this.offset + above && bottom <= this.offset + view - below) return;
    this.offset = Math.max(0, Math.min(this.maxOffset ?? 0, top - view / 3));
  }

  // The shown space's aim, when several tabs share it (others: in its tooltip).
  about(w, tabs, level) {
    const text = this.view.d.spaces[w.id]?.summary;
    return w.active && level === 0 && tabs.length > 1 ? text : null;
  }

  // Repo and branch, for a space's tooltip: "herdr · spike ↑2 ↓1".
  gitText(g, tree, name) {
    if (!g) return "";
    const raw = g.branch ?? "detached";
    const same = (a) => a.toLowerCase() === name.toLowerCase();
    const branch = same(raw) ? "" : raw;
    const repo = tree || same(g.name) ? "" : g.name;
    return [[repo, branch].filter(Boolean).join(" · "), g.ahead > 0 ? `↑${g.ahead}` : "", g.behind > 0 ? `↓${g.behind}` : ""].filter(Boolean).join(" ");
  }

  // A space's color (its avatar's), for its card and guide line.
  hue(w, t) {
    const color = (shared("space.colors") ?? {})[w.id] ?? "ansi6";
    return color.startsWith("#") ? color : (MARK[color] ?? t[color]);
  }

  // A space as a card (look.js decides its paint): its row, then its tabs.
  row(r, t, level) {
    const hue = this.hue(r.w, t);
    const c = look().card;
    return v_flex().id(`card-${r.w.id}`).relative().flex_none().mb(c.gap).pt(c.pad).pb(c.padBottom).rounded(c.radius)
      .when(c.bg === "hue", (el) => el.bg(hue + c.alpha))
      .when(c.bg === "surface", (el) => el.bg(t.surface))
      .when(Boolean(c.border), (el) => el.border(c.border).border_color(t.border))
      .when(c.bar > 0, (el) => el.border_l(c.bar).border_color(hue + (c.barAlpha ?? "b3")).pl(2))
      .when(Boolean(c.pill), (el) => el.child(div().absolute().left(0).top(c.pill.inset).bottom(c.pill.inset).w(c.pill.w).rounded(c.pill.radius ?? c.pill.w / 2).bg(hue + c.pill.alpha)))
      .child(this.head(r, t, level)).children(this.details(r.w, t, level, hue));
  }

  // Each tab of a space with its state and its helpers: every tab with a terminal,
  // an agent's or not (a shell, or an agent that hasn't said how it is yet).
  tabsOf(w) {
    const { a, ps, kids, reports } = this.view;
    return w.tabs.map((tab) => {
      const agent = leadAgent(tab, ps);
      const lead = agent ?? ps.find((p) => p.tab === tab.id && p.terminal) ?? ps.find((p) => p.tab === tab.id);
      if (!lead) return null;
      const { state, note, generic } = agent ? stateOf(tab, a[tab.id], reports.get(lead.terminal)?.kind) : { state: "quiet", note: "" };
      const subs = lead.terminal ? kids.get(lead.terminal) ?? [] : [];
      // What it is when it isn't an agent reporting: a mod pane (a file, a board), a
      // shell, or a program (an agent that stopped saying how it is).
      const plain = agent ? null : !lead.terminal ? "mod" : lead.program?.shell || !lead.program?.icon ? "shell" : "program";
      return { tab, lead, state, note, generic, subs, shell: !agent, plain };
    }).filter(Boolean);
  }

  // Under a tab's name: what it wants or found when it needs you; on level 0, the
  // shown tab's goal. One line.
  line(w, x, level) {
    const summary = this.view.d.tabs[x.tab.id]?.summary;
    if (needs(x.state)) return x.note || summary || null;
    if (level > 0 || !(w.active && x.tab.active)) return null;
    return x.state === "waiting" ? null : summary || null;
  }

  details(w, t, level, hue) {
    if (this.shut.has(w.id)) return [];
    const tabs = this.view.tabs.get(w.id) ?? [];
    const out = [];
    const about = this.about(w, tabs, level);
    if (about) out.push(div().pl(35).pr(8).pb(3).h(H.about).flex_none().text_size(11.5).truncate().text_color(t.dim).child(about));
    const now = Date.now();
    const rows = [];
    for (const x of tabs) {
      rows.push(this.tabRow(w, x, t, level, now));
      for (const k of x.subs) rows.push(this.kidRow(k, t, level, now));
    }
    // A space's tabs hang from its avatar on a guide line in its color, so a tab
    // never reads as a space.
    const g = look().guide;
    if (rows.length) out.push(v_flex().flex_none().ml(INDENT).pl(2).border_l(g.width).border_color(g.color === "hue" ? hue + g.alpha : g.color === "faint" ? t.foreground + (g.alpha ?? "24") : t.input).children(rows));
    return out;
  }

  tabRow(w, x, t, level, now) {
    const { tab, lead, state, note } = x;
    const { d, a } = this.view;
    const on = w.active && tab.active;
    const summary = d.tabs[tab.id]?.summary;
    const wants = needs(state);
    const rec = a[tab.id];
    const since = wants ? rec?.since ?? tab.changed_at : null;
    // A finished result or a question left in its last message can be put away by
    // hand; a permission prompt goes when it's answered.
    const away = wants && tab.status !== "blocked" && Boolean(rec) && this.hovered === tab.id && window().active;
    const line = this.line(w, x, level);
    // On the name's line: what it waits on.
    const inline = state === "waiting" ? note || "work it started" : null;
    const late = since != null ? now - since : null;
    const tip = [tab.name, x.plain === "program" && AGENTS.has(lead.program?.key) ? `${lead.program.name}: no status from it` : null, summary, state === "waiting" && note ? `Waiting on: ${note}` : null,
      late != null ? `Waiting for you: ${age(late, rec?.known !== false)}` : null].filter(Boolean).join("\n");
    return v_flex()
      .id(`tab-${tab.id}`)
      .px(8)
      .py(level ? 2 : 3)
      .flex_none()
      .rounded(6)
      .cursor_pointer()
      .when(on, (el) => el.bg(t.hover))
      .hover((s) => s.bg(t.hover))
      .on_hover((over, cx) => {
        if (over) this.hovered = tab.id;
        else if (this.hovered === tab.id) this.hovered = null;
        cx.notify();
      })
      .on_click(() => run("pane.focus", { pane: lead.pane }))
      // The tab bar's menu: Rename, New tab, Close.
      .on_mouse_down("right", (_e, cx) => {
        cx.stop_propagation();
        openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: tab.id, space: w.id } } });
      })
      .when(Boolean(tip), (el) => el.tooltip(tip))
      .child(h_flex().h(20).gap(9).items_center()
        .child(h_flex().w(18).flex_none().justify_center().child(this.plainMark(x, t) ?? mark(t, state)))
        .child(div().min_w(0).truncate().text_size(12.5)
          .when(Boolean(inline), (el) => el.flex_none().max_w(92))
          .when(!inline, (el) => el.flex_shrink_1().min_w(0))
          .text_color(on || wants ? t.foreground : state === "quiet" || state === "waiting" || state === "pending" ? t.dim : t.muted)
          .child(tab.name))
        .when(Boolean(inline), (el) => el.child(div().flex_1().min_w(0).truncate().text_size(11.5).text_color(t.dim).child(inline)))
        .when(!inline, (el) => el.child(div().flex_1()))
        .when(late != null && !away, (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(age(late, rec?.known !== false))))
        .when(away, (el) => el.child(div().id(`tab-done-${tab.id}`).flex_none().p(2).rounded(4).text_color(t.dim)
          .hover((s) => s.bg(t.raised).text_color(t.foreground))
          .tooltip("Done with it")
          .on_click((_e, cx) => { cx.stop_propagation(); this.attention.dismiss(tab.id); cx.notify(); })
          .child(svg("mods/workspace-chrome/check.svg").size(12)))))
      .when(Boolean(line), (el) => el.child(div().pl(27).h(H.note).text_size(11.5).line_height("15px").truncate().text_color(wants && note ? t.muted : t.dim).child(line)));
  }

  // The mark of a tab without an agent reporting: a file for a mod pane, a prompt for
  // a shell, the program's own icon (dimmed) for one that says nothing.
  plainMark(x, t) {
    if (x.plain === "mod") return svg("mods/workspace-chrome/file-text.svg").size(12).flex_none().text_color(t.dim);
    if (x.plain === "shell") return svg("mods/workspace-chrome/terminal.svg").size(12).flex_none().text_color(t.dim);
    if (x.plain === "program") {
      const p = x.lead.program;
      return p.tint ? svg(p.icon).size(13).flex_none().text_color(t.dim) : image(p.icon).w(13).h(13).flex_none().opacity(0.55);
    }
    return null;
  }

  // A helper its tab's agent started (hc run), under that tab: click to look at it.
  // One that asks you says what it wants, on its own line.
  kidRow(k, t, level, now) {
    const st = kidState(k);
    const asks = st === "ask";
    const note = asks ? kidNote(k) : null;
    const rec = this.view.a[`kid:${k.address}`];
    const late = asks && rec?.since != null ? now - rec.since : null;
    const head = h_flex().h(H.kid).gap(8).items_center()
      .child(div().w(9).h(12).mt(-8).flex_none().border_l(1.5).border_b(1.5).rounded_bl(5).border_color(t.input))
      .child(h_flex().w(14).flex_none().justify_center().child(mark(t, st)))
      .child(div().flex_shrink_1().min_w(0).truncate().text_size(12).text_color(asks ? t.foreground : t.dim).child(kidName(k)))
      .child(div().flex_1())
      .when(late != null, (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(age(late, rec.known !== false))));
    return v_flex()
      .id(`kid-${k.address}`)
      .pl(17)
      .pr(8)
      .flex_none()
      .rounded(6)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .on_click(() => run("terminal.peek", { terminal: k.address }))
      .tooltip(`Started by this tab's agent: ${kidName(k)}. Click to look at it.`)
      .child(head)
      .when(asks, (el) => el.child(div().pl(48).h(H.note).text_size(11.5).line_height("15px").truncate().text_color(t.muted).child(note)));
  }

  // A space's avatar, its first letter, painted as look.js says: on a faint tile,
  // white on a solid tile, or in a ring of its color.
  avatar(w, t, size = 18) {
    const fill = this.hue(w, t);
    const kind = look().avatar;
    return h_flex().size(size).flex_none().rounded(kind === "ring" ? size / 2 : 5).items_center().justify_center()
      .when(kind === "tint", (el) => el.bg(fill + "33").text_color(fill))
      .when(kind === "solid", (el) => el.bg(fill).text_color("#ffffff"))
      .when(kind === "ring", (el) => el.border(1.5).border_color(fill).text_color(fill))
      .when(kind === "ringfill", (el) => el.border(1).border_color(fill).bg(fill + "14").text_color(fill))
      .when(kind === "squarering", (el) => el.border(look().ringWidth ?? 1).border_color(fill + (look().ringAlpha ?? "99")).bg(fill + (look().ringFill ?? "14")).text_color(fill))
      .text_size(look().letter ?? 10.5).font_bold().child([...w.name][0]?.toUpperCase() ?? "?");
  }

  // What needs you, across spaces: asks first (a helper that asks is its own),
  // then finished results, each longest waiting first.
  needing() {
    const { a } = this.view;
    const items = [];
    for (const w of spaces()) {
      for (const x of this.view.tabs.get(w.id) ?? []) {
        if (needs(x.state)) items.push({ w, ...x, key: x.tab.id, since: a[x.tab.id]?.since ?? x.tab.changed_at });
        for (const k of x.subs) if (kidState(k) === "ask") items.push({ w, ...x, kid: k, key: k.address, state: "ask", note: kidNote(k), since: a[`kid:${k.address}`]?.since ?? Date.now() });
      }
    }
    return items.sort((x, y) => (y.state === "ask") - (x.state === "ask") || (x.since ?? 0) - (y.since ?? 0));
  }

  badge(text, tone) {
    return div().flex_none().px(5).h(16).rounded(4).bg(tone + "26").text_size(10.5).font_semibold().text_color(tone).flex().items_center().child(text);
  }

  // "3 ask" and "2 new": a click shows the next of that kind. Nothing when nothing needs you.
  chip(items, kind, t, short) {
    const mine = items.filter((x) => x.state === kind);
    if (!mine.length) return null;
    const tone = kind === "ask" ? t.blocked : t.done;
    const word = kind === "ask" ? "ask" : "new";
    const what = kind === "ask" ? `${mine.length} ${mine.length === 1 ? "agent asks" : "agents ask"} you something` : `${mine.length} finished while you were away`;
    return div()
      .id(`needs-${kind}`)
      .flex_none()
      .px(6)
      .h(18)
      .rounded(5)
      .bg(tone + "26")
      .text_size(10.5)
      .font_semibold()
      .text_color(tone)
      .flex()
      .items_center()
      .justify_center()
      .cursor_pointer()
      .hover((s) => s.bg(tone + "40"))
      .tooltip(`${what}. Click to show the next one.`)
      .on_click((_e, cx) => {
        cx.stop_propagation();
        // From the one shown (or the last shown from here), to the next.
        const shown = mine.findIndex((x) => !x.kid && x.w.active && x.tab.active);
        const last = mine.findIndex((x) => x.key === this.stepped?.[kind]);
        const next = mine[((shown >= 0 ? shown : last) + 1) % mine.length];
        this.stepped = { ...this.stepped, [kind]: next.key };
        if (this.pos) { this.reveal(this.where(next, this.pos)); cx.notify(); }
        if (next.kid) run("terminal.peek", { terminal: next.kid.address });
        else run("pane.focus", { pane: next.lead.pane });
      })
      .child(short ? String(mine.length) : `${mine.length} ${word}`);
  }

  // Two spaces on one machine with the same name each get a dim word after it that
  // tells them apart: their branch, else their folder, else their first tab, else a
  // number; so the list never shows one name twice.
  aliases() {
    const out = new Map();
    const same = {};
    for (const w of spaces()) (same[`${w.machine ?? ""}\n${w.name.toLowerCase()}`] ??= []).push(w);
    const ways = [(w) => w.branch, (w) => { const f = place(w, this.view.ps) ?? ""; return /^\/(Users|home)\/[^/]+\/?$/.test(f) ? "~" : base(f); }, (w) => w.tabs[0]?.name];
    for (const ws of Object.values(same)) {
      if (ws.length < 2) continue;
      const way = ways.find((f) => { const v = ws.map(f); return v.every(Boolean) && new Set(v).size === v.length; });
      ws.forEach((w, n) => out.set(w.id, way ? way(w) : `#${n + 1}`));
    }
    return out;
  }

  head({ w, g, tree }, t, level) {
    const on = w.active;
    const shut = this.shut.has(w.id);
    // Folded, what needs you in it still shows: red asks, blue new, then how many tabs.
    const mine = shut ? this.view.need.filter((x) => x.w.id === w.id) : [];
    const asks = mine.filter((x) => x.state === "ask").length;
    const count = (this.view.tabs.get(w.id) ?? []).length;
    const tip = [this.view.d.spaces[w.id]?.summary, this.gitText(g, tree, w.name)].filter(Boolean).join("\n");
    const fold = div().id(`fold-${w.id}`).flex_none().p(2).rounded(4).text_color(t.dim)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip(shut ? "Show its tabs" : "Fold its tabs away")
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => {
        cx.stop_propagation();
        shut ? this.shut.delete(w.id) : this.shut.add(w.id);
        localStorage.setItem("spaces.folded", JSON.stringify([...this.shut]));
        cx.notify();
      })
      .child(svg(`mods/workspace-chrome/chevron-${shut ? "right" : "down"}.svg`).size(11));
    return v_flex()
      .relative()
      .id(`space-${w.id}`)
      .px(8)
      .h(tree ? px(H.worktree, level) : px(H.space, level))
      .flex_none()
      .justify_center()
      .rounded(8)
      .when(on, (el) => el.bg(t.selected))
      .when(!on, (el) => el.hover((s) => s.bg(t.hover)))
      .on_hover((over, cx) => {
        if (over) this.over_space = w.id;
        else if (this.over_space === w.id) this.over_space = null;
        cx.notify();
      })
      .when(Boolean(tip), (el) => el.tooltip(tip))
      // Click to show it (the order is by what last ran, so there is no dragging).
      .on_click(() => run("space.select", { id: w.id }))
      .on_mouse_down("right", () => this.menu(w))
      .child(
        h_flex()
          .gap(9)
          .items_center()
          .when(Boolean(tree), el => el.pl(22).child(svg("mods/workspace-chrome/branch.svg").size(13).text_color(t.dim)))
          .when(!tree, el => el.child(this.avatar(w, t)))
          .child(h_flex().flex_1().min_w(0).gap(6).items_baseline()
            .child(div().flex_shrink_1().min_w(0).truncate().text_size(look().name.size).when(look().name.weight === "semibold", (el) => el.font_semibold()).when(look().name.weight === "medium", (el) => el.font_medium()).text_color(t.foreground).child(w.name))
            .when(this.view.alias.has(w.id), (el) => el.child(div().flex_shrink(3).min_w(24).truncate().text_size(11.5).text_color(t.dim).child(this.view.alias.get(w.id)))))
          .when(shut && asks > 0, (el) => el.child(this.badge(String(asks), t.blocked)))
          .when(shut && mine.length > asks, (el) => el.child(this.badge(String(mine.length - asks), t.done)))
          .when(shut, (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(`${count} ${count === 1 ? "tab" : "tabs"}`)))
          // The fold chevron: on hover, and always while folded.
          .when(count > 0 && (shut || (this.over_space === w.id && window().active)), (el) => el.child(fold)),
      );
  }

  // The rail: a space's avatar and the mark of its most urgent tab.
  compact({ w }, t) {
    const state = urgent((this.view.tabs.get(w.id) ?? []).map((x) => x.state));
    return h_flex()
      .id(`space-${w.id}`)
      .h(26)
      .flex_none()
      .justify_center()
      .items_center()
      .gap(6)
      .rounded(6)
      .when(w.active, (el) => el.bg(t.selected))
      .hover((s) => s.bg(t.hover))
      .tooltip(w.name)
      .on_click(() => run("space.select", { id: w.id }))
      .child(this.avatar(w, t, 16))
      .child(h_flex().w(14).flex_none().justify_center().child(mark(t, state)));
  }

  // Everything the list reads, once per draw (and each second, for the counts).
  compute() {
    const kids = new Map();
    const reports = new Map();
    for (const k of terminals()) {
      if (k.report) reports.set(k.address, k.report);
      if (!k.parent || k.state !== "live") continue;
      if (!kids.has(k.parent)) kids.set(k.parent, []);
      kids.get(k.parent).push(k);
    }
    this.view = { d: summaries(), a: attention(), ps: panes(), kids, reports, tabs: new Map() };
    for (const w of spaces()) this.view.tabs.set(w.id, this.tabsOf(w));
    this.view.alias = this.aliases();
    this.view.need = this.needing();
    this.noteRuns();
    // The rest of the window counts the same: the status bar reads this.
    const asks = this.view.need.filter((x) => x.state === "ask").length;
    const counts = { ask: asks, read: this.view.need.length - asks, agents: agents().length };
    if (JSON.stringify(counts) !== JSON.stringify(shared("attention.counts"))) setShared("attention.counts", counts);
    // And each tab's state, for the tab bar's marks.
    const states = {};
    for (const xs of this.view.tabs.values()) for (const x of xs) if (!x.shell) states[x.tab.id] = { s: x.subs.some((k) => kidState(k) === "ask") && x.state !== "ask" ? "ask" : x.state, p: x.lead.pane };
    if (JSON.stringify(states) !== JSON.stringify(shared("attention.tabs"))) setShared("attention.tabs", states);
  }

  render() {
    const t = theme();
    const collapsed = narrow();
    const sp = spaces();
    const ids = new Set(sp.map(p => p.id));
    // Colors of spaces gone from a machine whose layout is loaded go; the rest stay
    // (a remote machine's spaces are missing until its layout loads).
    const loaded = new Set(machines().filter((m) => m.layout === "ready").map((m) => m.name));
    const kept = Object.fromEntries(Object.entries(shared("space.colors") ?? {}).filter(([id]) => ids.has(id) || !loaded.has(id.includes("/") ? id.split("/")[0] : null)));
    let changed = Object.keys(kept).length !== Object.keys(shared("space.colors") ?? {}).length;
    // A space's color: on its machine, one no other space there has while the seven
    // last; past seven, the least used there. A color never changes after, so a
    // space is known by it in any order.
    const machineOf = (p) => p.machine ?? null;
    const usedOn = (p, c) => sp.filter((q) => q.id !== p.id && machineOf(q) === machineOf(p) && kept[q.id] === c).length;
    const pick = (p) => PALETTE.reduce((best, c) => (usedOn(p, c) < usedOn(p, best) ? c : best));
    for (const p of sp) {
      if (kept[p.id] || p.name === "~") continue;
      kept[p.id] = pick(p);
      changed = true;
    }
    // Once (seven hues now): spaces sharing a color on a machine where a free one is
    // left get their own.
    if ((shared("space.colors.v") ?? 1) < 3) {
      for (const p of sp) {
        const c = kept[p.id];
        if (!c || c.startsWith("#") || !MARK[c] || usedOn(p, c) === 0) continue;
        const free = PALETTE.find((k) => usedOn(p, k) === 0);
        if (free) { kept[p.id] = free; changed = true; }
      }
      setShared("space.colors.v", 3);
    }
    if (changed) setShared("space.colors", kept);
    this.compute();
    // Past seven spaces on a machine colors repeat: two with one color side by side in
    // the order shown (not while it holds still) give the lower one another color.
    const shown = this.ordered();
    if (!this.holding) {
      const colors = { ...(shared("space.colors") ?? {}) };
      let moved = false;
      for (const m of [null, ...this.remotes(shown)]) {
      const mine = shown.filter((r) => (r.w.machine ?? null) === m);
      for (let n = 1; n < mine.length; n++) {
        const [a, b] = [mine[n - 1].w, mine[n].w];
        if (!colors[a.id] || colors[a.id] !== colors[b.id]) continue;
        const next = mine[n + 1]?.w;
        const nearBy = [colors[a.id], next ? colors[next.id] : null];
        const onMachine = sp.filter((q) => (q.machine ?? null) === (b.machine ?? null) && q.id !== b.id).map((q) => colors[q.id]);
        const choice = PALETTE.filter((c) => !nearBy.includes(c)).reduce((best, c) => (onMachine.filter((x) => x === c).length < onMachine.filter((x) => x === best).length ? c : best), PALETTE.find((c) => !nearBy.includes(c)));
        if (choice && choice !== colors[b.id]) { colors[b.id] = choice; moved = true; }
      }
      }
      if (moved) setShared("space.colors", colors);
    }
    const need = this.view.need;
    // agent.next / agent.prev: what needs you first, then the list's order.
    const first = need.filter((x) => !x.kid).map((x) => x.lead.terminal);
    const rest = this.ordered().flatMap((r) => (this.view.tabs.get(r.w.id) ?? []).filter((x) => !x.shell).map((x) => x.lead.terminal));
    setAgentOrder([...new Set([...first, ...rest])]);
    // Denser a step at a time when it wouldn't fit; roomier only with room to spare.
    // Sizes here are at zoom 1; the block's height is zoomed.
    let level = 0;
    let room = Infinity;
    if (!collapsed && this.height > 0) {
      const zoom = Number(settings().zoom) || 1;
      room = this.height / zoom - H.header;
      const last = LEVELS.at(-1);
      const fit = LEVELS.find((l) => this.measure(l) <= room) ?? last;
      const comfy = LEVELS.find((l) => this.measure(l) <= room - SPARE) ?? last;
      level = fit >= (this.level ?? 0) ? fit : Math.max(fit, Math.min(this.level, comfy));
    }
    this.level = level;
    // The list's own viewport (not collapsed): its scroll offset is ours, so it knows
    // what is out of sight. Sizes are at zoom 1.
    const zoom = Number(settings().zoom) || 1;
    const view = Math.max(0, this.height / zoom - H.header);
    const pos = this.positions(level);
    this.pos = pos;
    this.viewH = view;
    this.maxOffset = Math.max(0, pos.height - view);
    this.offset = Math.max(0, Math.min(this.maxOffset, this.offset ?? 0));
    // In sight: wholly inside the band the pinned lines leave clear. The bottom line
    // first (it shows when anything is below the full view), then the top one.
    const hidden = { above: [], below: [] };
    if (!collapsed && this.maxOffset > 0) {
      const split = (top, bottom) => {
        const h = { above: [], below: [] };
        for (const x of need) {
          const [a, b] = this.where(x, pos);
          if (a < top) h.above.push(x);
          else if (b > bottom) h.below.push(x);
        }
        return h;
      };
      let band = [this.offset, this.offset + view];
      let h = split(...band);
      if (h.below.length) band = [band[0], band[1] - PIN];
      if (h.above.length) band = [band[0] + PIN, band[1]];
      h = split(...band);
      hidden.above = h.above;
      hidden.below = h.below;
    }
    this.band = [hidden.above.length ? PIN : 0, hidden.below.length ? PIN : 0];
    // "↓ 3 ask · 1 new": what needs you out of sight that way; a click scrolls to the nearest.
    const pin = (side, items) => {
      const asks = items.filter((x) => x.state === "ask").length;
      const news = items.length - asks;
      const nearest = side === "below" ? items.reduce((m, x) => (this.where(x, pos)[0] < this.where(m, pos)[0] ? x : m)) : items.reduce((m, x) => (this.where(x, pos)[0] > this.where(m, pos)[0] ? x : m));
      return h_flex().id(`pin-${side}`).absolute().left(8).right(10).h(22).when(side === "below", (el) => el.bottom(4)).when(side === "above", (el) => el.top(2))
        .px(8).gap(6).items_center().rounded(7).bg(t.popover).border(1).border_color(t.border).cursor_pointer().text_size(11)
        .hover((s) => s.bg(t.raised))
        .tooltip(`Out of sight ${side === "below" ? "below" : "above"}: ${items.map((x) => x.kid ? kidName(x.kid) : x.tab.name).join(", ")}. Click to scroll to the nearest (${nearest.kid ? kidName(nearest.kid) : nearest.tab.name}).`)
        .on_click((_e, cx) => { this.reveal(this.where(nearest, pos)); cx.notify(); })
        .child(div().flex_none().text_color(t.dim).child(side === "below" ? "↓" : "↑"))
        // The nearest one by what it wants (its tab in the tooltip), then how many in all.
        .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(nearest.note || nearest.tab.name))
        .when(asks > 0, (el) => el.child(div().flex_none().text_color(t.blocked).font_semibold().child(`${asks} ask`)))
        .when(asks > 0 && news > 0, (el) => el.child(div().flex_none().text_color(t.dim).child("·")))
        .when(news > 0, (el) => el.child(div().flex_none().text_color(t.done).font_semibold().child(`${news} new`)));
    };
    const thumb = this.maxOffset > 0 ? Math.max(24, (view * view) / pos.height) : 0;
    const rows = [...this.grouped(t, collapsed, level),
      // Last, after every space.
      ...(collapsed ? [] : [h_flex().id("machine-add").h(22).mt(4).px(8).gap(9).flex_none().items_center().rounded(6)
        .text_size(11.5).text_color(t.dim).cursor_pointer().hover((s) => s.bg(t.hover).text_color(t.foreground))
        .on_click(() => run("mod.open", { name: "machine-add" }))
        .child(h_flex().w(18).flex_none().justify_center().child(svg("mods/workspace-chrome/plus.svg").size(11)))
        .child("Add machine")])];
    const list = collapsed
      ? v_flex().flex_1().min_h(0).px(4).pb(H.foot).overflow_y_scrollbar().mode("always").children(rows)
      : v_flex().id("spaces-view").flex_1().min_h(0).relative().overflow_hidden()
        .on_hover((over, cx) => { if (this.overList !== over) { this.overList = over; if (!over) cx.notify(); } })
        .on_scroll_wheel((e, cx) => {
          const next = Math.max(0, Math.min(this.maxOffset, this.offset - (e.delta?.y ?? 0) / zoom));
          if (next !== this.offset) { this.offset = next; cx.notify(); }
        })
        .child(div().absolute().left(0).right(0).top(this.band[0]).bottom(this.band[1]).overflow_hidden()
          .child(v_flex().absolute().left(0).right(0).top(-this.offset - this.band[0]).px(8).pb(H.foot).children(rows)))
        .when(thumb > 0, (el) => el.child(div().absolute().right(2).w(4).rounded(2).bg(t.dim + "88")
          .top((this.offset / this.maxOffset) * (view - thumb)).h(thumb)))
        .when(hidden.above.length > 0, (el) => el.child(pin("above", hidden.above)))
        .when(hidden.below.length > 0, (el) => el.child(pin("below", hidden.below)));
    return v_flex().id("spaces-root").size_full().min_h(0).bg(t.chrome).text_size(13)
      .on_size_change((size, cx) => {
        const zoom = Number(settings().zoom) || 1;
        if (Math.abs(size.height - this.height) >= 1 || Math.abs(size.width / zoom - this.width) >= 1) { this.height = size.height; this.width = size.width / zoom; cx.notify(); }
      })
      .child(h_flex().h(H.header).flex_none().items_center().text_size(11.5).text_color(t.dim)
        .when(!collapsed, el => el.pl(16).pr(10).justify_between()
          .child(h_flex().gap(6).items_center().child("Spaces").children([this.chip(need, "ask", t), this.chip(need, "read", t)].filter(Boolean)))
          .child(div().id("space-new").size(26).flex_none().flex().items_center().justify_center().rounded(6).hover(s => s.bg(t.hover).text_color(t.foreground))
            .tooltip("New space").on_click(() => run("space.new")).child(svg("mods/workspace-chrome/plus.svg").size(14))))
        .when(collapsed, el => el.justify_center().gap(4).children([this.chip(need, "ask", t, true), this.chip(need, "read", t, true)].filter(Boolean))))
      .child(list)
      // The rail's way back out (the traffic lights cover the bar's toggle on macOS).
      .when(collapsed, (el) => el.child(h_flex().h(28).flex_none().items_center().justify_center()
        .child(div().id("expand").px(6).rounded(4).text_size(13).text_color(t.dim).hover((s) => s.bg(t.hover).text_color(t.foreground))
          .tooltip("Widen the sidebar").on_click(() => toggleSidebar()).child("»"))));
  }
}
