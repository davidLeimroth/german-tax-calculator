import type { Bundesland, DeductionItem, SalaryMode, Steuerklasse, TaxInput, TaxResult } from './types';
import type { TaxYearConfig } from './tax-years';
import { DEFAULT_TAX_YEAR, getTaxYearConfig } from './tax-years';

/** Round to 2 decimal places (cents) */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Truncate to 2 decimal places (PAP: setScale(2, ROUND_DOWN)) */
function trunc2(n: number): number {
  return Math.floor(n * 100) / 100;
}

/** Round down to full euros (abrunden auf volle Euro) as required by German tax law */
function floorToEuro(n: number): number {
  return Math.floor(n);
}

/** Round up to full euros (aufrunden auf volle Euro) */
function ceilToEuro(n: number): number {
  return Math.ceil(n);
}

/** De-annualize: floor(annual_cents / 12) for monthly PAP calculation */
function deannualizeMonthly(annualEur: number): number {
  return Math.floor(annualEur * 100 / 12) / 100;
}

function getKirchensteuerRate(state: Bundesland, cfg: TaxYearConfig): number {
  return cfg.kirchensteuer8States.includes(state) ? 0.08 : 0.09;
}

function getArbeitnehmerPauschbetragForClass(taxClass: Steuerklasse, cfg: TaxYearConfig): number {
  return taxClass === 6 ? 0 : cfg.arbeitnehmerPauschbetrag;
}

function getSonderausgabenPauschbetragForClass(taxClass: Steuerklasse, cfg: TaxYearConfig): number {
  switch (taxClass) {
    case 3:
      return cfg.sonderausgabenPauschbetrag * 2;
    case 6:
      return 0;
    default:
      return cfg.sonderausgabenPauschbetrag;
  }
}

/**
 * Calculate annual Einkommensteuer using the progressive tax formula (§32a EStG).
 * This is the UPTAB method from the PAP.
 * Input: zu versteuerndes Einkommen (zvE) - annual taxable income in EUR.
 */
export function calculateEinkommensteuer(zvE: number, cfg: TaxYearConfig): number {
  const x = floorToEuro(zvE);
  if (x <= 0) return 0;

  if (x <= cfg.grundfreibetrag) {
    return 0;
  }

  if (x <= cfg.taxZone2End) {
    const y = (x - cfg.grundfreibetrag) / 10000;
    return floorToEuro((cfg.zone2CoeffA * y + cfg.zone2CoeffB) * y);
  }

  if (x <= cfg.taxZone3End) {
    const z = (x - cfg.taxZone2End) / 10000;
    return floorToEuro((cfg.zone3CoeffA * z + cfg.zone3CoeffB) * z + cfg.zone3Constant);
  }

  if (x <= cfg.taxZone4End) {
    return floorToEuro(cfg.zone4Rate * x - cfg.zone4Offset);
  }

  return floorToEuro(cfg.zone5Rate * x - cfg.zone5Offset);
}

/**
 * UP5_6: Helper for the MST5_6 graduated rate method.
 * Computes the differential tax: max(2 * (Tax(1.25*x) - Tax(0.75*x)), 0.14*x)
 * Per PAP: § 39b Abs. 2 Satz 7 EStG
 */
function up5_6(zx: number, cfg: TaxYearConfig): number {
  const x125 = floorToEuro(zx * 1.25);
  const st1 = calculateEinkommensteuer(x125, cfg);

  const x075 = floorToEuro(zx * 0.75);
  const st2 = calculateEinkommensteuer(x075, cfg);

  const diff = (st1 - st2) * 2;
  const mist = floorToEuro(zx * 0.14);

  return mist > diff ? mist : diff;
}

/**
 * MST5_6: Tax calculation for tax classes V and VI.
 * Uses graduated rate method per § 39b Abs. 2 Satz 7 EStG.
 * Input X is the zvE (already divided by KZTAB, which is 1 for TC5/TC6).
 */
