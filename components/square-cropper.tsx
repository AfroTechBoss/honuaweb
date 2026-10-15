"use client";
import React from "react";
import { Icon } from "@/components/shared";

// Lets the user choose which square part of a photo to keep: drag to move,
// slider or scroll to zoom. Calls onDone with the cropped JPEG, at most
// `size` px on a side.
export function SquareCropper({ file, index, total, size = 1200, onDone, onCancel }: {
  file: File;
  index?: number;
  total?: number;
  size?: number;
  onDone: (cropped: File) => void;
  onCancel: () => void;
}) {
  const V = 272; // viewport side in px; fits a 320px-wide phone
  const [src, setSrc] = React.useState<string | null>(null);
  const [img, setImg] = React.useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const [busy, setBusy] = React.useState(false);
  const drag = React.useRef<{ id: number; x: number; y: number; px: number; py: number } | null>(null);

  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url); setImg(null); setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Scale at zoom 1 makes the short side fill the square.
  const base = img ? V / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const w = img ? img.naturalWidth * base * zoom : V;
  const h = img ? img.naturalHeight * base * zoom : V;
  const clamp = React.useCallback((x: number, y: number, cw = w, ch = h) => ({
    x: Math.min(0, Math.max(V - cw, x)),
    y: Math.min(0, Math.max(V - ch, y)),
  }), [w, h]);

  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    const b = V / Math.min(el.naturalWidth, el.naturalHeight);
    setImg(el);
    setPos({ x: (V - el.naturalWidth * b) / 2, y: (V - el.naturalHeight * b) / 2 });
  };

  // Zoom around the centre of the square so the subject stays put.
  const setZoomCentered = (z: number) => {
    if (!img) return;
    const nz = Math.min(4, Math.max(1, z));
    const cx = (V / 2 - pos.x) / zoom, cy = (V / 2 - pos.y) / zoom;
    const nw = img.naturalWidth * base * nz, nh = img.naturalHeight * base * nz;
    setZoom(nz);
    setPos(clamp(V / 2 - cx * nz, V / 2 - cy * nz, nw, nh));
  };

  const confirm = async () => {
    if (!img || busy) return;
    setBusy(true);
    try {
      const scale = base * zoom;
      const side = V / scale;
      const out = Math.round(Math.min(side, size));
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = out;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(img, -pos.x / scale, -pos.y / scale, side, side, 0, 0, out, out);
      const blob: Blob | null = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.88));
      if (!blob) throw new Error("encode failed");
      const name = (file.name.replace(/\.[^.]*$/, "") || "photo") + ".jpg";
      onDone(new File([blob], name, { type: "image/jpeg" }));
    } catch {
      setBusy(false);
      onCancel();
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Crop photo" onClick={e => e.stopPropagation()}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.6)", display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ background: "var(--surface, var(--bg))", borderRadius: 16, width: "100%", maxWidth: 360, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <h3 className="font-display" style={{ margin: 0, fontSize: 18 }}>Crop photo</h3>
          {total && total > 1 ? <span style={{ fontSize: 12, color: "var(--ink-4)" }}>{(index ?? 0) + 1} of {total}</span> : null}
        </div>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--ink-3)" }}>Drag to choose what shows. Photos are square on the map.</p>
        <div
          onPointerDown={e => {
            if (!img) return;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
          }}
          onPointerMove={e => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId) return;
            setPos(clamp(d.px + e.clientX - d.x, d.py + e.clientY - d.y));
          }}
          onPointerUp={() => { drag.current = null; }}
          onPointerCancel={() => { drag.current = null; }}
          onWheel={e => setZoomCentered(zoom - e.deltaY * 0.002)}
          style={{ position: "relative", width: V, height: V, margin: "0 auto", overflow: "hidden", borderRadius: 12, background: "var(--bg-2)", cursor: img ? "grab" : "default", touchAction: "none", userSelect: "none" }}
        >
          {src && (
            <img src={src} alt="" draggable={false} onLoad={onLoad}
              style={{ position: "absolute", left: pos.x, top: pos.y, width: w, height: h, maxWidth: "none", opacity: img ? 1 : 0, pointerEvents: "none" }} />
          )}
          {!img && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 13, color: "var(--ink-4)" }}>Loading photo…</div>}
          {/* Thirds grid to help framing */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)", backgroundSize: `${V / 3}px ${V / 3}px`, backgroundPosition: "-1px -1px" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 16px" }}>
          <Icon name="image" size={13} />
          <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={e => setZoomCentered(parseFloat(e.target.value))} aria-label="Zoom" style={{ flex: 1, accentColor: "var(--green)" }} />
          <Icon name="image" size={18} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ flex: 1, justifyContent: "center" }}>Skip photo</button>
          <button type="button" className="btn btn-green" onClick={confirm} disabled={!img || busy} style={{ flex: 2, justifyContent: "center", opacity: img && !busy ? 1 : .5 }}>{busy ? "Cropping…" : "Use photo"}</button>
        </div>
      </div>
    </div>
  );
}
