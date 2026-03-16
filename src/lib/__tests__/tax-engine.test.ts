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
import {
  AV_RATE,
  BBG_KV_PV,
  BBG_RV_AV_WEST,
  GRUNDFREIBETRAG,
  KV_GENERAL_RATE,
  MINIJOB_THRESHOLD_ANNUAL,
  RV_RATE,
} from '../constants';

function makeInput(overrides: Partial<TaxInput> = {}): TaxInput {
  return {
    annualGrossSalary: 50000,
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
    expect(calculateEinkommensteuer(0)).toBe(0);
    expect(calculateEinkommensteuer(GRUNDFREIBETRAG)).toBe(0);
    expect(calculateEinkommensteuer(-1000)).toBe(0);
  });

  it('calculates tax in Zone 2 (progressive 14%-24%)', () => {
    const tax = calculateEinkommensteuer(15000);
    expect(tax).toBeGreaterThan(0);
    expect(tax).toBeLessThan(15000 * 0.24);
  });

  it('calculates tax in Zone 3 (progressive 24%-42%)', () => {
    const tax = calculateEinkommensteuer(40000);
    expect(tax).toBeGreaterThan(0);
    // Should be between zone 2 end tax and 42% of income
    expect(tax).toBeLessThan(40000 * 0.42);
  });

  it('calculates tax in Zone 4 (42%)', () => {
    const tax = calculateEinkommensteuer(100000);
    expect(tax).toBeGreaterThan(0);
    // At 100k, marginal rate is 42%
    const taxAt99k = calculateEinkommensteuer(99000);
    const marginalTax = tax - taxAt99k;
    // Marginal rate should be approximately 42%
    expect(marginalTax).toBeCloseTo(420, -1);
  });

  it('calculates tax in Zone 5 (45% Reichensteuer)', () => {
    const tax = calculateEinkommensteuer(300000);
    expect(tax).toBeGreaterThan(0);
    // Marginal rate should be 45%
    const taxAt299k = calculateEinkommensteuer(299000);
    const marginalTax = tax - taxAt299k;
    expect(marginalTax).toBeCloseTo(450, -1);
  });

  it('is progressive (higher income -> higher effective rate)', () => {
    const incomes = [20000, 40000, 60000, 80000, 100000];
    const effectiveRates = incomes.map((inc) => calculateEinkommensteuer(inc) / inc);
    for (let i = 1; i < effectiveRates.length; i++) {
      expect(effectiveRates[i]).toBeGreaterThan(effectiveRates[i - 1]);
    }
  });

  it('returns whole euros (floor)', () => {
    const tax = calculateEinkommensteuer(25000);
    expect(tax).toBe(Math.floor(tax));
  });
});

describe('calculateLohnsteuer', () => {
  it('returns 0 for zero salary', () => {
    expect(calculateLohnsteuer(0, 1, 'Bayern', 0, KV_GENERAL_RATE, 0.025)).toBe(0);
  });

  it('tax class III produces lower tax than class I for same income', () => {
    const taxI = calculateLohnsteuer(50000, 1, 'Bayern', 0, KV_GENERAL_RATE, 0.025);
    const taxIII = calculateLohnsteuer(50000, 3, 'Bayern', 0, KV_GENERAL_RATE, 0.025);
    expect(taxIII).toBeLessThan(taxI);
  });

  it('tax class V produces higher tax than class I', () => {
    const taxI = calculateLohnsteuer(50000, 1, 'Bayern', 0, KV_GENERAL_RATE, 0.025);
    const taxV = calculateLohnsteuer(50000, 5, 'Bayern', 0, KV_GENERAL_RATE, 0.025);
    expect(taxV).toBeGreaterThan(taxI);
  });

  it('tax class II produces lower tax than class I (single parent relief)', () => {
    const taxI = calculateLohnsteuer(50000, 1, 'Bayern', 1, KV_GENERAL_RATE, 0.025);
    const taxII = calculateLohnsteuer(50000, 2, 'Bayern', 1, KV_GENERAL_RATE, 0.025);
    expect(taxII).toBeLessThan(taxI);
  });

  it('tax class VI has no Pauschbetraege and produces the highest tax', () => {
    const taxI = calculateLohnsteuer(50000, 1, 'Bayern', 0, KV_GENERAL_RATE, 0.025);
    const taxVI = calculateLohnsteuer(50000, 6, 'Bayern', 0, KV_GENERAL_RATE, 0.025);
    expect(taxVI).toBeGreaterThan(taxI);
  });

  it('tax class II Entlastungsbetrag scales with children count', () => {
    const tax1Child = calculateLohnsteuer(50000, 2, 'Bayern', 1, KV_GENERAL_RATE, 0.025);
    const tax3Children = calculateLohnsteuer(50000, 2, 'Bayern', 3, KV_GENERAL_RATE, 0.025);
    // More children = higher Entlastungsbetrag = lower tax
    expect(tax3Children).toBeLessThan(tax1Child);
  });

  it('tax class V gets Sonderausgaben-Pauschbetrag (36 EUR)', () => {
    // Class V should get the 36 EUR Sonderausgaben-Pauschbetrag
    // Class VI should NOT get it - so Class VI tax should be slightly higher
    const taxV = calculateLohnsteuer(50000, 5, 'Bayern', 0, KV_GENERAL_RATE, 0.025);
    const taxVI = calculateLohnsteuer(50000, 6, 'Bayern', 0, KV_GENERAL_RATE, 0.025);
    expect(taxVI).toBeGreaterThan(taxV);
  });
});

