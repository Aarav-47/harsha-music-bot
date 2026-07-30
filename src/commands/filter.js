import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('filter')
  .setDescription('🎧 Apply real-time FFmpeg audio filters')
  .addStringOption(option =>
    option.setName('type')
      .setDescription('Select audio filter effect')
      .setRequired(true)
      .addChoices(
        { name: 'Off (Clear Filter)', value: 'none' },
        { name: '🔊 Bass Boost', value: 'bass' },
        { name: '⚡ Nightcore (Speed + Pitch)', value: 'nightcore' },
        { name: '🌊 Vaporwave (Slow + Slowed)', value: 'vaporwave' },
        { name: '🌀 8D Surround Audio', value: '8d' }
      )
  );

export async function execute(interaction) {
  const { member, guildId, client, options } = interaction;

  if (!member.voice.channel) {
    return interaction.reply({
      embeds: [createErrorEmbed('Voice Channel Required', 'You must be in a voice channel to change audio filters!')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const filterType = options.getString('type');
  const queue = GuildQueue.get(client, guildId);

  await interaction.deferReply();
  const appliedFilter = await queue.setFilter(filterType);

  return interaction.editReply({
    embeds: [createSuccessEmbed('Audio Filter Updated', `🎧 Applied audio filter: **${appliedFilter.toUpperCase()}**`)],
  });
}
