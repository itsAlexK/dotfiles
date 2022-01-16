#!/bin/bash

# install

sudo -v

# Make sure we’re using the latest Homebrew.
brew update

# Upgrade any already-installed formulae.
brew upgrade

# Save Homebrew’s installed location.
BREW_PREFIX=$(brew --prefix)

#ZSH
brew install zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
sh -c "$(curl -fLo ~/.local/share/nvim/site/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim)"

brew install zsh-autosuggestions
brew install zsh-completions

# Developer stuff

brew install awscli
brew install bat
brew install csvkit
brew tap dandavison/delta https://github.com/dandavison/delta
brew install dandavison/delta/git-delta
brew install diff-so-fancy
brew install direnv
brew install fx
brew install fzf
brew install git
brew install grep
brew install jq
brew install lsd
brew install neofetch
brew install nvim
brew install openssh
brew install poetry
brew install postgresql
brew install pyenv
brew install rg
brew install stow
brew install shellcheck
brew install tree
brew install z
brew install watch
brew install k9s
brew install kubectl
brew install helm


# tiling manager
brew tap koekeishiya/formulae

brew install yabai
brew install skhd

# cask

brew tap caskroom/cask

brew install --cask alfred
brew install --cask box-sync
brew install --cask docker
brew install --cask dozer
brew install --cask dropbox
brew install --cask firefox
brew install --cask flux
brew install --cask google-chrome
brew install --cask karabiner-elements
brew install --cask kitty
brew install --cask libreoffice
brew install --cask obsidian
brew install --cask slack
brew install --cask spotify
brew install --cask spotmenu
brew install --cask tableplus
brew install --cask transmission
brew install --cask tunnelblick
brew install --cask visual-studio-code
brew install --cask vlc
brew install --cask xquartz
brew install --cask meetingbar
brew install --cask background-music
brew install --cask hammerspoon

# https://github.com/ekreutz/CornerCal
