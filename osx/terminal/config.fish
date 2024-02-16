# file path: ~/.config/fish/config.fish

if status is-interactive
    # Commands to run in interactive sessions can go here
end

# Set up user's bins
fish_add_path /usr/bin

# Inhibit startup message
set -U fish_greeting ""

# Shorthand for "ls -A"
alias la='ls -A'

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

# Use Emacs as standard editor
set -x EDITOR emacs

# LLVM
fish_add_path /opt/homebrew/opt/llvm/bin

# GHCuo for Haskell on Mac
set -q GHCUP_INSTALL_BASE_PREFIX[1]; or set GHCUP_INSTALL_BASE_PREFIX $HOME ; set -gx PATH $HOME/.cabal/bin $PATH /Users/Sophie/.ghcup/bin

# Run GHCi with stack
alias ghci='stack exec ghci -- -W'

# TeX Live
# fish_add_path path/to/tex/bin

# Starship prompt
starship init fish | source
