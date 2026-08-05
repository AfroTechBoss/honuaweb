"use client";
import React from "react";

// The page everyone sees while maintenance mode is on.
//
// Deliberately plain: no sidebar, no data fetching, nothing that could fail
// while the rest of the platform is already failing. The one interactive thing
// is a retry, and it is a full reload rather than a router push — the middleware
// decides whether maintenance is over, and only a real request reaches it.

export function MaintenanceScreen({ message, from }: { message: string; from: string | null }) {
  const [checking, setChecking] = React.useState(false);

  const retry = () => {
    setChecking(true);
    window.location.href = from || "/";
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "32px 20px",
        background: "var(--bg)",
      }}
    >
      <div style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
        <div
          aria-hidden
          style={{
            width: 52,
            height: 52,
            margin: "0 auto 22px",
            borderRadius: 16,
            background: "var(--green-tint)",
            border: "1px solid var(--line)",
            display: "grid",
            placeItems: "center",
            fontSize: 24,
          }}
        >
          🌱
        </div>

        <h1
          style={{
            margin: "0 0 12px",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
          }}
        >
          Back shortly
        </h1>

        {/* The admin's own words, and they may be several lines of them. */}
        <p
          style={{
            margin: "0 0 26px",
            fontSize: 15,
            lineHeight: 1.7,
            color: "var(--ink-3)",
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </p>

        <button
          onClick={retry}
          disabled={checking}
          className="btn-primary"
          style={{
            border: "none",
            borderRadius: 12,
            padding: "12px 22px",
            fontSize: 14,
            fontWeight: 600,
            cursor: checking ? "default" : "pointer",
            opacity: checking ? 0.6 : 1,
          }}
        >
          {checking ? "Checking…" : from ? "Try that page again" : "Try again"}
        </button>

        <p style={{ margin: "26px 0 0", fontSize: 13, color: "var(--ink-4)" }}>
          Something urgent? Write to{" "}
          <a href="mailto:support@honua.green" style={{ color: "var(--ink-3)" }}>
            support@honua.green
          </a>
          .
        </p>
      </div>
    </div>
  );
}