describe('calculateSoli', () => {
  it('returns 0 when Lohnsteuer is below Freigrenze', () => {
    expect(calculateSoli(10000, 1)).toBe(0);
    expect(calculateSoli(19950, 1)).toBe(0);
  });

  it('returns 0 for zero Lohnsteuer', () => {
    expect(calculateSoli(0, 1)).toBe(0);
  });

  it('applies Milderungszone just above Freigrenze', () => {
    const soli = calculateSoli(20000, 1);
    // Just 50 EUR above Freigrenze, Milderungszone caps the Soli
    const milderung = (20000 - 19950) * 0.119;
    const fullSoli = 20000 * 0.055;
    expect(soli).toBeCloseTo(Math.min(fullSoli, milderung), 2);
  });

  it('uses higher Freigrenze for class III', () => {
    // 30000 is below married Freigrenze (39900) but above single (19950)
    expect(calculateSoli(30000, 3)).toBe(0);
    expect(calculateSoli(30000, 1)).toBeGreaterThan(0);
  });

  it('returns full 5.5% for high Lohnsteuer', () => {
    const highTax = 100000;
    const soli = calculateSoli(highTax, 1);
    expect(soli).toBeCloseTo(highTax * 0.055, 2);
  });

  it('returns 0 for negative Lohnsteuer', () => {
    expect(calculateSoli(-1000, 1)).toBe(0);
  });
});

describe('calculateKirchensteuer', () => {
  it('returns 0 when not a church member', () => {
    expect(calculateKirchensteuer(10000, 'Bayern', false)).toBe(0);
  });

  it('returns 0 for zero Lohnsteuer', () => {
    expect(calculateKirchensteuer(0, 'Bayern', true)).toBe(0);
  });

  it('applies 8% rate for Bayern', () => {
    expect(calculateKirchensteuer(10000, 'Bayern', true)).toBeCloseTo(800, 2);
  });

  it('applies 8% rate for Baden-Wuerttemberg', () => {
    expect(calculateKirchensteuer(10000, 'Baden-Wuerttemberg', true)).toBeCloseTo(800, 2);
  });

  it('applies 9% rate for other states', () => {
    expect(calculateKirchensteuer(10000, 'Berlin', true)).toBeCloseTo(900, 2);
    expect(calculateKirchensteuer(10000, 'Nordrhein-Westfalen', true)).toBeCloseTo(900, 2);
  });
});

