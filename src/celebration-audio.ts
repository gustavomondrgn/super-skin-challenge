export interface CelebrationAudio {
  readonly supported: boolean;
  /** Call directly from a user gesture when the browser requires one. */
  start(): Promise<boolean>;
  stop(): void;
  dispose(): void;
}

type AudioSource = OscillatorNode | AudioBufferSourceNode | ConstantSourceNode;
type LegacyAudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

const BEAT = 60 / 128;
const NOTE = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// An original eight-bar victory theme. Times and lengths are in beats.
const MELODY: ReadonlyArray<readonly [number, number, number]> = [
  [0, 72, 0.5], [0.5, 76, 0.5], [1, 79, 1], [2, 76, 0.5], [2.5, 79, 0.5], [3, 84, 1],
  [4, 81, 1], [5, 79, 0.5], [5.5, 76, 0.5], [6, 79, 1], [7, 76, 1],
  [8, 77, 0.5], [8.5, 81, 0.5], [9, 84, 1], [10, 81, 1], [11, 79, 1],
  [12, 79, 0.5], [12.5, 83, 0.5], [13, 86, 1], [14, 83, 0.5], [14.5, 79, 0.5], [15, 86, 1],
  [16, 84, 1], [17, 79, 0.5], [17.5, 76, 0.5], [18, 79, 1], [19, 84, 1],
  [20, 81, 0.5], [20.5, 84, 0.5], [21, 89, 1], [22, 88, 1], [23, 84, 1],
  [24, 83, 0.5], [24.5, 86, 0.5], [25, 91, 1], [26, 86, 0.5], [26.5, 83, 0.5], [27, 79, 1],
  [28, 84, 4],
];

const CHORDS = [
  [48, 60, 64, 67], [45, 60, 64, 69], [41, 60, 65, 69], [43, 59, 62, 67],
  [48, 60, 64, 67], [41, 60, 65, 69], [43, 59, 62, 67], [48, 60, 64, 67],
] as const;

