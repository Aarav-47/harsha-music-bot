import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set audio volume percentage (0-100)')
    .addIntegerOption((option) =>
      option
        .setName('percent')
        .setDescription('Volume level (0 to 100)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(100)
    ),

  async execute(interaction) {
    const queue = GuildQueue.managers.get(interaction.guildId);
    if (!queue) {
      return interaction.reply({
        embeds: [createErrorEmbed('Inactive Player', 'No active queue in this server!')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const level = interaction.options.getInteger('percent', true);
    const newVol = queue.setVolume(level);

    return interaction.reply({
      embeds: [createSuccessEmbed('Volume Set', `🔊 Volume updated to **${newVol}%**`)],
    });
  },
};
