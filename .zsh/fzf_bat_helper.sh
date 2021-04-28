#!/bin/zsh

fzf_bat_exec() {
    local file=$1
    local line=$2
    local lines=$LINES

    # subtract 3 for the header
    declare -i center=$(( (lines - 3) / 2 ))

    if [ $line -lt $center ]; then
        center=$line
    fi
    start=$(( line - center ))
    end=$(( lines + start ))

    bat --color always --highlight-line $line --line-range $start:$end --paging never "$file"
}