function mst5_6(x: number, cfg: TaxYearConfig): number {
  const zzx = x;

  if (zzx > cfg.w2Stkl5) {
    // Above W2: use UP5_6 at W2 breakpoint, then add 42%/45% for excess
    let st = up5_6(cfg.w2Stkl5, cfg);

    if (zzx > cfg.w3Stkl5) {
      // Above W3: 42% zone (W2 to W3) + 45% zone (above W3)
      st = st + floorToEuro((cfg.w3Stkl5 - cfg.w2Stkl5) * 0.42);
      st = st + floorToEuro((zzx - cfg.w3Stkl5) * 0.45);
    } else {
      // Between W2 and W3: 42% for excess above W2
      st = st + floorToEuro((zzx - cfg.w2Stkl5) * 0.42);
    }
    return st;
  } else {
    // At or below W2: use UP5_6 directly
    let st = up5_6(zzx, cfg);

    if (zzx > cfg.w1Stkl5) {
      // Check against alternative: UP5_6(W1) + 42% excess above W1
      const vergl = st;
      const hoch = up5_6(cfg.w1Stkl5, cfg) + floorToEuro((zzx - cfg.w1Stkl5) * 0.42);
      st = hoch < vergl ? hoch : vergl;
    }
    return st;
  }
}

/**
 * Compute the Pflegeversicherung employee rate for the Vorsorgepauschale.
 * This computes PVSATZAN per the PAP.
 */
function computePvEmployeeRate(
  state: Bundesland,
  childrenCount: number,
  age: number,
  cfg: TaxYearConfig,
): number {
  let rate = cfg.pvBaseRate / 2;
  if (state === 'Sachsen') {
    rate += cfg.pvSachsenExtraEmployee;
  }
  if (childrenCount === 0 && age >= 23) {
    rate += cfg.pvChildlessSurcharge;
  }
  if (childrenCount >= 2) {
    const discountChildren = Math.min(childrenCount, cfg.pvMaxDiscountChildren) - 1;
    rate -= discountChildren * cfg.pvChildDiscount;
  }
  return Math.max(0, rate);
}

/**
 * Calculate the Vorsorgepauschale (insurance deduction allowance).
 * Follows the BMF PAP methods: UPEVP, MVSPKVPV, and MVSPHB.
 *
 * Key PAP rules:
 * - VSPR (RV part): trunc2, computed unless KRV==1
 * - VSPKVPV (KV+PV part): trunc2
 *   - For PKV + TC6: VSPKVPV = 0
 *   - For PKV + other TC: VSPKVPV = PKV premium (capped at GKV equivalent)
 *   - For GKV: VSPKVPV = income * (KVSATZAN + PVSATZAN)
 * - VSP = VSPKVPV + VSPR (basic calculation)
 * - MVSPHB (only for TC != 6): alternative with AV cap of 1900 EUR
 *   - VSPN = ceil(VSPR + min(VSPALV + VSPKVPV, 1900))
 *   - VSP = max(VSP, VSPN)
 */
function calculateVorsorgepauschale(
  annualGross: number,
  taxClass: Steuerklasse,
  state: Bundesland,
  zusatzbeitrag: number,
  childrenCount: number,
  age: number,
  cfg: TaxYearConfig,
  isGesetzlich: boolean = true,
  privatKvAnnual: number = 0,
): number {
  const rvBasis = Math.min(annualGross, cfg.bbgRvAv);
  const kvPvBasis = Math.min(annualGross, cfg.bbgKvPv);

  // VSPR: Rentenversicherung (employee share), truncated to 2 decimals per PAP
  const vspr = trunc2(rvBasis * (cfg.rvRate / 2));

  // MVSPKVPV: KV + PV combined component
  let vspkvpv: number;
  const kvsatzan = zusatzbeitrag / 2 + cfg.kvReducedRate / 2;
  const pvsatzan = computePvEmployeeRate(state, childrenCount, age, cfg);

  if (!isGesetzlich) {
    // PKV
    if (taxClass === 6) {
      // PAP: If PKV > 0 AND STKL == 6, VSPKVPV = 0
      vspkvpv = 0;
    } else {
      // PAP: VSPKVPV = PKPV annual premium (employee portion)
      // Capped at GKV-equivalent: kvPvBasis * (KVSATZAN + PVSATZAN)
      const gkvEquivalent = trunc2(kvPvBasis * (kvsatzan + pvsatzan));
      vspkvpv = Math.min(privatKvAnnual, gkvEquivalent);
      vspkvpv = Math.max(0, vspkvpv);
    }
  } else {
    // GKV: VSPKVPV = income * (KVSATZAN + PVSATZAN)
    vspkvpv = trunc2(kvPvBasis * (kvsatzan + pvsatzan));
  }

  // Basic VSP
  let vsp = vspkvpv + vspr;

  // MVSPHB: Alternative computation (only for TC != 6)
  if (taxClass !== 6) {
    const vspalv = trunc2((cfg.avRate / 2) * rvBasis);
    let vsphb = trunc2(vspalv + vspkvpv);
    if (vsphb > 1900) {
      vsphb = 1900;
    }
    const vspn = ceilToEuro(vspr + vsphb);
    if (vspn > vsp) {
      vsp = vspn;
    }
  }

  return vsp;
}

