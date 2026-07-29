import { Client, GatewayIntentBits, Collection, ActivityType } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { config, validateConfig } from './config.js';
import { GuildQueue } from './audio/GuildQueue.js';
import { createErrorEmbed } from './utils/embedBuilder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!validateConfig()) {
  console.error('\n⚠️ Please configure your DISCORD_TOKEN and CLIENT_ID in the .env file before starting Harsha.');
  process.exit(1);
}

// Create Client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

// Command collection
client.commands = new Collection();

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = (await import(pathToFileURL(filePath).href)).default;
  if (command && command.data) {
    client.commands.set(command.data.name, command);
  }
}

// Ready Event
client.once('ready', () => {
  console.log(`\n⚡ Harsha Music Bot logged in successfully as ${client.user.tag}!`);
  console.log(`🌐 Connected to ${client.guilds.cache.size} server(s).`);

  client.user.setActivity({
    name: 'ad-free music | /play',
    type: ActivityType.Listening,
  });
});

// Interaction Event Listener
client.on('interactionCreate', async (interaction) => {
  // 1. Handle Slash Commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing /${interaction.commandName}:`, error);
      const replyOptions = {
        embeds: [createErrorEmbed('Harsha Command Error', 'An unexpected error occurred while processing this command.')],
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions).catch(() => {});
      } else {
        await interaction.reply(replyOptions).catch(() => {});
      }
    }
    return;
  }

  // 2. Handle Button Interactions from Control Panel UI
  if (interaction.isButton()) {
    const queue = GuildQueue.managers.get(interaction.guildId);
    if (!queue) {
      return interaction.reply({
        embeds: [createErrorEmbed('Inactive Player', 'No active music queue in this server!')],
        ephemeral: true,
      });
    }

    try {
      await queue.handleButtonInteraction(interaction);
    } catch (error) {
      console.error('Button interaction error:', error);
    }
  }
});

// Voice State Update Listener (Auto-leave when voice channel empty)
client.on('voiceStateUpdate', (oldState, newState) => {
  const guildId = oldState.guild.id;
  const queue = GuildQueue.managers.get(guildId);
  if (!queue || !queue.connection) return;

  const channel = oldState.guild.channels.cache.get(queue.connection.joinConfig.channelId);
  if (channel) {
    // Count non-bot members in voice channel
    const members = channel.members.filter((m) => !m.user.bot);
    if (members.size === 0) {
      queue.destroy();
      if (queue.textChannel) {
        queue.textChannel.send({
          embeds: [createErrorEmbed('Harsha Auto-Disconnected', 'Left voice channel because everyone left.')],
        }).catch(() => {});
      }
    }
  }
});

// Global Error Handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Login
client.login(config.token);
