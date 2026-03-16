import type { Bundesland, DeductionItem, Steuerklasse, TaxInput, TaxResult } from './types';
import {
  AV_RATE,
  BBG_KV_PV,
  ENTLASTUNGSBETRAG_ADDITIONAL_CHILD,
  ENTLASTUNGSBETRAG_ALLEINERZIEHENDE,
  GRUNDFREIBETRAG,
  KINDERFREIBETRAG_SOLI,
  KV_GENERAL_RATE,
  PV_BASE_RATE,
  PV_CHILD_DISCOUNT,
  PV_CHILDLESS_SURCHARGE,
  PV_MAX_DISCOUNT_CHILDREN,
  PV_SACHSEN_EXTRA_EMPLOYEE,
  RV_RATE,
  SOLI_FREIGRENZE_MARRIED,
  SOLI_FREIGRENZE_SINGLE,
  SOLI_MILDERUNG_RATE,
  SOLI_RATE,
  TAX_ZONE_2_END,
  TAX_ZONE_3_END,
  TAX_ZONE_4_END,
  getArbeitnehmerPauschbetragForClass,
  getBBGRvAv,
  getKirchensteuerRate,
  getSonderausgabenPauschbetragForClass,
} from './constants';

/** Round to 2 decimal places (cents) */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Round down to full euros (abrunden auf volle Euro) as required by German tax law */
function floorToEuro(n: number): number {
  return Math.floor(n);
}

/**
 * Calculate annual Einkommensteuer using the 2025 German progressive tax formula.
 * Input: zu versteuerndes Einkommen (zvE) - annual taxable income in EUR.
 * Uses the formulas from Section 32a EStG.
 */
export function calculateEinkommensteuer(zvE: number): number {
  const x = floorToEuro(zvE);
  if (x <= 0) return 0;

  if (x <= GRUNDFREIBETRAG) {
    // Zone 1: no tax
    return 0;
  }

  if (x <= TAX_ZONE_2_END) {
    // Zone 2: progressive 14% to ~24%
    const y = (x - GRUNDFREIBETRAG) / 10000;
    const tax = (922.98 * y + 1400) * y;
    return floorToEuro(tax);
  }

  if (x <= TAX_ZONE_3_END) {
    // Zone 3: progressive ~24% to 42%
    const z = (x - TAX_ZONE_2_END) / 10000;
    const tax = (181.19 * z + 2397) * z + 1025.38;
    return floorToEuro(tax);
  }

  if (x <= TAX_ZONE_4_END) {
    // Zone 4: 42%
    const tax = 0.42 * x - 10971.01;
    return floorToEuro(tax);
  }

  // Zone 5: 45% (Reichensteuer)
  const tax = 0.45 * x - 19307.26;
  return floorToEuro(tax);
}

/**
 * Calculate the Vorsorgepauschale (insurance deduction allowance).
 * Simplified calculation used for monthly payroll.
 * For PKV, uses the GKV-equivalent amount as an approximation.
 */
function calculateVorsorgepauschale(
  annualGross: number,
  state: Bundesland,
  kvRate: number,
  zusatzbeitrag: number,
  childrenCount: number,
  age: number,
): number {
  const bbgRvAv = getBBGRvAv(state);
  const rvBasis = Math.min(annualGross, bbgRvAv);

  // Part 1: Rentenversicherung contribution (employee share)
  const rvPauschale = rvBasis * (RV_RATE / 2);

  const kvPvBasis = Math.min(annualGross, BBG_KV_PV);

  // Part 2: Krankenversicherung (employee share)
  // For both GKV and PKV, use the GKV-equivalent as an approximation
  const kvPauschale = kvPvBasis * ((kvRate + zusatzbeitrag) / 2);

  // Part 3: Pflegeversicherung (employee share)
  let pvEmployeeRate = PV_BASE_RATE / 2;
  if (state === 'Sachsen') {
    pvEmployeeRate += PV_SACHSEN_EXTRA_EMPLOYEE;
  }
  if (childrenCount === 0 && age >= 23) {
    pvEmployeeRate += PV_CHILDLESS_SURCHARGE;
  }
  if (childrenCount >= 2) {
    const discountChildren = Math.min(childrenCount, PV_MAX_DISCOUNT_CHILDREN) - 1;
    pvEmployeeRate -= discountChildren * PV_CHILD_DISCOUNT;
  }
  pvEmployeeRate = Math.max(0, pvEmployeeRate);
  const pvPauschale = kvPvBasis * pvEmployeeRate;

  return round2(rvPauschale + kvPauschale + pvPauschale);
}

