"use client";
import {
  ArrowRight,
  BookOpen,
  Code2,
  GraduationCap,
  PanelLeftClose,
  Plus,
  Settings2,
  Sparkles,
} from "lucide-react";
import type { Lesson } from "@/lib/lesson";
export type Session = {
  lesson: Lesson;
  sample: boolean;
  sourceQuestion?: string;
};
export default function Sidebar({
  lesson,
  sessions,
  select,
  fresh,
  openDemo,
  setSidebar,
  setModal,
  mobile = false,
  mobileOpen = false,
}: {
  mobile?: boolean;
  mobileOpen?: boolean;
  lesson: Lesson | null;
  sessions: Session[];
  select: (s: Session) => void;
  fresh: () => void;
  openDemo: () => void;
  setSidebar: (v: boolean) => void;
  setModal: (v: "settings") => void;
}) {
  return (
    <aside
      className="sidebar"
      id="workspace-sidebar"
      inert={mobile && !mobileOpen}
      aria-hidden={mobile && !mobileOpen ? true : undefined}
      role={mobile && mobileOpen ? "dialog" : undefined}
      aria-modal={mobile && mobileOpen ? true : undefined}
      aria-label={mobile ? "Workspace navigation" : undefined}
    >
      <div className="brand">
        <span className="brand-mark">
          <GraduationCap size={22} />
        </span>
        <span className="brand-name">
          SketchMind <span className="brand-dot">AI</span>
        </span>
        <button
          className="icon-button collapse"
          aria-label="Hide sidebar"
          onClick={() => setSidebar(false)}
        >
          <PanelLeftClose size={18} />
        </button>
      </div>
      <div className="sidebar-main">
        <button className="new-button" onClick={fresh}>
          <Plus size={18} />
          New instance
        </button>
        <div className="section-label">
          YOUR WORKSPACE{" "}
          <span>{sessions.length.toString().padStart(2, "0")}</span>
        </div>
        <nav>
          {sessions.map((s, i) => (
            <button
              key={i}
              className={`session ${lesson === s.lesson ? "selected" : ""}`}
              onClick={() => select(s)}
            >
              <span className="session-icon">
                <BookOpen size={17} />
              </span>
              <span>
                {s.lesson.topic}
                <small>
                  {s.sample
                    ? "Sample lesson"
                    : s.sourceQuestion
                      ? "Follow-up explanation"
                      : "AI lesson"}
                </small>
              </span>
              {lesson === s.lesson && <span className="active-dot" />}
            </button>
          ))}
          {!sessions.length && (
            <div className="empty-sessions">
              A little curiosity goes a long way.
              <br />
              Your lessons will live here.
            </div>
          )}
        </nav>
        <button className="sample-link" onClick={openDemo}>
          <Code2 size={17} />
          <span>
            Explore a sample lesson<small>JavaScript closures</small>
          </span>
          <ArrowRight size={14} />
        </button>
      </div>
      <div className="sidebar-bottom">
        <div className="learning-note">
          <Sparkles size={17} />
          <p>
            Big ideas. Small steps.<span>Make room for your next “aha”.</span>
          </p>
        </div>
        <button className="settings" onClick={() => setModal("settings")}>
          <Settings2 size={19} />
          <span>
            Settings<small>Voice & preferences</small>
          </span>
        </button>
        <div className="profile">
          <span>Y</span>
          <div>
            Your learning space<small>Personal workspace</small>
          </div>
          <span className="online-dot" />
        </div>
      </div>
    </aside>
  );
}
