import {
  createAudioPlayer,
  AudioPlayerStatus,
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
} from '@discordjs/voice';
import { createAudioResourceFromUrl } from '../utils/ytDlpHelper.js';
import {
  createNowPlayingEmbed,
  createControlButtons,
  createErrorEmbed,
  createSuccessEmbed,
  createQueueEmbed,
} from '../utils/embedBuilder.js';
import { config } from '../config.js';

export class GuildQueue {
  /**
   * @param {import('discord.js').Client} client 
   * @param {string} guildId 
   */
  constructor(client, guildId) {
    this.client = client;
    this.guildId = guildId;
    this.tracks = [];
    this.currentTrack = null;
    this.loopMode = 'off'; // 'off' | 'track' | 'queue'
    this.volume = config.defaultVolume / 100;
    
    /** @type {import('discord.js').TextBasedChannel|null} */
    this.textChannel = null;
    /** @type {import('@discordjs/voice').VoiceConnection|null} */
    this.connection = null;
    /** @type {import('@discordjs/voice').AudioPlayer|null} */
    this.player = null;
    /** @type {import('@discordjs/voice').AudioResource|null} */
    this.resource = null;
    /** @type {import('discord.js').Message|null} */
    this.nowPlayingMessage = null;

    this.idleTimer = null;
    this.isProcessing = false;

    this.initPlayer();
  }

