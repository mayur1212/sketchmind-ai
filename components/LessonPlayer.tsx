"use client";
import {
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import type { Lesson } from "@/lib/lesson";
import type { usePlayer } from "@/hooks/usePlayer";
export default function LessonPlayer({
  lesson,
  player,
  sample,
}: {
  lesson: Lesson;
  player: ReturnType<typeof usePlayer>;
  sample: boolean;
}) {
  return (
    <section className="player">
      <div className="player-top">
        <span className="voice-status">
          <Volume2 size={15} />
          {player.status === "playing"
            ? "Tutor is speaking"
            : player.status === "paused"
              ? "Narration paused"
              : player.status === "completed"
                ? "Lesson complete"
                : "Ready when you are"}
        </span>
        <span>
          ~
          {Math.round(
            lesson.steps.reduce((n, s) => n + s.estimatedDurationSeconds, 0) /
              60,
          )}{" "}
          min lesson · {sample ? "Sample" : "Gemini AI"}
        </span>
      </div>
      <div className="playback">
        <button aria-label="Restart lesson" onClick={player.reset}>
          <RotateCcw size={17} />
        </button>
        <button
          aria-label="Previous step"
          disabled={player.index === 0}
          onClick={() => player.seek(player.index - 1)}
        >
          <SkipBack size={17} />
        </button>
        <button
          className="play-button"
          aria-label={
            player.status === "playing"
              ? "Pause lesson"
              : player.status === "paused"
                ? "Resume lesson"
                : "Play lesson"
          }
          onClick={player.status === "playing" ? player.pause : player.play}
        >
          {player.status === "playing" ? (
            <Pause size={17} />
          ) : (
            <Play size={17} />
          )}
        </button>
        <button
          aria-label="Next step"
          disabled={player.index === lesson.steps.length - 1}
          onClick={() => player.seek(player.index + 1)}
        >
          <SkipForward size={17} />
        </button>
        <div className="step-progress">
          {lesson.steps.map((s, i) => (
            <button
              title={s.title}
              aria-label={`Go to step ${i + 1}: ${s.title}`}
              aria-current={i === player.index ? "step" : undefined}
              className={i <= player.index ? "filled" : ""}
              key={s.id}
              onClick={() => player.seek(i)}
            />
          ))}
        </div>
        <span>
          {player.index + 1} / {lesson.steps.length}
        </span>
      </div>
      {player.voiceError && (
        <p role="alert" className="voice-error">
          {player.voiceError}
        </p>
      )}
    </section>
  );
}
