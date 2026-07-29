import { SlashCommandBuilder } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set audio volume level (0 to 100)')
    .addIntegerOption((option) =>
      option
        .setName('level')
        .setDescription('Volume level percentage (0 - 100)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(100)
    ),

  async execute(interaction) {
    const queue = GuildQueue.managers.get(interaction.guildId);
    if (!queue) {
      return interaction.reply({
        embeds: [createErrorEmbed('Inactive Player', 'No active music player in this server!')],
        ephemeral: true,
      });
    }

    const level = interaction.options.getInteger('level', true);
    const newVol = queue.setVolume(level);

    return interaction.reply({
      embeds: [createSuccessEmbed('Volume Set', `🔊 Volume updated to **${newVol}%**`)],
    });
  },
};
