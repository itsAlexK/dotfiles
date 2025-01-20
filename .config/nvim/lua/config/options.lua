-- Options are automatically loaded before lazy.nvim startup
-- Default options that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/options.lua
-- Add any additional options here
--
vim.opt.clipboard = 'unnamedplus'

vim.o.history = 1000

-- Save undo history
vim.o.undofile = true

vim.o.laststatus = 2
vim.o.splitbelow = true
vim.o.splitright = true
vim.o.wildmenu = true
vim.o.expandtab = true
vim.o.nu = true
vim.o.smartindent = true
vim.o.wrapscan = true

-- Case insensitive searching UNLESS /C or capital in search
vim.o.smartcase = true
vim.o.ignorecase = true

vim.o.incsearch = true

-- Set completeopt to have a better completion experience
vim.o.completeopt = 'menuone,noselect'


-- Make line numbers default
vim.wo.number = true
vim.o.relativenumber = true

vim.g.NERDTreeShowHidden = 1
