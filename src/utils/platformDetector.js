/**
 * Platform Detector & Metadata Utility for Harsha Music Bot
 */

export const PLATFORMS = {
  SPOTIFY: {
    name: 'Spotify',
    color: 0x1DB954,
    icon: '🟢',
    regex: /https?:\/\/(?:open|play)\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/i,
  },
  APPLE_MUSIC: {
    name: 'Apple Music',
    color: 0xFA243C,
    icon: '🍎',
    regex: /https?:\/\/music\.apple\.com\/[a-z]{2}\/(?:album|playlist|song)\/[^/]+\/([0-9]+)/i,
  },
  SOUNDCLOUD: {
    name: 'SoundCloud',
    color: 0xFF5500,
    icon: '🟠',
    regex: /https?:\/\/(?:on\.)?soundcloud\.com\/[a-zA-Z0-9_-]+/i,
  },
  YOUTUBE: {
    name: 'YouTube',
    color: 0xFF0000,
    icon: '🔴',
    regex: /https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i,
  },
  BANDCAMP: {
    name: 'Bandcamp',
    color: 0x1DA0C3,
    icon: '🔵',
    regex: /https?:\/\/[a-zA-Z0-9_-]+\.bandcamp\.com\/(?:track|album)\//i,
  },
  TIKTOK: {
    name: 'TikTok',
    color: 0x000000,
    icon: '🎵',
    regex: /https?:\/\/(?:www\.|vm\.)?tiktok\.com\//i,
  },
  GENERIC: {
    name: 'Harsha Audio',
    color: 0x9B59B6,
    icon: '⚡',
    regex: /.*/,
  },
};

export function detectPlatform(url) {
  if (!url || typeof url !== 'string') return PLATFORMS.GENERIC;
  
  for (const key of Object.keys(PLATFORMS)) {
    if (key === 'GENERIC') continue;
    if (PLATFORMS[key].regex.test(url)) {
      return PLATFORMS[key];
    }
  }
  return PLATFORMS.GENERIC;
}

/**
 * Parses Spotify track/album metadata via Spotify embed oEmbed or web scraping
 */
export async function parseSpotifyUrl(url) {
  try {
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      // data.title is usually "Song Title by Artist" or "Album Title"
      return {
        title: data.title,
        thumbnail: data.thumbnail_url,
        query: `${data.title} audio`,
        artist: data.author_name || 'Spotify Artist',
      };
    }
  } catch (err) {
    console.error('Failed to parse Spotify oEmbed:', err.message);
  }
  return null;
}
