import { describe, expect, it } from 'vitest';
import {
  calculateArbeitslosenversicherung,
  calculateEinkommensteuer,
  calculateKirchensteuer,
  calculateKrankenversicherung,
  calculateLohnsteuer,
  calculateNetSalary,
  calculatePflegeversicherung,
  calculateRentenversicherung,
  calculateSoli,
} from '../tax-engine';
import type { TaxInput } from '../types';
import { getTaxYearConfig } from '../tax-years';

const cfg = getTaxYearConfig(2025);

function makeInput(overrides: Partial<TaxInput> = {}): TaxInput {
  return {
    grossSalary: 50000,
    salaryMode: 'annual',
    taxYear: 2025,
    taxClass: 1,
    state: 'Bayern',
    churchMember: false,
    childrenCount: 0,
    healthInsuranceType: 'gesetzlich',
    zusatzbeitragRate: 0.025,
    age: 30,
    ...overrides,
  };
}

describe('calculateEinkommensteuer', () => {
  it('returns 0 for income at or below Grundfreibetrag', () => {
    expect(calculateEinkommensteuer(0, cfg)).toBe(0);
    expect(calculateEinkommensteuer(cfg.grundfreibetrag, cfg)).toBe(0);
    expect(calculateEinkommensteuer(-1000, cfg)).toBe(0);
  });

  it('calculates tax in Zone 2 (progressive 14%-24%)', () => {
    const tax = calculateEinkommensteuer(15000, cfg);
    expect(tax).toBeGreaterThan(0);
    expect(tax).toBeLessThan(15000 * 0.24);
  });

  it('calculates tax in Zone 3 (progressive 24%-42%)', () => {
    const tax = calculateEinkommensteuer(40000, cfg);
    expect(tax).toBeGreaterThan(0);
    expect(tax).toBeLessThan(40000 * 0.42);
  });

  it('calculates tax in Zone 4 (42%)', () => {
    const tax = calculateEinkommensteuer(100000, cfg);
    expect(tax).toBeGreaterThan(0);
    const taxAt99k = calculateEinkommensteuer(99000, cfg);
    const marginalTax = tax - taxAt99k;
    expect(marginalTax).toBeCloseTo(420, -1);
  });

  it('calculates tax in Zone 5 (45% Reichensteuer)', () => {
    const tax = calculateEinkommensteuer(300000, cfg);
    expect(tax).toBeGreaterThan(0);
    const taxAt299k = calculateEinkommensteuer(299000, cfg);
    const marginalTax = tax - taxAt299k;
    expect(marginalTax).toBeCloseTo(450, -1);
  });

  it('is progressive (higher income -> higher effective rate)', () => {
    const incomes = [20000, 40000, 60000, 80000, 100000];
    const effectiveRates = incomes.map((inc) => calculateEinkommensteuer(inc, cfg) / inc);
    for (let i = 1; i < effectiveRates.length; i++) {
      expect(effectiveRates[i]).toBeGreaterThan(effectiveRates[i - 1]);
    }
  });

  it('returns whole euros (floor)', () => {
    const tax = calculateEinkommensteuer(25000, cfg);
    expect(tax).toBe(Math.floor(tax));
  });
});