/**
 * Compute the zu versteuerndes Einkommen (zvE) for a given salary and tax class.
 * Shared helper used by calculateLohnsteuer and for Kinderfreibetrag adjustments.
 */
function computeZvE(
  annualGross: number,
  taxClass: Steuerklasse,
  state: Bundesland,
  childrenCount: number,
  kvRate: number,
  zusatzbeitrag: number,
  age: number,
): number {
  const arbeitnehmerPauschbetrag = getArbeitnehmerPauschbetragForClass(taxClass);
  const sonderausgabenPauschbetrag = getSonderausgabenPauschbetragForClass(taxClass);
  const vorsorgepauschale = calculateVorsorgepauschale(annualGross, state, kvRate, zusatzbeitrag, childrenCount, age);

  let zvE = annualGross - arbeitnehmerPauschbetrag - sonderausgabenPauschbetrag - vorsorgepauschale;

  // Tax class II: Entlastungsbetrag fuer Alleinerziehende (scales with children)
  if (taxClass === 2) {
    zvE -= ENTLASTUNGSBETRAG_ALLEINERZIEHENDE + Math.max(0, childrenCount - 1) * ENTLASTUNGSBETRAG_ADDITIONAL_CHILD;
  }

  return Math.max(0, zvE);
}

/**
 * Calculate the Einkommensteuer for a given zvE, respecting tax class splitting rules.
 * Class V/VI: no Grundfreibetrag benefit - offset the built-in Zone 1 exemption.
 */
function computeTaxForZvE(zvE: number, taxClass: Steuerklasse): number {
  if (taxClass === 3) {
    // Splittingtabelle: halve the zvE, calculate tax, then double
    return calculateEinkommensteuer(zvE / 2) * 2;
  }
  if (taxClass === 5 || taxClass === 6) {
    // Class V/VI have no Grundfreibetrag - add it back to counteract Zone 1 exemption
    return calculateEinkommensteuer(zvE + GRUNDFREIBETRAG);
  }
  return calculateEinkommensteuer(zvE);
}

/**
 * Calculate annual Lohnsteuer (wage tax) based on tax class.
 * This considers Grundfreibetrag, Arbeitnehmer-Pauschbetrag, Sonderausgaben-Pauschbetrag,
 * Vorsorgepauschale, and applies Splitting for class III.
 */
export function calculateLohnsteuer(
  annualGross: number,
  taxClass: Steuerklasse,
  state: Bundesland,
  childrenCount: number,
  kvRate: number,
  zusatzbeitrag: number,
  age: number = 30,
): number {
  if (annualGross <= 0) return 0;

  const zvE = computeZvE(annualGross, taxClass, state, childrenCount, kvRate, zusatzbeitrag, age);
  return computeTaxForZvE(zvE, taxClass);
}

/**
 * Calculate Solidaritaetszuschlag (solidarity surcharge).
 * 5.5% of Lohnsteuer, but only if Lohnsteuer exceeds the Freigrenze.
 * Milderungszone applies above the Freigrenze.
 */
export function calculateSoli(
  lohnsteuerAnnual: number,
  taxClass: Steuerklasse,
): number {
  if (lohnsteuerAnnual <= 0) return 0;

  const freigrenze = taxClass === 3 ? SOLI_FREIGRENZE_MARRIED : SOLI_FREIGRENZE_SINGLE;

  if (lohnsteuerAnnual <= freigrenze) {
    return 0;
  }

  const fullSoli = lohnsteuerAnnual * SOLI_RATE;
  const milderungSoli = (lohnsteuerAnnual - freigrenze) * SOLI_MILDERUNG_RATE;

  // The Soli is capped at the Milderungszone amount (gradual phase-in)
  return round2(Math.min(fullSoli, milderungSoli));
}

/**
 * Calculate Kirchensteuer (church tax).
 * 8% or 9% of Lohnsteuer depending on state.
 */
export function calculateKirchensteuer(
  lohnsteuerAnnual: number,
  state: Bundesland,
  churchMember: boolean,
): number {
  if (!churchMember || lohnsteuerAnnual <= 0) return 0;
  const rate = getKirchensteuerRate(state);
  return round2(lohnsteuerAnnual * rate);
}

/**
 * Calculate Krankenversicherung (health insurance).
 * Returns [employeeAnnual, employerAnnual].
 */
