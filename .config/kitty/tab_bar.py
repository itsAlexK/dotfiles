# Custom tab titles, rendered with kitty's built-in powerline style.
#   idle shell      -> "dotfiles"            (home shows as "~")
#   program at ~    -> "herdr"
#   program in dir  -> "nvim · dotfiles"
#   ssh             -> "⇄ devbox" / "⇄ devbox:main" (remote tmux session)
# Relies on kitty internals; any failure falls back to kitty's own title.
import os

from kitty.boss import get_boss
from kitty.tab_bar import TabAccessor, draw_tab_with_powerline

HOME = os.path.expanduser("~")
SHELLS = {"zsh", "bash", "fish", "sh", "nu", "pwsh", "login"}
# flags that consume the following argument
SSH_ARG_FLAGS = set("BbcDEeFIiJLlmOopQRSWw")
AUTOSSH_ARG_FLAGS = SSH_ARG_FLAGS | {"M"}


def _host_title(args, arg_flags):
    positional = []
    i = 0
    while i < len(args):
        a = args[i]
        if not positional and a.startswith("-") and len(a) > 1:
            if len(a) == 2 and a[1] in arg_flags:
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


def _remote_title(cmd):
    exe = os.path.basename(cmd[0])
    if exe == "ssh":
        return _host_title(cmd[1:], SSH_ARG_FLAGS)
    if exe == "autossh":
        return _host_title(cmd[1:], AUTOSSH_ARG_FLAGS)
    if exe in ("kitten", "kitty") and "ssh" in cmd[1:3]:
        return _host_title(cmd[cmd.index("ssh") + 1:], SSH_ARG_FLAGS)
    if exe == "mosh":
        return _host_title(cmd[1:], set())
    if exe == "mosh-client" and "-#" in cmd:
        # mosh-client -# 'original mosh args' | ip port
        return _host_title(cmd[cmd.index("-#") + 1].split(), set())
    return None


def _title(tab_id, fallback):
    tab = get_boss().tab_for_id(tab_id)
    window = tab.active_window if tab else None
    if window is None:
        return fallback
    for proc in window.child.foreground_processes:
        cmd = proc.get("cmdline") or []
        if cmd:
            t = _remote_title(cmd)
            if t:
                return t
    acc = TabAccessor(tab_id)
    wd = acc.active_wd
    d = "~" if not wd or wd == HOME else os.path.basename(wd)
    exe = acc.active_exe
    if not exe or exe.lstrip("-") in SHELLS:
        return d
    return exe if d == "~" else f"{exe} · {d}"


def draw_tab(draw_data, screen, tab, before, max_tab_length, index, is_last, extra_data):
    try:
        custom = tab._replace(title=_title(tab.tab_id, tab.title))
        return draw_tab_with_powerline(draw_data, screen, custom, before, max_tab_length, index, is_last, extra_data)
    except Exception:
        return draw_tab_with_powerline(draw_data, screen, tab, before, max_tab_length, index, is_last, extra_data)
