import { SlashCommandBuilder } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume paused audio playback'),

  async execute(interaction) {
    const queue = GuildQueue.managers.get(interaction.guildId);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [createErrorEmbed('Nothing Playing', 'There is currently no music playing!')],
        ephemeral: true,
      });
    }

    const resumed = queue.resume();
    if (resumed) {
      return interaction.reply({
        embeds: [createSuccessEmbed('Playback Resumed', '▶️ Resumed audio playback.')],
      });
    } else {
      return interaction.reply({
        embeds: [createErrorEmbed('Resume Error', 'Playback is not paused!')],
        ephemeral: true,
      });
    }
  },
};
