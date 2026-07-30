import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS } from '../utils/embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display all Harsha Music Bot commands and features'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.HARSHA)
      .setTitle('⚡ HARSHA MUSIC BOT — COMPLETE COMMAND LIST')
      .setDescription(
        '**Harsha** is your ad-free, high-fidelity music & music video audio streamer for Discord! Supports **YouTube, Music Videos, SoundCloud, Spotify, Vimeo, Twitch, Bandcamp, TikTok, & direct links**.'
      )
      .addFields(
        {
          name: '🎵 Playback Commands',
          value:
            '• `/play <query|url>` — Play ad-free song from Spotify, YouTube, SoundCloud, etc.\n' +
            '• `/pause` — Pause current playback\n' +
            '• `/resume` — Resume paused audio\n' +
            '• `/skip` — Skip to next song in queue\n' +
            '• `/voteskip` — Vote to skip current track (majority vote)\n' +
            '• `/stop` — Stop playing and clear queue\n' +
            '• `/leave` — Disconnect bot from voice channel',
        },
        {
          name: '🎛️ Queue & Sound Effects',
          value:
            '• `/nowplaying` — Show current song details, live progress bar & visualizer\n' +
            '• `/queue [page]` — Display queued songs\n' +
            '• `/history [page]` — Show recently played song history\n' +
            '• `/filter <bass|nightcore|vaporwave|8d|off>` — Apply audio effects\n' +
            '• `/volume <0-100>` — Set audio volume percentage\n' +
            '• `/loop <off|track|queue>` — Toggle repeat mode\n' +
            '• `/shuffle` — Randomize upcoming tracks in queue',
        },
        {
          name: 'ℹ️ Info & Help',
          value: '• `/help` — Display this complete commands menu',
        },
        {
          name: '🎛️ Interactive Button Panel',
          value:
            'Harsha posts an interactive control panel in chat with live progress bar, visualizer, and buttons for **Pause/Resume (⏯️), Skip (⏭️), Stop (⏹️), Loop (🔁), and Shuffle (🔀)**.',
        }
      )
      .setFooter({ text: 'Harsha Music Bot • Ad-Free Multi-Platform Streamer' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
