import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Disconnect Harsha from the voice channel'),

  async execute(interaction) {
    const queue = GuildQueue.managers.get(interaction.guildId);
    if (!queue || !queue.connection) {
      return interaction.reply({
        embeds: [createErrorEmbed('Not Connected', 'Harsha is not in any voice channel!')],
        flags: MessageFlags.Ephemeral,
      });
    }

    queue.destroy();
    return interaction.reply({
      embeds: [createSuccessEmbed('Disconnected', '👋 Disconnected from voice channel and cleared queue.')],
    });
  },
};
