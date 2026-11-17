"use client";
import { useEffect, useRef, useState } from "react";
import { Lesson, stepIndex } from "@/lib/lesson";
import { BrowserVoice } from "@/lib/speech";
export function usePlayer(lesson: Lesson | null) {
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<
    "ready" | "playing" | "paused" | "completed" | "error"
  >("ready");
  const [voiceError, setVoiceError] = useState("");
  const voice = useRef(new BrowserVoice());
  // Invalidate callbacks from canceled utterances before switching lessons or steps.
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
      voice.current.cancel();
    },
    [],
  );
  function stop() {
    generation.current++;
    voice.current.cancel();
    setStatus("ready");
  }
  function reset() {
    stop();
    setIndex(0);
    setVoiceError("");
  }
  function seek(i: number) {
    stop();
    setIndex(stepIndex(i, lesson?.steps.length || 1));
  }
  function speak(i: number, token: number) {
    if (!lesson || token !== generation.current) return;
    setIndex(i);
    setStatus("playing");
    voice.current.speak(
      lesson.steps[i].narration,
      () => {
        if (token !== generation.current) return;
        // Speech completion, rather than a guessed timer, advances the diagram.
        if (i + 1 < lesson.steps.length) speak(i + 1, token);
        else setStatus("completed");
      },
      () => {
        if (token !== generation.current) return;
        setVoiceError(
          "Narration could not start. Try Play again, or read the transcript.",
        );
        setStatus("error");
      },
    );
  }
  function play() {
    if (!lesson) return;
    if (!voice.current.supported()) {
      setVoiceError(
        "Your browser does not support narration. Read each step and use Next to continue.",
      );
      setStatus("error");
      return;
    }
    if (status === "paused") {
      voice.current.resume();
      setStatus("playing");
      return;
    }
    const token = ++generation.current;
    speak(status === "completed" ? 0 : index, token);
  }
  function pause() {
    voice.current.pause();
    setStatus("paused");
  }
  return { index, status, play, pause, seek, reset, stop, voiceError };
}
