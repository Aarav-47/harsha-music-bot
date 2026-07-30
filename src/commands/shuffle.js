import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle all queued tracks'),

  async execute(interaction) {
    const queue = GuildQueue.managers.get(interaction.guildId);
    if (!queue || queue.tracks.length < 2) {
      return interaction.reply({
        embeds: [createErrorEmbed('Shuffle Error', 'Need at least 2 tracks in queue to shuffle!')],
        flags: MessageFlags.Ephemeral,
      });
    }

    queue.shuffle();
    return interaction.reply({
      embeds: [createSuccessEmbed('Queue Shuffled', `🔀 Shuffled **${queue.tracks.length}** tracks in the queue.`)],
    });
  },
};