describe('calculateLohnsteuer', () => {
  it('returns 0 for zero salary', () => {
    expect(calculateLohnsteuer(0, 1, 'Bayern', 0, 0.025, 30, cfg)).toBe(0);
  });

  it('tax class III produces lower tax than class I for same income', () => {
    const taxI = calculateLohnsteuer(50000, 1, 'Bayern', 0, 0.025, 30, cfg);
    const taxIII = calculateLohnsteuer(50000, 3, 'Bayern', 0, 0.025, 30, cfg);
    expect(taxIII).toBeLessThan(taxI);
  });

  it('tax class V produces higher tax than class I', () => {
    const taxI = calculateLohnsteuer(50000, 1, 'Bayern', 0, 0.025, 30, cfg);
    const taxV = calculateLohnsteuer(50000, 5, 'Bayern', 0, 0.025, 30, cfg);
    expect(taxV).toBeGreaterThan(taxI);
  });

  it('tax class II produces lower tax than class I (single parent relief)', () => {
    const taxI = calculateLohnsteuer(50000, 1, 'Bayern', 1, 0.025, 30, cfg);
    const taxII = calculateLohnsteuer(50000, 2, 'Bayern', 1, 0.025, 30, cfg);
    expect(taxII).toBeLessThan(taxI);
  });

  it('tax class VI has no Pauschbetraege and produces the highest tax', () => {
    const taxI = calculateLohnsteuer(50000, 1, 'Bayern', 0, 0.025, 30, cfg);
    const taxVI = calculateLohnsteuer(50000, 6, 'Bayern', 0, 0.025, 30, cfg);
    expect(taxVI).toBeGreaterThan(taxI);
  });

  it('tax class II Entlastungsbetrag scales with children count', () => {
    const tax1Child = calculateLohnsteuer(50000, 2, 'Bayern', 1, 0.025, 30, cfg);
    const tax3Children = calculateLohnsteuer(50000, 2, 'Bayern', 3, 0.025, 30, cfg);
    expect(tax3Children).toBeLessThan(tax1Child);
  });

  it('tax class V gets Sonderausgaben-Pauschbetrag (36 EUR)', () => {
    const taxV = calculateLohnsteuer(50000, 5, 'Bayern', 0, 0.025, 30, cfg);
    const taxVI = calculateLohnsteuer(50000, 6, 'Bayern', 0, 0.025, 30, cfg);
    expect(taxVI).toBeGreaterThan(taxV);
  });
});

describe('calculateSoli', () => {
  it('returns 0 when Lohnsteuer is below Freigrenze', () => {
    expect(calculateSoli(10000, 1, cfg)).toBe(0);
    expect(calculateSoli(cfg.soliFreigrenzeSingle, 1, cfg)).toBe(0);
  });

  it('returns 0 for zero Lohnsteuer', () => {
    expect(calculateSoli(0, 1, cfg)).toBe(0);
  });

  it('applies Milderungszone just above Freigrenze', () => {
    const soli = calculateSoli(20000, 1, cfg);
    const milderung = (20000 - cfg.soliFreigrenzeSingle) * cfg.soliMilderungRate;
    const fullSoli = 20000 * cfg.soliRate;
    expect(soli).toBeCloseTo(Math.min(fullSoli, milderung), 2);
  });

  it('uses higher Freigrenze for class III', () => {
    expect(calculateSoli(30000, 3, cfg)).toBe(0);
    expect(calculateSoli(30000, 1, cfg)).toBeGreaterThan(0);
  });

  it('returns full 5.5% for high Lohnsteuer', () => {
    const highTax = 100000;
    const soli = calculateSoli(highTax, 1, cfg);
    expect(soli).toBeCloseTo(highTax * cfg.soliRate, 2);
  });

  it('returns 0 for negative Lohnsteuer', () => {
    expect(calculateSoli(-1000, 1, cfg)).toBe(0);
  });
});

describe('calculateKirchensteuer', () => {
  it('returns 0 when not a church member', () => {
    expect(calculateKirchensteuer(10000, 'Bayern', false, cfg)).toBe(0);
  });

  it('returns 0 for zero Lohnsteuer', () => {
    expect(calculateKirchensteuer(0, 'Bayern', true, cfg)).toBe(0);
  });

  it('applies 8% rate for Bayern', () => {
    expect(calculateKirchensteuer(10000, 'Bayern', true, cfg)).toBeCloseTo(800, 2);
  });

  it('applies 8% rate for Baden-Wuerttemberg', () => {
    expect(calculateKirchensteuer(10000, 'Baden-Wuerttemberg', true, cfg)).toBeCloseTo(800, 2);
  });

  it('applies 9% rate for other states', () => {
    expect(calculateKirchensteuer(10000, 'Berlin', true, cfg)).toBeCloseTo(900, 2);
    expect(calculateKirchensteuer(10000, 'Nordrhein-Westfalen', true, cfg)).toBeCloseTo(900, 2);
  });
});

