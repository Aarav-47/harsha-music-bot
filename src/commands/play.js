import { SlashCommandBuilder } from 'discord.js';
import { GuildQueue } from '../audio/GuildQueue.js';
import { getTrackInfo } from '../utils/ytDlpHelper.js';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embedBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or playlist from YouTube/URL')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Song title, keywords, or YouTube URL')
        .setRequired(true)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction 
   */
  async execute(interaction) {
    const query = interaction.options.getString('query', true);
    const member = interaction.member;

    if (!member.voice.channel) {
      return interaction.reply({
        embeds: [createErrorEmbed('Voice Channel Required', 'You must join a voice channel first to play music!')],
        ephemeral: true,
      });
    }

    const botMember = interaction.guild.members.me;
    if (botMember.voice.channelId && botMember.voice.channelId !== member.voice.channelId) {
      return interaction.reply({
        embeds: [createErrorEmbed('Wrong Voice Channel', 'You must be in the same voice channel as the bot!')],
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      const tracks = await getTrackInfo(query, interaction.user.id);
      const queue = GuildQueue.get(interaction.client, interaction.guildId);

      await queue.connect(member.voice.channel, interaction.channel);
      await queue.enqueue(tracks);

      if (tracks.length === 1) {
        const track = tracks[0];
        return interaction.editReply({
          embeds: [
            createSuccessEmbed(
              'Track Enqueued',
              `🎵 Added **[${track.title}](${track.url})** (\`${track.formattedDuration}\`) to the queue.`
            ),
          ],
        });
      } else {
        return interaction.editReply({
          embeds: [
            createSuccessEmbed(
              'Playlist Enqueued',
              `🎶 Added **${tracks.length} tracks** to the queue.`
            ),
          ],
        });
      }
    } catch (error) {
      console.error('Play command error:', error);
      return interaction.editReply({
        embeds: [createErrorEmbed('Playback Error', error.message || 'Could not fetch or play the requested song.')],
      });
    }
  },
};
