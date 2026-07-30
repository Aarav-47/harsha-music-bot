import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { createHistoryEmbed, createErrorEmbed } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('history')
  .setDescription('📜 View recently played tracks in this server')
  .addIntegerOption(option =>
    option.setName('page')
      .setDescription('Page number to view')
      .setRequired(false)
      .setMinValue(1)
  );

export async function execute(interaction) {
  const queue = GuildQueue.get(interaction.client, interaction.guildId);
  const page = interaction.options.getInteger('page') || 1;

  if (queue.history.length === 0) {
    return interaction.reply({
      embeds: [createErrorEmbed('History Empty', 'No songs have been played in this session yet!')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const embed = createHistoryEmbed(queue.history, page);
  return interaction.reply({ embeds: [embed] });
}