describe('calculateKrankenversicherung', () => {
  it('splits total rate equally between employee and employer', () => {
    const [employee, employer] = calculateKrankenversicherung(50000, 0.025, true, cfg);
    const expected = 50000 * ((cfg.kvGeneralRate + 0.025) / 2);
    expect(employee).toBeCloseTo(expected, 2);
    expect(employer).toBeCloseTo(expected, 2);
  });

  it('caps contributions at BBG', () => {
    const [employee] = calculateKrankenversicherung(100000, 0.025, true, cfg);
    const expectedMax = cfg.bbgKvPv * ((cfg.kvGeneralRate + 0.025) / 2);
    expect(employee).toBeCloseTo(expectedMax, 1);
  });

  it('handles private insurance', () => {
    const [employee, employer] = calculateKrankenversicherung(50000, 0.025, false, cfg, 500);
    // Employee pays their own premium (500/month = 6000/year)
    expect(employee).toBeCloseTo(6000, 0);
    // Employer subsidy is capped at GKV-equivalent employer share
    expect(employer).toBeGreaterThan(0);
    expect(employer).toBeLessThanOrEqual(employee);
  });

  it('handles private insurance with zero monthly amount', () => {
    const [employee, employer] = calculateKrankenversicherung(50000, 0.025, false, cfg, 0);
    expect(employee).toBe(0);
    expect(employer).toBe(0);
  });
});

describe('calculatePflegeversicherung', () => {
  it('splits base rate equally for person with 1 child', () => {
    const [employee, employer] = calculatePflegeversicherung(50000, 1, 30, 'Bayern', cfg);
    const expectedEach = 50000 * (cfg.pvBaseRate / 2);
    expect(employee).toBeCloseTo(expectedEach, 2);
    expect(employer).toBeCloseTo(expectedEach, 2);
  });

  it('adds childless surcharge for age >= 23 with no children', () => {
    const [withChild] = calculatePflegeversicherung(50000, 1, 30, 'Bayern', cfg);
    const [childless] = calculatePflegeversicherung(50000, 0, 30, 'Bayern', cfg);
    expect(childless).toBeGreaterThan(withChild);
    expect(childless - withChild).toBeCloseTo(50000 * cfg.pvChildlessSurcharge, 0);
  });

  it('no childless surcharge for age < 23', () => {
    const [young] = calculatePflegeversicherung(50000, 0, 22, 'Bayern', cfg);
    const [withChild] = calculatePflegeversicherung(50000, 1, 30, 'Bayern', cfg);
    expect(young).toBeCloseTo(withChild, 2);
  });

  it('applies child discount for 2+ children (employee only)', () => {
    const [oneChild] = calculatePflegeversicherung(50000, 1, 30, 'Bayern', cfg);
    const [twoChildren] = calculatePflegeversicherung(50000, 2, 30, 'Bayern', cfg);
    expect(twoChildren).toBeLessThan(oneChild);
    expect(oneChild - twoChildren).toBeCloseTo(50000 * cfg.pvChildDiscount, 0);
  });

  it('caps child discount at 5 children', () => {
    const [fiveChildren] = calculatePflegeversicherung(50000, 5, 30, 'Bayern', cfg);
    const [sixChildren] = calculatePflegeversicherung(50000, 6, 30, 'Bayern', cfg);
    expect(fiveChildren).toBe(sixChildren);
  });

  it('Sachsen: employee pays more, employer pays less', () => {
    const [empBayern, erBayern] = calculatePflegeversicherung(50000, 1, 30, 'Bayern', cfg);
    const [empSachsen, erSachsen] = calculatePflegeversicherung(50000, 1, 30, 'Sachsen', cfg);
    expect(empSachsen).toBeGreaterThan(empBayern);
    expect(erSachsen).toBeLessThan(erBayern);
    expect(empSachsen + erSachsen).toBeCloseTo(empBayern + erBayern, 0);
  });

  it('caps at BBG', () => {
    const [employee] = calculatePflegeversicherung(100000, 1, 30, 'Bayern', cfg);
    const expected = cfg.bbgKvPv * (cfg.pvBaseRate / 2);
    expect(employee).toBeCloseTo(expected, 2);
  });
});

describe('calculateRentenversicherung', () => {
  it('splits rate equally', () => {
    const [employee, employer] = calculateRentenversicherung(50000, cfg);
    const expected = 50000 * (cfg.rvRate / 2);
    expect(employee).toBeCloseTo(expected, 2);
    expect(employer).toBeCloseTo(expected, 2);
  });

  it('caps at BBG', () => {
    const [employee] = calculateRentenversicherung(200000, cfg);
    const expected = cfg.bbgRvAv * (cfg.rvRate / 2);
    expect(employee).toBeCloseTo(expected, 2);
  });
});

