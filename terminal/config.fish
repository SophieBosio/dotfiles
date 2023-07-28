if status is-interactive
    # Commands to run in interactive sessions can go here
end

# Inhibit startup message
set -U fish_greeting ""

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

# Oh-my-posh
oh-my-posh init fish  --config ~/Documents/dotfiles/terminal/oh-my-posh-themes/arrow.omp.json | source

# GHCup for Haskell
set -U fish_user_paths $HOME/sophie/.ghcup/env $fish_user_paths
fish_add_path /home/sophie/.ghcup/bin

# Run GHCi with stack
alias ghci='stack exec ghci -- -W'

# TeX Live
fish_add_path /usr/local/texlive/2023/bin/x86_64-linux

# python is alias for python3
alias python='python3'