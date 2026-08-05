"use client";
import React from "react";
import Link from "next/link";

const BASE = "https://api.honua.green/v1";

// ── Shared primitives ─────────────────────────────────────────────────────────
function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ display: "inline-block", fontSize: 10.5, fontFamily: "JetBrains Mono", fontWeight: 700, letterSpacing: ".06em", padding: "3px 8px", borderRadius: 6, background: color + "22", color, border: `1px solid ${color}44` }}>
      {text}
    </span>
  );
}

function Method({ m }: { m: "GET" | "POST" | "DELETE" | "PATCH" }) {
  const c = { GET: "#22c55e", POST: "#3b82f6", DELETE: "#ef4444", PATCH: "#f59e0b" }[m];
  return <Badge text={m} color={c} />;
}

function Tag({ t }: { t: string }) {
  return <Badge text={t} color="var(--green)" />;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 7px", fontSize: 12.5, fontFamily: "JetBrains Mono", color: "var(--green)" }}>
      {children}
    </code>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--line)", margin: "48px 0" }} />;
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", letterSpacing: ".1em", color: "var(--ink-4)", marginBottom: 12 }}>
      {text}
    </div>
  );
}

// ── Endpoint row ──────────────────────────────────────────────────────────────
function Endpoint({ method, path, desc, params, example, response }: {
  method: "GET" | "POST" | "DELETE" | "PATCH";
  path: string;
  desc: string;
  params?: { name: string; type: string; required?: boolean; desc: string }[];
  example?: string;
  response?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: open ? "var(--bg-2)" : "var(--surface)", border: "none", cursor: "pointer", textAlign: "left" }}>
        <Method m={method} />
        <code style={{ flex: 1, fontSize: 13, fontFamily: "JetBrains Mono", color: "var(--ink-2)" }}>{path}</code>
        <span style={{ fontSize: 13, color: "var(--ink-3)", marginRight: 8 }}>{desc}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)" strokeWidth="2" style={{ flexShrink: 0, transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{ padding: "18px 20px 20px", borderTop: "1px solid var(--line)", background: "var(--bg)" }}>
          {params && params.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", letterSpacing: ".06em", color: "var(--ink-4)", marginBottom: 10 }}>PARAMETERS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {params.map(p => (
                  <div key={p.name} style={{ display: "grid", gridTemplateColumns: "140px 80px 1fr", gap: 12, alignItems: "start", fontSize: 13 }}>
                    <code style={{ fontFamily: "JetBrains Mono", color: "var(--ink)", fontSize: 12.5 }}>{p.name}{p.required && <span style={{ color: "var(--clay)", marginLeft: 2 }}>*</span>}</code>
                    <span style={{ color: "var(--ink-4)", fontFamily: "JetBrains Mono", fontSize: 11.5 }}>{p.type}</span>
                    <span style={{ color: "var(--ink-3)", lineHeight: 1.5 }}>{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {example && (
            <div style={{ marginBottom: response ? 18 : 0 }}>
              <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", letterSpacing: ".06em", color: "var(--ink-4)", marginBottom: 8 }}>EXAMPLE REQUEST</div>
              <pre style={{ background: "#0d1117", borderRadius: 10, padding: "14px 16px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#e6edf3", overflow: "auto", margin: 0, lineHeight: 1.65 }}>{example}</pre>
            </div>
          )}
          {response && (
            <div>
              <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", letterSpacing: ".06em", color: "var(--ink-4)", marginBottom: 8, marginTop: example ? 14 : 0 }}>EXAMPLE RESPONSE</div>
              <pre style={{ background: "#0d1117", borderRadius: 10, padding: "14px 16px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#e6edf3", overflow: "auto", margin: 0, lineHeight: 1.65 }}>{response}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Possibility card ──────────────────────────────────────────────────────────
function PossibilityCard({ icon, title, desc, tags }: { icon: string; title: string; desc: string; tags: string[] }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: "22px 22px 20px" }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: "var(--ink-3)", lineHeight: 1.6, marginBottom: 14 }}>{desc}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {tags.map(t => <Tag key={t} t={t} />)}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ApiPage() {
  const navLinks = [
    ["Overview", "#overview"],
    ["What's possible", "#possible"],
    ["Impact", "#impact"],
    ["Profiles", "#profiles"],
    ["Feed", "#feed"],
    ["Marketplace", "#marketplace"],
    ["Carbon", "#carbon"],
    ["Stories", "#stories"],
    ["Map", "#map"],
    ["Webhooks", "#webhooks"],
  ];

  const [activeSection, setActiveSection] = React.useState("overview");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handler = () => {
      const sections = navLinks.map(([, href]) => href.slice(1));
      for (const id of [...sections].reverse()) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 80) {
          setActiveSection(id);
          return;
        }
      }
      setActiveSection("overview");
    };
    container.addEventListener("scroll", handler, { passive: true });
    return () => container.removeEventListener("scroll", handler);
  }, []);

  return (
    <div ref={scrollRef} style={{ position: "fixed", inset: 0, overflowY: "auto", background: "var(--bg)", color: "var(--ink)" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--bg)", borderBottom: "1px solid var(--line)", padding: "0 32px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <span style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)", fontFamily: "Lora, sans-serif" }}>Honua</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "var(--ink-4)", background: "var(--green-tint)", border: "1px solid var(--green-3)", borderRadius: 6, padding: "3px 10px" }}>API v1 · Beta</span>
          <Link href="/" style={{ fontSize: 13, color: "var(--green)", fontWeight: 600, textDecoration: "none" }}>Back to app →</Link>
        </div>
      </header>

      <div className="api-content-wrap" style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px", display: "flex", gap: 56, alignItems: "flex-start" }}>
        {/* Sidebar nav */}
        <nav style={{ width: 180, flexShrink: 0, position: "sticky", top: 80, paddingTop: 40 }} className="api-sidebar">
          {navLinks.map(([label, href]) => {
            const id = href.slice(1);
            return (
              <a key={id} href={href} style={{ display: "block", padding: "6px 10px", fontSize: 13, color: activeSection === id ? "var(--green)" : "var(--ink-3)", fontWeight: activeSection === id ? 600 : 400, textDecoration: "none", borderLeft: `2px solid ${activeSection === id ? "var(--green)" : "var(--line)"}`, marginBottom: 2, transition: "all .15s" }}>
                {label}
              </a>
            );
          })}
          <div style={{ marginTop: 24, padding: "14px", background: "var(--green-tint)", border: "1px solid var(--green-3)", borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "var(--green)", fontWeight: 700, marginBottom: 6 }}>BASE URL</div>
            <code style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "var(--ink-2)", wordBreak: "break-all" }}>{BASE}</code>
          </div>
        </nav>

        {/* Content */}
        <main className="api-main" style={{ flex: 1, minWidth: 0, paddingTop: 48 }}>

          {/* ── Overview ── */}
          <section id="overview">
            <SectionLabel text="OVERVIEW" />
            <h1 className="font-display" style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 14px", lineHeight: 1.1 }}>
              The Honua API
            </h1>
            <p style={{ fontSize: 16, color: "var(--ink-2)", lineHeight: 1.7, maxWidth: 680, margin: "0 0 28px" }}>
              Honua is the impact ledger for the planet. Our API lets any app, device, or platform record, verify, and reward real-world environmental actions — and plug into 2.4 million members who are already tracking their green impact.
            </p>

            <div className="api-cards-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32 }}>
              {[
                ["REST + JSON", "Standard HTTP endpoints, predictable responses, no SDKs required."],
                ["Bearer auth", "API key issued per integration. Scoped to the permissions you request."],
                ["Webhooks", "Push notifications for impact events, verifications, and purchases."],
              ].map(([title, desc]) => (
                <div key={title} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5 }}>{title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.55 }}>{desc}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "#0d1117", borderRadius: 12, padding: "20px 24px", marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#8b949e", marginBottom: 10, letterSpacing: ".06em" }}>AUTHENTICATION</div>
              <pre style={{ margin: 0, fontSize: 13, fontFamily: "JetBrains Mono", color: "#e6edf3", lineHeight: 1.6 }}>{`curl ${BASE}/impact \\
  -H "Authorization: Bearer hna_live_••••••••••••" \\
  -H "Content-Type: application/json"`}</pre>
            </div>

            <div style={{ background: "var(--green-tint)", border: "1px solid var(--green-3)", borderRadius: 12, padding: "14px 18px", fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--green)" }}>Beta access:</strong> The Honua API is in private beta. <a href="mailto:api@honua.green" style={{ color: "var(--green)", fontWeight: 600 }}>Request access →</a>
            </div>
          </section>

          <Divider />

          {/* ── What's possible ── */}
          <section id="possible">
            <SectionLabel text="WHAT'S POSSIBLE" />
            <h2 className="font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 8px" }}>What you can build</h2>
            <p style={{ fontSize: 15, color: "var(--ink-3)", margin: "0 0 28px", lineHeight: 1.6 }}>
              Honua becomes the canonical record for what someone did for the planet — wherever it happened.
            </p>

            <div className="api-cards-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 12 }}>
              <PossibilityCard
                icon="🚲"
                title="Fitness & mobility apps"
                desc="Log every bike ride, transit trip, or car-free commute directly to a user's Honua impact ledger. Earn Green Points automatically based on km not driven."
                tags={["POST /impact", "Green Points", "Transport"]}
              />
              <PossibilityCard
                icon="🏠"
                title="Smart home devices"
                desc="Smart meters, solar inverters, and EV chargers can push energy savings and EV charging sessions as verified impact — no manual entry."
                tags={["POST /impact", "Energy", "Webhooks"]}
              />
              <PossibilityCard
                icon="🛒"
                title="Sustainable brands"
                desc="When a customer buys a plant-based product or chooses low-carbon shipping, log the impact to their ledger and display a live impact score on your checkout page."
                tags={["POST /impact", "Marketplace", "Widgets"]}
              />
              <PossibilityCard
                icon="🏢"
                title="Corporate sustainability"
                desc="Aggregate verified employee impact across your organisation. Surface a real-time CO₂ dashboard tied to individual Honua accounts, not self-reported spreadsheets."
                tags={["GET /impact", "GET /profiles", "Analytics"]}
              />
              <PossibilityCard
                icon="🌊"
                title="Environmental NGOs"
                desc="Run verified challenges — beach cleanups, tree planting drives, food waste pledges — and reward participants with Green Points and digital badges."
                tags={["POST /challenges", "POST /impact", "Vouching"]}
              />
              <PossibilityCard
                icon="📱"
                title="Habit & wellness apps"
                desc="Surface a user's Honua streak and impact score alongside their other health metrics. Turn green habits into a social identity that persists across apps."
                tags={["GET /profiles", "GET /impact", "Streak"]}
              />
            </div>
          </section>

          <Divider />

          {/* ── Impact ── */}
          <section id="impact">
            <SectionLabel text="ENDPOINTS" />
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Impact</h2>
            <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "0 0 20px", lineHeight: 1.6 }}>
              The core of the Honua platform. Log real-world actions; CO₂ and Green Points are computed server-side from our verified emission-factor model.
            </p>

            <Endpoint
              method="POST"
              path="/impact"
              desc="Log an environmental action"
              params={[
                { name: "user_id", type: "string", required: true, desc: "Honua user ID of the person performing the action" },
                { name: "category", type: "enum", required: true, desc: "Transport · Food · Energy · Waste · Ocean · Lifestyle · Policy · Education" },
                { name: "action", type: "string", required: true, desc: "Human-readable label, e.g. 'Bike commute'" },
                { name: "quantity", type: "number", required: true, desc: "Units of the action (km, meals, kWh, kg, etc.)" },
                { name: "description", type: "string", desc: "Optional context shown in the feed post" },
                { name: "share_to_feed", type: "boolean", desc: "Also create a feed post for this action (default: false)" },
                { name: "proof_url", type: "string", desc: "Public URL of a photo proving the action took place" },
              ]}
              example={`curl -X POST ${BASE}/impact \\
  -H "Authorization: Bearer hna_live_••••" \\
  -d '{
    "user_id": "usr_abc123",
    "category": "Transport",
    "action": "Bike commute",
    "quantity": 14,
    "share_to_feed": true
  }'`}
              response={`{
  "id": "log_9x2kq",
  "co2_saved_kg": 2.38,
  "green_points": 28,
  "unit": "km not driven",
  "status": "unverified",
  "post_id": "pst_7yz3r"
}`}
            />

            <Endpoint
              method="GET"
              path="/impact/:user_id"
              desc="Fetch a user's impact history"
              params={[
                { name: "limit", type: "number", desc: "Max logs to return (default 20, max 100)" },
                { name: "category", type: "enum", desc: "Filter by action category" },
                { name: "since", type: "ISO 8601", desc: "Return logs after this timestamp" },
              ]}
              example={`curl ${BASE}/impact/usr_abc123?limit=5&category=Transport \\
  -H "Authorization: Bearer hna_live_••••"`}
              response={`{
  "total_co2_kg": 142.6,
  "total_green_points": 1840,
  "streak_days": 12,
  "logs": [
    {
      "id": "log_9x2kq",
      "action": "Bike commute",
      "category": "Transport",
      "co2_saved_kg": 2.38,
      "green_points": 28,
      "quantity": 14,
      "unit": "km not driven",
      "status": "verified",
      "logged_at": "2026-07-29T08:14:00Z"
    }
  ]
}`}
            />

            <Endpoint
              method="POST"
              path="/impact/:log_id/vouch"
              desc="Community-vouch a log entry"
              params={[
                { name: "user_id", type: "string", required: true, desc: "ID of the member casting the vouch" },
              ]}
              example={`curl -X POST ${BASE}/impact/log_9x2kq/vouch \\
  -H "Authorization: Bearer hna_live_••••" \\
  -d '{ "user_id": "usr_def456" }'`}
              response={`{
  "ok": true,
  "vouch_count": 2,
  "verified": false,
  "vouches_needed": 1
}`}
            />

            <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--ink)" }}>CO₂ model:</strong> Impact is computed as <Code>quantity × emission_factor</Code>. Factors are grounded in EPA, DEFRA, and IPCC averages. A log reaches <Code>verified</Code> status after 3 community vouches, which unlocks the CO₂ value on the user's ledger.
            </div>
          </section>

          <Divider />

          {/* ── Profiles ── */}
          <section id="profiles">
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Profiles</h2>
            <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "0 0 20px", lineHeight: 1.6 }}>
              Look up users, check their impact score, and follow on their behalf.
            </p>

            <Endpoint method="GET" path="/profiles/:handle" desc="Get a user profile by handle"
              example={`curl ${BASE}/profiles/chidile \\
  -H "Authorization: Bearer hna_live_••••"`}
              response={`{
  "id": "usr_abc123",
  "handle": "chidile",
  "full_name": "Chidile Ozoemena",
  "avatar_url": "https://...",
  "impact_score": 320,
  "green_points": 1840,
  "total_co2_kg": 142.6,
  "streak_days": 12,
  "followers_count": 84,
  "following_count": 61,
  "verified": false,
  "location": "Lagos, NG"
}`}
            />

            <Endpoint method="GET" path="/profiles/:user_id/followers" desc="List followers"
              params={[{ name: "limit", type: "number", desc: "Max to return (default 50)" }]}
            />

            <Endpoint method="POST" path="/profiles/:user_id/follow" desc="Follow a user"
              params={[{ name: "follower_id", type: "string", required: true, desc: "ID of the user performing the follow" }]}
            />
          </section>

          <Divider />

          {/* ── Feed ── */}
          <section id="feed">
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Feed & Posts</h2>
            <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "0 0 20px", lineHeight: 1.6 }}>
              Read and write to the Honua social feed, including impact posts, reposts, and quotes.
            </p>

            <Endpoint method="GET" path="/feed" desc="Fetch the home feed"
              params={[
                { name: "user_id", type: "string", required: true, desc: "Whose feed to fetch (following + own posts)" },
                { name: "tab", type: "enum", desc: "for_you · following · verified_impact" },
                { name: "cursor", type: "string", desc: "Pagination cursor from previous response" },
              ]}
            />

            <Endpoint method="POST" path="/posts" desc="Create a post"
              params={[
                { name: "user_id", type: "string", required: true, desc: "Author user ID" },
                { name: "content", type: "string", required: true, desc: "Post text (max 500 chars)" },
                { name: "image_url", type: "string", desc: "Attached image URL" },
                { name: "post_type", type: "enum", desc: "post · action · repost · quote" },
                { name: "quoted_post_id", type: "string", desc: "For quote posts — ID of post being quoted" },
              ]}
            />

            <Endpoint method="POST" path="/posts/:id/react" desc="Like a post"
              params={[{ name: "user_id", type: "string", required: true, desc: "User casting the reaction" }]}
            />
          </section>

          <Divider />

          {/* ── Marketplace ── */}
          <section id="marketplace">
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Marketplace</h2>
            <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "0 0 20px", lineHeight: 1.6 }}>
              List sustainable products, browse the catalogue, and create verified purchase impact logs automatically when a buyer checks out.
            </p>

            <Endpoint method="GET" path="/marketplace/products" desc="List live products"
              params={[
                { name: "category", type: "string", desc: "Filter by product category" },
                { name: "seller_id", type: "string", desc: "Filter to a specific seller" },
                { name: "featured", type: "boolean", desc: "Only return featured products" },
              ]}
            />

            <Endpoint method="GET" path="/marketplace/products/:id" desc="Get a single product" />

            <Endpoint method="POST" path="/marketplace/products" desc="List a new product"
              params={[
                { name: "seller_id", type: "string", required: true, desc: "Verified seller ID" },
                { name: "name", type: "string", required: true, desc: "Product name" },
                { name: "price_cents", type: "number", required: true, desc: "Price in cents (USD)" },
                { name: "category", type: "string", required: true, desc: "Product category" },
                { name: "tag", type: "string", desc: "Sustainability tag shown on listing (e.g. 'Plastic-free')" },
                { name: "description", type: "string", desc: "Full product description" },
                { name: "stock", type: "number", desc: "Available units (omit for digital goods)" },
              ]}
            />

            <Endpoint method="GET" path="/shop/:handle" desc="Get a seller's storefront"
              example={`curl ${BASE}/shop/greenroots \\
  -H "Authorization: Bearer hna_live_••••"`}
              response={`{
  "handle": "greenroots",
  "name": "Green Roots Co.",
  "tagline": "Plastic-free everyday essentials",
  "location": "Portland, OR",
  "products": [ { "id": "prd_1", "name": "Bamboo Toothbrush", "price": "$4.99" } ]
}`}
            />
          </section>

          <Divider />

          {/* ── Carbon ── */}
          <section id="carbon">
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Carbon Market</h2>
            <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "0 0 20px", lineHeight: 1.6 }}>
              Browse verified carbon credits and record purchases directly against a user's offset ledger.
            </p>

            <Endpoint method="GET" path="/carbon/credits" desc="List available carbon credits"
              response={`{
  "credits": [
    {
      "id": "crd_001",
      "name": "Kenyan Cookstoves",
      "region": "Kenya",
      "type": "Avoidance",
      "verifier": "Gold Standard",
      "vintage": "2025",
      "price_cents": 1800,
      "volume_t": 12400,
      "tag": "Verified"
    }
  ]
}`}
            />

            <Endpoint method="POST" path="/carbon/purchase" desc="Record a carbon credit purchase"
              params={[
                { name: "user_id", type: "string", required: true, desc: "Purchasing user's ID" },
                { name: "credit_id", type: "string", required: true, desc: "ID of the credit being purchased" },
                { name: "tonnes", type: "number", required: true, desc: "Number of tonnes purchased" },
                { name: "total_cents", type: "number", required: true, desc: "Total paid in cents" },
              ]}
            />

            <Endpoint method="GET" path="/carbon/offsets/:user_id" desc="Get a user's total offsets"
              response={`{
  "tonnes_offset": 3.5,
  "total_spent_cents": 6300,
  "purchases": [ ... ]
}`}
            />
          </section>

          <Divider />

          {/* ── Stories ── */}
          <section id="stories">
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Stories</h2>
            <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "0 0 20px", lineHeight: 1.6 }}>
              Create and read 24-hour impact stories — images, text cards, or shared posts.
            </p>

            <Endpoint method="GET" path="/stories" desc="Fetch active story groups"
              params={[{ name: "user_id", type: "string", desc: "Returns followed users' stories first" }]}
            />

            <Endpoint method="POST" path="/stories" desc="Create a story"
              params={[
                { name: "user_id", type: "string", required: true, desc: "Story author" },
                { name: "type", type: "enum", required: true, desc: "image · video · text · post" },
                { name: "media_url", type: "string", desc: "Required for image/video stories" },
                { name: "text_content", type: "string", desc: "Required for text stories" },
                { name: "post_id", type: "string", desc: "Required for post-share stories" },
                { name: "caption", type: "string", desc: "Optional caption (max 150 chars)" },
              ]}
            />

            <Endpoint method="DELETE" path="/stories/:id" desc="Delete a story" />
          </section>

          <Divider />

          {/* ── Map ── */}
          <section id="map">
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Action Map</h2>
            <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "0 0 20px", lineHeight: 1.6 }}>
              List and manage real-world projects — cleanups, tree planting, community events — pinned to a map location.
            </p>

            <Endpoint method="GET" path="/map/projects" desc="List active map projects"
              params={[
                { name: "lat", type: "number", desc: "Center latitude for proximity sort" },
                { name: "lng", type: "number", desc: "Center longitude for proximity sort" },
                { name: "category", type: "string", desc: "Filter by category (Cleanup, Planting, etc.)" },
                { name: "radius_km", type: "number", desc: "Only return projects within this radius" },
              ]}
            />

            <Endpoint method="POST" path="/map/projects" desc="Create a project"
              params={[
                { name: "user_id", type: "string", required: true, desc: "Organiser's user ID" },
                { name: "title", type: "string", required: true, desc: "Project name" },
                { name: "category", type: "string", required: true, desc: "Cleanup · Planting · Education · Energy · Advocacy" },
                { name: "lat", type: "number", desc: "Latitude of event location" },
                { name: "lng", type: "number", desc: "Longitude of event location" },
                { name: "location_name", type: "string", desc: "Human-readable location (shown on map)" },
                { name: "starts_at", type: "ISO 8601", desc: "Event start time" },
                { name: "description", type: "string", desc: "Full description" },
              ]}
            />

            <Endpoint method="POST" path="/map/projects/:id/rsvp" desc="RSVP to a project"
              params={[{ name: "user_id", type: "string", required: true, desc: "User RSVPing" }]}
            />
          </section>

          <Divider />

          {/* ── Webhooks ── */}
          <section id="webhooks">
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Webhooks</h2>
            <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "0 0 24px", lineHeight: 1.6 }}>
              Receive real-time push notifications when key events occur on Honua — no polling required.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {[
                ["impact.logged", "A user logs a new action via your integration"],
                ["impact.verified", "An impact log reaches the 3-vouch threshold and is marked verified"],
                ["impact.vouched", "A community member vouches for one of your users' logs"],
                ["order.placed", "A buyer places an order in your shop"],
                ["order.status_changed", "An order item advances to a new status"],
                ["carbon.purchased", "A user purchases a carbon credit offset"],
                ["profile.followed", "A user gains a new follower"],
                ["challenge.completed", "A user completes a challenge"],
              ].map(([event, desc]) => (
                <div key={event} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10 }}>
                  <code style={{ minWidth: 200, fontSize: 12.5, fontFamily: "JetBrains Mono", color: "var(--green)" }}>{event}</code>
                  <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{desc}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "#0d1117", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#8b949e", marginBottom: 10, letterSpacing: ".06em" }}>EXAMPLE WEBHOOK PAYLOAD — impact.verified</div>
              <pre style={{ margin: 0, fontSize: 12.5, fontFamily: "JetBrains Mono", color: "#e6edf3", lineHeight: 1.65 }}>{`{
  "event": "impact.verified",
  "created_at": "2026-07-29T09:41:00Z",
  "data": {
    "log_id": "log_9x2kq",
    "user_id": "usr_abc123",
    "action": "Bike commute",
    "category": "Transport",
    "co2_saved_kg": 2.38,
    "green_points": 28,
    "vouch_count": 3
  }
}`}</pre>
            </div>

            <div style={{ marginTop: 24, background: "var(--green-tint)", border: "1px solid var(--green-3)", borderRadius: 12, padding: "16px 20px", fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Ready to integrate? <a href="mailto:api@honua.green" style={{ color: "var(--green)", fontWeight: 700, textDecoration: "none" }}>Request API access →</a>
            </div>
          </section>

        </main>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--line)", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "var(--ink-4)" }}>© 2026 Honua</span>
        <div style={{ display: "flex", gap: 20, fontSize: 12, fontFamily: "JetBrains Mono", color: "var(--ink-4)" }}>
          {[["Terms", "/terms"], ["Privacy", "/terms#privacy"], ["Support", "/support"]].map(([l, h]) => (
            <a key={l} href={h} style={{ color: "var(--ink-4)", textDecoration: "none" }}>{l}</a>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .api-sidebar { display: none !important; }
        }
        @media (max-width: 900px) {
          .api-content-wrap { flex-direction: column !important; gap: 0 !important; }
          .api-main { padding-top: 24px !important; }
        }
        @media (max-width: 600px) {
          .api-param-row { grid-template-columns: 1fr !important; }
          .api-cards-3 { grid-template-columns: 1fr !important; }
          .api-cards-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
