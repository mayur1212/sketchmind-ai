export interface VoiceService {
  supported(): boolean;
  speak(text: string, onEnd: () => void, onError: () => void): void;
  pause(): void;
  resume(): void;
  cancel(): void;
}
export class BrowserVoice implements VoiceService {
  private utterance: SpeechSynthesisUtterance | null = null;
  supported() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }
  speak(text: string, onEnd: () => void, onError: () => void) {
    this.cancel();
    const u = new SpeechSynthesisUtterance(text);
    this.utterance = u;
    u.lang = "en-US";
    const voice = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.startsWith("en"));
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.onend = onEnd;
    u.onerror = onError;
    window.speechSynthesis.speak(u);
  }
  pause() {
    if (this.supported()) window.speechSynthesis.pause();
  }
  resume() {
    if (this.supported()) window.speechSynthesis.resume();
  }
  cancel() {
    if (this.utterance) {
      this.utterance.onend = null;
      this.utterance.onerror = null;
      this.utterance = null;
    }
    if (this.supported()) window.speechSynthesis.cancel();
  }
}
