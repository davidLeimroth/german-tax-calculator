import type { Bundesland } from './types';

/**
 * Tax year configuration.
 * Each year's parameters are stored here for easy extension.
 * To add a new year, add a new entry to TAX_YEAR_CONFIGS.
 */
export interface TaxYearConfig {
  /** Grundfreibetrag (basic tax-free allowance) */
  grundfreibetrag: number;

  /** Income tax zone boundaries and formula coefficients (§32a EStG) */
  taxZone2End: number;
  taxZone3End: number;
  taxZone4End: number;
  zone2CoeffA: number;
  zone2CoeffB: number;
  zone3CoeffA: number;
  zone3CoeffB: number;
  zone3Constant: number;
  zone4Rate: number;
  zone4Offset: number;
  zone5Rate: number;
  zone5Offset: number;

  /** Solidaritätszuschlag */
  soliRate: number;
  soliFreigrenzeSingle: number;
  soliFreigrezeMarried: number;
  soliMilderungRate: number;

  /** Pauschbeträge */
  arbeitnehmerPauschbetrag: number;
  sonderausgabenPauschbetrag: number;

  /** Krankenversicherung */
  kvGeneralRate: number;
  /** Ermäßigter Beitragssatz (used for Vorsorgepauschale, excludes Krankengeld component) */
  kvReducedRate: number;
  kvDefaultZusatzbeitrag: number;

  /** Pflegeversicherung */
  pvBaseRate: number;
  pvChildlessSurcharge: number;
  pvChildDiscount: number;
  pvMaxDiscountChildren: number;
  pvSachsenExtraEmployee: number;

  /** Rentenversicherung */
  rvRate: number;

  /** Arbeitslosenversicherung */
  avRate: number;

  /** Beitragsbemessungsgrenzen (annual) */
  bbgKvPv: number;
  bbgRvAv: number;

  /** Entlastungsbetrag für Alleinerziehende */
  entlastungsbetragAlleinerziehende: number;
  entlastungsbetragAdditionalChild: number;

  /** Kinderfreibetrag for Soli/Kirchensteuer (total for both parents) */
  kinderfreibetragSoli: number;

  /** Minijob threshold */
  minijobThresholdMonthly: number;
  minijobThresholdAnnual: number;

  /** Kirchensteuer: states with 8% rate (rest is 9%) */
  kirchensteuer8States: Bundesland[];

  /** Tax class V/VI graduated rate boundaries (§39b Abs. 2 Satz 7 EStG) */
  w1Stkl5: number;
  w2Stkl5: number;
  w3Stkl5: number;
}

export type TaxYear = 2025 | 2026;

export const AVAILABLE_TAX_YEARS: TaxYear[] = [2026, 2025];

const CONFIG_2025: TaxYearConfig = {
  grundfreibetrag: 12096,
  taxZone2End: 17443,
  taxZone3End: 68480,
  taxZone4End: 277825,
  zone2CoeffA: 932.30,
  zone2CoeffB: 1400,
  zone3CoeffA: 176.64,
  zone3CoeffB: 2397,
  zone3Constant: 1015.13,
  zone4Rate: 0.42,
  zone4Offset: 10911.92,
  zone5Rate: 0.45,
  zone5Offset: 19246.67,

  soliRate: 0.055,
  soliFreigrenzeSingle: 19950,
  soliFreigrezeMarried: 39900,
  soliMilderungRate: 0.119,

  arbeitnehmerPauschbetrag: 1230,
  sonderausgabenPauschbetrag: 36,

  kvGeneralRate: 0.146,
  kvReducedRate: 0.14,
  kvDefaultZusatzbeitrag: 0.025,

  pvBaseRate: 0.036,
  pvChildlessSurcharge: 0.006,
  pvChildDiscount: 0.0025,
  pvMaxDiscountChildren: 5,
  pvSachsenExtraEmployee: 0.005,

  rvRate: 0.186,
  avRate: 0.026,

  bbgKvPv: 66150,
  bbgRvAv: 96600,

  entlastungsbetragAlleinerziehende: 4260,
  entlastungsbetragAdditionalChild: 240,

  kinderfreibetragSoli: 9600,

  minijobThresholdMonthly: 556,
  minijobThresholdAnnual: 6672,

  kirchensteuer8States: ['Baden-Wuerttemberg', 'Bayern'],

  w1Stkl5: 13785,
  w2Stkl5: 34240,
  w3Stkl5: 222260,
};

const CONFIG_2026: TaxYearConfig = {
  grundfreibetrag: 12348,
  taxZone2End: 17799,
  taxZone3End: 69878,
  taxZone4End: 277825,
  zone2CoeffA: 914.51,
  zone2CoeffB: 1400,
  zone3CoeffA: 173.10,
  zone3CoeffB: 2397,
  zone3Constant: 1034.87,
  zone4Rate: 0.42,
  zone4Offset: 11135.63,
  zone5Rate: 0.45,
  zone5Offset: 19470.38,

  soliRate: 0.055,
  soliFreigrenzeSingle: 20350,
  soliFreigrezeMarried: 40700,
  soliMilderungRate: 0.119,

  arbeitnehmerPauschbetrag: 1230,
  sonderausgabenPauschbetrag: 36,

  kvGeneralRate: 0.146,
  kvReducedRate: 0.14,
  kvDefaultZusatzbeitrag: 0.029,

  pvBaseRate: 0.036,
  pvChildlessSurcharge: 0.006,
  pvChildDiscount: 0.0025,
  pvMaxDiscountChildren: 5,
  pvSachsenExtraEmployee: 0.005,

  rvRate: 0.186,
  avRate: 0.026,

  bbgKvPv: 69750,
  bbgRvAv: 101400,

  entlastungsbetragAlleinerziehende: 4260,
  entlastungsbetragAdditionalChild: 240,

  kinderfreibetragSoli: 9756,

  minijobThresholdMonthly: 603,
  minijobThresholdAnnual: 7236,

  kirchensteuer8States: ['Baden-Wuerttemberg', 'Bayern'],

  w1Stkl5: 14071,
  w2Stkl5: 34939,
  w3Stkl5: 222260,
};

const TAX_YEAR_CONFIGS: Record<TaxYear, TaxYearConfig> = {
  2025: CONFIG_2025,
  2026: CONFIG_2026,
};

export function getTaxYearConfig(year: TaxYear): TaxYearConfig {
  return TAX_YEAR_CONFIGS[year];
}

export const DEFAULT_TAX_YEAR: TaxYear = 2026;
