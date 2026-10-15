// Seller tax details (migration 058) — who a seller is for tax purposes, and
// which reporting regime that puts them under.
//
// Shared by the seller's form, the admin DAC7 route and the admin panel, so the
// country lists the form explains and the lists the report filters on are the
// same lists.
//
//   EU          DAC7 (Directive 2021/514). Reported by Honua to the tax office of
//               the member state it is registered in, by 31 January.
//   UK, CA,     The OECD Model Reporting Rules for Digital Platforms, which DAC7
//   AU, NZ      was modelled on. Same data, same thresholds; each country is
//               reported to under its own registration.
//   US          Form 1099-K. Stripe files it for payouts that go through Stripe
//               Connect; payouts sent another way are Honua's to file.
//
// Nothing here is legal advice. The lists are the regimes in force for 2026
// and an accountant should confirm them before the first filing.

export const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
] as const;

/** OECD model-rules countries Honua's audience is in, outside the EU. */
export const OECD_MRDP_COUNTRIES = ['GB', 'CA', 'AU', 'NZ'] as const;

export type TaxRegime = 'dac7' | 'oecd' | 'us' | 'none';

export function regimeFor(country: string | null | undefined): TaxRegime {
  const c = (country ?? '').toUpperCase();
  if ((EU_COUNTRIES as readonly string[]).includes(c)) return 'dac7';
  if ((OECD_MRDP_COUNTRIES as readonly string[]).includes(c)) return 'oecd';
  if (c === 'US') return 'us';
  return 'none';
}

// DAC7 art. 1(1)(a) / OECD MRDP: a seller of goods with fewer than 30 sales
// *and* no more than €2,000 of consideration in the year is excluded.
export const EXCLUSION_MAX_SALES = 30;
export const EXCLUSION_MAX_EUR = 2000;

/** ISO 3166-1 alpha-2, for the residence picker. Names come from Intl. */
const ALL_CODES = (
  'AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW'
).split(' ');

export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch { return code; }
}

export const TAX_COUNTRIES: { code: string; name: string }[] = ALL_CODES
  .map(code => ({ code, name: countryName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** What the TIN is called where the seller lives — so the form asks for the right thing. */
export function tinLabel(country: string, entity: boolean): string {
  switch (country) {
    case 'US': return entity ? 'EIN' : 'SSN or ITIN';
    case 'GB': return entity ? 'Company UTR' : 'National Insurance number or UTR';
    case 'CA': return entity ? 'Business Number' : 'Social Insurance Number';
    case 'AU': return 'Tax File Number (TFN)';
    case 'NZ': return 'IRD number';
    case 'IT': return entity ? 'Codice fiscale / Partita IVA' : 'Codice fiscale';
    case 'EE': return entity ? 'Registry code' : 'Isikukood (personal ID code)';
    case 'DE': return 'Steuer-ID';
    case 'FR': return 'Numéro fiscal';
    case 'ES': return 'NIF';
    case 'NG': return 'TIN';
    default: return 'Tax identification number (TIN)';
  }
}

export type EntityType = 'individual' | 'entity';
export type TaxStatus = 'submitted' | 'verified' | 'rejected';

/** Column names as stored — the seller reads and writes their own row directly. */
export type TaxProfile = {
  entity_type: EntityType;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  birth_city: string | null;
  birth_country: string | null;
  legal_name: string | null;
  business_reg_number: string | null;
  permanent_establishments: string[];
  address_line1: string;
  address_line2: string | null;
  city: string;
  region: string | null;
  postal_code: string | null;
  country: string;
  tin: string | null;
  tin_country: string | null;
  no_tin: boolean;
  vat_number: string | null;
  status?: TaxStatus;
  review_note?: string | null;
  reviewed_at?: string | null;
  updated_at?: string;
};

export const EMPTY_TAX_PROFILE: TaxProfile = {
  entity_type: 'individual',
  first_name: '', last_name: '', date_of_birth: '', birth_city: '', birth_country: '',
  legal_name: '', business_reg_number: '', permanent_establishments: [],
  address_line1: '', address_line2: '', city: '', region: '', postal_code: '', country: '',
  tin: '', tin_country: '', no_tin: false, vat_number: '',
};

const blank = (v: unknown) => typeof v !== 'string' || v.trim() === '';

/** The same rules as 058's check constraints, phrased for a person. Null when valid. */
export function validateTaxProfile(p: TaxProfile): string | null {
  if (p.entity_type === 'individual') {
    if (blank(p.first_name) || blank(p.last_name)) return 'Enter your first and last name as they appear on your tax records.';
    if (blank(p.date_of_birth)) return 'Enter your date of birth.';
    const dob = new Date(p.date_of_birth as string);
    if (isNaN(dob.getTime()) || dob > new Date()) return 'Enter a valid date of birth.';
  } else if (blank(p.legal_name)) {
    return 'Enter the registered name of the business.';
  }
  if (!/^[A-Z]{2}$/.test(p.country ?? '')) return 'Choose your country of tax residence.';
  if (blank(p.address_line1) || blank(p.city)) return 'Enter your full address.';
  if (p.no_tin) {
    if (p.entity_type === 'individual' && (blank(p.birth_city) || blank(p.birth_country))) {
      return 'Without a TIN, we need your place of birth instead.';
    }
  } else if (blank(p.tin)) {
    return `Enter your ${tinLabel(p.country, p.entity_type === 'entity')}.`;
  }
  return null;
}

/** Trimmed, blanks to null, ready to write. */
export function cleanTaxProfile(p: TaxProfile) {
  const t = (v: string | null | undefined, max = 200) => {
    const s = (v ?? '').trim().slice(0, max);
    return s === '' ? null : s;
  };
  const individual = p.entity_type === 'individual';
  return {
    entity_type: p.entity_type,
    first_name: individual ? t(p.first_name) : null,
    last_name: individual ? t(p.last_name) : null,
    date_of_birth: individual ? t(p.date_of_birth, 10) : null,
    birth_city: individual && p.no_tin ? t(p.birth_city) : null,
    birth_country: individual && p.no_tin ? t(p.birth_country, 2) : null,
    legal_name: individual ? null : t(p.legal_name),
    business_reg_number: individual ? null : t(p.business_reg_number, 60),
    permanent_establishments: individual ? [] : (p.permanent_establishments ?? []).filter(c => (EU_COUNTRIES as readonly string[]).includes(c)),
    address_line1: (p.address_line1 ?? '').trim().slice(0, 200),
    address_line2: t(p.address_line2),
    city: (p.city ?? '').trim().slice(0, 120),
    region: t(p.region, 120),
    postal_code: t(p.postal_code, 20),
    country: p.country,
    tin: p.no_tin ? null : t(p.tin, 40)?.replace(/\s+/g, '') ?? null,
    // The TIN is issued by the country of residence unless the seller says
    // otherwise; the form only asks when they tick that it differs.
    tin_country: p.no_tin ? null : (t(p.tin_country, 2) ?? p.country),
    no_tin: !!p.no_tin,
    vat_number: t(p.vat_number, 20)?.replace(/\s+/g, '').toUpperCase() ?? null,
  };
}
