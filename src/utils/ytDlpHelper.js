import ytDlpExec from 'yt-dlp-exec';
import ffmpegPath from 'ffmpeg-static';
import { createAudioResource, StreamType } from '@discordjs/voice';
import { spawn } from 'child_process';

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 * @param {number} seconds 
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return 'Live / Stream';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Extract info for any query or multi-platform URL (YouTube, SoundCloud, Spotify, Vimeo, Twitch, Bandcamp, TikTok, etc.)
 * Uses iOS / Android client headers to bypass YouTube datacenter IP bot detection.
 * @param {string} query 
 * @param {string} requestedBy 
 * @returns {Promise<Array>}
 */
export async function getTrackInfo(query, requestedBy) {
  let cleanQuery = query.trim();
  const isUrl = /^https?:\/\//i.test(cleanQuery);
  const searchTarget = isUrl ? cleanQuery : `ytsearch1:${cleanQuery}`;

  try {
    const rawData = await ytDlpExec(searchTarget, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      flatPlaylist: false,
      extractorArgs: 'youtube:player_client=ios,mweb',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    });

    const output = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!output) {
      throw new Error('No media results found for query across supported platforms.');
    }

    const items = output._type === 'playlist' ? output.entries : [output];
    const tracks = [];

    for (const item of items) {
      if (!item) continue;
      tracks.push({
        title: item.title || item.track || 'Harsha Music Track',
        url: item.webpage_url || item.url || cleanQuery,
        durationSec: item.duration || 0,
        formattedDuration: formatDuration(item.duration),
        thumbnail: item.thumbnail || (item.thumbnails && item.thumbnails[0]?.url) || 'https://cdn.discordapp.com/embed/avatars/0.png',
        uploader: item.uploader || item.artist || item.channel || 'Multi-Platform Ad-Free Audio',
        requestedBy,
      });
    }

    if (tracks.length === 0) {
      throw new Error('No valid track extracted.');
    }

    return tracks;
  } catch (error) {
    console.error('yt-dlp extraction error:', error.message);
    throw new Error(`Failed to play track: ${error.message}`);
  }
}

/**
 * Create a playable AudioResource from track URL using yt-dlp & ffmpeg
 * Uses iOS / Mobile Web player clients to stream pure, high-fidelity ad-free audio on Cloud/Render IPs.
 * @param {string} trackUrl 
 * @returns {Promise<{ resource: import('@discordjs/voice').AudioResource, process: any }>}
 */
export async function createAudioResourceFromUrl(trackUrl) {
  return new Promise((resolve, reject) => {
    // Spawn yt-dlp child process with iOS player client args to bypass YouTube bot detection
    const ytdlpProc = ytDlpExec.exec(
      trackUrl,
      {
        format: 'bestaudio/best',
        output: '-',
        extractorArgs: 'youtube:player_client=ios,mweb',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      },
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    // Spawn FFmpeg to convert stream to high-quality PCM for Discord Voice
    const ffmpegProc = spawn(
      ffmpegPath,
      [
        '-i', 'pipe:0',
        '-analyzeduration', '0',
        '-loglevel', '0',
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '2',
        'pipe:1',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );

    if (ytdlpProc.stdout) {
      ytdlpProc.stdout.pipe(ffmpegProc.stdin);
    }

    ytdlpProc.on('error', (err) => {
      console.error('yt-dlp process error:', err);
    });

    ffmpegProc.on('error', (err) => {
      console.error('ffmpeg process error:', err);
      reject(err);
    });

    const resource = createAudioResource(ffmpegProc.stdout, {
      inputType: StreamType.Raw,
      inlineVolume: true,
    });

    resolve({ resource, process: ffmpegProc });
  });
}
