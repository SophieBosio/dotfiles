# Visual Studio Code Remote - Tunnels

The **Remote - Tunnels** extension lets you connect to a remote machine, like a desktop PC or virtual machine (VM), via a secure tunnel. You can then securely connect to that machine from anywhere, without the requirement of SSH.

## Getting started

- Start by running the **[VS Code Server](https://aka.ms/vscode-server-doc)** on your remote machine.
     - The CLI establishes a tunnel between a VS Code client and your remote machine. Tunneling, also known as port forwarding, securely transmits data from one network to another.
- You'll be provided a device code and URL to authenticate your GitHub account into the secure tunneling service.
- If this is your first time launching the VS Code Server on this remote machine, you'll be prompted to enter a machine name. 
- After authenticating and providing a machine name, you then have a couple options for connecting to your remote machine:
     - Select the vscode.dev link the CLI prints that's connected to your server instance.
     - Open vscode.dev or a desktop instance of VS Code directly, and run the command: `Remote - Tunnels: Connect to remote...` (you may use `F1` to open the Command Palette to find this command).

![Connection to the VS Code Server in vscode.dev](https://github.com/microsoft/vscode-docs/blob/main/docs/remote/images/vscode-server/server-connected.png)
 
You may review the [quick start](https://code.visualstudio.com/docs/remote/vscode-server#_quick-start) in the VS Code Server documentation for more information.

## Release Notes

While an optional install, this extension releases with VS Code. [VS Code release notes](https://code.visualstudio.com/updates/) include a summary of changes, with a link to [detailed remote release notes](https://github.com/microsoft/vscode-docs/tree/main/remote-release-notes).

## Questions, Feedback, Contributing

Have a question or feedback?

* See the VS Code Server [documentation](https://aka.ms/vscode-server-doc) and [FAQ](https://code.visualstudio.com/docs/remote/vscode-server#_common-questions).
* [Up-vote a feature or request a new one](https://aka.ms/vscode-remote/feature-requests), search [existing issues](https://aka.ms/vscode-remote/issues), or [report a problem](https://aka.ms/vscode-remote/issues/new).
* Contribute to [our documentation](https://github.com/Microsoft/vscode-docs).

Or connect with the community...

[![Twitter](https://microsoft.github.io/vscode-remote-release/images/Twitter_Social_Icon_24x24.png)](https://aka.ms/vscode-remote/twitter) [![Stack Overflow](https://microsoft.github.io/vscode-remote-release/images/so-image-24x24.png)](https://stackoverflow.com/questions/tagged/vscode) [![VS Code Dev Community Slack](https://microsoft.github.io/vscode-remote-release/images/Slack_Mark-24x24.png)](https://aka.ms/vscode-dev-community) [![VS CodeGitter](https://microsoft.github.io/vscode-remote-release/images/gitter-icon-24x24.png)](https://gitter.im/Microsoft/vscode)
