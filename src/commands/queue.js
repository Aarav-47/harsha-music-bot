import { SlashCommandBuilder } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { createQueueEmbed, createErrorEmbed } from '../utils/embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Display the current music queue')
    .addIntegerOption((option) =>
      option
        .setName('page')
        .setDescription('Page number to view')
        .setMinValue(1)
    ),

  async execute(interaction) {
    const queue = GuildQueue.managers.get(interaction.guildId);
    if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
      return interaction.reply({
        embeds: [createErrorEmbed('Empty Queue', 'The music queue is currently empty!')],
        ephemeral: true,
      });
    }

    const page = interaction.options.getInteger('page') || 1;
    const embed = createQueueEmbed(queue, page);

    return interaction.reply({ embeds: [embed] });
  },
};
