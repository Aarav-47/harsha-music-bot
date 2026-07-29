import { SlashCommandBuilder } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { createNowPlayingEmbed, createControlButtons, createErrorEmbed } from '../utils/embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show details of the song currently playing'),

  async execute(interaction) {
    const queue = GuildQueue.managers.get(interaction.guildId);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [createErrorEmbed('Nothing Playing', 'There is currently no music playing!')],
        ephemeral: true,
      });
    }

    const embed = createNowPlayingEmbed(queue.currentTrack, queue);
    const components = createControlButtons(queue.player?.state?.status === 'paused', queue.loopMode);

    return interaction.reply({ embeds: [embed], components });
  },
};
