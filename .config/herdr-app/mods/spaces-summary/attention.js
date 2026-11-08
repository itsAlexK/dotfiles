// What each agent's tab leaves for the person, so the sidebar can tell "needs
// you" from "carries on by itself". A turn that ends opens a record; summarize.js
// then reads the agent's last message and says whether it asks something (ask),
// finished (read) or waits on work it watches itself (waiting). Until it has, the
// turn is "pending": shown faintly and not counted, unless work still running on
// the agent's screen ("1 monitor still running") says it waits. Looking doesn't
// close a record: an ask stays until the agent works again (it was answered) or it
// is dismissed, a finished result once it has been in front of the person, window
// in front, for READ ms on end. Either way it becomes "handled" until the next turn.
// Each record keeps the agent's turn (hc counts one each time it stops working):
// a turn that ended while this window wasn't watching (it was closed, or elsewhere)
// replaces the record with what summarize.js read of that turn.
// Kept in shared("attention") = {tab: {kind, note, since, known, turn, bg}}; since:
// when it started waiting, known false when that is only a lower bound (the turn
// ended before this window saw the tab, or the tab's machine just connected: then
// every tab there "changed" at once). Helpers that ask: {"kid:<address>": {since, known}}.

import { spaces, panes, terminals, machines, hc, focused, window, shared, setShared } from "herdr";
import { summaries, leadAgent, background } from "./summarize.js";

const KEY = "attention";
const READ = 10000; // ms of looking at a finished tab without a break that reads it
const PEEK = 2000; // ms after a turn ends before its screen is read for work still running
const UNREAD = 60000; // ms a just-ended turn waits for summarize.js before it counts as a result to read
const NOTE = 24; // characters a note may have (summarize.js asks for at most this)

export const attention = () => shared(KEY) ?? {};

// What a blocked agent wants, by the kind it reported, until its words are read.
const ASKS = { permission: "Wants your permission", question: "Has a question for you", auth: "Needs you to sign in" };
export const asking = (kind) => ASKS[kind] ?? "Waiting for your answer";

// What the sidebar shows for a tab: working, ask, read, pending, waiting or quiet, a
// note, and whether that note only repeats the state (`generic`). `kind`: what a
// blocked lead agent reported (permission, question, auth).
export function stateOf(tab, rec, kind) {
  if (tab.status === "working") return { state: "working", note: "" };
  if (tab.status === "blocked") {
    const said = rec?.kind === "ask" && rec.note;
    return { state: "ask", note: said || asking(kind), generic: !said };
  }
  // The core's done: it finished while nobody looked, even if this window never saw the turn end.
  if (!rec) return tab.status === "done" ? { state: "read", note: "" } : { state: "quiet", note: "" };
  if (rec.kind === "pending") {
    if (rec.bg) return { state: "waiting", note: rec.bg };
    return Date.now() - (rec.since ?? 0) < UNREAD ? { state: "pending", note: "" } : { state: "read", note: "" };
  }
  if (rec.kind === "handled") return { state: "quiet", note: "" };
  return { state: rec.kind, note: rec.note ?? "" };
}

export class Attention {
  constructor() {
    this.last = {}; // tab -> its status at the last tick
    this.seen = {}; // tab -> ms its finished result has been in front of the person, unbroken
    this.peeking = new Set();
    this.at = Date.now();
    this.readyAt = {}; // machine -> when its layout turned ready while this ran
    this.wasReady = new Set();
    this.born = Date.now();
  }

  // Tabs whose changed_at is a machine's connect time, not a change: when it is
  // within 5 s of that machine turning ready, or (it connected before this ran)
  // when 3 or more of its tabs changed within the same 3 s before this ran.
  // Turns seen ending while this runs are exact, however many end at once.
  stamped(sp) {
    const out = new Set();
    const by = {};
    for (const s of sp) for (const t of s.tabs) if (t.changed_at != null) (by[s.machine ?? ""] ??= []).push(t);
    for (const [m, tabs] of Object.entries(by)) {
      const ready = this.readyAt[m || null];
      for (const t of tabs) {
        const before = t.changed_at < this.born + 5000;
        const near = before && tabs.filter((u) => Math.abs(u.changed_at - t.changed_at) <= 3000).length;
        if (near >= 3 || (ready != null && t.changed_at >= ready - 1000 && t.changed_at <= ready + 5000)) out.add(t.id);
      }
    }
    return out;
  }

