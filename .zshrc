#!/bin/zsh

if [ -n "${ZSH_DEBUGRC+1}" ]; then
    zmodload zsh/zprof
fi

# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:/usr/local/bin:$PATH

# Path to your oh-my-zsh installation.
export ZSH="${HOME}/.oh-my-zsh"

# git clone https://github.com/zsh-users/zsh-completions ${ZSH_CUSTOM:=~/.oh-my-zsh/custom}/plugins/zsh-completions
# git clone https://github.com/romkatv/powerlevel10k.git $ZSH_CUSTOM/themes/powerlevel10k
ZSH_THEME="powerlevel10k/powerlevel10k"
source $(brew --prefix)/share/powerlevel10k/powerlevel10k.zsh-theme

# Set name of the theme to load --- if set to "random", it will
# load a random theme each time oh-my-zsh is loaded, in which case,
# to know which specific one was loaded, run: echo $RANDOM_THEME
# See https://github.com/robbyrussell/oh-my-zsh/wiki/Themes

# Which plugins would you like to load?
# Standard plugins can be found in ~/.oh-my-zsh/plugins/*
# Custom plugins may be added to ~/.oh-my-zsh/custom/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(
    git
    aws
    brew
    docker
    extract
    macos
    python
    fzf
    fzf-tab
    colored-man-pages
    zsh-autosuggestions
)

#z
if command -v brew >/dev/null 2>&1; then
    # Load rupa's z if installed
    [ -f $(brew --prefix)/etc/profile.d/z.sh ] && source $(brew --prefix)/etc/profile.d/z.sh
fi

# Has to be at the very end
# Adding ito plugins work for some reason now?
# source /usr/local/share/zsh-autosuggestions/zsh-autosuggestions.zsh

export ZSH_AUTOSUGGEST_USE_ASYNC=true
export ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=244'

source $ZSH/oh-my-zsh.sh
export NOTES_DIR="$HOME/notes/notes/"

more=(
    aliases
    python
    fzf
    obsidian
    powerlevel9kconfig
    functions
    work
)

for m in $more; do
    source ${HOME}/.zsh/$m
done

autoload -Uz compinit
if [ $(date +'%j') != $(stat -f '%Sm' -t '%j' ~/.zcompdump) ]; then
    compinit
else
    compinit -C
fi

export MANPAGER='less -s -M -N -R -I -J'

# EDITOR
export EDITOR=nvim

# Increase ZSH history size. Allow 32Â³ entries; the default is 500.
export HISTSIZE=32768
export SAVEHIST=HISTSIZE
# Omit duplicates and commands that begin with a space from history.
setopt hist_ignore_all_dups

# fix zsh tabbing expansion with fzf
setopt GLOB_COMPLETE

# autocomplete alias for ssh
setopt complete_aliases

export PATH="/usr/local/opt/gnu-getopt/bin:$PATH"

[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

eval "$(direnv hook zsh)"
eval "$(zoxide init zsh)"
enable-fzf-tab # enables the fzf tab command for git plugin

# Created by `pipx` on 2023-02-07 03:35:59
export PATH="$PATH:/Users/kingkai/.local/bin"

# https://gist.github.com/elalemanyo/cb3395af64ac23df2e0c3ded8bd63b2f
if [ -n "${ZSH_DEBUGRC+1}" ]; then
    zprof
fi

eval "$(atuin init zsh --disable-up-arrow)"