describe('calculateArbeitslosenversicherung', () => {
  it('splits rate equally', () => {
    const [employee, employer] = calculateArbeitslosenversicherung(50000, cfg);
    const expected = 50000 * (cfg.avRate / 2);
    expect(employee).toBeCloseTo(expected, 2);
    expect(employer).toBeCloseTo(expected, 2);
  });

  it('caps at BBG', () => {
    const [employee] = calculateArbeitslosenversicherung(200000, cfg);
    const expected = cfg.bbgRvAv * (cfg.avRate / 2);
    expect(employee).toBeCloseTo(expected, 2);
  });
});

describe('calculateNetSalary', () => {
  it('returns a complete breakdown for a standard case', () => {
    const result = calculateNetSalary(makeInput());

    expect(result.annualGross).toBe(50000);
    expect(result.monthlyGross).toBeCloseTo(50000 / 12, 2);
    expect(result.annualNet).toBeGreaterThan(0);
    expect(result.annualNet).toBeLessThan(50000);
    expect(result.totalDeductionsAnnual).toBeCloseTo(
      result.annualGross - result.annualNet,
      2,
    );
  });

  it('net salary is in plausible range for 50k, class I', () => {
    const result = calculateNetSalary(makeInput({ grossSalary: 50000, taxClass: 1 }));
    expect(result.annualNet).toBeGreaterThan(28000);
    expect(result.annualNet).toBeLessThan(37000);
  });

  it('class III gives higher net than class I', () => {
    const resultI = calculateNetSalary(makeInput({ taxClass: 1 }));
    const resultIII = calculateNetSalary(makeInput({ taxClass: 3 }));
    expect(resultIII.annualNet).toBeGreaterThan(resultI.annualNet);
  });

  it('class V gives lower net than class I', () => {
    const resultI = calculateNetSalary(makeInput({ taxClass: 1 }));
    const resultV = calculateNetSalary(makeInput({ taxClass: 5 }));
    expect(resultV.annualNet).toBeLessThan(resultI.annualNet);
  });

  it('church member has lower net than non-member', () => {
    const noChurch = calculateNetSalary(makeInput({ churchMember: false }));
    const withChurch = calculateNetSalary(makeInput({ churchMember: true }));
    expect(withChurch.annualNet).toBeLessThan(noChurch.annualNet);
    expect(withChurch.kirchensteuerAnnual).toBeGreaterThan(0);
    expect(noChurch.kirchensteuerAnnual).toBe(0);
  });

  it('produces correct number of deduction items', () => {
    const result = calculateNetSalary(makeInput());
    expect(result.deductions).toHaveLength(7);
  });

  it('deduction items have consistent monthly/annual values', () => {
    const result = calculateNetSalary(makeInput());
    for (const d of result.deductions) {
      expect(d.employeeShareMonthly).toBeCloseTo(d.employeeShareAnnual / 12, 1);
      expect(d.employerShareMonthly).toBeCloseTo(d.employerShareAnnual / 12, 1);
    }
  });

  it('handles mini-job salary (low income)', () => {
    const result = calculateNetSalary(
      makeInput({ grossSalary: cfg.minijobThresholdAnnual }),
    );
    expect(result.lohnsteuerAnnual).toBe(0);
    expect(result.soliAnnual).toBe(0);
  });

  it('handles very high salary (above all BBGs)', () => {
    const result = calculateNetSalary(makeInput({ grossSalary: 500000 }));
    expect(result.annualNet).toBeGreaterThan(0);
    expect(result.rentenversicherungEmployeeAnnual).toBeCloseTo(
      cfg.bbgRvAv * (cfg.rvRate / 2),
      2,
    );
    expect(result.krankenversicherungEmployeeAnnual).toBeCloseTo(
      cfg.bbgKvPv * ((cfg.kvGeneralRate + 0.025) / 2),
      1,
    );
  });

  it('handles all six tax classes', () => {
    const classes = [1, 2, 3, 4, 5, 6] as const;
    for (const tc of classes) {
      const result = calculateNetSalary(makeInput({ taxClass: tc, childrenCount: tc === 2 ? 1 : 0 }));
      expect(result.annualNet).toBeGreaterThan(0);
      expect(result.annualNet).toBeLessThan(50000);
    }
  });

  it('soli is 0 for moderate income class I', () => {
    const result = calculateNetSalary(makeInput({ grossSalary: 30000 }));
    expect(result.soliAnnual).toBe(0);
  });

  it('returns the input in the result', () => {
    const input = makeInput();
    const result = calculateNetSalary(input);
    expect(result.input).toEqual(input);
  });

  it('Kinderfreibetrag reduces Soli for parents', () => {
    const noChildren = calculateNetSalary(makeInput({
      grossSalary: 120000,
      childrenCount: 0,
    }));
    const withChildren = calculateNetSalary(makeInput({
      grossSalary: 120000,
      childrenCount: 2,
    }));
    expect(withChildren.soliAnnual).toBeLessThan(noChildren.soliAnnual);
  });

  it('Kinderfreibetrag reduces Kirchensteuer for parents', () => {
    const noChildren = calculateNetSalary(makeInput({
      grossSalary: 50000,
      churchMember: true,
      childrenCount: 0,
    }));
    const withChildren = calculateNetSalary(makeInput({
      grossSalary: 50000,
      churchMember: true,
      childrenCount: 2,
    }));
    expect(withChildren.kirchensteuerAnnual).toBeLessThan(noChildren.kirchensteuerAnnual);
  });

  it('Entlastungsbetrag scales with children count for class II', () => {
    const result1Child = calculateNetSalary(makeInput({
      taxClass: 2,
      childrenCount: 1,
    }));
    const result3Children = calculateNetSalary(makeInput({
      taxClass: 2,
      childrenCount: 3,
    }));
    expect(result3Children.annualNet).toBeGreaterThan(result1Child.annualNet);
  });

  it('handles private health insurance through full calculation', () => {
    const result = calculateNetSalary(makeInput({
      healthInsuranceType: 'privat',
      privatHealthInsuranceMonthly: 500,
    }));
    expect(result.annualNet).toBeGreaterThan(0);
    expect(result.annualNet).toBeLessThan(50000);
    // Employee pays their own premium (500/month = 6000/year)
    expect(result.krankenversicherungEmployeeAnnual).toBeCloseTo(6000, 0);
    // Employer subsidy is separate, capped at GKV-equivalent
    expect(result.krankenversicherungEmployerAnnual).toBeGreaterThan(0);
  });

  it('handles East German states (Sachsen)', () => {
    const result = calculateNetSalary(makeInput({ state: 'Sachsen' }));
    expect(result.annualNet).toBeGreaterThan(0);
    expect(result.annualNet).toBeLessThan(50000);
    const resultBayern = calculateNetSalary(makeInput({ state: 'Bayern' }));
    expect(result.pflegeversicherungEmployeeAnnual).toBeGreaterThan(
      resultBayern.pflegeversicherungEmployeeAnnual,
    );
  });

  it('monthly mode uses PAP de-annualization', () => {
    const monthlyResult = calculateNetSalary(makeInput({
      grossSalary: 3000,
      salaryMode: 'monthly',
    }));
    const annualResult = calculateNetSalary(makeInput({
      grossSalary: 36000,
      salaryMode: 'annual',
    }));
    // Annual gross should be the same
    expect(monthlyResult.annualGross).toBe(36000);
    // Monthly Lohnsteuer may differ slightly due to PAP floor(cents/12) vs round2(annual/12)
    expect(monthlyResult.deductions[0].employeeShareMonthly).toBeLessThanOrEqual(
      annualResult.deductions[0].employeeShareMonthly + 0.01,
    );
  });

  it('works with 2026 year config', () => {
    const result = calculateNetSalary(makeInput({ taxYear: 2026 }));
    expect(result.annualNet).toBeGreaterThan(0);
    // 2026 has higher Grundfreibetrag, so net should be slightly higher
    const result2025 = calculateNetSalary(makeInput({ taxYear: 2025 }));
    expect(result.annualNet).toBeGreaterThan(result2025.annualNet);
  });
});