  tick(cx) {
    const now = Date.now();
    const step = Math.min(now - this.at, 2000);
    this.at = now;
    const old = attention();
    const a = { ...old };
    const d = summaries();
    const ps = panes();
    const all = terminals();
    const turns = new Map(all.map((k) => [k.address, k.turn ?? 0]));
    const shown = window().active ? focused()?.tab : null;
    const known = new Set();
    for (const m of machines()) {
      const ready = m.layout === "ready";
      if (ready && !this.wasReady.has(m.name) && this.started) this.readyAt[m.name] = now;
      ready ? this.wasReady.add(m.name) : this.wasReady.delete(m.name);
    }
    this.started = true;
    const sp = spaces();
    const stamped = this.stamped(sp);
    for (const s of sp) {
      for (const t of s.tabs) {
        known.add(t.id);
        const was = this.last[t.id];
        this.last[t.id] = t.status;
        const lead = leadAgent(t, ps);
        if (!lead || t.status === "working") {
          delete a[t.id];
          continue;
        }
        const turn = turns.get(lead.terminal) ?? 0;
        const o = d.tabs[t.id];
        // summarize.js read this turn: its turn matches (older summaries carry
        // none: read after the tab last changed).
        const fresh = Boolean(o?.state) && (o.turn != null ? o.turn === turn : t.changed_at == null || o.at >= t.changed_at);
        const ended = (was === "working" || was === "blocked") && (t.status === "done" || t.status === "idle");
        // From an earlier turn: one ended while this window wasn't watching.
        const stale = Boolean(a[t.id]) && a[t.id].turn != null && a[t.id].turn !== turn;
        // How long it has waited: since the tab changed, else (it changed before
        // this window saw it) at least since its summary was read.
        const since = t.changed_at ?? (fresh ? o.at : null) ?? now;
        const exact = t.changed_at != null && !stamped.has(t.id);
        if (ended) a[t.id] = { kind: "pending", since: now, known: true, turn };
        else if (!a[t.id] || stale) {
          if (t.status === "blocked") a[t.id] = { kind: "ask", note: fresh && o.state === "ask" ? o.note ?? "" : "", since, known: exact, turn };
          else if (fresh && (o.state === "ask" || o.state === "waiting")) a[t.id] = { kind: o.state, note: o.note ?? "", since, known: exact, turn };
          else if (fresh && o.state === "done" && t.status === "done") a[t.id] = { kind: "read", note: o.note ?? "", since, known: exact, turn };
          // Finished, unseen, and not read yet: summarize.js reads it next.
          else if (t.status === "done") a[t.id] = { kind: "pending", since, known: exact, turn };
          else delete a[t.id];
        } else {
          // Records from before ages and turns were kept, or stamped by a connect.
          if (a[t.id].since == null) a[t.id] = { ...a[t.id], since, known: exact };
          else if (a[t.id].known !== false && stamped.has(t.id) && Math.abs(a[t.id].since - t.changed_at) <= 3000) a[t.id] = { ...a[t.id], known: false };
          if (a[t.id].turn == null) a[t.id] = { ...a[t.id], turn };
          // Words once summarize.js has read them: for a tab that blocked before it had,
          // or words too long for a row (an older prompt). Never just reworded: people
          // know an ask by its words, so new words would read as a new question.
          const r = a[t.id];
          const worn = !r.note || r.note.length > NOTE;
          if (worn && t.status === "blocked" && r.kind === "ask" && fresh && o.state === "ask" && o.note && o.at >= (t.changed_at ?? 0)) a[t.id] = { ...r, note: o.note };
          else if (worn && fresh && o.note && o.at >= (r.since ?? 0) && (o.state === r.kind || (o.state === "done" && r.kind === "read"))) a[t.id] = { ...r, note: o.note };
        }
        const r = a[t.id];
        if (r?.kind === "pending") {
          if (fresh && o.at >= (r.since ?? 0) - 1000) a[t.id] = { ...r, kind: o.state === "done" ? "read" : o.state, note: o.note ?? "" };
          else if (r.bg === undefined && now - r.since >= PEEK) this.peek(t.id, r.since, lead.terminal, cx);
        }
        if (shown === t.id && stateOf(t, a[t.id]).state === "read") {
          this.seen[t.id] = (this.seen[t.id] ?? 0) + step;
          if (this.seen[t.id] >= READ) a[t.id] = { kind: "handled", since: a[t.id]?.since ?? null, turn };
        } else delete this.seen[t.id];
      }
    }
    // Helpers that ask: since when (their own word's time, else since this saw it ask).
    const asking = new Set();
    for (const k of all) {
      if (!k.parent || k.state !== "live" || !(k.status === "blocked" || k.status === "error")) continue;
      const id = `kid:${k.address}`;
      asking.add(id);
      if (!a[id]) a[id] = { since: k.status_ms ?? now, known: k.status_ms != null };
    }
    for (const id of Object.keys(a)) if (id.startsWith("kid:") && !asking.has(id)) delete a[id];
    // Forgets tabs that are gone, on machines whose layout it can see.
    const ready = new Set(machines().filter((m) => m.layout === "ready").map((m) => m.name));
    for (const id of Object.keys(a)) if (!id.startsWith("kid:") && !known.has(id) && ready.has(id.includes("/") ? id.split("/")[0] : null)) delete a[id];
    if (JSON.stringify(a) !== JSON.stringify(old)) setShared(KEY, a);
  }

  // Work still running on its screen, until summarize.js has read the turn.
  peek(id, since, terminal, cx) {
    if (this.peeking.has(id)) return;
    this.peeking.add(id);
    cx.spawn(async () => {
      const r = await hc(["read", terminal, "--lines", "40"]).catch(() => null);
      this.peeking.delete(id);
      const a = attention();
      if (a[id]?.since !== since || a[id].kind !== "pending") return;
      setShared(KEY, { ...a, [id]: { ...a[id], bg: r?.code === 0 ? background(r.stdout) : "" } });
    });
  }

  dismiss(id) {
    const a = attention();
    setShared(KEY, { ...a, [id]: { ...a[id], kind: "handled", since: a[id]?.since ?? null } });
  }
}
