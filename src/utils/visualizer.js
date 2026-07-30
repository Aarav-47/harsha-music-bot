import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../..');
const COOKIES_PATH = path.join(PROJECT_ROOT, 'cookies.txt');

/**
 * Generates a PNG waveform visualization buffer from an audio/video URL using FFmpeg showwavespic.
 * @param {string} trackUrl 
 * @returns {Promise<Buffer|null>}
 */
export async function generateWaveform(trackUrl) {
  return new Promise((resolve) => {
    // Timeout safeguard after 5 seconds
    const timer = setTimeout(() => {
      resolve(null);
    }, 5000);

    const YTDLP_BIN = fs.existsSync(path.join(PROJECT_ROOT, 'yt-dlp'))
      ? path.join(PROJECT_ROOT, 'yt-dlp')
      : path.join(PROJECT_ROOT, 'node_modules/yt-dlp-exec/bin/yt-dlp');

    const ytdlpArgs = [
      trackUrl,
      '-f', 'ba/b',
      '-o', '-',
      '--no-warnings',
      '--no-check-certificate',
    ];

    if (fs.existsSync(COOKIES_PATH)) {
      ytdlpArgs.push('--cookies', COOKIES_PATH);
    }

    const ytdlpProc = spawn(YTDLP_BIN, ytdlpArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const ffmpegProc = spawn(
      ffmpegPath,
      [
        '-i', 'pipe:0',
        '-t', '60', // only read first 60 seconds for fast visualizer generation
        '-filter_complex', 'showwavespic=s=600x120:colors=0x9B59B6|0x3498DB',
        '-frames:v', '1',
        '-f', 'image2',
        '-vcodec', 'png',
        'pipe:1',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const chunks = [];

    ytdlpProc.stdout.pipe(ffmpegProc.stdin);

    ffmpegProc.stdout.on('data', (chunk) => {
      chunks.push(chunk);
    });

    ffmpegProc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && chunks.length > 0) {
        resolve(Buffer.concat(chunks));
      } else {
        resolve(null);
      }
    });

    ytdlpProc.on('error', () => { clearTimeout(timer); resolve(null); });
    ffmpegProc.on('error', () => { clearTimeout(timer); resolve(null); });
  });
}
