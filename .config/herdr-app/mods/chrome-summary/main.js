// The sidebar's top row: Herdr, then search, Settings (a dot when an update is
// ready) and the sidebar toggle. Settings lives here so the list below keeps the
// footer's room; Add machine is the list's last row.

import { View, div, image, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { theme, run, window, shared, setShared, updates, layout } from "herdr";

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
  setShared("sidebar.collapsed", !narrow());
  run("layout.resize", { id: "sidebar", px: narrow() ? (shared("sidebar.width") ?? 268) : window()?.platform === "macos" ? 76 : 44 });
}

export default class ChromeSummary extends View {
  button(id, label, tip, action) {
    const t = theme();
    return div().id(id).relative().size(26).flex_none().flex().items_center().justify_center().rounded(6).text_color(t.muted)
      .hover(s => s.bg(t.hover).text_color(t.foreground)).tooltip(tip)
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(action).child(label);
  }

  render() {
    const t = theme();
    const collapsed = narrow();
    const mac = window()?.platform === "macos";
    const ready = Boolean(updates().app.ready);
    return h_flex().size_full().bg(t.chrome).pl(collapsed ? 6 : 14).pr(10).gap(2).items_center().text_size(13.5)
      .when(mac && !window()?.fullscreen && !collapsed, el => el.pl(76))
      .when(!collapsed, el => el
        .child(h_flex().flex_1().min_w(0).gap(8).items_center().child(image("frame/welcome/herdr.png").size(20).rounded(5)).child(div().truncate().font_semibold().text_color(t.foreground).child("Herdr")))
        .child(this.button("search", svg("mods/workspace-chrome/search.svg").size(15), "Find a space, tab or agent", () => run("mod.open", { name: "picker" })))
        .child(this.button("settings", svg("mods/workspace-chrome/settings.svg").size(15), ready ? "Settings (an update is ready)" : "Settings", () => run("app.settings"))
          .when(ready, el => el.child(div().absolute().top(4).right(4).size(6).rounded_full().bg(t.accent)))))
      // On the macOS rail the traffic lights fill the row; the list's » unfolds it.
      .when(!(collapsed && mac), el => el.child(this.button("sidebar-toggle", svg("mods/workspace-chrome/sidebar.svg").size(15), "Narrow or widen the sidebar", toggleSidebar)));
  }
}
