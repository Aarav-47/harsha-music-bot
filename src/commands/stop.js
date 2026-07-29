import { SlashCommandBuilder } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop music playback and clear the queue'),

  async execute(interaction) {
    const queue = GuildQueue.managers.get(interaction.guildId);
    if (!queue) {
      return interaction.reply({
        embeds: [createErrorEmbed('Inactive Player', 'No active music player in this server!')],
        ephemeral: true,
      });
    }

    queue.stop();
    return interaction.reply({
      embeds: [createSuccessEmbed('Playback Stopped', '⏹️ Stopped music playback and cleared the queue.')],
    });
  },
};
