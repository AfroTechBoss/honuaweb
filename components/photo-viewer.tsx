"use client";
import React from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/shared";

// Full-screen photo viewer. Arrow keys or the side buttons move between
// photos; Escape, the close button or a click on the backdrop closes it.
// Rendered into <body> so a transformed parent (like the modal card's
// entry animation) can't trap the fixed overlay.
export function PhotoViewer({ photos, index, onIndex, onClose, alt = "" }: {
  photos: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  alt?: string;
}) {
  const count = photos.length;
  const go = React.useCallback((d: number) => onIndex((index + d + count) % count), [index, count, onIndex]);

  React.useEffect(() => {
    // Capture phase, and stop it there, so Escape closes only the viewer and
    // not the modal underneath (which listens on window too).
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      else if (e.key === "ArrowRight" && count > 1) { e.stopPropagation(); go(1); }
      else if (e.key === "ArrowLeft" && count > 1) { e.stopPropagation(); go(-1); }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [go, onClose, count]);

  if (typeof document === "undefined" || !count) return null;

  const navBtn: React.CSSProperties = {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: 44, height: 44, borderRadius: 999, border: "none", cursor: "pointer",
    background: "rgba(255,255,255,.14)", color: "#fff", display: "grid", placeItems: "center",
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Photo viewer"
      onMouseDown={e => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}
      onClick={e => e.stopPropagation()} // portal events still bubble to the React parent (the photo that opened us)
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,.92)", display: "grid", placeItems: "center", padding: "56px 72px" }}>
      <img src={photos[index]} alt={alt}
        style={{ maxWidth: "min(100%, calc(100vw - 144px))", maxHeight: "calc(100vh - 112px)", objectFit: "contain", borderRadius: 8, boxShadow: "0 20px 60px rgba(0,0,0,.5)", userSelect: "none" }} />
      <button onClick={onClose} aria-label="Close" style={{ ...navBtn, top: 16, right: 16, transform: "none", width: 40, height: 40 }}>
        <Icon name="close" size={18} />
      </button>
      {count > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label="Previous photo" style={{ ...navBtn, left: 16 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span>
          </button>
          <button onClick={() => go(1)} aria-label="Next photo" style={{ ...navBtn, right: 16 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>›</span>
          </button>
          <div style={{ position: "absolute", bottom: 18, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,.75)", fontSize: 13 }}>
            {index + 1} / {count}
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
