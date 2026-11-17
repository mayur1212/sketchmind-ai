"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Download,
  GitBranch,
  Hand,
  HelpCircle,
  Loader2,
  MessageSquare,
  Menu,
  Minus,
  MousePointer2,
  PanelLeftClose,
  PenTool,
  Play,
  Plus,
  RotateCcw,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  Undo2,
  Volume2,
  X,
} from "lucide-react";
import { Lesson, lessonSchema, topicSchema } from "@/lib/lesson";
import { demo } from "@/lib/demo";
import { usePlayer } from "@/hooks/usePlayer";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import type { Stroke } from "./Board";
const Board = dynamic(() => import("./Board"), {
  ssr: false,
  loading: () => (
    <div className="canvas-wrap loading">
      <Loader2 className="spin" />
    </div>
  ),
});
import type { ChatMessage as Message } from "@/lib/chat";
import LessonPlayer from "./LessonPlayer";
import Sidebar, { type Session } from "./Sidebar";
export default function Tutor() {
  const compact = useCompactViewport();
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const mobileMenu = useRef<HTMLButtonElement>(null);
  function closeMobileDrawer() {
    setMobileDrawer(false);
    mobileMenu.current?.focus();
  }
  useEffect(() => {
    if (!mobileDrawer || !compact) return;
    const drawer = document.getElementById("workspace-sidebar");
    const focusable = () =>
      Array.from(
        drawer?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,textarea,[tabindex="0"]',
        ) || [],
      );
    focusable()[0]?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileDrawer(false);
        mobileMenu.current?.focus();
      }
      if (event.key === "Tab") {
        const nodes = focusable();
        if (!nodes.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const media = window.matchMedia("(max-width:1023px)");
    const resize = () => {
      if (!media.matches) setMobileDrawer(false);
    };
    document.addEventListener("keydown", keys);
    media.addEventListener("change", resize);
    return () => {
      document.removeEventListener("keydown", keys);
      media.removeEventListener("change", resize);
    };
  }, [mobileDrawer, compact]);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [sample, setSample] = useState(false);
  const [sourceQuestion, setSourceQuestion] = useState<string>();
  const [explaining, setExplaining] = useState<Message | null>(null);
  const pending = useRef(false);
  const conversations = useRef(new Map<Lesson, Message[]>());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("chat");
  const [sidebar, setSidebar] = useState(true);
  const [palette, setPalette] = useState(false);
  const [tool, setTool] = useState("select");
  const [color, setColor] = useState("#ffffff");
  const [width, setWidth] = useState(3);
  const [zoom, setZoom] = useState(1);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [modal, setModal] = useState<"settings" | "help" | null>(null);
  const lastAttempt = useRef<
    | { kind: "submit"; value: string; creating: boolean }
    | { kind: "explain"; message: Message }
    | null
  >(null);
  const request = useRef<AbortController | null>(null);
  const epoch = useRef(0);
  const exportBoard = useRef<() => void>(() => {});
  const registerExport = useCallback((fn: () => void) => {
    exportBoard.current = fn;
  }, []);
  const bottom = useRef<HTMLDivElement>(null);
  const topicInput = useRef<HTMLTextAreaElement>(null);
  const player = usePlayer(lesson);
  const step = lesson?.steps[player.index];
  useEffect(() => {
    if (!messages.length && !busy && !error) return;
    const scroller = bottom.current?.parentElement;
    const last = compact
      ? scroller
          ?.querySelectorAll<HTMLElement>(".message")
          .item(messages.length - 1)
      : null;
    const top =
      last && scroller
        ? scroller.scrollTop +
          last.getBoundingClientRect().bottom -
          scroller.getBoundingClientRect().top -
          scroller.clientHeight +
          16
        : scroller?.scrollHeight;
    if (scroller) scroller.scrollTo({ top, behavior: "smooth" });
  }, [messages, busy, error, compact]);
  useEffect(() => {
    if (!compact) return;
    const frame = requestAnimationFrame(() => {
      const scroller = document.querySelector<HTMLElement>(".chat-content");
      if (!scroller) return;
      const last = scroller.querySelectorAll<HTMLElement>(".message");
      const tail = last.item(last.length - 1);
      const top =
        tab === "tree" || !tail
          ? 0
          : scroller.scrollTop +
            tail.getBoundingClientRect().bottom -
            scroller.getBoundingClientRect().top -
            scroller.clientHeight +
            16;
      scroller.scrollTo({ top, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [compact, tab]);
  useEffect(() => {
    if (lesson) conversations.current.set(lesson, messages);
  }, [lesson, messages]);
  useEffect(() => () => request.current?.abort(), []);
  function abortRequest() {
    request.current?.abort();
    epoch.current++;
    pending.current = false;
    setBusy(false);
    setExplaining(null);
  }
  function cancel() {
    abortRequest();
    player.reset();
  }
  function select(session: Session) {
    cancel();
    if (compact) {
      setMobileDrawer(false);
      setTab("tree");
    }
    setLesson(session.lesson);
    setSample(session.sample);
    setSourceQuestion(session.sourceQuestion);
    setMessages(conversations.current.get(session.lesson) || []);
    setError("");
    setStrokes([]);
    setTool("select");
    setPalette(false);
    setZoom(1);
  }
  function fresh() {
    cancel();
    if (compact) {
      setMobileDrawer(false);
      setTab("chat");
    }
    setLesson(null);
    setSample(false);
    setSourceQuestion(undefined);
    setMessages([]);
    setError("");
    setInput("");
    setStrokes([]);
    setTool("select");
    setPalette(false);
    setZoom(1);
    topicInput.current?.focus();
  }
  function openDemo() {
    const session = { lesson: demo, sample: true };
    select(session);
    setSessions((s) => (s.some((x) => x.sample) ? s : [session, ...s]));
  }
  async function submit(topic?: string, newLesson = false) {
    const value = (topic ?? input).trim();
    if (pending.current) return;
    if (!lesson || newLesson) {
      const result = topicSchema.safeParse({ topic: value });
      if (!result.success) {
        setError("Enter a learning topic between 2 and 240 characters.");
        return;
      }
    } else if (value.length < 2 || value.length > 1200) {
      setError("Ask a question between 2 and 1,200 characters.");
      return;
    }
    const creating = !lesson || newLesson;
    lastAttempt.current = { kind: "submit", value, creating };
    pending.current = true;
    if (creating) player.reset();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const token = ++epoch.current;
    setBusy(true);
    setError("");
    setInput("");
    setTab("chat");
    const history = creating ? [] : messages;
    setMessages([...history, { role: "user", content: value }]);
    try {
      const response = await fetch(creating ? "/api/lessons" : "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          creating
            ? { topic: value, level: "beginner" }
            : {
                topic: lesson!.topic,
                summary: lesson!.summary,
                history: history.slice(-6).map((m) => ({
                  role: m.role,
                  content: m.content.slice(0, 2400),
                })),
                question: value,
              },
        ),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Request failed. Please retry.");
      if (token !== epoch.current) return;
      if (creating) {
        const next = lessonSchema.parse(data);
        setLesson(next);
        if (compact) setTab("tree");
        setSample(false);
        setSourceQuestion(undefined);
        setStrokes([]);
        setTool("select");
        setPalette(false);
        setZoom(1);
        setSessions((s) =>
          [{ lesson: next, sample: false }, ...s].slice(0, 12),
        );
        setMessages([
          { role: "user", content: value },
          {
            role: "assistant",
            content: `Your lesson is ready. ${next.objective} Press Play on the whiteboard when you’re ready to begin.`,
          },
        ]);
      } else {
        if (typeof data.answer !== "string" || !data.answer.trim())
          throw new Error("The AI returned an empty answer. Please retry.");
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.answer,
            followUp: {
              topic: lesson!.topic,
              summary: lesson!.summary,
              question: value,
              answer: data.answer,
            },
          },
        ]);
      }
    } catch (e) {
      if (token === epoch.current && !controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : "Could not connect. Please retry.",
        );
    } finally {
      if (token === epoch.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  async function explainOnWhiteboard(message: Message) {
    if (pending.current || !message.followUp) return;
    if (message.explanation) {
      if (message.explanation === lesson) return;
      const saved = sessions.find((s) => s.lesson === message.explanation);
      select(
        saved || {
          lesson: message.explanation,
          sample: false,
          sourceQuestion: message.followUp.question,
        },
      );
      return;
    }
    pending.current = true;
    lastAttempt.current = { kind: "explain", message };
    const controller = new AbortController();
    request.current = controller;
    const token = ++epoch.current;
    setBusy(true);
    setExplaining(message);
    setError("");
    setTab("chat");
    const { topic, ...context } = message.followUp;
    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, level: "beginner", followUp: context }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error ||
            "Could not create the whiteboard explanation. Please retry.",
        );
      if (token !== epoch.current) return;
      const next = lessonSchema.parse(data);
      // Only a successful, explicitly requested explanation replaces the board.
      // Chat requests and failed generations leave the current narration alone.
      player.reset();
      if (compact) setTab("tree");
      setLesson(next);
      setSample(false);
      setSourceQuestion(context.question);
      setStrokes([]);
      setTool("select");
      setPalette(false);
      setZoom(1);
      const nextMessages = messages.map((m) =>
        m === message ? { ...m, explanation: next } : m,
      );
      if (lesson) conversations.current.set(lesson, nextMessages);
      setMessages(nextMessages);
      setSessions((s) =>
        [
          { lesson: next, sample: false, sourceQuestion: context.question },
          ...s,
        ].slice(0, 12),
      );
    } catch (e) {
      if (token === epoch.current && !controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : "Could not connect. Please retry.",
        );
    } finally {
      if (token === epoch.current) {
        pending.current = false;
        setBusy(false);
        setExplaining(null);
      }
    }
  }
  const workspace = (
    <section className="workspace">
      <header className="workspace-header">
        <div className="header-title">
          {sourceQuestion && (
            <div className="explanation-notice" role="status">
              <span>New whiteboard explanation</span>
              <small title={sourceQuestion}>{sourceQuestion}</small>
            </div>
          )}
          {!sidebar && (
            <button
              className="icon-button"
              aria-label="Show sidebar"
              onClick={() => setSidebar(true)}
            >
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label="New lesson"
            title="New lesson"
            onClick={fresh}
          >
            <Plus size={17} />
          </button>
          <button
            className="export-button"
            onClick={() => exportBoard.current()}
          >
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </header>
      <div className={`board-area ${lesson ? "has-lesson" : ""}`}>
        <div className="board-top">
          <button
            aria-label="Drawing settings"
            className={`icon-button board-menu ${palette ? "active" : ""}`}
            onClick={() => setPalette(!palette)}
          >
            <Settings2 size={18} />
          </button>
          <div className="drawing-toolbar">
            {[
              { id: "select", Icon: MousePointer2, label: "Select" },
              { id: "hand", Icon: Hand, label: "Pan view" },
              { id: "pen", Icon: PenTool, label: "Draw" },
            ].map(({ id, Icon, label }, i) => (
              <button
                title={label}
                aria-label={label}
                className={tool === id ? "active" : ""}
                onClick={() => {
                  setTool(id);
                  if (id === "pen") setPalette(true);
                }}
                key={id}
              >
                <Icon size={18} />
                <small>{i + 1}</small>
              </button>
            ))}
            <span className="toolbar-divider" />
            <button
              aria-label="Undo drawing"
              disabled={!strokes.length}
              onClick={() => setStrokes((s) => s.slice(0, -1))}
            >
              <Undo2 size={18} />
            </button>
            <button
              aria-label="Clear annotations"
              disabled={!strokes.length}
              onClick={() => setStrokes([])}
            >
              <Trash2 size={17} />
            </button>
          </div>
          <span className="board-badge">
            <span />
            {sample
              ? "Sample lesson"
              : sourceQuestion
                ? "Follow-up explanation"
                : lesson
                  ? "AI whiteboard"
                  : "Ready to explore"}
          </span>
        </div>
        {palette && (
          <div className="palette">
            <div className="palette-title">
              Drawing style
              <button
                aria-label="Close drawing settings"
                onClick={() => setPalette(false)}
              >
                <X size={14} />
              </button>
            </div>
            <label>Stroke</label>
            <div className="swatches">
              {["#ffffff", "#e05263", "#43a56b", "#368bc9", "#8b5cf6"].map(
                (c) => (
                  <button
                    key={c}
                    aria-label={`Use ${c} stroke`}
                    onClick={() => {
                      setColor(c);
                      setTool("pen");
                    }}
                    style={{ background: c }}
                    className={color === c ? "chosen" : ""}
                  />
                ),
              )}
            </div>
            <label>Stroke width</label>
            <div className="widths">
              {[2, 4, 7].map((w) => (
                <button
                  className={width === w ? "active" : ""}
                  key={w}
                  aria-label={`${w} pixel stroke`}
                  onClick={() => setWidth(w)}
                >
                  <span style={{ height: w }} />
                </button>
              ))}
            </div>
            <p>Draw over your lesson to make it yours.</p>
          </div>
        )}
        <Board
          key={`${lesson?.title || "empty"}:${player.index}`}
          elements={step?.elements || []}
          zoom={zoom}
          tool={tool}
          color={color}
          width={width}
          strokes={strokes}
          onStrokes={setStrokes}
          onExport={registerExport}
        />
        {!lesson && (
          <div className="welcome-board minimal-welcome">
            <p className="empty-state-label">AI-Powered Visual Learning</p>
            <h2>What would you like to learn today?</h2>
          </div>
        )}
        {busy && !lesson && (
          <div className="generating-overlay">
            <Loader2 className="spin" size={30} />
            <h3>Connecting the dots…</h3>
            <p>Your tutor is building a lesson just for you.</p>
          </div>
        )}
        {step && (
          <div className="step-heading">
            <span>
              STEP {String(player.index + 1).padStart(2, "0")} /{" "}
              {String(lesson!.steps.length).padStart(2, "0")}
            </span>
            <h2>{step.title}</h2>
          </div>
        )}
        <div className="board-bottom">
          <div className="zoom-controls">
            <button
              aria-label="Zoom out"
              disabled={zoom <= 0.6}
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
            >
              <Minus size={16} />
            </button>
            <button aria-label="Reset zoom" onClick={() => setZoom(1)}>
              {Math.round(zoom * 100)}%
            </button>
            <button
              aria-label="Zoom in"
              disabled={zoom >= 1.8}
              onClick={() => setZoom((z) => Math.min(1.8, z + 0.1))}
            >
              <Plus size={16} />
            </button>
          </div>
          <span className="canvas-caption">YOUR IDEAS, WITHOUT LIMITS</span>
          {lesson && (
            <span className="mobile-canvas-hint">
              Scroll diagram · tap labels to read
            </span>
          )}
          <button
            className="icon-button"
            aria-label="Help"
            onClick={() => setModal("help")}
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </div>
      {lesson && (
        <LessonPlayer lesson={lesson} player={player} sample={sample} />
      )}
    </section>
  );
  return (
    <main
      className={`app-shell ${sidebar ? "" : "sidebar-hidden"} ${mobileDrawer ? "mobile-drawer-is-open" : ""}`}
    >
      <header className="mobile-app-header">
        <button
          ref={mobileMenu}
          className="icon-button"
          type="button"
          aria-label="Open workspace menu"
          aria-controls="workspace-sidebar"
          aria-expanded={mobileDrawer}
          onClick={() => {
            topicInput.current?.blur();
            setMobileDrawer(true);
          }}
        >
          <Menu size={21} />
        </button>
        <span>
          SketchMind <strong>AI</strong>
        </span>
        <button
          className="icon-button"
          type="button"
          aria-label="New mobile lesson"
          onClick={fresh}
        >
          <Plus size={21} />
        </button>
      </header>
      <button
        className="mobile-drawer-backdrop"
        aria-label="Close workspace menu"
        type="button"
        onClick={closeMobileDrawer}
        tabIndex={-1}
      />

      <Sidebar
        lesson={lesson}
        sessions={sessions}
        select={select}
        fresh={fresh}
        openDemo={openDemo}
        setSidebar={(value) => {
          if (compact) closeMobileDrawer();
          else setSidebar(value);
        }}
        setModal={(value) => {
          if (compact) setMobileDrawer(false);
          setModal(value);
        }}
        mobile={compact}
        mobileOpen={mobileDrawer}
      />
      {!compact && workspace}
      <aside className="chat-panel">
        <div className="chat-header">
          <div className="chat-tabs">
            <button
              className={tab === "chat" ? "current" : ""}
              onClick={() => setTab("chat")}
            >
              <MessageSquare size={16} />
              Chat
            </button>
            <button
              className={tab === "tree" ? "current" : ""}
              onClick={() => setTab("tree")}
            >
              <GitBranch size={16} />
              Lesson
            </button>
          </div>
          <span className="tutor-avatar">
            <Sparkles size={17} />
          </span>
        </div>
        <div
          className="chat-content"
          data-active-panel={tab === "tree" ? "lesson" : "chat"}
        >
          {compact && tab === "tree" && workspace}
          {tab === "tree" ? (
            <div className="lesson-outline">
              <div className="mini-label">YOUR LEARNING PATH</div>
              <h2>{lesson?.title || "Your next discovery"}</h2>
              {lesson ? (
                <>
                  <p>{lesson.objective}</p>
                  {lesson.steps.map((s, i) => (
                    <button
                      key={s.id}
                      className={i === player.index ? "outline-active" : ""}
                      onClick={() => player.seek(i)}
                    >
                      <span>{i + 1}</span>
                      <div>
                        {s.title}
                        <small>~{s.estimatedDurationSeconds} seconds</small>
                      </div>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                  <h3>The takeaway</h3>
                  <p>{lesson.summary}</p>
                </>
              ) : (
                <p>
                  Start a lesson to see its steps, revisit an idea, or jump
                  ahead.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="tutor-intro">
                <span className="intro-icon">
                  <Sparkles size={21} />
                </span>
                <span>
                  AI + Visual Whiteboard Learning
                  <small>A little guidance. A lot of discovery.</small>
                </span>
              </div>
              <div className="welcome-message">
                <h2>Curiosity looks good on you.</h2>
                <p>
                  Hi! I’m your AI tutor. What would you like to learn today?
                </p>
                <p className="muted">
                  Pick a topic. I’ll break it down with visuals and a voice to
                  guide you.
                </p>
              </div>
              {!lesson && messages.length === 0 && (
                <>
                  <div className="suggestion-label">
                    NEED A LITTLE INSPIRATION?
                  </div>
                  <div className="suggestions">
                    {[
                      {
                        topic: "JavaScript Closures",
                        sub: "A function with a memory",
                        icon: "{ }",
                      },
                      {
                        topic: "React Hooks",
                        sub: "State, without the mystery",
                        icon: "↻",
                      },
                      {
                        topic: "Event Loop",
                        sub: "What happens behind the scenes",
                        icon: "⌘",
                      },
                      {
                        topic: "Solar System",
                        sub: "A little perspective",
                        icon: "☀",
                      },
                    ].map((t) => (
                      <button
                        disabled={busy}
                        key={t.topic}
                        onClick={() => submit(t.topic, true)}
                      >
                        <span className="topic-icon">{t.icon}</span>
                        <span>
                          {t.topic}
                          <small>{t.sub}</small>
                        </span>
                        <ArrowRight size={15} />
                      </button>
                    ))}
                  </div>
                  <div className="how-card">
                    <span>
                      <Volume2 size={18} />
                      More than an answer.
                    </span>
                    <p>
                      A short visual lesson, spoken step by step.
                      <br />
                      Pause, explore, and ask as you go.
                    </p>
                    <div>
                      <span>~2 MIN LESSONS</span>
                      <span>YOUR PACE</span>
                    </div>
                  </div>
                </>
              )}
              {lesson && (
                <div className="lesson-card">
                  <span className="mini-label">
                    {sample
                      ? "EXPLICIT SAMPLE · NOT LIVE AI"
                      : sourceQuestion
                        ? "NEW WHITEBOARD EXPLANATION"
                        : "YOUR LESSON IS READY"}
                  </span>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.objective}</p>
                  <button
                    onClick={() => {
                      if (compact) setTab("tree");
                      player.play();
                    }}
                  >
                    <Play size={15} />
                    Start learning
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
              {messages.map((m, i) => (
                <div className={`message ${m.role}`} key={i}>
                  {m.role === "assistant" && (
                    <span className="message-label">
                      <Sparkles size={12} /> AI
                    </span>
                  )}
                  <p>{m.content}</p>
                  {m.role === "assistant" && m.followUp && (
                    <button
                      type="button"
                      className="explain-whiteboard"
                      disabled={busy || m.explanation === lesson}
                      onClick={() => explainOnWhiteboard(m)}
                      aria-busy={explaining === m}
                    >
                      {explaining === m ? (
                        <Loader2 size={14} className="spin" />
                      ) : (
                        <PenTool size={14} />
                      )}
                      Explain on Whiteboard
                      {m.explanation === lesson && <small>Showing now</small>}
                    </button>
                  )}
                </div>
              ))}
              {step && (
                <details className="transcript">
                  <summary>
                    <BookOpen size={14} /> Current step transcript
                  </summary>
                  <p>{step.narration}</p>
                </details>
              )}
              {lesson && (
                <div className="follow-ups">
                  <span className="suggestion-label">
                    KEEP THE CURIOSITY GOING
                  </span>
                  {lesson.suggestedQuestions.map((q) => (
                    <button disabled={busy} key={q} onClick={() => submit(q)}>
                      {q}
                      <ArrowRight size={14} />
                    </button>
                  ))}
                  <button
                    disabled={busy}
                    onClick={() => submit(lesson.topic, true)}
                  >
                    <RotateCcw size={14} />
                    Regenerate this lesson
                  </button>
                </div>
              )}
              {busy && (
                <div className="thinking" role="status">
                  <Loader2 size={16} className="spin" />
                  {explaining
                    ? "Creating your whiteboard explanation…"
                    : lesson
                      ? "Thinking it through…"
                      : "Creating your visual lesson…"}
                  <button
                    onClick={() => {
                      abortRequest();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
              {error && (
                <div className="error-message" role="alert">
                  {error}
                  <button
                    onClick={() => {
                      const attempt = lastAttempt.current;
                      if (attempt?.kind === "explain")
                        explainOnWhiteboard(attempt.message);
                      else if (attempt) submit(attempt.value, attempt.creating);
                    }}
                  >
                    Retry
                    <RotateCcw size={13} />
                  </button>
                </div>
              )}
              <div ref={bottom} />
            </>
          )}
        </div>
        <form
          className="composer-area"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="composer">
            <textarea
              ref={topicInput}
              aria-label={
                lesson ? "Ask a follow-up question" : "Learning topic"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={lesson ? 1200 : 240}
              placeholder={
                lesson
                  ? "What else are you wondering?"
                  : "Ask me to explain any topic…"
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <div className="composer-bottom">
              <span className="mode-pill">
                <Sparkles size={12} />
                {lesson ? "Follow-up question" : "Guided learning"}
              </span>
              <button
                className="send-button"
                type="submit"
                aria-label={lesson ? "Send question" : "Generate lesson"}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 size={17} className="spin" />
                ) : (
                  <Send size={17} />
                )}
              </button>
            </div>
          </div>
          <p>
            <span className="online-dot" />
            Powered by Gemini <span>AI can make mistakes. Stay curious.</span>
          </p>
        </form>
      </aside>
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "help" ? "How to use SketchMind AI" : "Preferences"
            }
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            <Sparkles className="purple" size={28} />
            <h2>
              {modal === "help"
                ? "Your curiosity, guided."
                : "Made for your pace."}
            </h2>
            {modal === "help" ? (
              <>
                <p>
                  Ask for a topic in Chat to generate a real Gemini lesson.
                  Press Play to hear each step as its diagram appears.
                </p>
                <p>
                  Use the step bars or Lesson tab to seek. Seeking stops
                  narration; Play starts that step again. Draw over the canvas
                  with the pen, and export your board as a PNG.
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    setModal(null);
                    openDemo();
                  }}
                >
                  Explore the sample lesson
                </button>
              </>
            ) : (
              <>
                <p>
                  Narration uses an available English voice on your device.
                  Allow sound in your browser, then press Play. No audio is
                  recorded.
                </p>
                <p>
                  Playback is synchronized at step boundaries. You can pause,
                  resume, or revisit any step.
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    setModal(null);
                    setPalette(true);
                  }}
                >
                  Customize drawing style
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
