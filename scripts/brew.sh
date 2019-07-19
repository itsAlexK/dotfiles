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


# Developer stuff
brew install grep
brew install lsd
brew install neofetch
brew install bat
brew install jq
brew install stow
brew install tldr
brew install tree
brew install z
brew install fzf
yes | /usr/local/opt/fzf/install

brew install git
brew install diff-so-fancy

brew install openssh
brew install awscli
brew install csvkit

brew install pyenv
brew install pipenv

brew install postgresql

# tiling manager
brew tap koekeishiya/formulae

brew install chunkwm
brew install skhd


# cask

brew tap caskroom/cask


brew cask install alfred
brew cask install boostnote
brew cask install box-sync
brew cask install docker
brew cask install dozer
brew cask install dropbox
brew cask install firefox
brew cask install flux
brew cask install google-chrome
brew cask install iterm2
brew cask install kitty
brew cask install libreoffice
brew cask install omnidb
brew cask install pycharm
brew cask install skype
brew cask install slack
brew cask install soundflower
brew cask install soundflowerbed
brew cask install spotify
brew cask install tableplus
brew cask install transmission
brew cask install tunnelblick
brew cask install visual-studio-code
brew cask install vlc
brew cask install xquartz
brew cask install karabiner-elements
brew cask install spotmenu
