"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} style={{ marginBottom: 48 }}>
    <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 14px", color: "var(--ink)", scrollMarginTop: 80 }}>{title}</h2>
    <div style={{ fontSize: 15, color: "var(--ink-2)", lineHeight: 1.8 }}>{children}</div>
  </section>
);

const Sub = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 20 }}>
    <h3 style={{ fontSize: 16, fontWeight: 650, color: "var(--ink)", margin: "0 0 8px" }}>{title}</h3>
    <div>{children}</div>
  </div>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: "0 0 12px" }}>{children}</p>
);

const UL = ({ items }: { items: React.ReactNode[] }) => (
  <ul style={{ margin: "8px 0 12px", paddingLeft: 22 }}>
    {items.map((it, i) => <li key={i} style={{ marginBottom: 6 }}>{it}</li>)}
  </ul>
);

const Callout = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: "var(--green-tint)", border: "1px solid var(--green-3)", borderRadius: 12, padding: "14px 18px", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.65, margin: "12px 0 16px" }}>
    {children}
  </div>
);

const FeatureCard = ({ tag, title, children }: { tag: string; title: string; children: React.ReactNode }) => (
  <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--green)" }} />
    <div style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 8 }}>{tag}</div>
    <div style={{ fontSize: 16, fontWeight: 650, color: "var(--ink)", marginBottom: 8, lineHeight: 1.3 }}>{title}</div>
    <div style={{ fontSize: 13.5, color: "var(--ink-3)", lineHeight: 1.6 }}>{children}</div>
  </div>
);

const RevenueRow = ({ name, children }: { name: string; children: React.ReactNode }) => (
  <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: 24, padding: "18px 0", borderBottom: "1px solid var(--line)", alignItems: "start" }}>
    <div style={{ fontSize: 15, fontWeight: 650, color: "var(--green-2, var(--green))", lineHeight: 1.3, paddingTop: 2 }}>{name}</div>
    <div style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.65 }}>{children}</div>
  </div>
);

const SECTIONS = [
  "Overview",
  "Key New Functionality",
  "Supporting Infrastructure",
  "Revenue Streams",
];

