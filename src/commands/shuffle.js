import { SlashCommandBuilder } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Randomly shuffle the current music queue'),

  async execute(interaction) {
    const queue = GuildQueue.managers.get(interaction.guildId);
    if (!queue || queue.tracks.length < 2) {
      return interaction.reply({
        embeds: [createErrorEmbed('Shuffle Error', 'At least 2 tracks must be in queue to shuffle!')],
        ephemeral: true,
      });
    }

    queue.shuffle();
    return interaction.reply({
      embeds: [createSuccessEmbed('Queue Shuffled', `🔀 Shuffled **${queue.tracks.length}** tracks in the queue.`)],
    });
  },
};
