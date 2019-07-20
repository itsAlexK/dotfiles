#!/bin/zsh

# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:/usr/local/bin:$PATH

# Path to your oh-my-zsh installation.
export ZSH="${HOME}/.oh-my-zsh"

# git clone https://github.com/romkatv/powerlevel10k.git $ZSH_CUSTOM/themes/powerlevel10k
ZSH_THEME="powerlevel10k/powerlevel10k"

# Set name of the theme to load --- if set to "random", it will
# load a random theme each time oh-my-zsh is loaded, in which case,
# to know which specific one was loaded, run: echo $RANDOM_THEME
# See https://github.com/robbyrussell/oh-my-zsh/wiki/Themes


more=(
    aliases
    functions
    python
    fzf
    powerlevel9kconfig
)

for m in $more; do
    source ${HOME}/.zsh/$m
done

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
    osx
    python
    z
    fzf
    ripgrep
)

source $ZSH/oh-my-zsh.sh

#z
if command -v brew >/dev/null 2>&1; then
	# Load rupa's z if installed
	[ -f $(brew --prefix)/etc/profile.d/z.sh ] && source $(brew --prefix)/etc/profile.d/z.sh
fi

neofetch --off

# Has to be at the very end
source /usr/local/share/zsh-autosuggestions/zsh-autosuggestions.zsh