/** Local synthesis: no network, media files, copyrighted recording, or playback loop. */
export function createCelebrationAudio(onEnded?: () => void): CelebrationAudio {
  const AudioContextClass = typeof window === "undefined"
    ? undefined
    : window.AudioContext ?? (window as LegacyAudioWindow).webkitAudioContext;
  let context: AudioContext | undefined;
  let nodes = new Set<AudioNode>();
  let sources = new Set<AudioSource>();
  let cancelResumeWait: (() => void) | undefined;
  let generation = 0;
  let disposed = false;

  const stop = () => {
    generation += 1;
    cancelResumeWait?.();
    cancelResumeWait = undefined;
    const previousContext = context;
    context = undefined;
    for (const source of sources) {
      source.onended = null;
      try { source.stop(); } catch { /* An already ended source needs no stop. */ }
    }
    for (const node of nodes) node.disconnect();
    sources.clear();
    nodes.clear();
    if (previousContext && previousContext.state !== "closed") {
      void previousContext.close().catch(() => undefined);
    }
  };

  const waitForRunning = (audio: AudioContext): Promise<boolean> => {
    if (audio.state === "running") return Promise.resolve(true);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (running: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        audio.removeEventListener("statechange", check);
        cancelResumeWait = undefined;
        resolve(running);
      };
      const check = () => {
        if (audio.state === "running") finish(true);
        else if (audio.state === "closed") finish(false);
      };
      const timeout = setTimeout(() => finish(audio.state === "running"), 250);
      cancelResumeWait = () => finish(false);
      audio.addEventListener("statechange", check);
      check();
    });
  };

  const start = async (): Promise<boolean> => {
    if (!AudioContextClass || disposed) return false;
    if (context?.state === "running") return true;
    stop();
    const playGeneration = generation;
    let audio: AudioContext;
    try {
      audio = new AudioContextClass();
      context = audio;
      // This call stays in the initiating click's synchronous call stack.
      if (audio.state !== "running") void audio.resume().catch(() => undefined);
      if (!await waitForRunning(audio)) {
        if (generation === playGeneration) stop();
        return false;
      }
      if (generation !== playGeneration || disposed) return false;
      nodes = new Set<AudioNode>();
      sources = new Set<AudioSource>();

      const keep = <T extends AudioNode>(node: T): T => {
        nodes.add(node);
        return node;
      };
      const master = keep(audio.createGain());
      master.gain.value = 0.27;
      const compressor = keep(audio.createDynamicsCompressor());
      compressor.threshold.value = -17;
      compressor.knee.value = 18;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.2;
      master.connect(compressor);
      compressor.connect(audio.destination);
      const beginning = audio.currentTime + 0.08;
      const finishAt = beginning + BEAT * 32 + 0.7;

      const run = (source: AudioSource, at: number, until: number) => {
        sources.add(source);
        nodes.add(source);
        source.onended = () => {
          source.disconnect();
          sources.delete(source);
          nodes.delete(source);
        };
        source.start(at);
        source.stop(until);
      };

      const tone = (midi: number, at: number, duration: number, volume: number, type: OscillatorType) => {
        const oscillator = audio.createOscillator();
        oscillator.type = type;
        oscillator.frequency.value = NOTE(midi);
        const envelope = keep(audio.createGain());
        envelope.gain.setValueAtTime(0, at);
        envelope.gain.linearRampToValueAtTime(volume, at + 0.018);
        envelope.gain.exponentialRampToValueAtTime(Math.max(volume * 0.67, 0.0001), at + Math.min(0.13, duration / 2));
        envelope.gain.setValueAtTime(Math.max(volume * 0.67, 0.0001), at + duration);
        envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration + 0.17);
        oscillator.connect(envelope);
        envelope.connect(master);
        run(oscillator, at, at + duration + 0.18);
      };

      for (const [beat, midi, length] of MELODY) {
        const at = beginning + beat * BEAT;
        const duration = length * BEAT * 0.9;
        tone(midi, at, duration, 0.13, "triangle");
        tone(midi - 12, at, duration, 0.055, "sawtooth");
      }
      CHORDS.forEach(([bass, ...chord], bar) => {
        const at = beginning + bar * 4 * BEAT;
        chord.forEach((midi) => tone(midi, at, BEAT * 3.7, 0.035, "triangle"));
        tone(bass, at, BEAT * 1.5, 0.17, "sine");
        tone(bass, at + BEAT * 2, BEAT * 1.5, 0.13, "sine");
      });

      const noiseBuffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * 0.15), audio.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let index = 0; index < noiseData.length; index += 1) noiseData[index] = Math.random() * 2 - 1;
      const noiseHit = (at: number, volume: number, frequency: number, length: number) => {
        const source = audio.createBufferSource();
        source.buffer = noiseBuffer;
        const filter = keep(audio.createBiquadFilter());
        filter.type = "highpass";
        filter.frequency.value = frequency;
        const envelope = keep(audio.createGain());
        envelope.gain.setValueAtTime(volume, at);
        envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
        source.connect(filter);
        filter.connect(envelope);
        envelope.connect(master);
        run(source, at, at + length);
      };
      for (let beat = 0; beat < 32; beat += 1) {
        const at = beginning + beat * BEAT;
        if (beat % 2 === 0) {
          const kick = audio.createOscillator();
          kick.frequency.setValueAtTime(135, at);
          kick.frequency.exponentialRampToValueAtTime(46, at + 0.13);
          const envelope = keep(audio.createGain());
          envelope.gain.setValueAtTime(0.24, at);
          envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
          kick.connect(envelope);
          envelope.connect(master);
          run(kick, at, at + 0.21);
        } else {
          noiseHit(at, 0.13, 1_500, 0.11);
        }
        noiseHit(at + BEAT / 2, 0.035, 6_500, 0.045);
      }

      // A silent scheduled source replaces a JS playback timer and is canceled by stop().
      const completion = audio.createConstantSource();
      completion.offset.value = 0;
      completion.connect(master);
      run(completion, beginning, finishAt);
      completion.onended = () => {
        if (generation !== playGeneration || context !== audio) return;
        stop();
        onEnded?.();
      };
      return true;
    } catch {
      if (generation === playGeneration) stop();
      return false;
    }
  };

  return {
    supported: Boolean(AudioContextClass),
    start,
    stop,
    dispose: () => {
      disposed = true;
      stop();
    },
  };
}
