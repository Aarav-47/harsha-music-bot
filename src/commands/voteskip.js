import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('voteskip')
  .setDescription('🗳️ Vote to skip the currently playing track');

export async function execute(interaction) {
  const { member, guildId, client } = interaction;

  if (!member.voice.channel) {
    return interaction.reply({
      embeds: [createErrorEmbed('Voice Channel Required', 'You must be in a voice channel to vote skip!')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const queue = GuildQueue.get(client, guildId);
  if (!queue.currentTrack) {
    return interaction.reply({
      embeds: [createErrorEmbed('Nothing Playing', 'There is no track currently playing to skip.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const listenersCount = member.voice.channel.members.filter(m => !m.user.bot).size;
  const result = queue.voteSkip(member.id, listenersCount);

  if (result.skippedInstantly) {
    return interaction.reply({
      embeds: [createSuccessEmbed('Track Skipped', `⏭️ Instantly skipped **${result.track.title}**!`)],
    });
  }

  if (result.votesReached) {
    return interaction.reply({
      embeds: [createSuccessEmbed('Vote Passed', `🗳️ Majority vote reached! Skipped **${result.track.title}**!`)],
    });
  }

  return interaction.reply({
    embeds: [createSuccessEmbed('Vote Counted', `🗳️ <@${member.id}> voted to skip! (${result.votesCount}/${result.votesNeeded} votes needed)`)],
  });
}
