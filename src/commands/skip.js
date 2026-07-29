import { SlashCommandBuilder } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the currently playing song'),

  async execute(interaction) {
    const queue = GuildQueue.managers.get(interaction.guildId);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [createErrorEmbed('Nothing Playing', 'There is no track to skip!')],
        ephemeral: true,
      });
    }

    const skippedTrack = queue.skip();
    if (skippedTrack) {
      return interaction.reply({
        embeds: [createSuccessEmbed('Track Skipped', `⏭️ Skipped **[${skippedTrack.title}](${skippedTrack.url})**`)],
      });
    } else {
      return interaction.reply({
        embeds: [createErrorEmbed('Skip Failed', 'Could not skip current track.')],
        ephemeral: true,
      });
    }
  },
};
