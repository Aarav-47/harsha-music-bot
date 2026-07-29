import { SlashCommandBuilder } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Disconnect the bot from the voice channel'),

  async execute(interaction) {
    const queue = GuildQueue.managers.get(interaction.guildId);
    if (!queue || !queue.connection) {
      return interaction.reply({
        embeds: [createErrorEmbed('Not Connected', 'The bot is not connected to a voice channel!')],
        ephemeral: true,
      });
    }

    queue.destroy();
    return interaction.reply({
      embeds: [createSuccessEmbed('Disconnected', '👋 Disconnected from voice channel and cleared queue.')],
    });
  },
};