/**
 * Compute the zu versteuerndes Einkommen (zvE).
 */
function computeZvE(
  annualGross: number,
  taxClass: Steuerklasse,
  state: Bundesland,
  childrenCount: number,
  zusatzbeitrag: number,
  age: number,
  cfg: TaxYearConfig,
  isGesetzlich: boolean = true,
  privatKvAnnual: number = 0,
): number {
  const arbeitnehmerPauschbetrag = getArbeitnehmerPauschbetragForClass(taxClass, cfg);
  const sonderausgabenPauschbetrag = getSonderausgabenPauschbetragForClass(taxClass, cfg);
  const vorsorgepauschale = calculateVorsorgepauschale(annualGross, taxClass, state, zusatzbeitrag, childrenCount, age, cfg, isGesetzlich, privatKvAnnual);

  let zvE = annualGross - arbeitnehmerPauschbetrag - sonderausgabenPauschbetrag - vorsorgepauschale;

  if (taxClass === 2) {
    zvE -= cfg.entlastungsbetragAlleinerziehende + Math.max(0, childrenCount - 1) * cfg.entlastungsbetragAdditionalChild;
  }

  return Math.max(0, zvE);
}

/**
 * Calculate the Einkommensteuer for a given zvE, respecting tax class rules.
 * Per PAP UPMLST:
 * - TC 1,2,4: X = floor(zvE), call UPTAB
 * - TC 3: X = floor(zvE / 2), call UPTAB, multiply by 2
 * - TC 5,6: X = floor(zvE), call MST5_6 (graduated rate method)
 */
function computeTaxForZvE(zvE: number, taxClass: Steuerklasse, cfg: TaxYearConfig): number {
  if (taxClass === 3) {
    // Splittingverfahren: divide by KZTAB=2, compute tax, multiply by 2
    const x = floorToEuro(zvE / 2);
    return calculateEinkommensteuer(x, cfg) * 2;
  }
  if (taxClass === 5 || taxClass === 6) {
    // MST5_6: graduated rate method per § 39b Abs. 2 Satz 7 EStG
    const x = floorToEuro(zvE);
    return mst5_6(x, cfg);
  }
  // TC 1, 2, 4: standard progressive tariff
  return calculateEinkommensteuer(zvE, cfg);
}

/**
 * Calculate annual Lohnsteuer (wage tax).
 */
export function calculateLohnsteuer(
  annualGross: number,
  taxClass: Steuerklasse,
  state: Bundesland,
  childrenCount: number,
  zusatzbeitrag: number,
  age: number,
  cfg: TaxYearConfig,
  isGesetzlich: boolean = true,
  privatKvAnnual: number = 0,
): number {
  if (annualGross <= 0) return 0;

  const zvE = computeZvE(annualGross, taxClass, state, childrenCount, zusatzbeitrag, age, cfg, isGesetzlich, privatKvAnnual);
  return computeTaxForZvE(zvE, taxClass, cfg);
}

/**
 * Calculate Solidaritätszuschlag.
 */
export function calculateSoli(
  lohnsteuerAnnual: number,
  taxClass: Steuerklasse,
  cfg: TaxYearConfig,
): number {
  if (lohnsteuerAnnual <= 0) return 0;

  const freigrenze = taxClass === 3 ? cfg.soliFreigrezeMarried : cfg.soliFreigrenzeSingle;

  if (lohnsteuerAnnual <= freigrenze) {
    return 0;
  }

  const fullSoli = lohnsteuerAnnual * cfg.soliRate;
  const milderungSoli = (lohnsteuerAnnual - freigrenze) * cfg.soliMilderungRate;

  return round2(Math.min(fullSoli, milderungSoli));
}

/**
 * Calculate Kirchensteuer (church tax).
 */
export function calculateKirchensteuer(
  lohnsteuerAnnual: number,
  state: Bundesland,
  churchMember: boolean,
  cfg: TaxYearConfig,
): number {
  if (!churchMember || lohnsteuerAnnual <= 0) return 0;
  const rate = getKirchensteuerRate(state, cfg);
  return round2(lohnsteuerAnnual * rate);
}

/**
 * Calculate Krankenversicherung (health insurance).
 * Returns [employeeAnnual, employerAnnual].
 */
