"use client";
import { useEffect, useState } from "react";

/** VisualViewport also shrinks for iOS keyboards, where 100dvh may not. */
export function useCompactViewport() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setCompact(media.matches);
        if (media.matches) {
          const viewport = window.visualViewport;
          root.style.setProperty(
            "--compact-viewport-height",
            `${viewport?.height ?? window.innerHeight}px`,
          );
          root.style.setProperty(
            "--compact-viewport-top",
            `${viewport?.offsetTop ?? 0}px`,
          );
        } else {
          root.style.removeProperty("--compact-viewport-height");
          root.style.removeProperty("--compact-viewport-top");
        }
      });
    };
    update();
    media.addEventListener("change", update);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", update);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      root.style.removeProperty("--compact-viewport-height");
      root.style.removeProperty("--compact-viewport-top");
    };
  }, []);
  return compact;
}
