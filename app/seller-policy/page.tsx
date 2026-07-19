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

const P = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <p style={{ margin: "0 0 12px", ...style }}>{children}</p>
);

const UL = ({ items }: { items: React.ReactNode[] }) => (
  <ul style={{ margin: "8px 0 12px", paddingLeft: 22 }}>
    {items.map((it, i) => <li key={i} style={{ marginBottom: 6 }}>{it}</li>)}
  </ul>
);

const OL = ({ items }: { items: React.ReactNode[] }) => (
  <ol style={{ margin: "8px 0 12px", paddingLeft: 22 }}>
    {items.map((it, i) => <li key={i} style={{ marginBottom: 6 }}>{it}</li>)}
  </ol>
);

const Callout = ({ type, children }: { type: "note" | "warn"; children: React.ReactNode }) => (
  <div style={{
    background: type === "warn" ? "var(--orange-tint, #fff8f2)" : "var(--green-tint)",
    border: `1px solid ${type === "warn" ? "var(--orange-3, #f5c08a)" : "var(--green-3)"}`,
    borderRadius: 12,
    padding: "14px 18px",
    fontSize: 14,
    color: "var(--ink-2)",
    lineHeight: 1.65,
    margin: "12px 0 16px",
  }}>
    {children}
  </div>
);

