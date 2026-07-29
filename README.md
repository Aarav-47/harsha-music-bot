# 🎵 Discord Music Bot

A modern, high-performance **Discord Music Bot** built with **Node.js**, **discord.js (v14)**, **@discordjs/voice**, and **yt-dlp**.

Featuring Discord Slash Commands, interactive rich embeds with control buttons, multi-server queue management, audio streaming with built-in FFmpeg, volume control, and auto-idle disconnection.

---

## ✨ Features

- ⚡ **Discord Slash Commands**: Modern `/play`, `/pause`, `/resume`, `/skip`, `/stop`, `/queue`, `/nowplaying`, `/volume`, `/loop`, `/shuffle`, `/leave`, `/help`.
- 🎛️ **Interactive UI Control Panel**: Live "Now Playing" embeds featuring action buttons:
  - ⏯️ **Play / Pause**
  - ⏭️ **Skip**
  - ⏹️ **Stop**
  - 🔁 **Loop Mode** (Off / Single Track / Entire Queue)
  - 🔀 **Shuffle**
  - 📜 **Queue View**
- 🔊 **Volume Control**: Adjust audio output levels dynamically (0-100%).
- 📜 **Queue Management**: Multi-track pagination, shuffle, single-track & full-queue repeat modes.
- ⚡ **Zero External Binary Hassle**: Bundles `ffmpeg-static` directly so no manual OS-level FFmpeg installation is needed.
- ⏱️ **Auto-Idle Timer**: Automatically leaves voice channel when empty or idle for 5 minutes.

---

## 📁 Project Structure

```
epic-planck/
├── package.json               # NPM package & scripts setup
├── .env.example               # Template for Discord bot environment variables
├── README.md                  # Detailed documentation & setup guide
└── src/
    ├── index.js               # Bot entrypoint & event listeners
    ├── config.js              # Environment variable parser
    ├── deploy-commands.js     # Slash command deployer script
    ├── audio/
    │   └── GuildQueue.js      # Per-server audio queue & connection manager
    ├── commands/              # Slash command module handlers
    │   ├── play.js
    │   ├── pause.js
    │   ├── resume.js
    │   ├── skip.js
    │   ├── stop.js
    │   ├── queue.js
    │   ├── nowplaying.js
    │   ├── volume.js
    │   ├── loop.js
    │   ├── shuffle.js
    │   ├── leave.js
    │   └── help.js
    └── utils/
        ├── embedBuilder.js    # Rich embeds & interactive button builders
        └── ytDlpHelper.js     # yt-dlp audio stream extractor
```

---

## 🚀 Step-by-Step Setup Guide

### 1. Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** at the top right and choose a name for your bot.
3. In the left menu, click **Bot**:
   - Click **Reset Token** to generate a new token. **Copy this token** (this is your `DISCORD_TOKEN`).
   - Scroll down to **Privileged Gateway Intents** and enable:
     - ✅ **Voice States Intent**
     - ✅ **Message Content Intent**
4. In the left menu, click **OAuth2** -> **General**:
   - Copy the **CLIENT ID** (Application ID). This is your `CLIENT_ID`.

---

### 2. Invite the Bot to Your Server

1. In the Discord Developer Portal, go to **OAuth2** -> **URL Generator**.
2. Under **Scopes**, select:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Under **Bot Permissions**, select:
   - ✅ `Send Messages`
   - ✅ `Embed Links`
   - ✅ `Use Slash Commands`
   - ✅ `Connect`
   - ✅ `Speak`
4. Copy the generated URL at the bottom and paste it into your web browser to invite the bot to your server.

---

### 3. Install & Configure Environment

1. Rename or copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and fill in your credentials:
   ```env
   DISCORD_TOKEN=your_actual_bot_token_here
   CLIENT_ID=your_actual_client_id_here
   GUILD_ID=your_test_guild_id_optional
   ```
   > 💡 **Tip:** Setting `GUILD_ID` allows slash commands to update **instantly** in your test server during development!

---

### 4. Install Dependencies & Deploy Commands

1. Install required packages:
   ```bash
   npm install
   ```

2. Register slash commands with Discord:
   ```bash
   npm run deploy
   ```

---

### 5. Start the Bot

Run the start command:
```bash
npm start
```

You should see output similar to:
```text
Loaded command for registration: /play
...
🤖 Bot logged in successfully as YourBotName#1234!
🌐 Connected to 1 server(s).
```

---

## 🎮 Slash Commands Reference

| Command | Description |
| :--- | :--- |
| `/play <query>` | Search YouTube or play direct video/playlist URL |
| `/pause` | Pause current song playback |
| `/resume` | Resume paused song playback |
| `/skip` | Skip the current playing track |
| `/stop` | Stop playback and clear the server queue |
| `/queue [page]` | View upcoming tracks in queue |
| `/nowplaying` | Show detailed now playing panel with control buttons |
| `/volume <level>` | Set playback volume (0% to 100%) |
| `/loop <mode>` | Toggle repeat mode: `Off`, `Single Track`, or `Entire Queue` |
| `/shuffle` | Randomize queued track list |
| `/leave` | Disconnect bot from voice channel |
| `/help` | Display interactive command list |

---

## 🛠️ Tech Stack & Dependencies

- [discord.js v14](https://discord.js.org/)
- [@discordjs/voice](https://github.com/discordjs/voice)
- [yt-dlp-exec](https://github.com/microlinkhq/yt-dlp-exec)
- [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static)
- [dotenv](https://github.com/motdotla/dotenv)