describe('calculateKrankenversicherung', () => {
  it('splits total rate equally between employee and employer', () => {
    const [employee, employer] = calculateKrankenversicherung(
      50000,
      KV_GENERAL_RATE,
      0.025,
      true,
    );
    const expected = 50000 * ((KV_GENERAL_RATE + 0.025) / 2);
    expect(employee).toBeCloseTo(expected, 2);
    expect(employer).toBeCloseTo(expected, 2);
  });

  it('caps contributions at BBG', () => {
    const highSalary = 100000;
    const [employee] = calculateKrankenversicherung(highSalary, KV_GENERAL_RATE, 0.025, true);
    const expectedMax = BBG_KV_PV * ((KV_GENERAL_RATE + 0.025) / 2);
    expect(employee).toBeCloseTo(expectedMax, 1);
  });

  it('handles private insurance', () => {
    const [employee, employer] = calculateKrankenversicherung(
      50000,
      KV_GENERAL_RATE,
      0.025,
      false,
      500,
    );
    // Private: 500/month = 6000/year total
    expect(employee + employer).toBeCloseTo(6000, 0);
    expect(employer).toBeGreaterThan(0);
  });

  it('handles private insurance with zero monthly amount', () => {
    const [employee, employer] = calculateKrankenversicherung(
      50000,
      KV_GENERAL_RATE,
      0.025,
      false,
      0,
    );
    expect(employee).toBe(0);
    expect(employer).toBe(0);
  });
});

describe('calculatePflegeversicherung', () => {
  it('splits base rate equally for person with 1 child', () => {
    const [employee, employer] = calculatePflegeversicherung(50000, 1, 30, 'Bayern');
    const expectedEach = 50000 * (0.036 / 2);
    expect(employee).toBeCloseTo(expectedEach, 2);
    expect(employer).toBeCloseTo(expectedEach, 2);
  });

  it('adds childless surcharge for age >= 23 with no children', () => {
    const [withChild] = calculatePflegeversicherung(50000, 1, 30, 'Bayern');
    const [childless] = calculatePflegeversicherung(50000, 0, 30, 'Bayern');
    expect(childless).toBeGreaterThan(withChild);
    // Difference should be ~0.6% of basis
    expect(childless - withChild).toBeCloseTo(50000 * 0.006, 0);
  });

  it('no childless surcharge for age < 23', () => {
    const [young] = calculatePflegeversicherung(50000, 0, 22, 'Bayern');
    const [withChild] = calculatePflegeversicherung(50000, 1, 30, 'Bayern');
    expect(young).toBeCloseTo(withChild, 2);
  });

  it('applies child discount for 2+ children (employee only)', () => {
    const [oneChild] = calculatePflegeversicherung(50000, 1, 30, 'Bayern');
    const [twoChildren] = calculatePflegeversicherung(50000, 2, 30, 'Bayern');
    expect(twoChildren).toBeLessThan(oneChild);
    // 1 discount child * 0.25% = 0.25% of basis discount
    expect(oneChild - twoChildren).toBeCloseTo(50000 * 0.0025, 0);
  });

  it('caps child discount at 5 children', () => {
    const [fiveChildren] = calculatePflegeversicherung(50000, 5, 30, 'Bayern');
    const [sixChildren] = calculatePflegeversicherung(50000, 6, 30, 'Bayern');
    expect(fiveChildren).toBe(sixChildren);
  });

  it('Sachsen: employee pays more, employer pays less', () => {
    const [empBayern, erBayern] = calculatePflegeversicherung(50000, 1, 30, 'Bayern');
    const [empSachsen, erSachsen] = calculatePflegeversicherung(50000, 1, 30, 'Sachsen');
    expect(empSachsen).toBeGreaterThan(empBayern);
    expect(erSachsen).toBeLessThan(erBayern);
    // Total should be roughly the same
    expect(empSachsen + erSachsen).toBeCloseTo(empBayern + erBayern, 0);
  });

  it('caps at BBG', () => {
    const [employee] = calculatePflegeversicherung(100000, 1, 30, 'Bayern');
    const expected = BBG_KV_PV * (0.036 / 2);
    expect(employee).toBeCloseTo(expected, 2);
  });
});

describe('calculateRentenversicherung', () => {
  it('splits 18.6% equally', () => {
    const [employee, employer] = calculateRentenversicherung(50000, 'Bayern');
    const expected = 50000 * (RV_RATE / 2);
    expect(employee).toBeCloseTo(expected, 2);
    expect(employer).toBeCloseTo(expected, 2);
  });

  it('caps at BBG', () => {
    const [employee] = calculateRentenversicherung(200000, 'Bayern');
    const expected = BBG_RV_AV_WEST * (RV_RATE / 2);
    expect(employee).toBeCloseTo(expected, 2);
  });
});