const Table = ({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) => (
  <div style={{ overflowX: "auto", margin: "12px 0 20px", borderRadius: 12, border: "1px solid var(--line)" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
      <thead>
        <tr style={{ background: "var(--surface-2, var(--bg))" }}>
          {headers.map((h, i) => (
            <th key={i} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "var(--ink-4)", fontWeight: 500, letterSpacing: ".08em", textTransform: "uppercase", borderBottom: "1px solid var(--line)" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none" }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: "10px 14px", color: "var(--ink-2)", verticalAlign: "top", lineHeight: 1.5 }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Badge = ({ color, children }: { color: "green" | "amber" | "red" }) => {
  const colors = {
    green: { bg: "rgba(16,124,48,0.1)", text: "var(--green-2, #1a6035)" },
    amber: { bg: "rgba(184,154,90,0.15)", text: "var(--accent, #8a6a20)" },
    red:   { bg: "rgba(180,50,30,0.1)",  text: "#b43018" },
  };
  return (
    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: colors[color].bg, color: colors[color].text, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
};

const SECTIONS = [
  "Introduction & Scope",
  "Definitions",
  "Seller Eligibility",
  "Registration & Verification",
  "Seller Tiers",
  "Sustainability Standards",
  "Allowed Product Categories",
  "Prohibited & Restricted Items",
  "Listing Requirements",
  "Pricing Policy",
  "Green Points & Rewards",
  "Fees & Commissions",
  "Payments & Payouts",
  "Taxes & Invoicing",
  "Shipping & Delivery",
  "Returns, Refunds & Cancellations",
  "Digital & Service Products",
  "Seller Conduct & Community Standards",
  "Claims & Accuracy",
  "Intellectual Property",
  "Data & Privacy",
  "Performance Standards",
  "Dispute Resolution",
  "Enforcement & Account Actions",
  "Appeals",
  "Liability & Indemnification",
  "Policy Amendments",
  "Contact & Support",
];

export default function SellerPolicyPage() {
  const effective = "1 August 2026";
  const lastUpdated = "July 2026";
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
        <Link href="/seller" style={{ fontSize: 13, color: "var(--green)", fontWeight: 600, textDecoration: "none" }}>← Back to Seller Hub</Link>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px", display: "flex", gap: 64, alignItems: "flex-start" }}>
        {/* Sidebar TOC */}
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
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontFamily: "Lora, sans-serif", fontSize: "clamp(30px,4vw,48px)", fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 14px", lineHeight: 1.05 }}>Seller Policy</h1>
            <div style={{ display: "flex", gap: 20, fontSize: 13, color: "var(--ink-3)", fontFamily: "JetBrains Mono, monospace", flexWrap: "wrap" }}>
              <span>Last updated: {lastUpdated}</span>
              <span>Effective: {effective}</span>
              <span>Version 1.0</span>
            </div>
            <div style={{ marginTop: 18, background: "var(--green-tint)", border: "1px solid var(--green-3)", borderRadius: 12, padding: "14px 18px", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.65 }}>
              <strong>Plain-English summary:</strong> Honua is a sustainability marketplace. Every product you list must meet real environmental standards — not just a "green" label. We charge a tiered commission, pay out on a schedule, and take greenwashing as seriously as counterfeits. Sellers who comply get access to Green Points integration, buyer trust, and growing reach. Those who don't are removed.
            </div>
          </div>

          {/* ── 1. Intro ── */}
          <Section id="s1" title="1. Introduction & Scope">
            <P>Welcome to the Honua Marketplace. Honua is a sustainability-first social commerce platform where individuals, makers, small businesses, and certified brands can sell products and services that align with environmental values. By registering as a seller on Honua, you agree to be bound by this Seller Policy in its entirety, as well as Honua's general <Link href="/terms" style={{ color: "var(--green)", textDecoration: "underline" }}>Terms of Service</Link>, Privacy Policy, and any additional policies or guidelines published from time to time.</P>
            <P>This policy applies to every person or entity that lists, offers, advertises, or sells any product or service through the Honua platform ("Marketplace"), whether through the primary storefront, via the Honua App, through embedded partner channels, or via any Honua-powered integration. It governs the full lifecycle of a seller's activity: account creation, product listing, transaction processing, fulfilment, post-sale obligations, and enforcement.</P>
            <P>Honua's marketplace is not a neutral platform. We exist to accelerate the transition to a sustainable economy. Every policy in this document is designed to protect buyers, uphold environmental integrity, and ensure that selling on Honua carries genuine meaning.</P>
            <Callout type="note"><strong>Our commitment to you:</strong> Honua will enforce this policy consistently and transparently. We will not remove listings arbitrarily, and every enforcement action is subject to appeal. In return, we ask that sellers engage in good faith and uphold the values this community is built on.</Callout>
            <Sub title="Who this policy covers">
              <UL items={[
                <><strong>Individual sellers</strong> — private persons selling handmade, upcycled, pre-owned, or sustainably sourced items.</>,
                <><strong>Small businesses</strong> — registered businesses with fewer than 50 employees primarily selling sustainable goods or services.</>,
                <><strong>Verified brands</strong> — companies that have completed Honua's brand certification process and carry a Verified Seller badge.</>,
                <><strong>Service providers</strong> — individuals or organisations offering sustainability-related services (repair, consulting, education, carbon offsetting).</>,
                <><strong>Partner integrations</strong> — third-party platforms or applications that list products through the Honua Open API on behalf of registered sellers.</>,
              ]} />
            </Sub>
          </Section>

          {/* ── 2. Definitions ── */}
          <Section id="s2" title="2. Definitions">
            <P>The following terms have specific meanings throughout this policy.</P>
            <Table
              headers={["Term", "Meaning"]}
              rows={[
                [<strong>Honua / Platform</strong>, "Honua B.V., its subsidiaries, and the suite of products, services, APIs, and interfaces it operates."],
                [<strong>Seller</strong>, "Any person or entity registered to list products or services on the Honua Marketplace."],
                [<strong>Buyer</strong>, "Any Honua user who purchases or attempts to purchase a product or service."],
                [<strong>Listing</strong>, "Any publicly visible offer of a product or service, including its title, description, images, price, and associated metadata."],
                [<strong>Transaction</strong>, "A completed or attempted purchase between a buyer and a seller through the Honua Marketplace."],
                [<strong>Green Points (GP)</strong>, "Honua's in-platform reward currency, earned for verified environmental actions and redeemable in the Marketplace or with Honua partners."],
                [<strong>Sustainability Score</strong>, "A 0–100 rating assigned to sellers and listings based on verified environmental credentials, actions, and claims."],
                [<strong>Verified Seller Badge</strong>, "A trust mark awarded to sellers who have passed Honua's identity, sustainability, and quality verification process."],
                [<strong>Prohibited Item</strong>, "Any product or service that Honua does not permit to be listed under any circumstances."],
                [<strong>Restricted Item</strong>, "A product or service that may be listed only by sellers who meet additional eligibility criteria or hold specific certifications."],
                [<strong>Payout</strong>, "The transfer of funds from Honua to a seller's linked bank or payment account following a completed transaction."],
                [<strong>Sustainability Claim</strong>, "Any assertion made in a listing about the environmental credentials, materials, certifications, or impact of a product or service."],
                [<strong>Greenwashing</strong>, "Making misleading or unsubstantiated environmental claims about a product or service."],
              ]}
            />
          </Section>

          {/* ── 3. Eligibility ── */}
          <Section id="s3" title="3. Seller Eligibility">
            <Sub title="Age and legal capacity">
              <UL items={[
                "You must be at least 18 years of age to register as a seller.",
                "If you are a business, you must be a legally registered entity in your jurisdiction.",
                "You must have the legal capacity to enter into contracts in your country of residence or incorporation.",
              ]} />
            </Sub>
            <Sub title="Geographic availability">
              <P>Honua Marketplace seller registration is currently available in the Netherlands, Belgium, Germany, France, the United Kingdom, and Ireland. We are expanding to additional countries on a rolling basis. Sellers in unavailable countries may join a waitlist.</P>
              <P>Selling into Honua is available globally, subject to applicable sanctions lists, export controls, and Honua's payment provider restrictions. You are solely responsible for ensuring your sales comply with your local laws.</P>
            </Sub>
            <Sub title="Account standing">
              <UL items={[
                "You must not have been previously suspended or permanently banned from Honua.",
                "You must not be subject to any court order or legal prohibition preventing you from operating a business.",
                "You must not be on any applicable sanctions list (UN, EU, US OFAC, or equivalent).",
              ]} />
            </Sub>
            <Sub title="One seller account per entity">
              <P>Each individual or legal entity may operate only one seller account. Operating multiple seller accounts, including after a suspension or ban, is prohibited and may result in permanent removal and financial liability.</P>
            </Sub>
          </Section>

          {/* ── 4. Registration ── */}
          <Section id="s4" title="4. Registration & Verification">
            <Sub title="Required information">
              <P>All sellers must provide the following during registration:</P>
              <UL items={[
                <><strong>Identity</strong> — Government-issued photo ID. Businesses must additionally provide company registration documents.</>,
                <><strong>Address</strong> — A verifiable physical address (residential or business).</>,
                <><strong>Tax information</strong> — VAT number (if applicable), tax identification number, and country of tax residence.</>,
                <><strong>Banking details</strong> — A bank account or payment account capable of receiving payouts.</>,
                <><strong>Contact details</strong> — A business email address and customer-facing contact method.</>,
              ]} />
            </Sub>
            <Sub title="Sustainability declaration">
              <P>Every seller must complete a Sustainability Declaration affirming that the products or services they intend to list meet Honua's minimum sustainability standards, that all sustainability claims are accurate and verifiable, and that they will cooperate with any audit or compliance review.</P>
            </Sub>
            <Sub title="Verification timeline">
              <P>All new sellers undergo basic identity and fraud screening within 3 business days of application. Sellers applying for Verified Brand status undergo additional sustainability audits, typically taking 10–15 business days. Honua may request additional documentation at any time; failure to provide it within 14 days may result in account suspension.</P>
            </Sub>
          </Section>

          {/* ── 5. Tiers ── */}
          <Section id="s5" title="5. Seller Tiers">
            <P>Honua operates a three-tier seller system. Your tier determines your listing limits, fee rates, eligibility for Green Points integration, and access to promotional tools. Tiers are reviewed quarterly.</P>
            <Table
              headers={["Tier", "Commission", "Listing limit", "GP integration", "Requirements"]}
              rows={[
                [<strong>Starter</strong>, "12%", "25 active listings", "Buyers can spend GP on your listings", "Completed registration + Sustainability Declaration"],
                [<strong>Trusted Seller</strong>, "9%", "200 active listings", "Full — buyers spend GP; you earn bonus GP for verified eco actions", "30+ transactions, <2% dispute rate, 1 verified sustainability credential"],
                [<strong>Verified Brand</strong>, "7%", "Unlimited", "Full + can issue custom GP rewards to buyers", "Brand audit, 3+ sustainability certifications, dedicated account manager"],
              ]}
            />
            <Callout type="note"><strong>Tier upgrades</strong> are reviewed quarterly. Honua may downgrade a seller's tier if performance metrics fall below thresholds. You will receive 30 days' notice before any downgrade, with a remediation window.</Callout>
            <Sub title="Verified Brand certification">
              <P>Verified Brand status requires a dedicated application. Applicants must submit evidence of at least 3 recognised sustainability certifications (e.g. B Corp, Fairtrade, GOTS, Cradle to Cradle, EU Ecolabel, Rainforest Alliance, or equivalent), a supply chain transparency report, an annual sustainability report (if published), and a signed Brand Partner Code of Conduct.</P>
            </Sub>
          </Section>

          {/* ── 6. Sustainability ── */}
          <Section id="s6" title="6. Sustainability Standards">
            <P>Honua is not a general marketplace. Every product and service listed must meet minimum sustainability criteria. These standards protect buyers from greenwashing and maintain the integrity of the Honua community.</P>
            <Sub title="Minimum requirements — at least one must apply">
              <UL items={[
                <><strong>Sustainable materials</strong> — Made primarily from recycled, upcycled, organic, natural, or sustainably sourced materials.</>,
                <><strong>Extended product life</strong> — Pre-owned, refurbished, repaired, or designed for durability and long-term use.</>,
                <><strong>Low-impact production</strong> — Manufactured using demonstrably lower-carbon or lower-impact processes than conventional alternatives.</>,
                <><strong>Local and artisan</strong> — Handmade or produced within a 500 km radius by the seller, with transparent sourcing.</>,
                <><strong>Carbon-offsetting service</strong> — Directly facilitates carbon reduction, removal, or offsetting.</>,
                <><strong>Sustainability education</strong> — Teaches, enables, or supports more sustainable practices.</>,
                <><strong>Circular economy</strong> — Contributes to a closed-loop system (repair cafés, take-back schemes, composting services).</>,
              ]} />
            </Sub>
            <Sub title="What does not qualify">
              <Callout type="warn">
                Products labelled "eco-friendly" or "green" without substantiating evidence; products where only the packaging is recycled while the product itself is not; products certified solely by the seller's own in-house scheme; fast fashion and single-use plastics regardless of marketing claims; products whose only environmental benefit is offset-only with no underlying improvement to production or materials.
              </Callout>
            </Sub>
            <Sub title="Accepted certifications (non-exhaustive)">
              <Table
                headers={["Certification", "Applies to", "Tier impact"]}
                rows={[
                  ["B Corp Certification", "Company-wide", <Badge color="green">Counts toward Verified Brand</Badge>],
                  ["EU Ecolabel", "Specific product categories", <Badge color="green">Counts toward Verified Brand</Badge>],
                  ["GOTS (Organic Textile)", "Clothing, textiles", <Badge color="green">Counts toward Verified Brand</Badge>],
                  ["Fairtrade Certified", "Food, agriculture, crafts", <Badge color="green">Counts toward Verified Brand</Badge>],
                  ["FSC / PEFC", "Wood, paper products", <Badge color="green">Counts toward Verified Brand</Badge>],
                  ["Cradle to Cradle", "Products / manufacturing", <Badge color="green">Counts toward Verified Brand</Badge>],
                  ["Rainforest Alliance", "Agriculture, forestry", <Badge color="green">Counts toward Verified Brand</Badge>],
                  ["EWG Verified", "Personal care, cleaning", <Badge color="amber">Starter / Trusted</Badge>],
                  ["Carbon Neutral certified", "Products / company-wide", <Badge color="amber">Starter / Trusted</Badge>],
                  ["Vegan Society Mark", "Any product", <Badge color="amber">Starter</Badge>],
                ]}
              />
            </Sub>
            <Sub title="Sustainability audits">
              <P>Honua may audit any seller's sustainability claims at any time. During an audit the seller must respond within 7 business days and provide original documentation. Listings under audit are not removed unless the audit reveals a clear violation, in which case the seller has 5 business days to remedy before the listing comes down.</P>
            </Sub>
          </Section>

          {/* ── 7. Allowed Categories ── */}
          <Section id="s7" title="7. Allowed Product Categories">
            <Table
              headers={["Category", "Min. tier", "Notes"]}
              rows={[
                ["Clothing & Accessories", <Badge color="amber">Starter</Badge>, "Must be pre-owned, handmade, or certified organic/recycled. Fast fashion brands explicitly excluded."],
                ["Home & Living", <Badge color="amber">Starter</Badge>, "Includes furniture, decor, kitchenware. Materials disclosure required."],
                ["Food & Drink", <Badge color="amber">Starter</Badge>, "Organic, local, or regenerative agriculture only. Food safety compliance required."],
                ["Beauty & Personal Care", <Badge color="amber">Starter</Badge>, "No microplastics. Cruelty-free required. Preferred: natural or certified organic."],
                ["Electronics (refurbished)", <Badge color="amber">Starter</Badge>, "Must be tested, graded, and come with minimum 6-month warranty."],
                ["Books, Media & Education", <Badge color="amber">Starter</Badge>, "Pre-owned or sustainability-focused content."],
                ["Garden & Outdoors", <Badge color="amber">Starter</Badge>, "Plants, seeds, compost, natural tools. No chemical pesticides or fertilisers."],
                ["Repair & Upcycling Services", <Badge color="amber">Starter</Badge>, "Clothing repair, electronics repair, furniture restoration, etc."],
                ["Sustainability Consulting", <Badge color="green">Trusted</Badge>, "Business or personal sustainability advisory. Qualification evidence required."],
                ["Carbon Offsets & Credits", <Badge color="green">Verified Brand</Badge>, "Only Verra (VCS), Gold Standard, or Puro.Earth credits accepted. Full chain of custody required."],
                ["Renewable Energy Products", <Badge color="green">Trusted</Badge>, "Solar panels, small-scale wind, heat pumps, EV accessories. CE marking required."],
                ["Zero-waste Products", <Badge color="amber">Starter</Badge>, "Reusables, bulk goods, package-free products. Must demonstrate reduction of single-use materials."],
              ]}
            />
          </Section>

          {/* ── 8. Prohibited ── */}
          <Section id="s8" title="8. Prohibited & Restricted Items">
            <Callout type="warn"><strong>Listing a prohibited item, regardless of how it is described, will result in immediate listing removal and may result in account suspension.</strong> Repeated violations result in permanent account termination.</Callout>
            <Sub title="Absolutely prohibited — no exceptions">
              <UL items={[
                "Weapons, firearms, ammunition, or components thereof",
                "Illegal drugs, controlled substances, or drug paraphernalia",
                "Products made from endangered species or CITES-listed materials (ivory, certain corals, exotic skins)",
                "Products tested on animals (cosmetics and personal care only)",
                "Single-use plastics, including disposable cups, cutlery, straws, and bags — unless the listing demonstrates a take-back or composting programme",
                "Products containing banned chemicals (EU REACH substances of very high concern, parabens above regulated limits, etc.)",
                "Counterfeit goods or goods that infringe intellectual property rights",
                "New fast fashion items — products produced in a model characterised by rapid design-to-retail cycles and synthetic low-cost fabrics intended for short-term use",
                "Unsustainable palm oil products (non-RSPO certified)",
                "Carbon offsets from projects that do not meet Verra, Gold Standard, Puro.Earth, or Honua-approved standards",
                "Any product or service facilitating fossil fuel extraction, deforestation, or industrial animal agriculture",
                "Financial products, insurance, loans, or investment instruments",
                "Anything illegal in the seller's or buyer's jurisdiction",
              ]} />
            </Sub>
            <Sub title="Restricted items — permitted only with additional verification">
              <Table
                headers={["Item type", "Restriction", "Required for listing"]}
                rows={[
                  ["Food products", "All tiers", "Local food safety registration; allergen disclosure; no expired stock"],
                  ["Children's products", "All tiers", "CE marking; age-appropriate safety compliance"],
                  ["Medical/health devices", "Trusted+ only", "Regulatory certification (CE or equivalent); no therapeutic claims without approval"],
                  ["Electrical equipment", "All tiers", "CE marking; warranty disclosure; returns process for faulty goods"],
                  ["Alcohol", "Trusted+ only", "Producer licence; age verification agreement; local regulatory compliance"],
                  ["Live plants / seeds", "All tiers", "Phytosanitary certificate for cross-border; invasive species screening"],
                  ["Vintage items >50 years", "All tiers", "Provenance statement; no prohibited materials"],
                  ["Carbon credits", "Verified Brand only", "Full registry chain of custody; retirement certificate upon sale"],
                ]}
              />
            </Sub>
          </Section>

          {/* ── 9. Listing Requirements ── */}
          <Section id="s9" title="9. Listing Requirements">
            <Sub title="Required fields">
              <UL items={[
                <><strong>Title</strong> — Clear, accurate, descriptive. No keyword stuffing. Max 150 characters.</>,
                <><strong>Description</strong> — At minimum 100 words covering what the product is, what it's made of, how it's made, and why it qualifies as sustainable.</>,
                <><strong>Category</strong> — The correct primary (and secondary, where applicable) category.</>,
                <><strong>Price</strong> — Clearly stated. Any additional fees (shipping, tax) must be disclosed at listing level.</>,
                <><strong>Photos</strong> — At least 3 original photographs of the actual product. No stock images. Clear, well-lit, accurately representative.</>,
                <><strong>Condition</strong> — New, like new, good, fair, or poor (as defined in Honua's Listing Guide).</>,
                <><strong>Sustainability tag</strong> — At least one standardised tag (e.g. "Organic", "Pre-owned", "Recycled materials", "Locally made", "Handcrafted", "Zero-waste").</>,
                <><strong>Materials</strong> — Primary material composition. For textiles, fibres must be listed by percentage.</>,
                <><strong>Shipping options</strong> — At least one shipping method with estimated delivery time and cost.</>,
                <><strong>Returns policy</strong> — Whether returns are accepted and under what conditions (see Section 16).</>,
              ]} />
            </Sub>
            <Sub title="Sustainability claims in listings">
              <P>Three types of claims are recognised:</P>
              <UL items={[
                <><strong>Certified claims</strong> — Backed by a recognised third-party certification. Certificate number and issuing body must be included. These receive a verification badge.</>,
                <><strong>Attested claims</strong> — Backed by your own declaration (e.g. "made with 80% recycled PET"). Must be accurate and provable on request. Marked "Seller-attested."</>,
                <><strong>Aspirational claims</strong> — Forward-looking commitments (e.g. "working toward carbon neutrality by 2027"). Must be clearly labelled as targets, not current reality. Misrepresenting an aspirational claim as current is greenwashing and is prohibited.</>,
              ]} />
            </Sub>
            <Sub title="Photography standards">
              <UL items={[
                "All photos must be original and taken by you or on your behalf. Stock photos are not permitted for the primary listing image.",
                "The primary image must show the product against a clean background with no obstructing text or watermarks.",
                "Images must accurately represent the product — colour, size, and condition.",
                "AI-generated product images are not permitted on any Honua listing.",
                "For pre-owned items, photos must show the actual item being sold, including any wear, damage, or imperfections.",
              ]} />
            </Sub>
            <Sub title="Prohibited listing practices">
              <UL items={[
                "Duplicate listings — listing the same item multiple times to gain visibility",
                "Keyword manipulation — including irrelevant keywords in titles or tags",
                "False scarcity — claiming limited stock when it is not limited",
                "Misleading bundling — burying a non-sustainable item inside a bundle",
                "Price inflation followed by artificial discount",
                "Listing items you do not own or have the right to sell",
                "AI-generated product images",
              ]} />
            </Sub>
          </Section>

          {/* ── 10. Pricing ── */}
          <Section id="s10" title="10. Pricing Policy">
            <Sub title="Pricing freedom">
              <P>Sellers are free to set their own prices. Honua does not set minimum or maximum prices except in specific regulated categories. Honua strongly encourages fair, transparent pricing that reflects the true cost of sustainable production.</P>
            </Sub>
            <Sub title="Price transparency">
              <UL items={[
                "The price shown on the listing must be the total price payable by the buyer, or clearly indicate that shipping costs are additional.",
                "VAT must be included in the displayed price for B2C sales within the EU.",
                "Any handling, processing, or packaging fees must be disclosed in the listing.",
                "Green Points redemption pricing must reflect the same value as the cash price — sellers may not inflate the GP equivalent price.",
              ]} />
            </Sub>
            <Sub title="Currency">
              <P>The primary listing currency is euros (EUR). The EUR price governs all transactions and payouts. Currency conversion for non-EUR payouts is handled by Honua's payment processor at the applicable exchange rate at time of payout.</P>
            </Sub>
            <Sub title="Price manipulation">
              <P>Artificial price manipulation — including inflating prices before applying a discount, colluding with other sellers on pricing, or systematically underpricing to eliminate competition — is prohibited and may constitute a violation of competition law.</P>
            </Sub>
          </Section>

          {/* ── 11. Green Points ── */}
          <Section id="s11" title="11. Green Points & Rewards Integration">
            <P>Green Points (GP) are Honua's environmental rewards currency. They are earned by users who take verified sustainable actions — both inside Honua and through partner integrations — and can be redeemed in the Marketplace.</P>
            <Sub title="How buyers use Green Points at checkout">
              <UL items={[
                "Buyers may apply Green Points at checkout to reduce the cash price. 1 GP = €0.01.",
                "Buyers may apply a maximum of 50% of the order value in Green Points on any single transaction.",
                "As a Starter seller, you receive the full listed price for every sale — Honua absorbs the cost of GP redemption. Trusted and Verified sellers co-fund GP redemption at a negotiated rate in their Seller Agreement.",
              ]} />
            </Sub>
            <Sub title="Earning Green Points as a seller">
              <P>Sellers can earn GP for verified environmental actions separate from selling: logging packaging waste reduction, switching to a lower-emission delivery partner, obtaining a new sustainability certification, and participating in Honua's verified local action events. Seller-earned GP may be used to boost listing visibility, run sponsored challenges, or be transferred to a personal wallet.</P>
            </Sub>
            <Sub title="Issuing Green Points to buyers (Verified Brand only)">
              <P>Verified Brand sellers may issue custom GP rewards to buyers as part of sponsored campaigns, subject to Honua's campaign approval process. Issued GP must be funded by the seller at €0.01 per GP, deposited into escrow before a campaign launches. Unused GP at campaign end is refunded to the seller minus a 3% handling fee.</P>
            </Sub>
            <Sub title="Prohibited GP practices">
              <Callout type="warn">
                Manipulating or gaming the GP system to earn points not based on genuine environmental action; purchasing, selling, or transferring GP outside the Honua platform; misrepresenting environmental actions to earn GP; attempting to artificially inflate a Sustainability Score through false action logging. These violations result in immediate GP privileges revocation and potential permanent account termination.
              </Callout>
            </Sub>
          </Section>

          {/* ── 12. Fees ── */}
          <Section id="s12" title="12. Fees & Commissions">
            <Sub title="Commission structure">
              <P>Honua charges a commission on each completed transaction, calculated as a percentage of the total order value including shipping, excluding VAT. Commission rates by tier are shown in Section 5. Commission is deducted automatically from each payout — you are never required to pay it upfront.</P>
            </Sub>
            <Sub title="Payment processing fee">
              <P>A payment processing fee of <strong>1.5% + €0.25 per transaction</strong> is charged in addition to the commission. This fee covers card processing, fraud prevention, and currency conversion. It is deducted from the payout.</P>
            </Sub>
            <Sub title="Listing fees">
              <P>There are no listing fees on Honua. You may list up to your tier limit without charge.</P>
            </Sub>
            <Sub title="Optional paid features">
              <Table
                headers={["Feature", "Cost", "Notes"]}
                rows={[
                  ["Listing boost (7 days)", "€2.50 per listing", "Prioritised placement in search results and discovery feeds"],
                  ["Sponsored challenge entry", "From €50 per campaign", "Brand-sponsored GP challenge; priced by reach and duration"],
                  ["Verified Brand audit", "€150 one-time", "Covers the third-party audit cost; refunded on approval"],
                  ["Sustainability Score report", "€25", "Personalised report with recommendations for improving your score"],
                ]}
              />
            </Sub>
            <Sub title="Fee changes">
              <P>Honua may change its fee structure with 30 days' notice. Fees will not increase for active listings during the notice period. Continued use after a fee change constitutes acceptance of the new rates.</P>
            </Sub>
            <Sub title="Refunds of fees">
              <P>Commission and processing fees are refunded only where: (a) the buyer cancels before shipping, (b) the order is cancelled due to a platform error, or (c) a dispute is resolved in the seller's favour after a buyer-initiated chargeback. Fees are not refunded on buyer returns where the seller complied with their stated return policy.</P>
            </Sub>
          </Section>

          {/* ── 13. Payments ── */}
          <Section id="s13" title="13. Payments & Payouts">
            <Sub title="Payment processing">
              <P>All payments are processed by Honua's integrated payment provider (currently Stripe). Honua collects payment from buyers on behalf of sellers and remits the net amount on the payout schedule.</P>
            </Sub>
            <Sub title="Payout schedule">
              <UL items={[
                <><strong>Starter sellers</strong> — Payouts every 14 days for transactions where the 7-day delivery confirmation period has passed.</>,
                <><strong>Trusted sellers</strong> — Payouts every 7 days.</>,
                <><strong>Verified Brand sellers</strong> — Payouts every 3 business days or on a custom schedule with your account manager.</>,
              ]} />
              <P>Payouts due on weekends or Netherlands public holidays are processed the next available business day. Minimum payout amount: €10.00. Balances below this roll forward to the next cycle.</P>
            </Sub>
            <Sub title="Payout holds">
              <P>Honua may hold payouts where: an open dispute is attached to the transaction; a chargeback has been initiated; the seller's account is under review; the account has a negative balance; or Honua reasonably suspects fraud. You will be notified within 24 hours of any hold being placed.</P>
            </Sub>
            <Sub title="Dormant accounts">
              <P>If a seller account has no transactions for 12 consecutive months and holds a positive balance, Honua will contact the seller. If no response is received within 60 days, outstanding balances may be transferred to a regulated dormant funds scheme in accordance with Dutch law.</P>
            </Sub>
          </Section>

          {/* ── 14. Taxes ── */}
          <Section id="s14" title="14. Taxes & Invoicing">
            <Sub title="Seller tax responsibility">
              <P>You are solely responsible for determining, collecting, reporting, and remitting all applicable taxes on your sales, including VAT, sales tax, customs duties, and income tax. Honua is not your tax agent and does not provide tax advice.</P>
            </Sub>
            <Sub title="VAT on platform fees">
              <P>Honua charges Dutch VAT (BTW) at the current rate on its commission and fees. If you are a VAT-registered business in the EU, you may be eligible to reclaim this. Honua issues a monthly tax invoice for all fees charged, accessible in your seller dashboard.</P>
            </Sub>
            <Sub title="EU VAT (OSS)">
              <P>If you sell to buyers in EU countries other than your country of establishment, EU VAT One Stop Shop (OSS) rules apply. You are responsible for registering under OSS if required. Honua provides basic VAT reporting data in your dashboard but does not file OSS returns on your behalf.</P>
            </Sub>
            <Sub title="DAC7 reporting">
              <P>Under EU Directive DAC7, Honua is required to report seller income data to Dutch tax authorities annually. By using the platform, you consent to this reporting. Honua will provide you a copy of the reported data by 31 January each year.</P>
            </Sub>
          </Section>

          {/* ── 15. Shipping ── */}
          <Section id="s15" title="15. Shipping & Delivery">
            <Sub title="Packaging standards">
              <P>Honua is a sustainability platform. Sellers must use packaging that is recycled, recyclable, or compostable. Virgin plastic packaging without a recycling scheme is prohibited. Excessive packaging — disproportionately large boxes, unnecessary void fill, or multiple layers of non-recyclable material — is a policy violation.</P>
            </Sub>
            <Sub title="Carbon-offset shipping">
              <P>Sellers are strongly encouraged to use low-carbon delivery options (bicycle courier, electric vehicle, rail) where available, and must offer a carbon-offset shipping option or partner with a carrier that offers this, at least as an opt-in for buyers.</P>
            </Sub>
            <Sub title="Dispatch timeframes">
              <UL items={[
                "Sellers must dispatch physical goods within the handling time stated on the listing. Default if unstated: 3 business days.",
                "Maximum handling time: 7 business days (Starter), 5 business days (Trusted / Verified Brand).",
                "If you cannot dispatch in time, you must contact the buyer and offer an updated timeline or cancellation with full refund.",
                "Orders must be marked as dispatched in the platform within 24 hours of handover to the carrier, with tracking information where available.",
              ]} />
            </Sub>
            <Sub title="Delivery responsibility">
              <P>Risk of loss passes to the buyer on delivery. Until delivery, the seller bears responsibility for safe transit. Sellers are responsible for adequate packaging to prevent transit damage. If goods arrive damaged due to poor packaging, the seller is liable for a replacement or refund regardless of the carrier's fault.</P>
            </Sub>
            <Sub title="International shipping">
              <P>Sellers shipping internationally are responsible for all export documentation, customs declarations, and compliance with import restrictions in the destination country. Import duties and taxes are typically the buyer's responsibility and must be disclosed in the listing's shipping terms.</P>
            </Sub>
            <Sub title="Lost shipments">
              <P>If a tracked shipment shows no movement for 10 business days beyond the estimated delivery date, it is deemed potentially lost. The seller must open a carrier investigation and update the buyer within 5 business days. If loss is confirmed, the seller must issue a replacement or full refund within 5 business days. Honua's dispute process may be invoked if the seller does not act within these timeframes.</P>
            </Sub>
          </Section>

          {/* ── 16. Returns ── */}
          <Section id="s16" title="16. Returns, Refunds & Cancellations">
            <Sub title="EU legal minimum — 14-day cooling-off period">
              <P>If you sell to consumers in the European Union, you are legally required to accept returns within 14 days of delivery for distance sales (EU Consumer Rights Directive). This is a legal minimum and cannot be waived or overridden by your listing's returns policy. Attempting to do so is a violation of this policy and EU consumer protection law.</P>
            </Sub>
            <Sub title="Seller returns policy">
              <P>Beyond the legal minimum, sellers may set their own returns policy, which must be clearly stated on every listing:</P>
              <UL items={[
                <><strong>No returns beyond legal minimum</strong> — acceptable only for custom, made-to-order, digital, or perishable goods.</>,
                <><strong>30-day returns</strong> — Honua's standard recommendation.</>,
                <><strong>60-day returns</strong> — eligible for a quality badge on listings.</>,
              ]} />
            </Sub>
            <Sub title="Return shipping costs">
              <P>Unless the item is faulty, not as described, or damaged in transit, return shipping costs may be borne by the buyer — this must be disclosed clearly. For returns due to seller error, the seller must provide a prepaid return label at the seller's cost.</P>
            </Sub>
            <Sub title="Refund processing">
              <UL items={[
                "Full refunds must be issued within 5 business days of the seller receiving the returned item.",
                "Partial refunds for items returned in worse condition must be communicated to the buyer with photographic evidence before processing.",
                "Refunds are issued to the original payment method. Green Points used are refunded as GP to the buyer's wallet.",
                "If a seller fails to process a refund within the required timeframe, Honua may initiate it on the seller's behalf and deduct the amount from pending payouts.",
              ]} />
            </Sub>
            <Sub title="Cancellations">
              <UL items={[
                "Buyers may cancel an order before dispatch and receive a full refund.",
                "Sellers may cancel before dispatch only if the item is genuinely unavailable. A full refund must be issued immediately. Repeated cancellations affect the performance score.",
                "Sellers may not cancel to avoid a problematic buyer or because a better offer arrived elsewhere.",
              ]} />
            </Sub>
          </Section>

          {/* ── 17. Digital ── */}
          <Section id="s17" title="17. Digital & Service Products">
            <Sub title="Digital products">
              <P>Digital products (downloadable files, e-books, templates, educational materials, software) are permitted provided they relate to sustainability, environmental education, or green living. Digital products must be delivered automatically or within 24 hours of purchase, and be as described. Buyers waive the EU right of withdrawal for digital products before accessing them — sellers must include an explicit waiver at checkout for this to be valid.</P>
            </Sub>
            <Sub title="Services">
              <P>Service listings must clearly state: what is included; how the service is delivered (in-person, remote, or asynchronous); any geographic restrictions; the timeframe for delivery after purchase; and cancellation and rescheduling terms.</P>
            </Sub>
          </Section>

          {/* ── 18. Conduct ── */}
          <Section id="s18" title="18. Seller Conduct & Community Standards">
            <Sub title="Communication">
              <UL items={[
                "Respond to buyer messages within 48 hours on business days.",
                "All communications must be respectful, professional, and in good faith.",
                "Do not use Honua's messaging system to send unsolicited marketing or promotional content.",
                "Do not direct buyers to complete transactions outside the Honua platform to avoid fees. This is a serious violation and results in immediate suspension.",
              ]} />
            </Sub>
            <Sub title="Review integrity">
              <UL items={[
                "Do not solicit, incentivise, or coerce buyers to leave positive reviews.",
                "Do not offer refunds or discounts in exchange for changing or removing a negative review.",
                "Do not post fake reviews of your own products using secondary accounts.",
                "Do not post negative reviews of competitors.",
              ]} />
            </Sub>
            <Sub title="Community values">
              <P>By selling on Honua, you join a community with shared values around sustainability, transparency, and fairness. We expect sellers to engage honestly, share knowledge about sustainable practices, and report suspected violations via the reporting function rather than retaliating against other sellers.</P>
            </Sub>
          </Section>

          {/* ── 19. Claims & Accuracy ── */}
          <Section id="s19" title="19. Claims & Accuracy">
            <Sub title="Accuracy of listings">
              <P>Listings must accurately represent the product or service offered. Material inaccuracies — in condition, size, material composition, origin, certifications, or sustainability claims — constitute a breach of this policy and, in many cases, consumer protection law.</P>
            </Sub>
            <Sub title="Anti-greenwashing — zero tolerance">
              <UL items={[
                `Claiming a product is "carbon neutral" or "net zero" based solely on offset purchases without evidence of underlying emission reduction`,
                `Using terms like "natural," "green," "eco," "clean," or "sustainable" without substantive justification`,
                "Displaying sustainability certification logos that have expired, been revoked, or do not apply to the specific product listed",
                "Implying an environmental benefit that applies only to a small component of the product",
                `Making comparative claims ("more sustainable than X") without verifiable data`,
              ]} />
              <P>Violations are subject to immediate listing removal, a formal warning, and — in severe or repeated cases — account suspension and referral to the Netherlands Authority for Consumers and Markets (ACM) or relevant advertising standards body.</P>
            </Sub>
            <Sub title="Health and safety claims">
              <P>Sellers must not make unauthorised medical or health claims. Statements claiming a product prevents, treats, or cures any medical condition are prohibited unless the product is a registered medical device with appropriate regulatory approval.</P>
            </Sub>
          </Section>

          {/* ── 20. IP ── */}
          <Section id="s20" title="20. Intellectual Property">
            <Sub title="Your content">
              <P>You retain all intellectual property rights in the content you upload to Honua. By listing on Honua, you grant Honua a non-exclusive, royalty-free, worldwide licence to display, reproduce, and promote your listing content solely for the purpose of operating and promoting the Marketplace. This licence ends when you remove the listing.</P>
            </Sub>
            <Sub title="Third-party IP">
              <P>You must only list and sell products you have the legal right to sell. You must not list: counterfeit goods; products infringing trademarks, patents, or design rights; digital products containing copyrighted content you do not own or have not licensed; or products using another person's or brand's image, name, or likeness without consent.</P>
            </Sub>
            <Sub title="IP complaints (notice and takedown)">
              <P>Rights holders who believe their intellectual property is being infringed may file a takedown notice through Honua's IP complaint process (honua.green/legal/ip-complaints). Upon receipt of a valid complaint, Honua will notify the seller and remove the listing pending investigation. Sellers may file a counter-notice if they believe the complaint is incorrect. Repeated IP violations result in permanent account termination.</P>
            </Sub>
          </Section>

          {/* ── 21. Data ── */}
          <Section id="s21" title="21. Data & Privacy">
            <Sub title="Buyer data — permitted use only">
              <P>Honua shares limited buyer data with sellers solely to facilitate transactions: delivery name, delivery address, and email (if required for fulfilment). Sellers may use this data only to fulfil the specific order and must not use it for marketing, sell or share it with third parties, retain it beyond the period required to resolve the order (maximum 3 years for tax purposes), or combine it with data from other sources to build profiles.</P>
            </Sub>
            <Sub title="GDPR compliance">
              <P>If you sell to buyers in the EU, you are a data controller for buyer data you receive. You must maintain a privacy policy covering how you handle buyer data, accessible via your Honua seller profile. Honua's Data Processing Agreement (DPA) is available in your seller dashboard settings.</P>
            </Sub>
          </Section>

          {/* ── 22. Performance ── */}
          <Section id="s22" title="22. Performance Standards">
            <P>Honua monitors seller performance on a rolling 90-day basis. The following metrics are tracked and visible in your seller dashboard.</P>
            <Table
              headers={["Metric", "Minimum standard", "Warning threshold"]}
              rows={[
                ["Dispatch rate (on time)", "≥ 95%", "< 90%"],
                ["Dispute rate", "≤ 2%", "> 3%"],
                ["Unresolved disputes", "0", "2+"],
                ["Message response time (business hours)", "≤ 48 hours", "> 72 hours"],
                ["Seller-initiated cancellation rate", "≤ 1%", "> 2%"],
                ["Average star rating", "≥ 4.0 / 5.0", "< 3.5 / 5.0"],
                ["Upheld listing accuracy complaints (90 days)", "0", "2+"],
              ]}
            />
            <Sub title="Performance warnings">
              <P>When a seller reaches a warning threshold, Honua sends a notification specifying the metric(s) affected, the standard required, and a 30-day window to improve. Full selling privileges are retained during the remediation window.</P>
            </Sub>
            <Sub title="Performance-based actions">
              <P>If metrics are not improved within the remediation window, Honua may reduce listing visibility, downgrade the seller's tier, suspend the ability to create new listings, or — in severe cases — suspend the account entirely.</P>
            </Sub>
          </Section>

          {/* ── 23. Disputes ── */}
          <Section id="s23" title="23. Dispute Resolution">
            <Sub title="Grounds for a buyer dispute">
              <UL items={[
                "Item not received after the estimated delivery date has passed",
                "Item significantly not as described (wrong item, wrong size, different material, undisclosed damage)",
                "Item arrived damaged",
                "Seller failed to fulfil a service as described",
                "Seller refused to process a valid return or refund",
              ]} />
            </Sub>
            <Sub title="Dispute process">
              <OL items={[
                <><strong>Direct resolution (72 hours)</strong> — Honua first encourages buyer–seller resolution. A message thread is opened; the seller must respond within 48 business hours.</>,
                <><strong>Honua mediation (7 business days)</strong> — If direct resolution fails, Honua's Trust &amp; Safety team reviews evidence submitted by both parties within 5 business days of the mediation request.</>,
                <><strong>Determination</strong> — Honua issues a binding determination. Outcomes may include full refund, partial refund, no action, or — where the seller is at fault — a formal warning or payout deduction.</>,
              ]} />
            </Sub>
            <Sub title="Chargebacks">
              <P>If a buyer initiates a chargeback through their card issuer, Honua will represent the seller if the seller can provide fulfilment evidence (tracking confirmation, delivery confirmation, service delivery records). Sellers are liable for the chargeback fee (currently €15 per chargeback) regardless of outcome, unless the chargeback is ruled fraudulent.</P>
            </Sub>
          </Section>

          {/* ── 24. Enforcement ── */}
          <Section id="s24" title="24. Enforcement & Account Actions">
            <Sub title="Enforcement actions available to Honua">
              <UL items={[
                <><strong>Listing removal</strong> — Removal of one or more violating listings.</>,
                <><strong>Formal warning</strong> — A written notice recorded on the seller's account.</>,
                <><strong>Listing restrictions</strong> — Limitations on new listings for a defined period.</>,
                <><strong>Visibility reduction</strong> — Removal from featured placements, discovery feeds, or search rankings.</>,
                <><strong>GP privileges suspended</strong> — Removal of the ability to earn or issue Green Points.</>,
                <><strong>Tier downgrade</strong> — Reduction to a lower seller tier.</>,
                <><strong>Temporary suspension</strong> — Account inactive for a defined period (typically 14–90 days).</>,
                <><strong>Permanent termination</strong> — Seller account permanently closed; entity prohibited from creating new seller accounts.</>,
                <><strong>Financial liability</strong> — For violations resulting in financial harm, Honua may seek recovery of costs including legal fees.</>,
              ]} />
            </Sub>
            <Sub title="Violations and typical responses">
              <Table
                headers={["Violation", "First occurrence", "Repeated / severe"]}
                rows={[
                  ["Inaccurate listing (minor)", "Warning + listing edit required", "Listing removal + warning"],
                  ["Greenwashing (substantiated)", "Listing removal + formal warning", "Suspension"],
                  ["Prohibited item listed", "Immediate listing removal + warning", "Permanent termination"],
                  ["Off-platform transaction solicitation", "Warning + payout hold", "Immediate suspension"],
                  ["Review manipulation", "Warning + review removal", "Suspension + GP privileges revoked"],
                  ["GP fraud / manipulation", "Immediate GP suspension + investigation", "Permanent termination + legal referral"],
                  ["Identity fraud / multiple accounts", "Immediate permanent termination", "Legal referral"],
                  ["Counterfeit goods", "Immediate removal + suspension", "Permanent termination + rights holder notification"],
                ]}
              />
            </Sub>
            <Callout type="note"><strong>Context matters.</strong> Honua reviews enforcement actions on a case-by-case basis. A seller with a long history of excellent standing who makes an isolated honest error will be treated differently from a repeat offender. We aim to be firm where it matters and fair where it counts.</Callout>
          </Section>

          {/* ── 25. Appeals ── */}
          <Section id="s25" title="25. Appeals">
            <P>Every enforcement action — listing removal, suspension, or account termination — is subject to appeal. Honua is committed to a fair, transparent appeals process.</P>
            <Sub title="How to appeal">
              <OL items={[
                <>Submit an appeal within <strong>14 days</strong> of receiving the enforcement notification, via the appeals form in your seller dashboard or by emailing sellers@honua.green with the subject line "Appeal: [account handle] – [action type]."</>,
                "Include a clear statement of why you believe the action was incorrect, along with any supporting evidence.",
                "Honua will acknowledge your appeal within 2 business days.",
                "A senior Trust & Safety reviewer (different from the person who took the original action) will issue a decision within 10 business days.",
                "The decision on appeal is final within the Honua platform. This does not affect your right to pursue remedies through applicable courts or regulatory bodies.",
              ]} />
            </Sub>
            <Sub title="Account status during appeal">
              <P>During an appeal of a listing removal or formal warning, the seller account remains active. During an appeal of a suspension, the account remains suspended but payouts for completed pre-suspension transactions are not affected. During an appeal of permanent termination, all account activity is frozen.</P>
            </Sub>
          </Section>

          {/* ── 26. Liability ── */}
          <Section id="s26" title="26. Liability & Indemnification">
            <Sub title="Honua's role">
              <P>Honua operates as a marketplace platform and is not a party to the contract of sale between buyer and seller. Honua does not inspect, store, or handle physical goods. Accordingly, Honua is not liable for product defects, inaccurate descriptions, non-delivery, loss in transit, import duties, tax obligations of sellers, or any harm caused to buyers by products purchased from sellers on the platform.</P>
            </Sub>
            <Sub title="Seller liability">
              <P>As a seller, you are solely liable for: the quality, safety, legality, and accuracy of your products and listings; compliance with all applicable laws; injury, damage, or loss caused to buyers or third parties by your products; and your acts or omissions in fulfilment, communication, and dispute resolution.</P>
            </Sub>
            <Sub title="Indemnification">
              <P>You agree to indemnify, defend, and hold harmless Honua, its directors, employees, and contractors from any claim, demand, loss, damage, cost, or expense (including reasonable legal fees) arising from your use of the platform, your listings or products, your breach of this policy or applicable law, or your actions in connection with any transaction.</P>
            </Sub>
            <Sub title="Limitation of Honua's liability">
              <P>To the fullest extent permitted by applicable law, Honua's aggregate liability to any seller for any claim arising from this policy or the platform is limited to the total fees paid by that seller to Honua in the 12 months preceding the claim.</P>
            </Sub>
          </Section>

          {/* ── 27. Amendments ── */}
          <Section id="s27" title="27. Policy Amendments">
            <P>Honua reserves the right to amend this policy at any time. Significant changes will be communicated to all active sellers via email and in-platform notification at least 30 days before they take effect. Changes required by law, regulation, or court order may take effect immediately.</P>
            <P>Continued use of the Honua seller platform after the effective date of an amendment constitutes acceptance of the updated policy. If you do not agree with an amendment, you may close your seller account before the effective date without penalty; outstanding payouts will be processed on the next regular payout cycle.</P>
            <P>The current version of this policy is always available at honua.green/legal/seller-policy. Prior versions are available on request.</P>
          </Section>

          {/* ── 28. Contact ── */}
          <Section id="s28" title="28. Contact & Support">
            <P>For questions about your account, listings, or payouts, reach out through the channels below.</P>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginTop: 8 }}>
              {[
                ["Seller support", "sellers@honua.green", "General account & listing queries. Response within 2 business days."],
                ["Disputes & appeals", "trust@honua.green", "Dispute escalations, enforcement appeals, and IP complaints."],
                ["Sustainability queries", "green@honua.green", "Certifications, sustainability standards, and Green Points programme."],
                ["Legal notices", "legal@honua.green", ""],
              ].map(([label, email, desc]) => (
                <div key={email} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "var(--ink-4)", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green)", marginBottom: 6 }}>{email}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
            </div>
          </Section>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 32, marginTop: 48, fontSize: 13, color: "var(--ink-4)", lineHeight: 1.7 }}>
            <p>This Seller Policy was written to be comprehensive, honest, and fair to Honua's seller community. If any provision is found unenforceable, the remaining provisions remain in full effect.</p>
            <p style={{ marginTop: 8 }}><strong>© 2026 Honua. All rights reserved.</strong></p>
          </div>
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .toc-aside { display: none !important; }
        }
      `}</style>
    </div>
  );
}
