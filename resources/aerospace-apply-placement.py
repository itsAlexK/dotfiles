#!/usr/bin/env python3
"""Re-apply AeroSpace on-window-detected placement rules after a restart.

AeroSpace only runs `if.during-aerospace-startup` rules for windows detected
while the startup session's task-local flag is set. Windows detected a moment
later (through async AX notifications) silently skip their rules, so after a
restart some apps stay on the wrong workspace. This replays every
move-node-to-workspace rule against all open windows — deterministic and
idempotent. Run it right after the server comes up.
"""

import json
import os
import re
import subprocess
import sys

CONFIG = os.path.expanduser("~/.aerospace.toml")
AEROSPACE = os.environ.get("AEROSPACE", "aerospace")


def rules_from_toml(path):
    try:
        import tomllib
    except ImportError:
        tomllib = None
    rules = []
    if tomllib is not None:
        try:
            with open(path, "rb") as f:
                cfg = tomllib.load(f)
            for cb in cfg.get("on-window-detected", []):
                app_id = cb.get("if", {}).get("app-id")
                if not app_id:
                    continue
                run = cb.get("run")
                cmds = run if isinstance(run, list) else [run]
                for cmd in cmds:
                    parts = cmd.split()
                    if len(parts) == 2 and parts[0] == "move-node-to-workspace":
                        rules.append((app_id, parts[1]))
            return rules
        except Exception:
            pass  # fall back to regex parsing below

    # Regex fallback (works on pythons without tomllib): the legacy
    # [[on-window-detected]] blocks are simple enough to parse line-wise.
    with open(path) as f:
        text = f.read()
    for block in re.findall(
        r"\[\[on-window-detected\]\](.*?)(?=\n\[\[|\Z)", text, re.S
    ):
        app = re.search(r"if\.app-id\s*=\s*['\"]([^'\"]*)['\"]", block)
        if not app:
            continue
        for ws in re.findall(
            r"move-node-to-workspace\s+['\"]?([\w.-]+)['\"]?", block
        ):
            rules.append((app.group(1), ws))
    return rules


def main():
    rules = rules_from_toml(CONFIG)
    if not rules:
        return 0
    try:
        out = subprocess.run(
            [
                AEROSPACE,
                "list-windows",
                "--monitor",
                "all",
                "--format",
                "%{window-id} %{app-bundle-id} %{workspace}",
                "--json",
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (subprocess.TimeoutExpired, OSError):
        return 0
    if out.returncode != 0:
        return 0
    try:
        windows = json.loads(out.stdout)
    except json.JSONDecodeError:
        return 0
    for w in windows:
        for app_id, ws in rules:
            if w.get("app-bundle-id") == app_id and w.get("workspace") != ws:
                subprocess.run(
                    [
                        AEROSPACE,
                        "move-node-to-workspace",
                        ws,
                        "--window-id",
                        str(w["window-id"]),
                    ],
                    capture_output=True,
                    timeout=10,
                )
    return 0


if __name__ == "__main__":
    sys.exit(main())
