import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserVoice } from "../lib/speech";
afterEach(() => vi.unstubAllGlobals());
describe("browser narration lifecycle", () => {
  it("gracefully detects unsupported speech", () => {
    expect(new BrowserVoice().supported()).toBe(false);
  });
  it("cancels overlapping utterances and removes stale callbacks", () => {
    const synthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: () => [{ lang: "en-US" }],
    };
    vi.stubGlobal("window", { speechSynthesis: synthesis });
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        text: string;
        constructor(text: string) {
          this.text = text;
        }
      },
    );
    const service = new BrowserVoice();
    const end = vi.fn();
    service.speak("First step", end, vi.fn());
    const first = synthesis.speak.mock.calls[0][0];
    service.pause();
    service.resume();
    expect(synthesis.pause).toHaveBeenCalledOnce();
    expect(synthesis.resume).toHaveBeenCalledOnce();
    service.speak("Second step", end, vi.fn());
    expect(first.onend).toBeNull();
    expect(first.onerror).toBeNull();
    expect(synthesis.speak.mock.calls[1][0].text).toBe("Second step");
    service.cancel();
    expect(synthesis.cancel).toHaveBeenCalledTimes(3);
  });
});
