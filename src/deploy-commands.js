import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { config, validateConfig } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deployCommands() {
  if (!validateConfig()) {
    console.error('Cannot deploy commands without valid .env configuration.');
    process.exit(1);
  }

  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = (await import(pathToFileURL(filePath).href)).default;
    if (command && command.data) {
      commands.push(command.data.toJSON());
      console.log(`Loaded command for registration: /${command.data.name}`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands...`);

    if (config.guildId) {
      // Register for specific guild (instant)
      const data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
      console.log(`✅ Successfully registered ${data.length} commands to Guild ID: ${config.guildId}`);
    } else {
      // Register globally
      const data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );
      console.log(`✅ Successfully registered ${data.length} global application commands across Discord.`);
    }
  } catch (error) {
    console.error('❌ Failed to register slash commands:', error);
  }
}

deployCommands();
