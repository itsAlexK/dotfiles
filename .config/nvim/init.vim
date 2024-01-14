syntax on

set laststatus=2
set wildmenu
set history=1000
set clipboard=unnamed
set expandtab
set ic
set incsearch
set nowrap
set nu
set shiftwidth=4
set smartcase
set smartindent
set splitbelow
set splitright
set tabstop=4 softtabstop=4
set termguicolors
set wrapscan

call plug#begin('~/.local/share/nvim/plugged')

Plug 'vim-airline/vim-airline'
Plug 'vim-airline/vim-airline-themes'
Plug 'junegunn/rainbow_parentheses.vim'
Plug 'j-tom/vim-old-hope'

Plug 'neoclide/coc.nvim', {'branch': 'release'}
Plug 'scrooloose/nerdcommenter'
Plug 'scrooloose/nerdtree'
Plug 'tiagofumo/vim-nerdtree-syntax-highlight'
Plug 'Xuyuanp/nerdtree-git-plugin'
Plug 'ctrlpvim/ctrlp.vim' " fuzzy find files
Plug 'airblade/vim-gitgutter'

Plug 'tpope/vim-fugitive'

Plug 'junegunn/fzf', { 'dir': '~/.fzf', 'do': './install --all' }
Plug 'junegunn/fzf.vim'


call plug#end()

colorscheme old-hope

# let mapleader=" "

nnoremap t :tabnew
nnoremap <Leader>[ :tabp<cr>
nnoremap <Leader>] :tabn<cr>
nnoremap <Leader>w :tabclose<cr>
nnoremap <Leader>W :hide<cr>
nnoremap <Leader>\ :vsplit<cr>
noremap <Leader>{ <C-w>h<C-w>
noremap <Leader>} <C-w>l<C-w>

let g:NERDTreeIgnore = ['^.venv$', '^venv$', '_build']
let g:NERDTreeGitStatusWithFlags = 1
nnoremap <Leader>b :NERDTreeToggle<CR>

nnoremap <Leader>p :CtrlP<cr>

let g:ctrlp_user_command = ['.git/', 'git --git-dir=%s/.git ls-files -oc --exclude-standard', '.venv/', 'venv/']


nnoremap d "_d
xnoremap d "_d

nnoremap x "_x
xnoremap x "_x

let g:coc_node_path = '/opt/homebrew/bin/node'