export function calculateKrankenversicherung(
  annualGross: number,
  zusatzbeitrag: number,
  isGesetzlich: boolean,
  cfg: TaxYearConfig,
  privatMonthly?: number,
): [number, number] {
  if (!isGesetzlich) {
    // privatMonthly is the employee's own monthly PKV premium
    const employeeAnnual = (privatMonthly ?? 0) * 12;
    // Employer subsidy is capped at the GKV-equivalent employer share
    const maxEmployerAnnual = (Math.min(annualGross, cfg.bbgKvPv) * (cfg.kvGeneralRate + zusatzbeitrag)) / 2;
    const employerShare = Math.min(employeeAnnual, maxEmployerAnnual);
    return [round2(employeeAnnual), round2(employerShare)];
  }

  const basis = Math.min(annualGross, cfg.bbgKvPv);
  const totalRate = cfg.kvGeneralRate + zusatzbeitrag;
  const employeeShare = basis * (totalRate / 2);
  const employerShare = basis * (totalRate / 2);

  return [round2(employeeShare), round2(employerShare)];
}

/**
 * Calculate Pflegeversicherung (long-term care insurance).
 * Returns [employeeAnnual, employerAnnual].
 */
export function calculatePflegeversicherung(
  annualGross: number,
  childrenCount: number,
  age: number,
  state: Bundesland,
  cfg: TaxYearConfig,
): [number, number] {
  const basis = Math.min(annualGross, cfg.bbgKvPv);

  const employeeRate = computePvEmployeeRate(state, childrenCount, age, cfg);
  let employerRate = cfg.pvBaseRate / 2;

  if (state === 'Sachsen') {
    employerRate -= cfg.pvSachsenExtraEmployee;
  }

  employerRate = Math.max(0, employerRate);

  return [round2(basis * employeeRate), round2(basis * employerRate)];
}

/**
 * Calculate Rentenversicherung (pension insurance).
 * Returns [employeeAnnual, employerAnnual].
 */
export function calculateRentenversicherung(
  annualGross: number,
  cfg: TaxYearConfig,
): [number, number] {
  const basis = Math.min(annualGross, cfg.bbgRvAv);
  const share = round2(basis * (cfg.rvRate / 2));
  return [share, share];
}

/**
 * Calculate Arbeitslosenversicherung (unemployment insurance).
 * Returns [employeeAnnual, employerAnnual].
 */
export function calculateArbeitslosenversicherung(
  annualGross: number,
  cfg: TaxYearConfig,
): [number, number] {
  const basis = Math.min(annualGross, cfg.bbgRvAv);
  const share = round2(basis * (cfg.avRate / 2));
  return [share, share];
}

/**
 * Convert a value to monthly based on salary mode.
 * For monthly mode: uses PAP de-annualization (floor of cents / 12)
 * For annual mode: simple division by 12, rounded to cents
 */
function toMonthly(annualValue: number, salaryMode: SalaryMode): number {
  if (salaryMode === 'monthly') {
    return deannualizeMonthly(annualValue);
  }
  return round2(annualValue / 12);
}

/**
 * Main calculation function. Orchestrates all individual calculations.
 *
 * When salaryMode is 'monthly', the calculation follows the BMF PAP:
 * 1. Annualize monthly salary (x12, truncate to 2 decimals)
 * 2. Compute annual taxes
 * 3. De-annualize to monthly (floor of annual_cents / 12)
 *
 * When salaryMode is 'annual', computes annual values and divides by 12.
 */
