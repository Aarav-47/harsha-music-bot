import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const COLORS = {
  PRIMARY: 0x5865F2, // Discord Blurple
  SUCCESS: 0x57F287, // Emerald Green
  WARNING: 0xFEE75C, // Gold Yellow
  ERROR: 0xED4245,   // Crimson Red
  HARSHA: 0xFF0055,  // Harsha Vibrant Pink/Magenta
};

/**
 * Generate visual progress bar string
 */
export function createProgressBar(currentSec = 0, totalSec = 0, length = 14) {
  if (!totalSec || isNaN(totalSec) || totalSec === 0) {
    return '🔘' + '▬'.repeat(length);
  }
  const progress = Math.min(Math.max(currentSec / totalSec, 0), 1);
  const index = Math.floor(progress * length);
  return '▬'.repeat(index) + '🔘' + '▬'.repeat(length - index);
}

/**
 * Create Harsha Now Playing Embed
 */
export function createNowPlayingEmbed(track, queue, elapsedSec = 0) {
  const loopStatusMap = {
    off: '➡️ Off',
    track: '🔂 Single Track',
    queue: '🔁 Entire Queue',
  };

  const volumePct = Math.round((queue.volume || 0.8) * 100);
  const platform = track.platform || { name: 'Harsha Audio', color: COLORS.HARSHA, icon: '⚡' };
  const filterName = (queue.activeFilter || 'none').toUpperCase();

  const currentFormatted = formatSec(elapsedSec);
  const totalFormatted = track.formattedDuration || 'Live';
  const progressBarStr = createProgressBar(elapsedSec, track.durationSec || 0, 12);

  const embed = new EmbedBuilder()
    .setColor(platform.color || COLORS.HARSHA)
    .setAuthor({ name: `${platform.icon} HARSHA MUSIC • NOW PLAYING (${platform.name.toUpperCase()})`, iconURL: 'https://cdn.discordapp.com/emojis/853303668853768222.gif' })
    .setTitle(track.title)
    .setURL(track.url || track.originalUrl)
    .setThumbnail(track.thumbnail)
    .addFields(
      { name: '👤 Artist / Channel', value: `\`${track.uploader}\``, inline: true },
      { name: '⏱️ Duration', value: `\`${totalFormatted}\``, inline: true },
      { name: '🙋 Requested By', value: `<@${track.requestedBy}>`, inline: true },
      { name: '🔊 Volume', value: `\`${volumePct}%\``, inline: true },
      { name: '🎧 Filter', value: `\`${filterName}\``, inline: true },
      { name: '🔁 Loop Mode', value: `\`${loopStatusMap[queue.loopMode] || 'Off'}\``, inline: true },
      { name: '⏳ Progress', value: `\`${progressBarStr}\` \`[${currentFormatted} / ${totalFormatted}]\``, inline: false }
    )
    .setFooter({ text: `Harsha • Source: ${platform.name} • ${queue.tracks.length} track(s) in queue` })
    .setTimestamp();

  return embed;
}

function formatSec(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Create History Embed
 */
export function createHistoryEmbed(history, page = 1) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.HARSHA)
    .setTitle(`📜 Harsha Recently Played History (${history.length} tracks)`)
    .setTimestamp();

  if (history.length === 0) {
    embed.setDescription('No songs have been played yet in this session!');
    return embed;
  }

  const itemsPerPage = 10;
  const totalPages = Math.ceil(history.length / itemsPerPage) || 1;
  const start = (page - 1) * itemsPerPage;
  const pageHistory = history.slice(start, start + itemsPerPage);

  let description = '';
  pageHistory.forEach((t, i) => {
    description += `**${start + i + 1}.** [${t.title}](${t.url}) | \`${t.formattedDuration}\` - Req by <@${t.requestedBy}>\n`;
  });

  embed.setDescription(description);
  embed.setFooter({ text: `Harsha Music • Page ${page} of ${totalPages}` });
  return embed;
}

/**
 * Create Interactive Control Button Row
 */
export function createControlButtons(isPaused = false, loopMode = 'off') {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_pause_resume')
      .setLabel(isPaused ? '▶️ Resume' : '⏸️ Pause')
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_skip')
      .setLabel('⏭️ Skip')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_stop')
      .setLabel('⏹️ Stop')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('btn_loop')
      .setLabel(`🔁 Loop (${loopMode.toUpperCase()})`)
      .setStyle(loopMode !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_shuffle')
      .setLabel('🔀 Shuffle')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1];
}

/**
 * Create Queue Embed
 */
export function createQueueEmbed(queue, page = 1) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.HARSHA)
    .setTitle(`📜 Harsha Music Queue (${queue.tracks.length} tracks)`)
    .setTimestamp();

  if (!queue.currentTrack && queue.tracks.length === 0) {
    embed.setDescription('The Harsha queue is currently empty. Add songs using `/play`!');
    return embed;
  }

  let description = '';
  if (queue.currentTrack) {
    description += `**Now Playing:**\n🎶 [${queue.currentTrack.title}](${queue.currentTrack.url}) | \`${queue.currentTrack.formattedDuration}\` (Req: <@${queue.currentTrack.requestedBy}>)\n\n**Up Next:**\n`;
  }

  const itemsPerPage = 10;
  const totalPages = Math.ceil(queue.tracks.length / itemsPerPage) || 1;
  const start = (page - 1) * itemsPerPage;
  const pageTracks = queue.tracks.slice(start, start + itemsPerPage);

  if (pageTracks.length === 0 && queue.tracks.length > 0) {
    description += '*No tracks on this page.*';
  } else {
    pageTracks.forEach((t, i) => {
      description += `**${start + i + 1}.** [${t.title}](${t.url}) | \`${t.formattedDuration}\` - <@${t.requestedBy}>\n`;
    });
  }

  embed.setDescription(description);
  embed.setFooter({ text: `Harsha Music • Page ${page} of ${totalPages} • Loop: ${queue.loopMode.toUpperCase()}` });
  return embed;
}

/**
 * Helper Embeds
 */
export function createSuccessEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setFooter({ text: 'Harsha Music Bot' })
    .setTimestamp();
}

export function createErrorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setFooter({ text: 'Harsha Music Bot' })
    .setTimestamp();
}
