import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current music playback'),

  async execute(interaction) {
    const queue = GuildQueue.managers.get(interaction.guildId);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [createErrorEmbed('Nothing Playing', 'There is no active playback to pause!')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const paused = queue.pause();
    if (paused) {
      return interaction.reply({
        embeds: [createSuccessEmbed('Playback Paused', '⏸️ Paused current audio playback.')],
      });
    } else {
      return interaction.reply({
        embeds: [createErrorEmbed('Pause Error', 'Playback is already paused or inactive!')],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
