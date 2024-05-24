if status is-interactive
    # Commands to run in interactive sessions can go here
end

# Set up user's bins
fish_add_path /home/sophie/.local/bin
fish_add_path /usr/local/bin

# Inhibit startup message
set -U fish_greeting ""

# Shorthand for "ls -A"
alias l='ls -A'

# Shorthand for committing with git
alias gac='git add . && git commit -m '

# Configuration for vterm
function vterm_printf;
    if begin; [  -n "$TMUX" ]  ; and  string match -q -r "screen|tmux" "$TERM"; end 
        # tell tmux to pass the escape sequences through
        printf "\ePtmux;\e\e]%s\007\e\\" "$argv"
    else if string match -q -- "screen*" "$TERM"
        # GNU screen (screen, screen-256color, screen-256color-bce)
        printf "\eP\e]%s\007\e\\" "$argv"
    else
        printf "\e]%s\e\\" "$argv"
    end
end

# Starship prompt
starship init fish | source

# GHCup for Haskell
set -U fish_user_paths $HOME/sophie/.ghcup/env $fish_user_paths
fish_add_path /home/sophie/.ghcup/bin

# Run GHCi with stack
alias ghci='stack exec ghci -- -W'

# TeX Live
# fish_add_path /usr/local/texlive/2023/bin/x86_64-linux
fish_add_path /usr/local/texlive/2024/bin/x86_64-linux

# Python
set -g PYTHONPATH /usr/bin/python3
fish_add_path $PYTHONPATH

# python is alias for python3
alias python='python3'

# opam configuration
source /home/sophie/.opam/opam-init/init.fish > /dev/null 2> /dev/null; or true

# Idris2
fish_add_path /home/sophie/.idris2/bin

# zoxide
zoxide init fish | source
