import { SlashCommandBuilder } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set queue repeat loop mode')
    .addStringOption((option) =>
      option
        .setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: 'Disabled (Off)', value: 'off' },
          { name: 'Single Track', value: 'track' },
          { name: 'Entire Queue', value: 'queue' }
        )
    ),

  async execute(interaction) {
    const queue = GuildQueue.managers.get(interaction.guildId);
    if (!queue) {
      return interaction.reply({
        embeds: [createErrorEmbed('Inactive Player', 'No active music player in this server!')],
        ephemeral: true,
      });
    }

    const mode = interaction.options.getString('mode', true);
    queue.setLoopMode(mode);

    const modeLabels = {
      off: 'Disabled (Off)',
      track: '🔂 Single Track',
      queue: '🔁 Entire Queue',
    };

    return interaction.reply({
      embeds: [createSuccessEmbed('Loop Mode Updated', `Loop mode set to **${modeLabels[mode]}**`)],
    });
  },
};
