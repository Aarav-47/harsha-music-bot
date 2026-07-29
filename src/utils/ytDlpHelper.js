import { create } from 'yt-dlp-exec';
import ffmpegPath from 'ffmpeg-static';
import { createAudioResource, StreamType } from '@discordjs/voice';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../..');
const COOKIES_PATH = path.join(PROJECT_ROOT, 'cookies.txt');

// Use the latest yt-dlp binary downloaded at startup (Render/cloud),
// or fall back to the npm-bundled binary (local dev).
const YTDLP_BIN = fs.existsSync(path.join(PROJECT_ROOT, 'yt-dlp'))
  ? path.join(PROJECT_ROOT, 'yt-dlp')
  : undefined; // undefined = use default from yt-dlp-exec

const ytDlpExec = YTDLP_BIN ? create(YTDLP_BIN) : (await import('yt-dlp-exec')).default;

console.log(`🔧 yt-dlp binary: ${YTDLP_BIN || 'npm default'}`);

/**
 * Write cookies from environment variable to file (for Render / cloud hosting)
 */
function ensureCookiesFile() {
  if (process.env.YOUTUBE_COOKIES && !fs.existsSync(COOKIES_PATH)) {
    fs.writeFileSync(COOKIES_PATH, process.env.YOUTUBE_COOKIES, 'utf-8');
    console.log('🍪 YouTube cookies file written from YOUTUBE_COOKIES env var.');
  }
  return fs.existsSync(COOKIES_PATH);
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
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
 * Build common yt-dlp options, injecting cookies if available.
 */
function baseOptions() {
  const opts = {
    noWarnings: true,
    noCheckCertificate: true,
    flatPlaylist: false,
  };

  if (ensureCookiesFile()) {
    opts.cookies = COOKIES_PATH;
  }

  return opts;
}

/**
 * Extract track info from any URL or search query.
 * Supports YouTube, SoundCloud, Spotify, Vimeo, Twitch, Bandcamp, TikTok, etc.
 */
export async function getTrackInfo(query, requestedBy) {
  const cleanQuery = query.trim();
  const isUrl = /^https?:\/\//i.test(cleanQuery);
  const searchTarget = isUrl ? cleanQuery : `ytsearch1:${cleanQuery}`;

  try {
    const rawData = await ytDlpExec(searchTarget, {
      ...baseOptions(),
      dumpSingleJson: true,
    });

    const output = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!output) {
      throw new Error('No media results found.');
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
        thumbnail:
          item.thumbnail ||
          (item.thumbnails && item.thumbnails[0]?.url) ||
          'https://cdn.discordapp.com/embed/avatars/0.png',
        uploader:
          item.uploader || item.artist || item.channel || 'Unknown Artist',
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
 * Create a playable AudioResource from a track URL using yt-dlp piped through ffmpeg.
 */
export async function createAudioResourceFromUrl(trackUrl) {
  return new Promise((resolve, reject) => {
    const ytdlpArgs = [
      trackUrl,
      '-f', 'bestaudio/best',
      '-o', '-',
      '--no-warnings',
      '--no-check-certificate',
    ];

    if (ensureCookiesFile()) {
      ytdlpArgs.push('--cookies', COOKIES_PATH);
    }

    const binaryPath = YTDLP_BIN || path.join(PROJECT_ROOT, 'node_modules/yt-dlp-exec/bin/yt-dlp');

    const ytdlpProc = spawn(binaryPath, ytdlpArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

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

    ytdlpProc.stdout.pipe(ffmpegProc.stdin);

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