export default function PropositionPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState("s1");

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const ids = SECTIONS.map((_, i) => `s${i + 1}`);
    const els = ids.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { root: container, rootMargin: "-10% 0px -60% 0px", threshold: 0 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={scrollRef} style={{ position: "fixed", inset: 0, overflowY: "auto", background: "var(--bg)", color: "var(--ink)", fontFamily: "Satoshi, sans-serif", zIndex: 10 }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--bg)", borderBottom: "1px solid var(--line)", padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--green)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 17, fontFamily: "Lora, sans-serif", letterSpacing: "-0.05em" }}>h</span>
          <span style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)", fontFamily: "Lora, sans-serif" }}>honua</span>
        </Link>
        <span style={{ fontSize: 13, color: "var(--ink-4)", fontFamily: "JetBrains Mono, monospace" }}>Strategic Proposition · July 2026</span>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px", display: "flex", gap: 64, alignItems: "flex-start" }}>
        {/* Sidebar */}
        <aside style={{ width: 220, flexShrink: 0, position: "sticky", top: 74, maxHeight: "calc(100vh - 90px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }} className="toc-aside no-scrollbar">
          <div style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "var(--ink-4)", letterSpacing: ".08em", marginBottom: 10, textTransform: "uppercase" }}>Contents</div>
          {SECTIONS.map((s, i) => {
            const id = `s${i + 1}`;
            const isActive = active === id;
            return (
              <a key={i} href={`#${id}`} style={{ fontSize: 12.5, color: isActive ? "var(--green)" : "var(--ink-3)", fontWeight: isActive ? 600 : 400, textDecoration: "none", padding: "4px 0 4px 8px", lineHeight: 1.4, borderLeft: isActive ? "2px solid var(--green)" : "2px solid transparent", transition: "color .15s, border-color .15s" }}>{i + 1}. {s}</a>
            );
          })}
        </aside>

        {/* Body */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Cover */}
          <div style={{ marginBottom: 48, paddingBottom: 40, borderBottom: "1px solid var(--line)" }}>
            <div style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--green)", marginBottom: 16 }}>New direction</div>
            <h1 style={{ fontFamily: "Lora, sans-serif", fontSize: "clamp(30px,4vw,52px)", fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 18px", lineHeight: 1.05 }}>
              The engine for green actions,{" "}
              <span style={{ fontStyle: "italic", color: "var(--green)" }}>everywhere</span>
            </h1>
            <p style={{ fontSize: 17, color: "var(--ink-2)", lineHeight: 1.7, maxWidth: 580, margin: 0 }}>
              Honua expands from a social app into the underlying system that tracks, verifies, and rewards environmental actions — whether they happen inside Honua, in the real world, or on third-party apps and devices.
            </p>
          </div>

          {/* 1. Overview */}
          <Section id="s1" title="1. Overview">
            <P>The first iteration of Honua built something valuable: a social layer where sustainable actions are visible, measurable, and rewarded. The next move is to open that infrastructure to the world.</P>
            <P>Every green action — recycling, taking transit, saving energy, cleaning up a park, buying local — can now be captured, verified, and permanently recorded in a user's Honua ledger. Not just what they posted. What they actually did. And not just inside Honua, but inside any app, device, or platform that integrates the protocol.</P>
            <Callout>
              <strong>The key shift:</strong> Honua stops being a walled garden and becomes open infrastructure. Think of it the way Stripe is to payments — Honua becomes the canonical source of truth for who did what for the planet, and what they've earned for it, regardless of where the action happened.
            </Callout>
            <P>Profiles surface that verified impact publicly, turning a user's green identity into a real, portable social-proof asset rather than just a follower count.</P>
          </Section>

          {/* 2. Key Functionality */}
          <Section id="s2" title="2. Key New Functionality">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 8 }} className="feature-grid">
              <div style={{ gridColumn: "1 / -1" }}>
                <FeatureCard tag="Core primitive" title="Green Action Ledger">
                  The data backbone. A unified, verifiable record of every environmental action a user takes — recycling, transit use, energy savings, cleanups, purchases. Every other feature plugs into this single source of truth.
                </FeatureCard>
              </div>
              <FeatureCard tag="Infrastructure" title="Open API / SDK for partners">
                Third-party apps, retailers, and IoT devices — smart meters, transit cards, recycling bins — can log actions directly into a user's ledger. Honua becomes the <strong>green identity layer</strong>, not a closed ecosystem.
              </FeatureCard>
              <FeatureCard tag="Trust" title="Action verification">
                A layered system of partner-attested data, receipt/photo proof, and direct API integrations (utility APIs, transit APIs) keeps points earnable but hard to game. Trust is built into the data, not bolted on.
              </FeatureCard>
              <FeatureCard tag="Currency" title="Green Points as universal currency">
                Points earned anywhere — in-app or via partner integrations — are spendable in-app (tipping, boosts, marketplace) and redeemable with partners. A <strong>two-way loop</strong>, not a closed point system.
              </FeatureCard>
              <FeatureCard tag="Identity" title="Public accountability layer">
                Profiles surface <strong>verified impact, not just posts</strong>. A user's green track record becomes a visible, portable identity asset — the social proof that makes sustainable behaviour a status signal.
              </FeatureCard>
            </div>
          </Section>

          {/* 3. Infrastructure */}
          <Section id="s3" title="3. Supporting Infrastructure">
            <P>The features above sit on top of a set of platform capabilities that power the broader ecosystem.</P>
            <Sub title="Universal Sustainability Score">
              <P>A 0–100 signal reflecting a person's verified lifetime impact. Earned inside Honua, readable anywhere. Partners surface it; users own it.</P>
            </Sub>
            <Sub title="On-chain Carbon Credit Marketplace">
              <P>Verified credits (Verra, Gold Standard, Puro.Earth) tradeable inside and outside Honua. Auto-offset subscriptions match individual and corporate footprints monthly without friction.</P>
            </Sub>
            <Sub title="Team & Corporate Dashboards">
              <P>Organisations track collective impact across their workforce. Sustainability KPIs become auditable, comparable, and reportable — backed by the same verified data the individual sees.</P>
            </Sub>
            <Sub title="Local Action Map">
              <P>A real-world layer surfacing nearby cleanups, repair cafés, co-ops, and gardens. Attendance is recorded as a verified action; area impact rolls up automatically.</P>
            </Sub>
          </Section>

          {/* 4. Revenue */}
          <Section id="s4" title="4. Revenue Streams">
            <P>Five distinct revenue streams, each reinforcing the others as the Green Points network grows.</P>
            <div style={{ borderTop: "1px solid var(--line)", marginTop: 8 }}>
              <RevenueRow name="Partner & API fees">
                Tiered SaaS fees for brands, apps, and platforms integrating green-action tracking and rewards into their own products. A mobility startup pays to emit cycling events; a supermarket chain pays to issue Green Points at checkout. Priced per monthly active users or events processed.
              </RevenueRow>
              <RevenueRow name="Redemption take-rate">
                Commission on partner offers and discounts redeemed with Green Points — a share of every transaction the currency enables. As the GP network grows, so does transaction volume.
              </RevenueRow>
              <RevenueRow name="Points economy margin & breakage">
                Markup on points purchased or sold, plus float on unspent balances — the same economic model that makes loyalty programmes and tipping wallets durable businesses.
              </RevenueRow>
              <RevenueRow name="Data & impact reporting">
                Aggregated, anonymised sustainability dashboards sold to brands for ESG reporting, to municipalities for policy insight, and to corporate sustainability teams. The verified, on-chain impact record is the product; the dashboard is the interface.
              </RevenueRow>
              <RevenueRow name="Sponsored challenges">
                Brands pay to run green-action challenges under their own name — users earn Green Points for completing them. A performance-marketing channel with a sustainability wrapper: measurable participation, verified actions, and brand association with real impact.
              </RevenueRow>
            </div>
          </Section>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 32, marginTop: 48, fontSize: 13, color: "var(--ink-4)", lineHeight: 1.7 }}>
            <p><strong>© 2026 Honua</strong> — Strategic proposition, internal document.</p>
          </div>
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .toc-aside { display: none !important; }
          .feature-grid { grid-template-columns: 1fr !important; }
          .feature-grid > div:first-child { grid-column: 1 !important; }
        }
        @media (max-width: 520px) {
          .revenue-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
