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

# tiling manager
brew tap koekeishiya/formulae

brew install yabai
brew install skhd

# cask

brew tap caskroom/cask

brew cask install alfred
brew cask install box-sync
brew cask install docker
brew cask install dozer
brew cask install dropbox
brew cask install firefox
brew cask install flux
brew cask install google-chrome
brew cask install karabiner-elements
brew cask install kitty
brew cask install libreoffice
brew cask install obsidian
brew cask install slack
brew cask install spotify
brew cask install spotmenu
brew cask install tableplus
brew cask install transmission
brew cask install tunnelblick
brew cask install visual-studio-code
brew cask install vlc
brew cask install xquartz
brew cask install meetingbar

# https://github.com/ekreutz/CornerCal
