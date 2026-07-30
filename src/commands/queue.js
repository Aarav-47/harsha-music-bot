import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { createQueueEmbed, createErrorEmbed } from '../utils/embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Display the queued songs')
    .addIntegerOption((option) =>
      option
        .setName('page')
        .setDescription('Page number to view')
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const queue = GuildQueue.managers.get(interaction.guildId);
    if (!queue) {
      return interaction.reply({
        embeds: [createErrorEmbed('Inactive Player', 'No active queue in this server!')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const page = interaction.options.getInteger('page') || 1;
    const embed = createQueueEmbed(queue, page);

    return interaction.reply({ embeds: [embed] });
  },
};
