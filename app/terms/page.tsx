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

const UL = ({ items }: { items: string[] }) => (
  <ul style={{ margin: "8px 0 12px", paddingLeft: 22 }}>
    {items.map((it, i) => <li key={i} style={{ marginBottom: 6 }}>{it}</li>)}
  </ul>
);

const SECTIONS = [
  "Agreement to Terms",
  "About Honua",
  "Eligibility & Account Registration",
  "User Content & Intellectual Property",
  "Impact Claims & Verification",
  "Green Points & Rewards",
  "Marketplace & Transactions",
  "Honua Wallet & Celo Integration",
  "Community Standards & Prohibited Conduct",
  "Privacy & Data Processing",
  "Cookies & Tracking",
  "Third-Party Services & Links",
  "Subscription Plans & Billing",
  "Disclaimers & Limitation of Liability",
  "Indemnification",
  "Dispute Resolution & Governing Law",
  "Modifications to These Terms",
  "Account Suspension & Termination",
  "Digital Millennium Copyright Act (DMCA)",
  "Children's Privacy",
  "Accessibility",
  "Environmental Commitments",
  "Contact Us",
];

export default function TermsPage() {
  const last = "10 July 2026";
  const effective = "10 July 2026";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState("s1");

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const ids = SECTIONS.map((_, i) => `s${i + 1}`);
    const els = ids.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the topmost visible section
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { root: container, rootMargin: "-10% 0px -60% 0px", threshold: 0 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    // position:fixed + overflow-y:auto escapes #honua-app { overflow:hidden }
    <div ref={scrollRef} style={{ position: "fixed", inset: 0, overflowY: "auto", background: "var(--bg)", color: "var(--ink)", fontFamily: "Geist, sans-serif", zIndex: 10 }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--bg)", borderBottom: "1px solid var(--line)", padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--green)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 17, fontFamily: "Bricolage Grotesque, sans-serif", letterSpacing: "-0.05em" }}>h</span>
          <span style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)", fontFamily: "Bricolage Grotesque, sans-serif" }}>honua</span>
        </Link>
        <Link href="/login" style={{ fontSize: 13, color: "var(--green)", fontWeight: 600, textDecoration: "none" }}>← Back to sign up</Link>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px", display: "flex", gap: 64, alignItems: "flex-start" }}>
        {/* Sidebar TOC */}
        <aside style={{ width: 220, flexShrink: 0, position: "sticky", top: 74, maxHeight: "calc(100vh - 90px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }} className="toc-aside no-scrollbar">
          <div style={{ fontSize: 11, fontFamily: "Geist Mono", color: "var(--ink-4)", letterSpacing: ".08em", marginBottom: 10, textTransform: "uppercase" }}>Contents</div>
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
            <h1 style={{ fontFamily: "Bricolage Grotesque, sans-serif", fontSize: "clamp(30px,4vw,48px)", fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 14px", lineHeight: 1.05 }}>Terms of Service &amp; Privacy Policy</h1>
            <div style={{ display: "flex", gap: 20, fontSize: 13, color: "var(--ink-3)", fontFamily: "Geist Mono", flexWrap: "wrap" }}>
              <span>Last updated: {last}</span>
              <span>Effective: {effective}</span>
              <span>Version 1.0</span>
            </div>
            <div style={{ marginTop: 18, background: "var(--green-tint)", border: "1px solid var(--green-3)", borderRadius: 12, padding: "14px 18px", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.65 }}>
              <strong>Plain-English summary:</strong> Honua is a sustainability social platform. You own your content, we keep your data safe, impact claims must be truthful, Green Points aren't cash, and we can suspend accounts that violate these rules. Read the full text below for every detail — it all applies.
            </div>
          </div>

          {/* ── 1. Agreement ── */}
          <Section id="s1" title="1. Agreement to Terms">
            <P>These Terms of Service ("Terms"), together with our Privacy Policy (Section 10) and Community Guidelines (Section 9), constitute a legally binding agreement between you and Honua Cooperative Ltd ("Honua," "we," "our," or "us"), a cooperative corporation incorporated under the laws of the State of Delaware, USA, with its principal place of business at [Address on file with registered agent].</P>
            <P>By creating a Honua account, clicking "Create my account," accessing our web or mobile applications, or using any Honua service (collectively the "Platform"), you confirm that you have read, understood, and agree to be bound by these Terms in their entirety. If you do not agree, do not use the Platform.</P>
            <P>If you are using the Platform on behalf of a company, organisation, or other legal entity, you represent that you have the authority to bind that entity to these Terms, and "you" refers to that entity.</P>
            <P>These Terms were last updated on {last}. When we make material changes we will notify you via email and/or an in-app notification at least 14 days before the changes take effect. Continued use after the effective date constitutes acceptance of the revised Terms.</P>
          </Section>

          {/* ── 2. About Honua ── */}
          <Section id="s2" title="2. About Honua">
            <P>Honua (the Hawaiian word for "Earth") is a social platform purpose-built for the global sustainability community. Our mission is to make individual and collective environmental impact visible, verifiable, and rewarding.</P>
            <Sub title="Core features include:">
              <UL items={[
                "Social feed for sharing sustainability actions, projects, and milestones",
                "Impact logging and carbon-footprint tracking tools",
                "Community forums organised by topic, region, and cause",
                "Green Points system rewarding verified environmental actions",
                "Marketplace for sustainable products and services",
                "Celo blockchain integration for on-chain impact attestations and reward tokens",
                "Educational content, challenges, and events",
              ]} />
            </Sub>
            <P>Honua operates as a cooperative. Members who join at the Cooperative tier gain voting rights and share in platform governance. Nothing in these Terms shall be construed to create an employment, partnership, or joint-venture relationship between you and Honua.</P>
          </Section>

          {/* ── 3. Eligibility & Accounts ── */}
          <Section id="s3" title="3. Eligibility & Account Registration">
            <Sub title="Age requirements">
              <P>You must be at least 13 years old to create a Honua account. If you are between 13 and 17, your parent or legal guardian must review and agree to these Terms on your behalf. Certain features — including Marketplace transactions, Celo Wallet, and Green Points redemption — are available only to users aged 18 or older. We do not knowingly collect data from children under 13; if we learn that we have, we will delete the account.</P>
            </Sub>
            <Sub title="Account accuracy">
              <P>You agree to provide true, accurate, current, and complete information when registering and to keep that information up to date. Creating an account with false information, impersonating another person or organisation, or using a misleading username is a violation of these Terms and may result in immediate account termination.</P>
            </Sub>
            <Sub title="One account per person">
              <P>Each natural person may maintain only one personal account. Organisations may maintain one organisational account. Operating multiple accounts, including to evade suspension or circumvent rate limits, is prohibited.</P>
            </Sub>
            <Sub title="Account security">
              <P>You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You must immediately notify us at <strong>security@honua.earth</strong> if you suspect unauthorised access. Honua will not be liable for losses arising from unauthorised use of your account where the breach resulted from your failure to maintain credential confidentiality.</P>
            </Sub>
            <Sub title="Account types">
              <UL items={[
                "Standard (free): Full social and impact-logging access; limited marketplace features",
                "Verified Advocate (subscription): Verified impact badge, advanced analytics, priority support",
                "Cooperative Member (subscription): Governance voting rights, profit-sharing participation, exclusive community access",
                "Organisational: For NGOs, businesses, and institutions — requires entity verification",
              ]} />
            </Sub>
          </Section>

          {/* ── 4. User Content & IP ── */}
          <Section id="s4" title="4. User Content & Intellectual Property">
            <Sub title="You own your content">
              <P>You retain full ownership of all text, photos, videos, documents, and other material you post or upload to the Platform ("User Content"). Honua does not claim ownership of your User Content.</P>
            </Sub>
            <Sub title="Licence grant to Honua">
              <P>By posting User Content, you grant Honua a worldwide, non-exclusive, royalty-free, sublicensable, and transferable licence to use, reproduce, distribute, prepare derivative works of, display, and perform your User Content in connection with operating and promoting the Platform. This licence exists only as long as your content remains on the Platform and expires when you delete it, except where caching, archival, or legal hold obligations require us to retain it.</P>
            </Sub>
            <Sub title="Content representations">
              <P>You represent and warrant that: (a) you own or have all necessary rights to the User Content you post; (b) your User Content does not infringe any third-party intellectual-property, privacy, or publicity rights; (c) all impact data and environmental claims in your User Content are truthful and not misleading; and (d) your User Content complies with these Terms and all applicable laws.</P>
            </Sub>
            <Sub title="Honua's intellectual property">
              <P>The Honua name, logo, brand, Platform design, software, proprietary algorithms (including our Green Points formula and impact-verification methodology), and all content produced by Honua are the exclusive property of Honua Cooperative Ltd and are protected by copyright, trademark, and other intellectual-property laws. You may not reproduce, distribute, or create derivative works from Honua's proprietary materials without our prior written consent.</P>
            </Sub>
            <Sub title="Open content & attribution">
              <P>Where Honua publishes educational materials under open licences (e.g., Creative Commons), the specific licence terms stated on that content govern. Attribution requirements must be followed.</P>
            </Sub>
          </Section>

          {/* ── 5. Impact Claims ── */}
          <Section id="s5" title="5. Impact Claims & Verification">
            <P>Honua exists to make real-world environmental impact visible. The credibility of that mission depends on truthful claims. You therefore agree to the following Impact Integrity Policy:</P>
            <Sub title="Truthfulness obligation">
              <P>All quantified environmental claims you make on the Platform (e.g., "I saved 200 kg of CO₂ by switching to an EV," "Our community planted 500 trees") must be based on credible evidence. You must not fabricate, exaggerate, or plagiarise impact data.</P>
            </Sub>
            <Sub title="Methodology">
              <P>Where you calculate carbon savings, you must use a recognised and disclosed methodology (e.g., IPCC emissions factors, EPA Greenhouse Gas Equivalencies Calculator, Gold Standard). Honua may display a verification badge for claims substantiated with evidence. Badged claims do not constitute Honua's endorsement or guarantee of accuracy.</P>
            </Sub>
            <Sub title="Platform verification tools">
              <P>Honua provides optional verification workflows, including document upload and third-party attestation. Use of verification tools is voluntary unless required for certain Green Points awards or Cooperative Membership benefits.</P>
            </Sub>
            <Sub title="Consequences of false claims">
              <P>Posting materially false or misleading impact claims may result in: removal of the content, revocation of Green Points associated with the claim, removal of verification badges, account suspension, and referral to appropriate authorities where fraud or consumer protection laws are implicated.</P>
            </Sub>
          </Section>

          {/* ── 6. Green Points ── */}
          <Section id="s6" title="6. Green Points & Rewards">
            <Sub title="What are Green Points?">
              <P>Green Points ("GP") are platform-specific, non-monetary reward units awarded to users for verified sustainability actions, community contributions, and platform engagement. GP are credited to your account ledger automatically or upon administrator review.</P>
            </Sub>
            <Sub title="Non-monetary nature">
              <P>Green Points have no cash value, are not currency, are not a financial instrument, and cannot be sold, transferred between accounts, or exchanged for fiat money through Honua. Any secondary-market sale of GP is prohibited and may result in account termination.</P>
            </Sub>
            <Sub title="Redemption">
              <P>GP may be redeemed within the Platform for: unlocking premium features, discounts from verified Marketplace sellers who opt into the GP programme, charitable donations facilitated by Honua, and Cooperative Membership credits. Redemption options may change over time.</P>
            </Sub>
            <Sub title="Forfeiture">
              <P>GP are forfeited upon account termination for breach of these Terms, if associated impact claims are found to be fraudulent, or if Honua discontinues the GP programme (with 60 days' notice and a redemption window where feasible).</P>
            </Sub>
            <Sub title="Celo EARTH token">
              <P>Future feature: Honua intends to offer conversion of a subset of GP into EARTH tokens on the Celo blockchain, subject to regulatory approval. EARTH tokens, if issued, will be governed by a separate Token Terms document. No representations regarding future token value are made or implied.</P>
            </Sub>
          </Section>

          {/* ── 7. Marketplace ── */}
          <Section id="s7" title="7. Marketplace & Transactions">
            <Sub title="Marketplace overview">
              <P>The Honua Marketplace ("Marketplace") is a facilitated commerce platform where vetted sellers ("Sellers") offer sustainable products and services to Platform users ("Buyers"). Honua acts as an intermediary, not a party to the underlying sale contract.</P>
            </Sub>
            <Sub title="Seller eligibility">
              <P>Sellers must apply and be approved by Honua. Approval requires: a verified business identity; product or service offerings that meet Honua's Sustainability Standards (available at honua.earth/seller-standards); agreement to Honua's Seller Agreement; and maintenance of Honua's minimum impact and quality ratings.</P>
            </Sub>
            <Sub title="Buyer protections">
              <UL items={[
                "All listings must accurately represent the product or service.",
                "Honua offers a Purchase Protection scheme for qualifying transactions: if an item is materially different from its description or not delivered, Buyers may file a dispute within 30 days of expected delivery.",
                "Sustainability claims in listings are subject to the same Impact Integrity Policy (Section 5).",
                "Honua does not guarantee the accuracy of third-party sustainability certifications displayed in listings.",
              ]} />
            </Sub>
            <Sub title="Fees">
              <P>Honua charges a platform fee on Seller transactions. The current fee schedule is published at honua.earth/fees and may be updated with 30 days' notice. Transaction fees are non-refundable except where required by law.</P>
            </Sub>
            <Sub title="Prohibited items">
              <P>The following may not be listed or sold on the Marketplace: counterfeit goods; products making fraudulent environmental claims ("greenwashing"); wildlife products; hazardous materials without required certifications; digital assets that constitute securities without appropriate licensing; and any item or service prohibited by applicable law.</P>
            </Sub>
            <Sub title="Disputes between Buyers and Sellers">
              <P>Honua provides a dispute-resolution process for Marketplace transactions but is not obligated to mediate. Where Honua chooses to mediate, its decision is final for the purposes of in-Platform actions (e.g., refund from escrow, GP adjustments). Legal remedies between Buyer and Seller remain available outside the Platform.</P>
            </Sub>
          </Section>

          {/* ── 8. Wallet & Celo ── */}
          <Section id="s8" title="8. Honua Wallet & Celo Integration">
            <P>The Honua Wallet feature ("Wallet") allows eligible users to connect a Celo-compatible blockchain wallet to their Honua account for the purpose of receiving on-chain impact attestations, EARTH tokens (when available), and Celo-native payments in the Marketplace. Wallet functionality is currently marked "Coming Soon" and not yet active.</P>
            <Sub title="When Wallet launches:">
              <UL items={[
                "You will self-custody your own keys. Honua never holds, controls, or recovers your private key.",
                "Blockchain transactions are irreversible. You are solely responsible for transactions you authorise.",
                'Celo network fees ("gas") are your responsibility.',
                "Honua is not a money services business, licensed exchange, or custodian. The Wallet is an interface tool, not a financial service.",
                "Regulatory compliance (KYC/AML) may be required for transactions above statutory thresholds and will be managed in partnership with a licensed third-party provider.",
                "You are solely responsible for reporting crypto income, gains, and losses to applicable tax authorities.",
              ]} />
            </Sub>
            <Sub title="Regulatory risk">
              <P>Blockchain regulation is rapidly evolving. Honua reserves the right to restrict, modify, or discontinue Wallet and token features in any jurisdiction to comply with applicable law, without liability to you.</P>
            </Sub>
          </Section>

          {/* ── 9. Community Standards ── */}
          <Section id="s9" title="9. Community Standards & Prohibited Conduct">
            <P>Honua is built on the principle that collective action requires mutual respect and intellectual honesty. The following conduct is prohibited on the Platform:</P>
            <Sub title="Harassment & harm">
              <UL items={[
                "Targeting individuals with threats, intimidation, hate speech, or sustained hostile behaviour",
                "Non-consensual sharing of intimate images or private personal information (doxxing)",
                "Inciting violence, self-harm, or dangerous behaviour",
                "Bullying, stalking, or coordinated brigading of any user or group",
              ]} />
            </Sub>
            <Sub title="Misinformation">
              <UL items={[
                "Deliberately spreading false or misleading scientific, medical, or environmental claims",
                "Impersonating scientists, researchers, organisations, or public figures",
                "Denying or misrepresenting peer-reviewed climate science in a context designed to mislead",
                "Astroturfing: pretending grassroots support for corporate or political interests",
              ]} />
            </Sub>
            <Sub title="Spam & manipulation">
              <UL items={[
                "Posting repetitive or irrelevant content to manipulate discovery or trending algorithms",
                "Operating bots, automated scripts, or scraping tools without Honua's written consent",
                "Buying, selling, or artificially inflating follower counts, engagement, or Green Points",
                "Coordinated inauthentic behaviour",
              ]} />
            </Sub>
            <Sub title="Illegal content">
              <UL items={[
                "Content that violates copyright, trademark, or other intellectual-property rights",
                "Child sexual abuse material (CSAM) — reported immediately to NCMEC and law enforcement",
                "Content that facilitates or promotes illegal activity",
                "Export-controlled information or technology",
              ]} />
            </Sub>
            <Sub title="Enforcement">
              <P>Violations may result in content removal, feature restrictions, temporary suspension, or permanent account termination depending on severity and recurrence. You may appeal enforcement decisions at honua.earth/appeals within 30 days. We aim to review appeals within 14 business days.</P>
            </Sub>
          </Section>

          {/* ── 10. Privacy ── */}
          <Section id="s10" title="10. Privacy & Data Processing">
            <Sub title="Data we collect">
              <UL items={[
                "Account data: name, email, date of birth, location, profile photo",
                "Content you post: text, images, video, impact logs, community activity",
                "Usage data: pages visited, features used, time spent, device and browser info",
                "Communication data: messages, support tickets, emails",
                "Payment data: billing address, last-four digits of card (full card details processed by Stripe, our PCI-compliant payment processor — we never store raw card numbers)",
                "Wallet data: public blockchain addresses you connect (never your private key)",
                "Location data: coarse location for region-based features (only with your permission)",
              ]} />
            </Sub>
            <Sub title="How we use your data">
              <UL items={[
                "Providing, maintaining, and improving the Platform",
                "Personalising your feed and recommendations",
                "Processing transactions and rewarding Green Points",
                "Communicating with you about your account and Platform updates",
                "Detecting and preventing fraud, abuse, and security incidents",
                "Complying with legal obligations",
                "Aggregate analytics and research to advance our sustainability mission (always anonymised before publication)",
              ]} />
            </Sub>
            <Sub title="Legal bases (GDPR)">
              <P>For users in the European Economic Area, UK, and Switzerland, we process data on the following legal bases: contract performance (account management, transactions); legitimate interests (security, fraud prevention, product improvement); consent (marketing communications, optional location services); and legal obligation (tax records, law-enforcement requests).</P>
            </Sub>
            <Sub title="Data sharing">
              <P>We do not sell your personal data. We share data only with: service providers who process it on our behalf under written data-processing agreements (cloud hosting, payment processing, email delivery, analytics); legal authorities where required by applicable law; business transferees in connection with a merger or acquisition (with notice to you); and other users where your privacy settings permit (public posts are public).</P>
            </Sub>
            <Sub title="Data retention">
              <P>We retain your data for as long as your account is active or as needed for legal obligations. Upon account deletion: your public-facing content is removed within 30 days; backup copies are purged within 90 days; transaction records required by tax law are retained for 7 years; anonymised aggregates may be retained indefinitely.</P>
            </Sub>
            <Sub title="Your rights">
              <UL items={[
                "Access: Request a copy of the personal data we hold about you",
                "Rectification: Correct inaccurate or incomplete data",
                "Erasure (Right to be Forgotten): Request deletion of your data, subject to legal-hold exceptions",
                "Portability: Receive your data in a machine-readable format",
                "Restriction: Ask us to stop processing your data in certain circumstances",
                "Objection: Object to processing based on legitimate interests",
                "Opt-out of automated decision-making: Where we use automated systems, you may request human review",
              ]} />
              <P>Submit rights requests at honua.earth/privacy or email privacy@honua.earth. We respond within 30 days. EEA/UK users may also lodge complaints with their national supervisory authority.</P>
            </Sub>
            <Sub title="International transfers">
              <P>Honua is based in the United States. Data transferred from the EEA, UK, or Switzerland is protected by Standard Contractual Clauses (SCCs) or equivalent safeguards as required by applicable law.</P>
            </Sub>
            <Sub title="Security">
              <P>We employ industry-standard measures including AES-256 encryption at rest, TLS 1.3 in transit, role-based access controls, regular penetration testing, and a bug-bounty programme (details at honua.earth/security). No system is perfectly secure; we will notify you of breaches that materially affect your data as required by applicable law.</P>
            </Sub>
          </Section>

          {/* ── 11. Cookies ── */}
          <Section id="s11" title="11. Cookies & Tracking">
            <Sub title="What we use">
              <UL items={[
                "Strictly necessary: Session management, security, authentication (cannot be disabled without breaking the service)",
                "Functional: Remembering your preferences (dark mode, language, notification settings)",
                "Analytics: Aggregate usage statistics to improve the Platform (anonymised; opt-out available)",
                "Marketing: Only with your explicit consent — used to show Honua advertisements on partner platforms",
              ]} />
            </Sub>
            <Sub title="Your choices">
              <P>Manage cookie preferences at any time via Settings → Privacy → Cookie Preferences. Strictly necessary cookies cannot be disabled. Withdrawing consent for other categories may affect Platform functionality.</P>
            </Sub>
            <Sub title="Do Not Track">
              <P>We honour browser-level Do Not Track (DNT) signals by disabling analytics and marketing cookies for those sessions.</P>
            </Sub>
          </Section>

          {/* ── 12. Third-Party ── */}
          <Section id="s12" title="12. Third-Party Services & Links">
            <P>The Platform may integrate with or link to third-party services including Google (sign-in, maps), Apple (sign-in), Stripe (payments), Celo blockchain, Mapbox, and others. Your use of third-party services is governed by their own terms and privacy policies. Honua is not responsible for the practices of third parties and does not endorse, guarantee, or assume liability for their services or content.</P>
            <P>Links to external websites in user content or Honua editorials are provided for information only. We do not vet all linked content and are not responsible for it.</P>
          </Section>

          {/* ── 13. Billing ── */}
          <Section id="s13" title="13. Subscription Plans & Billing">
            <Sub title="Subscription tiers">
              <P>Honua offers optional paid subscription tiers as described at honua.earth/pricing. Subscription fees are billed in advance on a monthly or annual basis via Stripe. All prices are in USD unless otherwise stated.</P>
            </Sub>
            <Sub title="Free trial">
              <P>Where a free trial is offered, it begins on the date you subscribe and ends on the trial expiry date. Your payment method will be charged at the applicable subscription rate at the end of the trial unless you cancel before trial expiry.</P>
            </Sub>
            <Sub title="Cancellation">
              <P>You may cancel your subscription at any time through Settings → Subscription. Cancellation takes effect at the end of the current billing period; you retain access until then. We do not pro-rate partial periods unless required by law.</P>
            </Sub>
            <Sub title="Refunds">
              <P>Subscription fees are generally non-refundable except: within 14 days of initial purchase (EU/UK cooling-off period); where Honua materially reduces subscription features without adequate notice; or where required by applicable consumer-protection law. Refund requests: billing@honua.earth.</P>
            </Sub>
            <Sub title="Price changes">
              <P>We will notify you of price increases at least 30 days before they apply to your subscription. You may cancel before the new price takes effect.</P>
            </Sub>
          </Section>

          {/* ── 14. Disclaimers ── */}
          <Section id="s14" title="14. Disclaimers & Limitation of Liability">
            <Sub title="Platform provided 'as-is'">
              <P>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, OR UNINTERRUPTED AVAILABILITY. HONUA DOES NOT WARRANT THAT THE PLATFORM WILL BE ERROR-FREE OR THAT DEFECTS WILL BE CORRECTED.</P>
            </Sub>
            <Sub title="Environmental claims">
              <P>HONUA DOES NOT VERIFY EVERY USER-SUBMITTED IMPACT CLAIM. ENVIRONMENTAL DATA, SUSTAINABILITY CERTIFICATIONS, AND IMPACT CALCULATIONS ON THE PLATFORM ARE PROVIDED FOR INFORMATIONAL PURPOSES AND DO NOT CONSTITUTE PROFESSIONAL ENVIRONMENTAL, LEGAL, OR FINANCIAL ADVICE.</P>
            </Sub>
            <Sub title="Limitation of liability">
              <P>TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, HONUA'S TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THE PLATFORM WILL NOT EXCEED THE GREATER OF: (A) THE AMOUNT YOU PAID TO HONUA IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) USD $100. THIS LIMIT APPLIES REGARDLESS OF THE FORM OF ACTION OR THE THEORY OF LIABILITY.</P>
              <P>IN NO EVENT WILL HONUA BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS OPPORTUNITIES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</P>
            </Sub>
            <Sub title="Exceptions">
              <P>Nothing in these Terms limits liability for: death or personal injury caused by Honua's negligence; fraud or fraudulent misrepresentation; any other liability that cannot be limited under applicable law.</P>
            </Sub>
          </Section>

          {/* ── 15. Indemnification ── */}
          <Section id="s15" title="15. Indemnification">
            <P>You agree to indemnify, defend, and hold harmless Honua, its cooperative members, directors, officers, employees, agents, and successors from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to: your use of the Platform; your User Content; your violation of these Terms; your violation of any third-party rights; or your violation of applicable law.</P>
            <P>Honua reserves the right to assume exclusive control of any matter subject to indemnification by you, in which case you agree to cooperate with Honua's defence of such matter at your expense.</P>
          </Section>

          {/* ── 16. Disputes ── */}
          <Section id="s16" title="16. Dispute Resolution & Governing Law">
            <Sub title="Informal resolution">
              <P>Before filing any formal dispute, you agree to contact Honua at legal@honua.earth and attempt to resolve the matter informally for at least 30 days. Most issues are resolved at this stage.</P>
            </Sub>
            <Sub title="Binding arbitration">
              <P>If informal resolution fails, you and Honua agree that any dispute arising from or related to these Terms or the Platform will be resolved by binding individual arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules. Arbitration will take place in San Francisco, California, or, at your election, via video conference. The arbitrator's award is final and may be entered in any court of competent jurisdiction.</P>
            </Sub>
            <Sub title="Class action waiver">
              <P>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, YOU AND HONUA EACH WAIVE THE RIGHT TO A JURY TRIAL AND TO PARTICIPATE AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS ACTION OR REPRESENTATIVE PROCEEDING.</P>
            </Sub>
            <Sub title="Exceptions to arbitration">
              <P>Either party may seek injunctive or other equitable relief in a court of competent jurisdiction to prevent infringement of intellectual property rights or misuse of confidential information. Small-claims court disputes that qualify under applicable rules are also exempt.</P>
            </Sub>
            <Sub title="Governing law">
              <P>These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law principles. For EEA/UK users, mandatory consumer-protection rights under local law are not affected.</P>
            </Sub>
          </Section>

          {/* ── 17. Modifications ── */}
          <Section id="s17" title="17. Modifications to These Terms">
            <P>Honua may update these Terms from time to time to reflect changes in our services, business practices, or legal requirements. When we make material changes, we will:</P>
            <UL items={[
              "Send an email to your registered address at least 14 days before the changes take effect",
              "Display a prominent in-app notification",
              'Update the "Last updated" date at the top of this page',
              "Maintain an archive of prior versions at honua.earth/terms/history",
            ]} />
            <P>Your continued use of the Platform after the effective date of revised Terms constitutes acceptance. If you do not agree with the changes, you must stop using the Platform and may delete your account.</P>
          </Section>

          {/* ── 18. Termination ── */}
          <Section id="s18" title="18. Account Suspension & Termination">
            <Sub title="By you">
              <P>You may delete your account at any time via Settings → Account → Delete Account. Account deletion is permanent and initiates the data-retention process described in Section 10. Deleting your account does not entitle you to a refund of any subscription fees already paid.</P>
            </Sub>
            <Sub title="By Honua">
              <P>Honua may suspend or terminate your account, with or without notice, if you: materially breach these Terms; provide false registration information; engage in fraudulent impact claims; harass other users; commit illegal acts through the Platform; or for any other reason at our sole discretion where we believe termination is necessary to protect users or the Platform's integrity.</P>
            </Sub>
            <Sub title="Effect of termination">
              <P>Upon termination: your licence to use the Platform immediately ceases; your User Content will be removed from public view (subject to retention obligations); Green Points are forfeited; outstanding financial obligations to Honua survive termination. Sections that by their nature should survive termination (Intellectual Property, Disclaimer, Limitation of Liability, Indemnification, Dispute Resolution) do survive.</P>
            </Sub>
          </Section>

          {/* ── 19. DMCA ── */}
          <Section id="s19" title="19. Digital Millennium Copyright Act (DMCA)">
            <P>Honua respects intellectual property rights and complies with the DMCA. If you believe that User Content on our Platform infringes your copyright, submit a notice to our Designated Copyright Agent:</P>
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 20px", fontSize: 14, fontFamily: "Geist Mono", marginBottom: 16, lineHeight: 2 }}>
              <div>Copyright Agent — Honua Cooperative Ltd</div>
              <div>Email: dmca@honua.earth</div>
              <div>Subject: DMCA Takedown Notice</div>
            </div>
            <P>Your notice must include: (1) identification of the copyrighted work; (2) identification of the infringing material and its location on our Platform; (3) your contact information; (4) a statement of good-faith belief that use is not authorised; (5) a statement, under penalty of perjury, that the information is accurate and you are authorised to act on the copyright owner's behalf; and (6) your physical or electronic signature.</P>
            <P>Counter-notices: If you believe your content was wrongly removed, you may submit a DMCA counter-notice to the same address. We will restore your content within 10–14 business days unless the complainant files a court action.</P>
            <P>Repeat infringers: We maintain and enforce a policy of terminating accounts of repeat copyright infringers.</P>
          </Section>

          {/* ── 20. Children ── */}
          <Section id="s20" title="20. Children's Privacy">
            <P>Honua is not directed to children under 13 and we do not knowingly collect personal data from children under 13. If we become aware that a child under 13 has provided us with personal data, we will take steps to delete such information as soon as practicable. Parents or guardians who believe their child under 13 has created an account should contact us at privacy@honua.earth and we will investigate and delete the account promptly.</P>
            <P>For users aged 13–17: we apply enhanced privacy defaults including private accounts by default, no targeted advertising, restricted direct messaging from non-followers, and no Wallet features. Parents may request data access or deletion on behalf of minor children.</P>
          </Section>

          {/* ── 21. Accessibility ── */}
          <Section id="s21" title="21. Accessibility">
            <P>Honua is committed to making our Platform accessible to all users, including those with disabilities. We target WCAG 2.1 Level AA compliance. If you encounter accessibility barriers, please contact us at accessibility@honua.earth. We will respond within 5 business days and work to remediate the issue promptly.</P>
            <P>We regularly audit our Platform for accessibility and provide keyboard navigation, screen-reader support, high-contrast modes, and adjustable text sizes. Where features are not yet fully accessible, we publish a known-issues log at honua.earth/accessibility.</P>
          </Section>

          {/* ── 22. Environmental ── */}
          <Section id="s22" title="22. Environmental Commitments">
            <P>We believe a sustainability platform must be sustainable itself. Honua commits to:</P>
            <UL items={[
              "Running on 100% renewable-energy-powered cloud infrastructure by 2027",
              "Publishing an annual Sustainability Report covering Honua's own carbon footprint, energy use, and waste",
              "Applying Honua's own Impact Integrity Policy (Section 5) to all claims we make publicly",
              "Donating 1% of subscription revenue annually to environmental non-profits selected by Cooperative members",
              "Carbon-offsetting Honua's residual emissions through verified Gold Standard or VCS projects",
              "Setting and publishing science-based targets aligned with the Paris Agreement's 1.5 °C pathway",
            ]} />
            <P>These commitments are aspirational goals and operational targets, not contractual obligations enforceable by users.</P>
          </Section>

          {/* ── 23. Contact ── */}
          <Section id="s23" title="23. Contact Us">
            <P>If you have questions about these Terms or any aspect of the Platform, please reach out:</P>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginTop: 8 }}>
              {[
                ["General enquiries", "hello@honua.earth"],
                ["Privacy & data rights", "privacy@honua.earth"],
                ["Legal & compliance", "legal@honua.earth"],
                ["Security vulnerabilities", "security@honua.earth"],
                ["Copyright / DMCA", "dmca@honua.earth"],
                ["Accessibility", "accessibility@honua.earth"],
                ["Billing & subscriptions", "billing@honua.earth"],
                ["Marketplace disputes", "marketplace@honua.earth"],
              ].map(([label, email]) => (
                <div key={email} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontFamily: "Geist Mono", color: "var(--ink-4)", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green)" }}>{email}</div>
                </div>
              ))}
            </div>
            <P style={{ marginTop: 24 }}>Postal address: Honua Cooperative Ltd, c/o Registered Agent, 1209 Orange Street, Wilmington, Delaware 19801, USA.</P>
          </Section>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 32, marginTop: 48, fontSize: 13, color: "var(--ink-4)", lineHeight: 1.7 }}>
            <p>These Terms of Service were drafted to be comprehensive, honest, and fair to Honua's community. They are governed by the laws of the State of Delaware and, where applicable, by the mandatory consumer-protection laws of your country of residence. If any provision is found unenforceable, the remaining provisions remain in full effect.</p>
            <p style={{ marginTop: 8 }}><strong>© 2026 Honua Cooperative Ltd. All rights reserved.</strong></p>
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