describe('calculateArbeitslosenversicherung', () => {
  it('splits 2.6% equally', () => {
    const [employee, employer] = calculateArbeitslosenversicherung(50000, 'Bayern');
    const expected = 50000 * (AV_RATE / 2);
    expect(employee).toBeCloseTo(expected, 2);
    expect(employer).toBeCloseTo(expected, 2);
  });

  it('caps at BBG', () => {
    const [employee] = calculateArbeitslosenversicherung(200000, 'Bayern');
    const expected = BBG_RV_AV_WEST * (AV_RATE / 2);
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
    expect(result.monthlyNet).toBeCloseTo(result.annualNet / 12, 2);
    expect(result.totalDeductionsAnnual).toBeCloseTo(
      result.annualGross - result.annualNet,
      2,
    );
  });

  it('net salary is in plausible range for 50k, class I', () => {
    const result = calculateNetSalary(makeInput({ annualGrossSalary: 50000, taxClass: 1 }));
    // Net should be roughly 30,000-35,000 EUR
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
      makeInput({ annualGrossSalary: MINIJOB_THRESHOLD_ANNUAL }),
    );
    // At mini-job level, Lohnsteuer should be 0 (below Grundfreibetrag after deductions)
    expect(result.lohnsteuerAnnual).toBe(0);
    expect(result.soliAnnual).toBe(0);
  });

  it('handles very high salary (above all BBGs)', () => {
    const result = calculateNetSalary(makeInput({ annualGrossSalary: 500000 }));
    expect(result.annualNet).toBeGreaterThan(0);
    // RV should be capped at BBG
    expect(result.rentenversicherungEmployeeAnnual).toBeCloseTo(
      BBG_RV_AV_WEST * (RV_RATE / 2),
      2,
    );
    // KV should be capped at BBG_KV_PV
    expect(result.krankenversicherungEmployeeAnnual).toBeCloseTo(
      BBG_KV_PV * ((KV_GENERAL_RATE + 0.025) / 2),
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
    // At 30k salary, Lohnsteuer should be well below Soli Freigrenze
    const result = calculateNetSalary(makeInput({ annualGrossSalary: 30000 }));
    expect(result.soliAnnual).toBe(0);
  });

  it('returns the input in the result', () => {
    const input = makeInput();
    const result = calculateNetSalary(input);
    expect(result.input).toEqual(input);
  });

  it('Kinderfreibetrag reduces Soli for parents', () => {
    // With children, the Soli should be lower because Kinderfreibetrag
    // reduces the hypothetical Lohnsteuer used for Soli calculation
    const noChildren = calculateNetSalary(makeInput({
      annualGrossSalary: 120000,
      childrenCount: 0,
    }));
    const withChildren = calculateNetSalary(makeInput({
      annualGrossSalary: 120000,
      childrenCount: 2,
    }));
    expect(withChildren.soliAnnual).toBeLessThan(noChildren.soliAnnual);
  });

  it('Kinderfreibetrag reduces Kirchensteuer for parents', () => {
    const noChildren = calculateNetSalary(makeInput({
      annualGrossSalary: 50000,
      churchMember: true,
      childrenCount: 0,
    }));
    const withChildren = calculateNetSalary(makeInput({
      annualGrossSalary: 50000,
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
    // More children = higher Entlastungsbetrag = lower Lohnsteuer = higher net
    expect(result3Children.annualNet).toBeGreaterThan(result1Child.annualNet);
  });

  it('handles private health insurance through full calculation', () => {
    const result = calculateNetSalary(makeInput({
      healthInsuranceType: 'privat',
      privatHealthInsuranceMonthly: 500,
    }));
    expect(result.annualNet).toBeGreaterThan(0);
    expect(result.annualNet).toBeLessThan(50000);
    // PKV: employee + employer should total 6000/year (500*12)
    expect(
      result.krankenversicherungEmployeeAnnual + result.krankenversicherungEmployerAnnual,
    ).toBeCloseTo(6000, 0);
  });

  it('handles East German states (Sachsen)', () => {
    const result = calculateNetSalary(makeInput({ state: 'Sachsen' }));
    expect(result.annualNet).toBeGreaterThan(0);
    expect(result.annualNet).toBeLessThan(50000);
    // Sachsen PV: employee pays more than in Bayern
    const resultBayern = calculateNetSalary(makeInput({ state: 'Bayern' }));
    expect(result.pflegeversicherungEmployeeAnnual).toBeGreaterThan(
      resultBayern.pflegeversicherungEmployeeAnnual,
    );
  });
});
