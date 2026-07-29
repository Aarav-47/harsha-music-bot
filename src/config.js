import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  defaultVolume: 80,
  idleTimeoutMs: 300000, // 5 minutes idle timeout
};

export function validateConfig() {
  if (!config.token || config.token === 'your_bot_token_here') {
    console.error('❌ ERROR: DISCORD_TOKEN is missing or not set in .env file!');
    return false;
  }
  if (!config.clientId || config.clientId === 'your_client_id_here') {
    console.error('❌ ERROR: CLIENT_ID is missing or not set in .env file!');
    return false;
  }
  return true;
}
