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
  : undefined;

const ytDlpExec = YTDLP_BIN ? create(YTDLP_BIN) : (await import('yt-dlp-exec')).default;

console.log(`🔧 yt-dlp binary: ${YTDLP_BIN || 'npm default'}`);

/**
 * Write cookies from environment variable to file.
 * Handles base64-encoded cookies (recommended) or raw text.
 */
function ensureCookiesFile() {
  if (process.env.YOUTUBE_COOKIES && !fs.existsSync(COOKIES_PATH)) {
    let cookieContent = process.env.YOUTUBE_COOKIES;

    // Try base64 decode first (recommended method - preserves tabs & newlines)
    try {
      const decoded = Buffer.from(cookieContent, 'base64').toString('utf-8');
      // If it looks like a valid Netscape cookies file, use the decoded version
      if (decoded.includes('.youtube.com') || decoded.includes('# Netscape') || decoded.includes('# HTTP Cookie')) {
        cookieContent = decoded;
        console.log('🍪 Decoded base64-encoded YouTube cookies.');
      }
    } catch (e) {
      // Not base64, use as-is
    }

    fs.writeFileSync(COOKIES_PATH, cookieContent, 'utf-8');
    console.log('🍪 YouTube cookies file written.');
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
 * Build common yt-dlp args array for spawn calls.
 */
function baseCookieArgs() {
  if (ensureCookiesFile()) {
    return ['--cookies', COOKIES_PATH];
  }
  return [];
}

/**
 * Extract track info using --print fields (avoids format resolution issues).
 */
export async function getTrackInfo(query, requestedBy) {
  const cleanQuery = query.trim();
  const isUrl = /^https?:\/\//i.test(cleanQuery);
  const searchTarget = isUrl ? cleanQuery : `ytsearch1:${cleanQuery}`;

  const binaryPath = YTDLP_BIN || path.join(PROJECT_ROOT, 'node_modules/yt-dlp-exec/bin/yt-dlp');

  return new Promise((resolve, reject) => {
    const args = [
      searchTarget,
      '--no-warnings',
      '--no-check-certificate',
      '--skip-download',
      '--print', '%(title)s\t%(webpage_url)s\t%(duration)s\t%(thumbnail)s\t%(uploader)s',
      ...baseCookieArgs(),
    ];

    const proc = spawn(binaryPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0 || !stdout.trim()) {
        console.error('yt-dlp metadata error:', stderr || `exit code ${code}`);
        return reject(new Error(`Failed to fetch track info: ${stderr || 'no output'}`));
      }

      const lines = stdout.trim().split('\n');
      const tracks = [];

      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length < 2) continue;

        const [title, url, durationStr, thumbnail, uploader] = parts;
        const durationSec = parseFloat(durationStr) || 0;

        tracks.push({
          title: title || 'Harsha Music Track',
          url: url || cleanQuery,
          durationSec,
          formattedDuration: formatDuration(durationSec),
          thumbnail: (thumbnail && thumbnail !== 'NA') ? thumbnail : 'https://cdn.discordapp.com/embed/avatars/0.png',
          uploader: (uploader && uploader !== 'NA') ? uploader : 'Unknown Artist',
          requestedBy,
        });
      }

      if (tracks.length === 0) {
        return reject(new Error('No valid track found.'));
      }

      resolve(tracks);
    });
  });
}

/**
 * Create a playable AudioResource from a track URL using yt-dlp piped through ffmpeg.
 */
export async function createAudioResourceFromUrl(trackUrl) {
  return new Promise((resolve, reject) => {
    const binaryPath = YTDLP_BIN || path.join(PROJECT_ROOT, 'node_modules/yt-dlp-exec/bin/yt-dlp');

    const ytdlpArgs = [
      trackUrl,
      '-f', 'bestaudio/best',
      '-o', '-',
      '--no-warnings',
      '--no-check-certificate',
      ...baseCookieArgs(),
    ];

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
