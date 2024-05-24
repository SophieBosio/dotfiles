function switch_starship_theme
    # Detect the system theme
    set THEME (gsettings get org.gnome.desktop.interface gtk-theme)

    if string match -q "*dark*" $THEME
        # Use dark theme configuration
        cp ~/.config/starship-dark.toml ~/.config/starship.toml
    else
        # Use light theme configuration
        cp ~/.config/starship-light.toml ~/.config/starship.toml
    end

    # Reload the Fish configuration to apply changes
    exec fish
end