export function calculateKrankenversicherung(
  annualGross: number,
  kvRate: number,
  zusatzbeitrag: number,
  isGesetzlich: boolean,
  privatMonthly?: number,
): [number, number] {
  if (!isGesetzlich) {
    const annual = (privatMonthly ?? 0) * 12;
    // For private insurance, employer pays a subsidy up to the max employer share
    const maxEmployerAnnual = (Math.min(annualGross, BBG_KV_PV) * (kvRate + zusatzbeitrag)) / 2;
    const employerShare = Math.min(annual / 2, maxEmployerAnnual);
    return [round2(annual - employerShare), round2(employerShare)];
  }

  const basis = Math.min(annualGross, BBG_KV_PV);
  const totalRate = kvRate + zusatzbeitrag;
  const employeeShare = basis * (totalRate / 2);
  const employerShare = basis * (totalRate / 2);

  return [round2(employeeShare), round2(employerShare)];
}

/**
 * Calculate Pflegeversicherung (long-term care insurance).
 * Returns [employeeAnnual, employerAnnual].
 *
 * Base rate 3.6% split equally, BUT:
 * - Childless persons aged 23+: +0.6% surcharge (employee only)
 * - Per child from 2nd to 5th: -0.25% discount (employee only)
 * - Sachsen: employee pays an extra 0.5% (historical Buss- und Bettag rule)
 */
export function calculatePflegeversicherung(
  annualGross: number,
  childrenCount: number,
  age: number,
  state: Bundesland,
): [number, number] {
  const basis = Math.min(annualGross, BBG_KV_PV);

  let employeeRate = PV_BASE_RATE / 2;
  let employerRate = PV_BASE_RATE / 2;

  // Sachsen special rule: shift 0.5% from employer to employee
  if (state === 'Sachsen') {
    employeeRate += PV_SACHSEN_EXTRA_EMPLOYEE;
    employerRate -= PV_SACHSEN_EXTRA_EMPLOYEE;
  }

  // Childless surcharge (employee only, age >= 23)
  if (childrenCount === 0 && age >= 23) {
    employeeRate += PV_CHILDLESS_SURCHARGE;
  }

  // Child discount (from 2nd child onwards, employee only)
  if (childrenCount >= 2) {
    const discountChildren = Math.min(childrenCount, PV_MAX_DISCOUNT_CHILDREN) - 1;
    employeeRate -= discountChildren * PV_CHILD_DISCOUNT;
  }

  // Ensure rates don't go below 0
  employeeRate = Math.max(0, employeeRate);
  employerRate = Math.max(0, employerRate);

  return [round2(basis * employeeRate), round2(basis * employerRate)];
}

/**
 * Calculate Rentenversicherung (pension insurance).
 * Returns [employeeAnnual, employerAnnual].
 * 18.6% total, split equally, up to BBG.
 */
export function calculateRentenversicherung(
  annualGross: number,
  state: Bundesland,
): [number, number] {
  const bbg = getBBGRvAv(state);
  const basis = Math.min(annualGross, bbg);
  const share = round2(basis * (RV_RATE / 2));
  return [share, share];
}

/**
 * Calculate Arbeitslosenversicherung (unemployment insurance).
 * Returns [employeeAnnual, employerAnnual].
 * 2.6% total, split equally, up to BBG.
 */
export function calculateArbeitslosenversicherung(
  annualGross: number,
  state: Bundesland,
): [number, number] {
  const bbg = getBBGRvAv(state);
  const basis = Math.min(annualGross, bbg);
  const share = round2(basis * (AV_RATE / 2));
  return [share, share];
}

/**
 * Main calculation function. Orchestrates all individual calculations
 * and returns a full tax breakdown.
 */
