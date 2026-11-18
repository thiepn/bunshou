export interface JapaneseVoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
}

export interface AudioStatus {
  supported: boolean;
  hasJapaneseVoice: boolean;
  voiceName: string | null;
  availableVoices: JapaneseVoiceOption[];
}

let cachedVoice: SpeechSynthesisVoice | null = null;
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export type JapaneseChimeKind = 'flip' | 'good' | 'again' | 'complete' | 'omikuji';

/**
 * Synthesizes traditional Japanese acoustic sounds using the Web Audio API:
 * - 'flip': Crisp hyōshigi / suzuribako inkstone wooden tap
 * - 'good': Shimmering Edo Fūrin (江戸風鈴) glass wind chime harmonic
 * - 'again': Soft bamboo shishi-odoshi knock
 * - 'complete': Warm Taiko thrum + Kyoto temple Rin singing bowl
 * - 'omikuji': Wooden hexagonal omikuji box shake + bright koto pluck
 */
export function playJapaneseChime(kind: JapaneseChimeKind, enabled: boolean = true): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (kind === 'flip') {
      // Suzuribako / Hyoshigi wood-and-stone tap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.045);

      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);
    } else if (kind === 'good') {
      // Edo Furin (風鈴) glass wind chime (Yo-scale pentatonic harmonic D6 + A6)
      const freqs = [1174.66, 1760.0];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = now + idx * 0.055;
        osc.frequency.setValueAtTime(f, start);

        gain.gain.setValueAtTime(0.09, start);
        gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.58);
      });
    } else if (kind === 'again') {
      // Soft bamboo shishi-odoshi low knock
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.11);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (kind === 'omikuji') {
      // Koto pentatonic arpeggio (Hirajoshi / Yo scale: D5 - E5 - G5 - A5 - D6)
      const notes = [587.33, 659.25, 783.99, 880.0, 1174.66];
      notes.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = now + idx * 0.06;
        osc.frequency.setValueAtTime(f, start);

        gain.gain.setValueAtTime(0.09, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.38);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    } else if (kind === 'complete') {
      // Warm Taiko thrum + Temple Rin singing bowl
      const taiko = ctx.createOscillator();
      const taikoGain = ctx.createGain();
      taiko.type = 'sine';
      taiko.frequency.setValueAtTime(115, now);
      taiko.frequency.exponentialRampToValueAtTime(58, now + 0.35);
      taikoGain.gain.setValueAtTime(0.18, now);
      taikoGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      taiko.connect(taikoGain);
      taikoGain.connect(ctx.destination);
      taiko.start(now);
      taiko.stop(now + 0.42);

      const rin = ctx.createOscillator();
      const rinGain = ctx.createGain();
      rin.type = 'sine';
      rin.frequency.setValueAtTime(1046.5, now + 0.08);
      rinGain.gain.setValueAtTime(0.1, now + 0.08);
      rinGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.95);
      rin.connect(rinGain);
      rinGain.connect(ctx.destination);
      rin.start(now + 0.08);
      rin.stop(now + 0.98);
    }
  } catch {
    // Ignore audio context restriction errors
  }
}

export function getAvailableJapaneseVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  try {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return [];

    return voices.filter(
      (v) =>
        v.lang.toLowerCase().startsWith('ja') ||
        v.lang.toLowerCase().includes('jp') ||
        v.name.toLowerCase().includes('japanese')
    );
  } catch {
    return [];
  }
}

function findBestJapaneseVoice(preferredVoiceURI?: string): SpeechSynthesisVoice | null {
  const jpVoices = getAvailableJapaneseVoices();
  if (jpVoices.length === 0) return null;

  if (preferredVoiceURI) {
    const exact = jpVoices.find(
      (v) => v.voiceURI === preferredVoiceURI || v.name === preferredVoiceURI
    );
    if (exact) {
      cachedVoice = exact;
      return exact;
    }
  }

  const preferred =
    jpVoices.find(
      (v) => v.name.includes('Kyoko') || v.name.includes('Otoya') || v.name.includes('Google')
    ) ||
    jpVoices.find((v) => v.localService) ||
    jpVoices[0];

  cachedVoice = preferred;
  return preferred;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    findBestJapaneseVoice();
  };
}

export function getAudioStatus(preferredVoiceURI?: string): AudioStatus {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return {
      supported: false,
      hasJapaneseVoice: false,
      voiceName: null,
      availableVoices: [],
    };
  }
  const jpVoices = getAvailableJapaneseVoices();
  const voice = findBestJapaneseVoice(preferredVoiceURI) || cachedVoice;
  return {
    supported: true,
    hasJapaneseVoice: Boolean(voice),
    voiceName: voice ? voice.name : null,
    availableVoices: jpVoices.map((v) => ({
      voiceURI: v.voiceURI,
      name: v.name,
      lang: v.lang,
      localService: v.localService,
    })),
  };
}

export function speakJapaneseSentence(
  text: string,
  rate: number = 1.0,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (reason: string) => void,
  preferredVoiceURI?: string
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.('Browser speech synthesis is not available in this environment.');
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = Math.max(0.6, Math.min(1.4, rate));

    const voice = findBestJapaneseVoice(preferredVoiceURI);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      onStart?.();
    };
    utterance.onend = () => {
      onEnd?.();
    };
    utterance.onerror = () => {
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  } catch {
    onEnd?.();
    onError?.('Unable to play Japanese speech audio on this device.');
  }
}
