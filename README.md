# rbxclistrap

A CLI tool for managing Roblox WindowsPlayer and WindowsStudio64 versions, allowing you to download the latest, previous, or custom version hash of Roblox. This tool also includes the ability to launch Roblox through deeplinks, with or without custom arguments and apply fast flags.

## Getting Started with rbxclistrap

### Prerequisites

Before you begin, ensure you have [Node.js](https://nodejs.org/) installed. This will also install npm (Node Package Manager), which is required to install the dependencies for rbxclistrap.

- Node.js v20 (or higher)

### Installation

1. **Download the Source Code**

2. **Install Dependencies**
   - Open a terminal in the downloaded source code directory and run:
     ```bash
     npm install
     ```

3. **Run the Application: RobloxPlayer**
   - Make sure to run it once to set the registry items required for protocols.
   Choose either method of running.
   - Start application by running:
     ```bash
     npm run start:player
     ```
   - Start application by running:
      `run-player.bat`

4. **Run the Application: RobloxStudio**
   - Make sure to run it once to set the registry items required for protocols.
   Choose either method of running.
   - Start application by running:
     ```bash
     npm run start:studio
     ```
   - Start application by running:
      `run-studio.bat`

5. **Protocols support**
   - Once you have ran either application at least once. Registry items related to protocols will be set. That allows you to run RobloxPlayer and RobloxStudio from the browser and other sources through native Roblox deeplinks. The bootstrapper will be executed first before the binary.

## FAQ

#### How can I uninstall anything associated with rbxclistrap?

Doing these will ensure complete removal of any registry entries associated with rbxclistrap from the system.

The uninstallation is only for the bootstrapper. However, any userdata-related files made by Roblox itself will not be removed. Users should manually navigate through those files to completely remove Roblox because automating that process
can result in loss of data.

1. Navigate to registry-tools. Run the following files in any order:
   - `unregister-player-protocols.reg`
   - `unregister-studio-protocols.reg`
2. Delete where you placed the `rbxclistrap` folder as a whole to complete the uninstallation.

#### Can this be used to downgrade Roblox?

Yes, just select the "2. Download the last LIVE version (downgrade)" option in the menu. This will download the previous LIVE version of Roblox.

#### Can this be used to launch Roblox games from [roblox.com](https://roblox.com)?

Yes, there is protocol support for launching games directly from the website. Please note that rbxclistrap is not intended to replace the Roblox launcher or Bloxstrap.

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
> [!IMPORTANT] Disclaimer: This project is an independent tool and is not affiliated with, endorsed by, or associated with Roblox Corporation.