export function calculateNetSalary(input: TaxInput): TaxResult {
  const {
    annualGrossSalary,
    taxClass,
    state,
    churchMember,
    childrenCount,
    healthInsuranceType,
    zusatzbeitragRate,
    privatHealthInsuranceMonthly,
    age = 30,
  } = input;

  const isGesetzlich = healthInsuranceType === 'gesetzlich';
  const kvRate = KV_GENERAL_RATE;

  // Calculate Lohnsteuer
  const lohnsteuerAnnual = calculateLohnsteuer(
    annualGrossSalary,
    taxClass,
    state,
    childrenCount,
    kvRate,
    zusatzbeitragRate,
    age,
  );

  // Calculate hypothetical Lohnsteuer with Kinderfreibetrag for Soli/Kirchensteuer
  // Per German tax law, Kinderfreibetrag reduces the Lohnsteuer basis for Soli and KiSt
  let lohnsteuerForSoliKiSt = lohnsteuerAnnual;
  if (childrenCount > 0) {
    const zvE = computeZvE(annualGrossSalary, taxClass, state, childrenCount, kvRate, zusatzbeitragRate, age);
    const reducedZvE = Math.max(0, zvE - childrenCount * KINDERFREIBETRAG_SOLI);
    lohnsteuerForSoliKiSt = computeTaxForZvE(reducedZvE, taxClass);
  }

  // Calculate Soli on Kinderfreibetrag-reduced Lohnsteuer
  const soliAnnual = calculateSoli(lohnsteuerForSoliKiSt, taxClass);

  // Calculate Kirchensteuer on Kinderfreibetrag-reduced Lohnsteuer
  const kirchensteuerAnnual = calculateKirchensteuer(lohnsteuerForSoliKiSt, state, churchMember);

  // Calculate social insurance
  const [kvEmployee, kvEmployer] = calculateKrankenversicherung(
    annualGrossSalary,
    kvRate,
    zusatzbeitragRate,
    isGesetzlich,
    privatHealthInsuranceMonthly,
  );

  const [pvEmployee, pvEmployer] = calculatePflegeversicherung(
    annualGrossSalary,
    childrenCount,
    age,
    state,
  );

  const [rvEmployee, rvEmployer] = calculateRentenversicherung(annualGrossSalary, state);
  const [avEmployee, avEmployer] = calculateArbeitslosenversicherung(annualGrossSalary, state);

  // Total deductions (employee only)
  const totalDeductionsAnnual = round2(
    lohnsteuerAnnual +
      soliAnnual +
      kirchensteuerAnnual +
      kvEmployee +
      pvEmployee +
      rvEmployee +
      avEmployee,
  );

  const annualNet = round2(annualGrossSalary - totalDeductionsAnnual);

  // Build deduction items for display
  const deductions: DeductionItem[] = [
    {
      name: 'Lohnsteuer',
      employeeShareAnnual: lohnsteuerAnnual,
      employerShareAnnual: 0,
      employeeShareMonthly: round2(lohnsteuerAnnual / 12),
      employerShareMonthly: 0,
    },
    {
      name: 'Solidaritaetszuschlag',
      employeeShareAnnual: soliAnnual,
      employerShareAnnual: 0,
      employeeShareMonthly: round2(soliAnnual / 12),
      employerShareMonthly: 0,
    },
    {
      name: 'Kirchensteuer',
      employeeShareAnnual: kirchensteuerAnnual,
      employerShareAnnual: 0,
      employeeShareMonthly: round2(kirchensteuerAnnual / 12),
      employerShareMonthly: 0,
    },
    {
      name: 'Krankenversicherung',
      employeeShareAnnual: kvEmployee,
      employerShareAnnual: kvEmployer,
      employeeShareMonthly: round2(kvEmployee / 12),
      employerShareMonthly: round2(kvEmployer / 12),
    },
    {
      name: 'Pflegeversicherung',
      employeeShareAnnual: pvEmployee,
      employerShareAnnual: pvEmployer,
      employeeShareMonthly: round2(pvEmployee / 12),
      employerShareMonthly: round2(pvEmployer / 12),
    },
    {
      name: 'Rentenversicherung',
      employeeShareAnnual: rvEmployee,
      employerShareAnnual: rvEmployer,
      employeeShareMonthly: round2(rvEmployee / 12),
      employerShareMonthly: round2(rvEmployer / 12),
    },
    {
      name: 'Arbeitslosenversicherung',
      employeeShareAnnual: avEmployee,
      employerShareAnnual: avEmployer,
      employeeShareMonthly: round2(avEmployee / 12),
      employerShareMonthly: round2(avEmployer / 12),
    },
  ];

  return {
    input,
    annualGross: annualGrossSalary,
    monthlyGross: round2(annualGrossSalary / 12),
    lohnsteuerAnnual,
    soliAnnual,
    kirchensteuerAnnual,
    krankenversicherungEmployeeAnnual: kvEmployee,
    krankenversicherungEmployerAnnual: kvEmployer,
    pflegeversicherungEmployeeAnnual: pvEmployee,
    pflegeversicherungEmployerAnnual: pvEmployer,
    rentenversicherungEmployeeAnnual: rvEmployee,
    rentenversicherungEmployerAnnual: rvEmployer,
    arbeitslosenversicherungEmployeeAnnual: avEmployee,
    arbeitslosenversicherungEmployerAnnual: avEmployer,
    totalDeductionsAnnual,
    totalDeductionsMonthly: round2(totalDeductionsAnnual / 12),
    annualNet,
    monthlyNet: round2(annualNet / 12),
    deductions,
  };
}
