import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS } from '../utils/embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display Harsha Music Bot commands & platform support'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.HARSHA)
      .setTitle('⚡ HARSHA MUSIC BOT — COMMANDS & PLATFORMS')
      .setDescription('**Harsha** streams ad-free high-fidelity audio from **YouTube, Music Videos, SoundCloud, Spotify, Vimeo, Twitch, Bandcamp, TikTok, & more**!')
      .addFields(
        { name: '▶️ `/play <query|url>`', value: 'Play ad-free audio or music video from any platform or URL.' },
        { name: '⏸️ `/pause`', value: 'Pause current audio.' },
        { name: '▶️ `/resume`', value: 'Resume paused audio.' },
        { name: '⏭️ `/skip`', value: 'Skip current track.' },
        { name: '⏹️ `/stop`', value: 'Stop playback and clear queue.' },
        { name: '📜 `/queue [page]`', value: 'Display current music queue.' },
        { name: '🎶 `/nowplaying`', value: 'Show current song & interactive button panel.' },
        { name: '🔊 `/volume <0-100>`', value: 'Set audio playback volume.' },
        { name: '🔁 `/loop <mode>`', value: 'Set repeat mode: Off, Single Track, or Queue.' },
        { name: '🔀 `/shuffle`', value: 'Randomize queued tracks.' },
        { name: '👋 `/leave`', value: 'Disconnect Harsha from voice channel.' },
        { name: '❓ `/help`', value: 'Show this menu.' }
      )
      .setFooter({ text: 'Harsha • Ad-Free Multi-Platform Music & Video Audio Streamer' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
