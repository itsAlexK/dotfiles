#!/bin/zsh

# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:/usr/local/bin:$PATH

# Path to your oh-my-zsh installation.
export ZSH="${HOME}/.oh-my-zsh"


# git clone https://github.com/zsh-users/zsh-completions ${ZSH_CUSTOM:=~/.oh-my-zsh/custom}/plugins/zsh-completions
# git clone https://github.com/romkatv/powerlevel10k.git $ZSH_CUSTOM/themes/powerlevel10k
ZSH_THEME="powerlevel10k/powerlevel10k"

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
    z
    fzf
    fzf-tab
    ripgrep
    colored-man-pages
    zsh-autosuggestions
)

autoload -Uz compinit
if [ $(date +'%j') != $(stat -f '%Sm' -t '%j' ~/.zcompdump) ]; then
  compinit
else
  compinit -C
fi


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

more=(
    aliases
    python
    fzf_bat_helper
    fzf
    obsidian
    powerlevel9kconfig
    functions
    work
)

for m in $more; do
    source ${HOME}/.zsh/$m
done

export MANPAGER='less -s -M -N -R -I -J'

# EDITOR
export EDITOR=nvim

# Increase ZSH history size. Allow 32³ entries; the default is 500.
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
enable-fzf-tab # enables the fzf tab command for git plugin

# Created by `pipx` on 2023-02-07 03:35:59
export PATH="$PATH:/Users/kingkai/.local/bin"
