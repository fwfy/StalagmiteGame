import { createLogger } from "./logger.js";

class BetterAudioBSN {
    constructor(audioContext, buffer, { loop = false } = {}) {
        this.context = audioContext;
        this.buffer = buffer;
        this.loop = loop;
        this._playing = false;
        this._paused = false;
        this._pauseTime = 0;
        this._startedAt = 0;
        this._dest = null;
        this._source = this._createSource();
    }
    _createSource() {
        const src = this.context.createBufferSource();
        src.buffer = this.buffer;
        src.loop = this.loop;
        if(this._dest) src.connect(this._dest);
        return src;
    }
    start(offset = 0) {
        if(this._playing) return;
        this._startedAt = this.context.currentTime - offset;
        this._source?.start(null, offset);
    }
    stop() {
        this._source?.stop();
        this._playing = false;
    }
    get position() {
        const elapsed = this.context.currentTime - this._startedAt;
        const duration = this.buffer.duration;
        if(this.loop) {
            return elapsed % duration
        } else {
            return Math.min(elapsed, duration);
        }
    }
    get pctCompleted() {
        return this.position / this.buffer.duration;
    }
    connect(dest) {
        this._dest = dest;
        this._source?.connect(dest);
    }
    pause() {
        this.paused = true;
        this.pausedPos = this.position;
        this._source?.stop();
    }
    resume() {
        if(!this.paused) return;
        this._source = this._createSource();
        this.start(this.pausedPos);
    }
}

export class AudioManager {
    #log = createLogger("AudioManager");
    constructor() {
        this.audioContext = new AudioContext();
        this.channels = {};
        this.sounds = {};
        this.queuedSounds = [];
        this.soundsPlaying = [];
        this.soundsPaused = [];
        this.registerChannel("Music");
        this.registerChannel("SFX");
    }
    registerChannel(name, defaultVolume = 0.1) {
        this.channels[name] = { 
            sounds: {},
            get volume() {
                return this.gainNode.gain.value;
            },
            set volume(val) {
                return this.gainNode.gain.value = val;
            }
        };
        let channel = this.channels[name];
        channel.gainNode = this.audioContext.createGain();
        channel.gainNode.connect(this.audioContext.destination);
        channel.gainNode.gain.value = defaultVolume;
        this.#log(`Registered new channel: "${name}"`);
    }
    async getAudioFromFile(filepath) {
        const response = await fetch(filepath);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer;
    }
    async registerSound(name, filename, channel, loop=false) {
        if (!this.channels[channel]) {
            throw new Error("No channel with that name exists!");
        }
        let data = await this.getAudioFromFile(filename);
        this.sounds[name] = {
            data,
            channel,
            loop
        }
        this.#log(`Registered sound "${name}" for channel "${channel}"`);
        this.releaseQueuedSounds();
    }
    haltChannel(channel) {
        this.#log(`Stopping all sounds from channel "${channel}"`);
        for(const sound of this.soundsPlaying.filter(e => e._audioMgrChannel == channel)) {
            sound.stop();
        }
    }
    haltAll() {
        this.#log(`Halting all sounds from all channels!`);
        for(const channel in this.channels) {
            this.haltChannel(channel);
        }
    }
    haltInstancesOf(soundName) {
        this.#log(`Halting all instances of sound "${soundName}"`);
        for(const sound of this.soundsPlaying.filter(e => e._audioMgrName == soundName)) {
            sound.stop();
        }
    }
    pauseChannel(channel) {
        this.#log(`Pausing all sounds from channel "${channel}"`);
        for(const sound of this.soundsPlaying.filter(e => e._audioMgrChannel == channel)) {
            sound.pause();
        }
    }
    pauseInstancesOf(soundName) {
        this.#log(`Pausing all instances of sound "${soundName}"`);
        for(const sound of this.soundsPlaying.filter(e => e._audioMgrName == soundName)) {
            sound.pause();
        }
    }
    pauseAll() {
        this.#log(`Pausing all sounds from all channels!`);
        for(const channel in this.channels) {
            this.pauseChannel(channel);
        }
    }
    resumeAll() {
        this.#log(`Resuming all sounds from all channels!`);
        for(const channel in this.channels) {
            this.resumeChannel(channel);
        }
    }
    resumeChannel(channel) {
        this.#log(`Resuming all sounds from channel "${channel}"`);
        for(const sound of this.soundsPlaying.filter(e => e._audioMgrChannel == channel)) {
            sound.resume();
        }
    }
    resumeInstancesOf(soundName) {
        this.#log(`Resuming all instances of sound "${soundName}"`);
        for(const sound of this.soundsPlaying.filter(e => e._audioMgrName == soundName)) {
            sound.resume();
        }
    }
    releaseQueuedSounds() {
        let stillQueued = [];
        for(const sound of this.queuedSounds) {
            if(this.sounds[sound]) {
                this.#log(`Releasing queued sound event "${sound}"`);
                this.playSound(sound);
            } else {
                stillQueued.push(sound);
            }
        }
        this.queuedSounds = stillQueued;
    }
    playSound(soundName) {
        if (!this.sounds[soundName]) {
            this.queuedSounds.push(soundName);
            return this.#log(`Queued "${soundName}" for playback as it has not yet been registered.`);
        }
        const sound = this.sounds[soundName];
        const trackSource = new BetterAudioBSN(this.audioContext, sound.data, { loop: sound.loop });
        trackSource.connect(this.channels[sound.channel].gainNode);
        trackSource.start();
        trackSource._audioMgrChannel = sound.channel;
        trackSource._audioMgrName = soundName;
        this.soundsPlaying.push(trackSource);
        trackSource.onended = _ => { this.soundsPlaying.splice(this.soundsPlaying.indexOf(trackSource), 1) };
        return trackSource;
    }
}