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

call plug#end()

colorscheme old-hope

let mapleader=" "

nnoremap t :tabnew
nnoremap <Leader>[ :tabp<cr>
nnoremap <Leader>] :tabn<cr>
nnoremap <Leader>w :tabclose<cr>
nnoremap <Leader>W :hide<cr>
nnoremap <Leader>\ :vsplit<cr>
noremap <Leader>{ <C-w>h<C-w>
noremap <Leader>} <C-w>l<C-w>


nnoremap d "_d
xnoremap d "_d

nnoremap x "_x
xnoremap x "_x
