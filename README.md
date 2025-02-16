# rbxclistrap

A CLI tool for managing Roblox WindowsPlayer and WindowsStudio64 versions, allowing you to download the latest, previous, or custom version hash of Roblox. This tool also includes the ability to launch Roblox through deeplinks, with or without custom arguments and apply fast flags.

### Differences from upstream (`rbxcli`) and `rbxclistrap`
- Deeplinks Support, allows you to run Roblox Player and Roblox Studio from Roblox's website through URIs (which involves Windows' Registry)
- Automatic installation of MS Edge Webview2 when it's not yet installed (which also involves Windows' Registry)

That's all I can think of the high-level differences between the two.

## Getting Started with rbxclistrap

### Prerequisites

Before you begin, ensure you have [Node.js](https://nodejs.org/) installed. This will also install npm (Node Package Manager), which is required to install the dependencies for rbxclistrap.

- 64-bit Operating System: Microsoft Windows 10 (or higher)
- JavaScript Runtime Environment: Node.js v20 (or higher)

### Installation

1. **Download the source code. Extract the archive if necessary.**
2. **Navigate to the directory of the source code**
3. **Install dependencies**
   - Open a terminal in the downloaded source code directory and run:
     ```bash
     npm install
     ```

### Running Application
> [!NOTE]
> Navigate to the directory of rbxclistrap then run either type of applications at least once for the bootstrapper to set the registry keys required to support deeplinks.

- **Running RobloxPlayer**
    > Choose among the methods to run the RobloxPlayer.

    - Start application by running file:
      `run-player.bat`
    - Start application by running in terminal:
      ```bash
      npm run start:player
      ```
    - Start application by running in terminal (WindowsPlayer by Default):
      ```bash
      node launchBootstrapper.js
      ```
    - Start application by running in terminal:
      ```bash
      node launchBootstrapper.js WindowsPlayer
      ```
    - Start application by running in terminal:
      ```bash
      npm run cli:player
      ```
      Type 5 and press enter key.
    - Start application by running in terminal:
      ```bash
      node launchCLI.js WindowsPlayer
      ```
      Type 5 and press enter key.

- **Running RobloxStudio**
    > Choose among the methods to run the RobloxStudio.

    - Start application by running file:
      `run-studio.bat`
    - Start application by running in terminal:
      ```bash
      npm run start:studio
      ```
    - Start application by running in terminal:
      ```bash
      node launchBootstrapper.js WindowsStudio64
      ```
    - Start application by running in terminal:
      ```bash
      npm run cli:studio
      ```
      Type 5 and press enter key.
    - Start application by running in terminal:
      ```bash
      node launchCLI.js WindowsStudio64
      ```
      Type 5 and press enter key.

> [!TIP]
> Once you have run either application at least once, registry keys related to the application will be set. That allows you to run RobloxPlayer and RobloxStudio from the browser and other sources through native Roblox launch flags, arguments and URIs (deeplinks). The bootstrapper will be executed first before the binary.

## FAQ

#### Roblox Studio is stuck at the intro screen "Loading Studio..."

- Try running `rbxclistrap` with elevated "Administrator" permissions and run Studio from there.

- Try running `RobloxStudioBeta.exe` with elevated "Administrator" permissions.

- Move `rbxclistrap` to a location where it isn't near the User's Documents folder or system permission restrictive locations in general. Moving it to the Desktop always works, so you get the idea. This is most likely because of system permissions issues. So to avoid those, we prevent it from running on those types of locations.


> [!NOTE]
> Moving rbxiclistrap location also moves the `StudioVersions` downloaded. Actually, only the binaries are the ones that needed to be moved to fix this.

#### How can I uninstall anything associated with rbxclistrap?

Doing these will ensure complete removal of any set registry entries associated with rbxclistrap from the system.

1. Navigate to the directory where `rbxclistrap` is installed, then open the `registry-tools` directory. Run the following files in any order:
   - `unregister-player.reg`
   - `unregister-studio.reg`

2. Delete the `rbxclistrap` directory to complete the uninstallation. This should also delete all associated `PlayerVersions` and `StudioVersions` stored within the directory.

> [!WARNING]
> The uninstallation is only for the bootstrapper. However, any user specific data made by Roblox itself will not be removed. Users should manually navigate through those files to completely remove Roblox because automating that process can result in loss of data so it was not implemented.

#### Can this be used to downgrade Roblox?

Yes, just select the "2. Download the last LIVE version (downgrade)" option in the menu. This will download the previous LIVE version of Roblox.

#### Can this be used to launch Roblox games from [roblox.com](https://roblox.com)?

Yes, there is protocol support for launching games directly from the website.
> [!NOTE]
> rbxclistrap is not intended to replace the Roblox launcher or Bloxstrap.

#### How does this work?

At a high level, rbxclistrap retrieves the latest or specified version of Roblox's `rbxPkgManifest.txt` and downloads all necessary files from `setup.rbxcdn.com`, extracting them into the specified destination. It then creates an `AppSettings.xml` file.

#### Can I download any Roblox version using this?

Yes, select the "3. Download a custom version hash" option, then input the version hash you want to download.

#### Can I download Roblox versions from specific channels?

Yes, select the "4. Download from a specific channel" option, then enter the channel name (e.g., `zbeta` or `zintegration`).

#### Can I launch Roblox with custom arguments?

Yes, after downloading a Roblox version, select the "6. Launch Roblox with args" option to provide custom arguments for launching the game.

## Credits

- https://github.com/pizzaboxer/bloxstrap
  - Special thanks for providing inspiration and resources that helped in the development of rbxclistrap, particularly for the folder mappings used during extraction.

- https://github.com/casualdevvv/rbxcli
  - This project is a fork of `rbxcli`.

- https://www.roblox.com/
> [!IMPORTANT]
> Disclaimer: This project is an independent tool and is not affiliated with, endorsed by, or associated with Roblox and Roblox Corporation.
