# Custom tab titles, rendered with kitty's built-in powerline style.
#   idle shell      -> "dotfiles"            (home shows as "~")
#   program at ~    -> "herdr"
#   program in dir  -> "nvim · dotfiles"
#   ssh             -> "⇄ devbox" / "⇄ devbox:main" (remote tmux session)
import os

from kitty.boss import get_boss
from kitty.tab_bar import TabAccessor, draw_tab_with_powerline

HOME = os.path.expanduser("~")
SHELLS = {"zsh", "bash", "fish", "sh", "-zsh", "login"}
# ssh flags that consume the following argument
SSH_ARG_FLAGS = set("BbcDEeFIiJLlmOopQRSWw")


def _ssh_title(cmdline):
    args = cmdline[1:]
    positional = []
    i = 0
    while i < len(args):
        a = args[i]
        if not positional and a.startswith("-") and len(a) > 1:
            if a[-1] in SSH_ARG_FLAGS and len(a) == 2:
                i += 1
            i += 1
            continue
        positional.append(a)
        i += 1
    if not positional:
        return None
    host = positional[0].split("@")[-1].split(".")[0]
    title = f"⇄ {host}"
    remote = " ".join(positional[1:]).split()
    if "tmux" in remote and "-s" in remote:
        idx = remote.index("-s")
        if idx + 1 < len(remote):
            title += ":" + remote[idx + 1].strip("'\"")
    return title


def _title(tab_id, fallback):
    tab = get_boss().tab_for_id(tab_id)
    window = tab.active_window if tab else None
    if window is None:
        return fallback
    for proc in window.child.foreground_processes:
        cmd = proc.get("cmdline") or []
        if cmd and os.path.basename(cmd[0]) == "ssh":
            t = _ssh_title(cmd)
            if t:
                return t
    acc = TabAccessor(tab_id)
    wd = acc.active_wd
    d = "~" if not wd or wd == HOME else os.path.basename(wd)
    exe = acc.active_exe
    if not exe or exe in SHELLS:
        return d
    return exe if d == "~" else f"{exe} · {d}"


def draw_tab(draw_data, screen, tab, before, max_tab_length, index, is_last, extra_data):
    try:
        tab = tab._replace(title=_title(tab.tab_id, tab.title))
    except Exception:
        pass
    return draw_tab_with_powerline(draw_data, screen, tab, before, max_tab_length, index, is_last, extra_data)
