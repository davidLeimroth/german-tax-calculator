import type { Bundesland, Region, Steuerklasse } from './types';

/** Tax year these constants apply to */
export const TAX_YEAR = 2025;

/**
 * Grundfreibetrag (basic tax-free allowance) per year.
 * 2025: 12,096 EUR
 */
export const GRUNDFREIBETRAG = 12096;

/**
 * Income tax zone boundaries (annual taxable income).
 * Zone 1: 0 - GRUNDFREIBETRAG (0% tax)
 * Zone 2: GRUNDFREIBETRAG+1 - 17,443 (linear progressive 14%-24%)
 * Zone 3: 17,444 - 68,480 (linear progressive 24%-42%)
 * Zone 4: 68,481 - 277,825 (42%)
 * Zone 5: > 277,825 (45%)
 */
export const TAX_ZONE_2_END = 17443;
export const TAX_ZONE_3_END = 68480;
export const TAX_ZONE_4_END = 277825;

/**
 * Solidaritaetszuschlag: 5.5% of Lohnsteuer.
 * Freigrenze (annual): 19,950 EUR Lohnsteuer for singles, 39,900 for married (class III).
 * Milderungszone: gradual phase-in above Freigrenze.
 */
export const SOLI_RATE = 0.055;
export const SOLI_FREIGRENZE_SINGLE = 19950;
export const SOLI_FREIGRENZE_MARRIED = 39900;
/** In the Milderungszone the Soli is capped at 11.9% of the amount exceeding the Freigrenze */
export const SOLI_MILDERUNG_RATE = 0.119;

/**
 * Kirchensteuer rates by state.
 * Bayern and Baden-Wuerttemberg: 8%, all others: 9%
 */
export const KIRCHENSTEUER_RATE_8_STATES: Bundesland[] = [
  'Baden-Wuerttemberg',
  'Bayern',
];

export function getKirchensteuerRate(state: Bundesland): number {
  return KIRCHENSTEUER_RATE_8_STATES.includes(state) ? 0.08 : 0.09;
}

/**
 * Arbeitnehmer-Pauschbetrag (employee lump-sum deduction).
 * 2025: 1,230 EUR
 */
export const ARBEITNEHMER_PAUSCHBETRAG = 1230;

/**
 * Sonderausgaben-Pauschbetrag.
 * 2025: 36 EUR
 */
export const SONDERAUSGABEN_PAUSCHBETRAG = 36;

/**
 * Vorsorgepauschale is calculated dynamically based on social insurance contributions,
 * so it's not a single constant but computed in the tax engine.
 */

/**
 * Social insurance rates for 2025.
 * All rates are the TOTAL rate (employer + employee). Each pays half.
 */

/** Krankenversicherung (health insurance) general rate: 14.6% total */
export const KV_GENERAL_RATE = 0.146;
/** Average Zusatzbeitrag 2025: 2.5% total */
export const KV_DEFAULT_ZUSATZBEITRAG = 0.025;

/** Pflegeversicherung (long-term care insurance) base rate: 3.6% total (2025) */
export const PV_BASE_RATE = 0.036;
/** Surcharge for childless persons aged 23+: +0.6% (employee only) */
export const PV_CHILDLESS_SURCHARGE = 0.006;
/** Discount per child beyond the first (from 2nd child): -0.25% per child, up to 5 children, employee only */
export const PV_CHILD_DISCOUNT = 0.0025;
/** Maximum number of children for PV discount */
export const PV_MAX_DISCOUNT_CHILDREN = 5;

/** Rentenversicherung (pension insurance) rate: 18.6% total */
export const RV_RATE = 0.186;

/** Arbeitslosenversicherung (unemployment insurance) rate: 2.6% total */
export const AV_RATE = 0.026;

/**
 * Beitragsbemessungsgrenzen (contribution ceilings) 2025, annual.
 */
/** BBG KV/PV: 66,150 EUR/year (5,512.50/month) - same for West and Ost since 2025 */
export const BBG_KV_PV = 66150;

/** BBG RV/AV West: 96,600 EUR/year (8,050/month) */
export const BBG_RV_AV_WEST = 96600;

/** BBG RV/AV Ost: 96,600 EUR/year (unified since 2025) */
export const BBG_RV_AV_OST = 96600;

/**
 * Mini-job threshold (Geringfuegigkeitsgrenze): 556 EUR/month = 6,672 EUR/year
 */
export const MINIJOB_THRESHOLD_MONTHLY = 556;
export const MINIJOB_THRESHOLD_ANNUAL = 6672;

/**
 * Map Bundesland to Region (West/Ost) for BBG purposes.
 * Since 2025 BBG is unified, but we keep this for completeness.
 */
export function getRegion(state: Bundesland): Region {
  const ostStates: Bundesland[] = [
    'Berlin',
    'Brandenburg',
    'Mecklenburg-Vorpommern',
    'Sachsen',
    'Sachsen-Anhalt',
    'Thueringen',
  ];
  return ostStates.includes(state) ? 'Ost' : 'West';
}

export function getBBGRvAv(state: Bundesland): number {
  return getRegion(state) === 'Ost' ? BBG_RV_AV_OST : BBG_RV_AV_WEST;
}

/**
 * Arbeitnehmer-Pauschbetrag per tax class.
 * Class 6 gets no Pauschbetrag.
 */
export function getArbeitnehmerPauschbetragForClass(taxClass: Steuerklasse): number {
  return taxClass === 6 ? 0 : ARBEITNEHMER_PAUSCHBETRAG;
}

/**
 * Sonderausgaben-Pauschbetrag per tax class.
 * Class 3: doubled (72 EUR). Class 6: 0. All others: 36 EUR.
 */
export function getSonderausgabenPauschbetragForClass(taxClass: Steuerklasse): number {
  switch (taxClass) {
    case 3:
      return SONDERAUSGABEN_PAUSCHBETRAG * 2;
    case 6:
      return 0;
    default:
      return SONDERAUSGABEN_PAUSCHBETRAG;
  }
}

/**
 * Entlastungsbetrag fuer Alleinerziehende (single parent relief) - Tax class II.
 * 2025: 4,260 EUR for the first child, +240 EUR per additional child.
 */
export const ENTLASTUNGSBETRAG_ALLEINERZIEHENDE = 4260;
export const ENTLASTUNGSBETRAG_ADDITIONAL_CHILD = 240;

/**
 * Kinderfreibetrag per child (for Soli/Kirchensteuer check, not used directly in Lohnsteuer
 * as the system compares Kindergeld vs. Kinderfreibetrag automatically).
 * 2025: 6,024 EUR per child (for Soli calculation: 9,312 EUR per child)
 */
export const KINDERFREIBETRAG_SOLI = 9312;

/**
 * Sachsen has a special rule: the employer pays a higher PV share (employee pays more).
 * In Sachsen, employee pays an extra 0.5% of the PV rate.
 */
export const PV_SACHSEN_EXTRA_EMPLOYEE = 0.005;
