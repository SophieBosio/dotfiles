# Custom prompt with colours and lambda
# function prompt {
#     $ESC = [char]27

#     "$ESC[32m$env:UserName@$env:COMPUTERNAME$ESC[33m $(( Get-Location | Get-Item ).Name)$ESC[32m ~ λ$ESC[0m "
# }

# oh-my-posh
oh-my-posh --init --shell pwsh --config C:/Users/sophi/OneDrive/Code/themes/oh-my-posh-themes/PrincessMod.omp.json | Invoke-Expression

# Custom bash-like aliases
function Bash-Touch {
    $file = $args[0]
    if ($file -eq $null) {
        throw "No filename supplied"
    }

    if (Test-Path $file) {
        (Get-ChildItem $file).LastWriteTime = Get-Date
    }
    else {
        echo $null > $file
    }
}
New-Alias -Name touch -Value Bash-Touch


# Doom Emacs
New-Alias -Name doom -Value $home\.emacs.d\bin\doom


# Haskell
function Stack-GHCi {
    stack exec ghci -- -W
}
New-Alias -Name sghci -Value Stack-GHCi


# Run Emerald programs using Docker
function Emerald-InDocker {
    docker run --interactive --tty --rm --volume "${PWD}:/home/docker/src/" --workdir "/home/docker/src/" portoleks/in5570v20:latest
}

New-Alias -Name emerald -Value Emerald-InDocker

# Connect to PlanetLab
function PlanetLabConnect {
    $server = $args[0]
    ssh -o StrictHostKeyChecking=no -l diku_IN5570 -i "C:\Users\sophi\.ssh\id_planetlab" $server
}

# Alias, `ConnectPL <server>` connects to that server
New-Alias -Name ConnectPL -Value PlanetLabConnect