  initPlayer() {
    this.player = createAudioPlayer();

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.handleTrackEnd();
    });

    this.player.on('error', (error) => {
      console.error(`Guild ${this.guildId} AudioPlayer Error:`, error.message);
      if (this.textChannel) {
        this.textChannel.send({
          embeds: [createErrorEmbed('Audio Playback Error', `An error occurred during playback: ${error.message}`)],
        }).catch(() => {});
      }
      this.handleTrackEnd();
    });
  }

  /**
   * Connect to voice channel
   * @param {import('discord.js').VoiceBasedChannel} voiceChannel 
   * @param {import('discord.js').TextBasedChannel} textChannel 
   */
  async connect(voiceChannel, textChannel) {
    this.textChannel = textChannel;

    if (!this.connection || this.connection.state.status === VoiceConnectionStatus.Destroyed) {
      console.log(`🔊 Joining voice channel: ${voiceChannel.name} (${voiceChannel.id})`);

      this.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: this.guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      // Debug: log all state transitions
      this.connection.on('stateChange', (oldState, newState) => {
        console.log(`🔊 Voice connection: ${oldState.status} → ${newState.status}`);
      });

      try {
        await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);
        console.log('✅ Voice connection ready!');
      } catch (error) {
        console.error('❌ Voice connection failed. Last state:', this.connection.state.status);
        this.destroy();
        throw new Error('Could not join voice channel within 30 seconds!');
      }

      this.connection.subscribe(this.player);

      this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch (error) {
          this.destroy();
        }
      });
    }

    this.resetIdleTimer();
  }

  /**
   * Enqueue tracks
   * @param {import('../utils/ytDlpHelper.js').Track[]} tracks 
   */
  async enqueue(tracks) {
    this.clearIdleTimer();
    this.tracks.push(...tracks);

    if (!this.currentTrack && this.player.state.status === AudioPlayerStatus.Idle) {
      await this.playNext();
    }
  }

  /**
   * Play the next track in queue
   */
  async playNext() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      if (this.loopMode === 'track' && this.currentTrack) {
        // Keep current track
      } else if (this.loopMode === 'queue' && this.currentTrack) {
        this.tracks.push(this.currentTrack);
        this.currentTrack = this.tracks.shift() || null;
      } else {
        this.currentTrack = this.tracks.shift() || null;
      }

      if (!this.currentTrack) {
        this.cleanNowPlayingMessage();
        this.resetIdleTimer();
        this.isProcessing = false;
        return;
      }

      this.clearIdleTimer();

      // Extract stream
      const { resource } = await createAudioResourceFromUrl(this.currentTrack.url);
      this.resource = resource;
      if (this.resource.volume) {
        this.resource.volume.setVolume(this.volume);
      }

      this.player.play(this.resource);

      // Send/Update Now Playing Embed with Interactive Buttons
      await this.sendNowPlayingMessage();

    } catch (error) {
      console.error(`Error playing track in guild ${this.guildId}:`, error);
      if (this.textChannel) {
        this.textChannel.send({
          embeds: [createErrorEmbed('Playback Failed', `Could not play track: ${this.currentTrack?.title || 'Unknown'}. Skipping...`)],
        }).catch(() => {});
      }
      this.currentTrack = null;
      this.isProcessing = false;
      this.playNext();
      return;
    }

    this.isProcessing = false;
  }

  async handleTrackEnd() {
    await this.playNext();
  }

  async sendNowPlayingMessage() {
    if (!this.textChannel || !this.currentTrack) return;
    this.cleanNowPlayingMessage();

    const embed = createNowPlayingEmbed(this.currentTrack, this);
    const components = createControlButtons(false, this.loopMode);

    try {
      this.nowPlayingMessage = await this.textChannel.send({
        embeds: [embed],
        components,
      });
    } catch (err) {
      console.error('Failed to send Now Playing embed:', err.message);
    }
  }

  async cleanNowPlayingMessage() {
    if (this.nowPlayingMessage) {
      try {
        await this.nowPlayingMessage.delete();
      } catch (e) {}
      this.nowPlayingMessage = null;
    }
  }

  pause() {
    if (this.player.state.status === AudioPlayerStatus.Playing) {
      this.player.pause();
      this.updateNowPlayingButtons(true);
      return true;
    }
    return false;
  }

  resume() {
    if (this.player.state.status === AudioPlayerStatus.Paused) {
      this.player.unpause();
      this.updateNowPlayingButtons(false);
      return true;
    }
    return false;
  }

  skip() {
    if (!this.currentTrack && this.tracks.length === 0) return false;
    const skipped = this.currentTrack;
    if (this.loopMode === 'track') {
      // Force break single track loop on manual skip
      this.currentTrack = null;
    }
    this.player.stop(true);
    return skipped;
  }

  stop() {
    this.tracks = [];
    this.currentTrack = null;
    this.player.stop(true);
    this.cleanNowPlayingMessage();
    this.resetIdleTimer();
  }

  setVolume(volPercent) {
    const targetVal = Math.min(Math.max(volPercent / 100, 0), 1);
    this.volume = targetVal;
    if (this.resource && this.resource.volume) {
      this.resource.volume.setVolume(targetVal);
    }
    return Math.round(targetVal * 100);
  }

  setLoopMode(mode) {
    // mode: 'off' | 'track' | 'queue'
    this.loopMode = mode;
    this.updateNowPlayingButtons(this.player.state.status === AudioPlayerStatus.Paused);
    return this.loopMode;
  }

  toggleLoopMode() {
    const modes = ['off', 'track', 'queue'];
    const nextIdx = (modes.indexOf(this.loopMode) + 1) % modes.length;
    this.loopMode = modes[nextIdx];
    this.updateNowPlayingButtons(this.player.state.status === AudioPlayerStatus.Paused);
    return this.loopMode;
  }

  shuffle() {
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }
  }

  async updateNowPlayingButtons(isPaused) {
    if (this.nowPlayingMessage && this.currentTrack) {
      const embed = createNowPlayingEmbed(this.currentTrack, this);
      const components = createControlButtons(isPaused, this.loopMode);
      try {
        await this.nowPlayingMessage.edit({
          embeds: [embed],
          components,
        });
      } catch (e) {}
    }
  }

  /**
   * Handle Button interactions from control panel
   * @param {import('discord.js').ButtonInteraction} interaction 
   */
  async handleButtonInteraction(interaction) {
    const { customId, member } = interaction;

    // Check if user is in voice channel
    if (!member.voice.channel) {
      return interaction.reply({
        embeds: [createErrorEmbed('Voice Channel Required', 'You must be in a voice channel to use music controls!')],
        ephemeral: true,
      });
    }

    switch (customId) {
      case 'btn_pause_resume': {
        const isPaused = this.player.state.status === AudioPlayerStatus.Paused;
        if (isPaused) {
          this.resume();
          await interaction.reply({ embeds: [createSuccessEmbed('Resumed', '▶️ Playback resumed.')], ephemeral: true });
        } else {
          this.pause();
          await interaction.reply({ embeds: [createSuccessEmbed('Paused', '⏸️ Playback paused.')], ephemeral: true });
        }
        break;
      }
      case 'btn_skip': {
        const skipped = this.skip();
        if (skipped) {
          await interaction.reply({ embeds: [createSuccessEmbed('Skipped', `⏭️ Skipped **${skipped.title}**`)], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [createErrorEmbed('Skip Error', 'No track to skip!')], ephemeral: true });
        }
        break;
      }
      case 'btn_stop': {
        this.stop();
        await interaction.reply({ embeds: [createSuccessEmbed('Stopped', '⏹️ Music stopped and queue cleared.')], ephemeral: true });
        break;
      }
      case 'btn_loop': {
        const newMode = this.toggleLoopMode();
        await interaction.reply({ embeds: [createSuccessEmbed('Loop Mode Updated', `🔁 Loop mode set to **${newMode.toUpperCase()}**`)], ephemeral: true });
        break;
      }
      case 'btn_shuffle': {
        if (this.tracks.length < 2) {
          return interaction.reply({ embeds: [createErrorEmbed('Shuffle Error', 'Need at least 2 tracks in queue to shuffle!')], ephemeral: true });
        }
        this.shuffle();
        await interaction.reply({ embeds: [createSuccessEmbed('Shuffled', `🔀 Shuffled **${this.tracks.length}** queued tracks.`)], ephemeral: true });
        break;
      }
      case 'btn_queue': {
        const embed = createQueueEmbed(this, 1);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }
    }
  }

  resetIdleTimer() {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      if (this.textChannel) {
        this.textChannel.send({
          embeds: [createErrorEmbed('Harsha Disconnected', 'Left voice channel due to 5 minutes of inactivity.')],
        }).catch(() => {});
      }
      this.destroy();
    }, config.idleTimeoutMs);
  }

  clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  destroy() {
    this.clearIdleTimer();
    this.cleanNowPlayingMessage();
    this.tracks = [];
    this.currentTrack = null;

    if (this.player) {
      this.player.stop(true);
    }
    if (this.connection) {
      try {
        this.connection.destroy();
      } catch (e) {}
      this.connection = null;
    }

    GuildQueue.managers.delete(this.guildId);
  }

  /** Static GuildQueue Manager Map */
  static managers = new Map();

  /**
   * Get or create GuildQueue for a guild
   * @param {import('discord.js').Client} client 
   * @param {string} guildId 
   * @returns {GuildQueue}
   */
  static get(client, guildId) {
    if (!GuildQueue.managers.has(guildId)) {
      GuildQueue.managers.set(guildId, new GuildQueue(client, guildId));
    }
    return GuildQueue.managers.get(guildId);
  }
}
