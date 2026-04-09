# dotfiles

Personal macOS development environment for itsalexk. Managed with **GNU Stow** — running `stow -R -v .` from the repo root creates symlinks in `~/` mirroring the repo structure.

## Applying changes

```bash
cd ~/dotfiles
stow -R -v .          # restow everything (idempotent)
```

Ignore patterns are in `.stow-local-ignore` (`.git`, `.DS_Store`, `karabiner.json`, etc.).

## Repository structure

```
dotfiles/
├── .zshrc                  # Main shell config (oh-my-zsh + p10k)
├── .zsh/                   # Sourced shell modules
├── .config/                # XDG config dir — all app configs
├── .gitconfig              # Git settings + aliases
├── .aerospace.toml         # AeroSpace tiling window manager
├── .hammerspoon/           # Hammerspoon automation (Hyper key)
├── .claude/                # Claude Code settings
├── scripts/                # Bootstrap and setup scripts
└── resources/              # Reference files, fonts, binaries, agent skills
```

## Shell setup — .zsh/ modules

| File | Purpose |
|------|---------|
| `aliases` | Aliases: `bat`, `rg` (with sane ignores), `ls` → lsd, `vim` → nvim, `g` → gemini, `ag` → antigravity, `ssh` → colorssh |
| `functions` | `twm` (yabai/skhd control), `km` (hidutil key remapping), `colorssh` (kitty bg color by env), `tabc`/`tab-reset`, `wttr`, `awscred` |
| `work` | Amazon-specific: AWS profiles, ada credentials, kinit/mwinit/Yubikey auth, brazil build tools |
| `fzf` | FZF helpers: `hf` (history search), `gli` (git log browser), `fif` (find-in-file), `fzfjson` |
| `python` | pyenv init, pipenv venv-in-project, UTF-8 I/O |
| `obsidian` | `obs` command — open Obsidian vaults from CLI with fzf |
| `powerlevel9kconfig` | Powerlevel10k prompt theme settings |

## Key configs — .config/

| Directory | Tool | Notes |
|-----------|------|-------|
| `nvim/` | Neovim (LazyVim) | `lua/config/`, `lua/plugins/` — LSP, treesitter, lualine, gitsigns |
| `kitty/` | Kitty terminal | Primary terminal; bg color changes via `colorssh` |
| `kanata/` | Kanata keyboard remapper | Home row mods + Hyper key. Uses `resources/kanata_macos_cmd_allowed_arm64` binary |
| `karabiner/` | Karabiner-Elements | Excluded from stow (managed separately) |
| `aerospace/` | AeroSpace | Root-level `.aerospace.toml` is the actual config |
| `sketchybar/` | Sketchybar | Lua-based menubar; auto-started by AeroSpace |
| `mise/` | mise runtime manager | Python 3.8–3.12, Node 24 |
| `atuin/` | Atuin shell history | Arrow key binding disabled in favour of fzf |
| `helix/` | Helix editor | Secondary editor |
| `raycast/` | Raycast | Extensions + Amazon Raycast integrations |
| `smithy-mcp/` | Smithy MCP | Amazon MCP server bundles (andes, builder, diag, datanet) |

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/brew.sh` | Full Homebrew bootstrap — dev tools, apps, fonts |
| `scripts/install-kanata.sh` | Install kanata as a macOS LaunchDaemon with sudoers entry |
| `scripts/macos.sh` | macOS system `defaults write` preferences (~750 settings) |
| `scripts/setup-agent-skills.sh` | Symlink `~/.claude/skills` and `~/.agents/skills` → `resources/agents/skills/` |

## Agent skills

Shared skills live in `resources/agents/skills/` and are symlinked to where each tool expects them:

```
~/.claude/skills  →  dotfiles/resources/agents/skills
~/.agents/skills  →  dotfiles/resources/agents/skills
```

Run `scripts/setup-agent-skills.sh` to create/repair these symlinks. Skills follow the [Agent Skills open standard](https://agentskills.io) — each skill is a directory with a `SKILL.md` file:

```
resources/agents/skills/
  my-skill/
    SKILL.md       # YAML frontmatter + instructions
```

## Claude Code integration

`.claude/settings.local.json` contains session permissions. Global Claude Code settings (model, hooks, etc.) are in `~/.claude/settings.json` (not stowed — managed by Claude Code itself).

## Keyboard setup

Two layers work together:
- **Kanata** (`scripts/install-kanata.sh`) — system-level remapping; runs as LaunchDaemon. Config: `.config/kanata/macos.kbd`
- **Karabiner-Elements** — complex modifications (excluded from stow, managed by the app)
- **Hammerspoon** `.hammerspoon/hyper.lua` — Hyper key application shortcuts

## Window management

**AeroSpace** (`.aerospace.toml`):
- Workspaces: 1-chat, 2-dev, 3-notes, 4-reading, 5-alt, 6-video, 7, 8
- Focus: `alt-ctrl-{a,s,d,w}` | Swap: `alt-ctrl-cmd-{a,s,d,w}` | Switch workspace: `alt-ctrl-{1-8}`
- Auto-assigns Firefox→2-dev, Slack→1-chat, Obsidian→3-notes, etc.
- Launches sketchybar and borders on start

## Git conventions

- Pager: `delta` (dark theme)
- Editor: `nvim`
- Key aliases: `lg` (fzf log), `save` (quick commit), `undo` (soft reset), `cleanup` (prune branches), `recent` (last 10 branches)