export function calculateNetSalary(input: TaxInput): TaxResult {
  const {
    grossSalary,
    salaryMode,
    taxYear = DEFAULT_TAX_YEAR,
    taxClass,
    state,
    churchMember,
    childrenCount,
    healthInsuranceType,
    zusatzbeitragRate,
    privatHealthInsuranceMonthly,
    age = 30,
  } = input;

  const cfg = getTaxYearConfig(taxYear);
  const isGesetzlich = healthInsuranceType === 'gesetzlich';

  // Determine annual gross based on salary mode
  let annualGross: number;
  if (salaryMode === 'monthly') {
    // PAP: annualize by multiplying by 12, truncate to 2 decimals
    annualGross = trunc2(grossSalary * 12);
  } else {
    annualGross = grossSalary;
  }

  const monthlyGross = salaryMode === 'monthly' ? grossSalary : round2(annualGross / 12);

  // For PKV, compute the annual premium for Vorsorgepauschale
  const privatKvAnnual = !isGesetzlich ? (privatHealthInsuranceMonthly ?? 0) * 12 : 0;

  // Calculate Lohnsteuer
  const lohnsteuerAnnual = calculateLohnsteuer(
    annualGross,
    taxClass,
    state,
    childrenCount,
    zusatzbeitragRate,
    age,
    cfg,
    isGesetzlich,
    privatKvAnnual,
  );

  // Calculate hypothetical Lohnsteuer with Kinderfreibetrag for Soli/Kirchensteuer
  let lohnsteuerForSoliKiSt = lohnsteuerAnnual;
  if (childrenCount > 0) {
    const zvE = computeZvE(annualGross, taxClass, state, childrenCount, zusatzbeitragRate, age, cfg, isGesetzlich, privatKvAnnual);
    const reducedZvE = Math.max(0, zvE - childrenCount * cfg.kinderfreibetragSoli);
    lohnsteuerForSoliKiSt = computeTaxForZvE(reducedZvE, taxClass, cfg);
  }

  const soliAnnual = calculateSoli(lohnsteuerForSoliKiSt, taxClass, cfg);
  const kirchensteuerAnnual = calculateKirchensteuer(lohnsteuerForSoliKiSt, state, churchMember, cfg);

  // Calculate social insurance
  const [kvEmployee, kvEmployer] = calculateKrankenversicherung(
    annualGross,
    zusatzbeitragRate,
    isGesetzlich,
    cfg,
    privatHealthInsuranceMonthly,
  );

  const [pvEmployee, pvEmployer] = calculatePflegeversicherung(
    annualGross,
    childrenCount,
    age,
    state,
    cfg,
  );

  const [rvEmployee, rvEmployer] = calculateRentenversicherung(annualGross, cfg);
  const [avEmployee, avEmployer] = calculateArbeitslosenversicherung(annualGross, cfg);

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

  const annualNet = round2(annualGross - totalDeductionsAnnual);

  // Build deduction items for display
  const deductions: DeductionItem[] = [
    {
      name: 'Lohnsteuer',
      employeeShareAnnual: lohnsteuerAnnual,
      employerShareAnnual: 0,
      employeeShareMonthly: toMonthly(lohnsteuerAnnual, salaryMode),
      employerShareMonthly: 0,
    },
    {
      name: 'Solidaritätszuschlag',
      employeeShareAnnual: soliAnnual,
      employerShareAnnual: 0,
      employeeShareMonthly: toMonthly(soliAnnual, salaryMode),
      employerShareMonthly: 0,
    },
    {
      name: 'Kirchensteuer',
      employeeShareAnnual: kirchensteuerAnnual,
      employerShareAnnual: 0,
      employeeShareMonthly: toMonthly(kirchensteuerAnnual, salaryMode),
      employerShareMonthly: 0,
    },
    {
      name: 'Krankenversicherung',
      employeeShareAnnual: kvEmployee,
      employerShareAnnual: kvEmployer,
      employeeShareMonthly: toMonthly(kvEmployee, salaryMode),
      employerShareMonthly: toMonthly(kvEmployer, salaryMode),
    },
    {
      name: 'Pflegeversicherung',
      employeeShareAnnual: pvEmployee,
      employerShareAnnual: pvEmployer,
      employeeShareMonthly: toMonthly(pvEmployee, salaryMode),
      employerShareMonthly: toMonthly(pvEmployer, salaryMode),
    },
    {
      name: 'Rentenversicherung',
      employeeShareAnnual: rvEmployee,
      employerShareAnnual: rvEmployer,
      employeeShareMonthly: toMonthly(rvEmployee, salaryMode),
      employerShareMonthly: toMonthly(rvEmployer, salaryMode),
    },
    {
      name: 'Arbeitslosenversicherung',
      employeeShareAnnual: avEmployee,
      employerShareAnnual: avEmployer,
      employeeShareMonthly: toMonthly(avEmployee, salaryMode),
      employerShareMonthly: toMonthly(avEmployer, salaryMode),
    },
  ];

  const totalDeductionsMonthly = deductions.reduce(
    (sum, d) => round2(sum + d.employeeShareMonthly),
    0,
  );

  const monthlyNet = round2(monthlyGross - totalDeductionsMonthly);

  return {
    input,
    annualGross,
    monthlyGross,
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
    totalDeductionsMonthly,
    annualNet,
    monthlyNet,
    deductions,
  };
}
