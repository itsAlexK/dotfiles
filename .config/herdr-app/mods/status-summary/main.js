// The bottom bar: where the shown space is (machine, branch), then every agent
// with what needs you, counted exactly as the Spaces sidebar counts it
// (spaces-summary publishes shared("attention.counts")), then the palette key.

import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, theme, run, window, keys, shared } from "herdr";

export default class StatusSummary extends View {
  // The palette key as actually bound, not a hardcoded one; without a
  // binding the hint stays useful ("commands") instead of lying.
  hint(t) {
    const mac = window()?.platform === "macos";
    const mod = { cmd: mac ? "⌘" : "Ctrl+", ctrl: mac ? "⌃" : "Ctrl+", shift: mac ? "⇧" : "Shift+", alt: mac ? "⌥" : "Alt+", option: mac ? "⌥" : "Alt+" };
    const b = keys().find((k) => k.section === "global" && k.action === "app.palette");
    const parts = b && b.keys.endsWith("--") ? [...b.keys.slice(0, -2).split("-"), "-"] : b?.keys.split("-");
    const key = parts && parts.map((p) => mod[p.toLowerCase()] ?? p.toUpperCase()).join("");
    return key ? `${key}  commands` : "commands";
  }

  render() {
    const t = theme();
    const space = spaces().find(s => s.active);
    const c = shared("attention.counts") ?? { ask: 0, read: 0, agents: agents().length };
    const label = (icon, text) => h_flex().gap(6).items_center().child(svg(`mods/workspace-chrome/${icon}.svg`).size(13)).child(text);
    return h_flex().size_full().px(14).gap(16).items_center().bg(t.chrome).border_t(1).border_color(t.border).text_size(11.8).text_color(t.muted)
      .child(label(space?.machine ? "server" : "monitor", space?.machine ?? "This computer"))
      .when(Boolean(space?.branch), el => el.child(label("branch", space.branch)))
      .child(div().w(1).h(12).bg(t.border))
      // Every machine's agents, not just the shown space's.
      .child(h_flex().gap(6).items_center()
        .child(`${c.agents} ${c.agents === 1 ? "agent" : "agents"} in all`)
        .when(c.ask > 0, el => el.child(div().text_color(t.blocked).child(`· ${c.ask} ask${c.ask === 1 ? "s" : ""} you`)))
        .when(c.read > 0, el => el.child(div().text_color(t.done).child(`· ${c.read} new`))))
      .child(div().flex_1())
      .child(div().id("palette").text_color(t.dim).on_click(() => run("app.palette")).child(this.hint(t)));
  }
}
