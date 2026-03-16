/** German federal states (Bundeslaender) */
export type Bundesland =
  | 'Baden-Wuerttemberg'
  | 'Bayern'
  | 'Berlin'
  | 'Brandenburg'
  | 'Bremen'
  | 'Hamburg'
  | 'Hessen'
  | 'Mecklenburg-Vorpommern'
  | 'Niedersachsen'
  | 'Nordrhein-Westfalen'
  | 'Rheinland-Pfalz'
  | 'Saarland'
  | 'Sachsen'
  | 'Sachsen-Anhalt'
  | 'Schleswig-Holstein'
  | 'Thueringen';

/** Tax classes (Steuerklassen) I through VI */
export type Steuerklasse = 1 | 2 | 3 | 4 | 5 | 6;

/** Health insurance type */
export type HealthInsuranceType = 'gesetzlich' | 'privat';

/** Whether the state is in the former East or West Germany (for BBG) */
export type Region = 'West' | 'Ost';

/** Input parameters for the tax calculator */
export interface TaxInput {
  /** Annual gross salary in EUR */
  annualGrossSalary: number;
  /** Tax class (Steuerklasse) */
  taxClass: Steuerklasse;
  /** Federal state */
  state: Bundesland;
  /** Whether the person is a church member */
  churchMember: boolean;
  /** Number of children (for Pflegeversicherung and Kinderfreibetrag) */
  childrenCount: number;
  /** Health insurance type */
  healthInsuranceType: HealthInsuranceType;
  /** Additional health insurance contribution rate (Zusatzbeitrag) as decimal, e.g. 0.017 for 1.7% */
  zusatzbeitragRate: number;
  /** Private health insurance monthly amount (only relevant if healthInsuranceType is 'privat') */
  privatHealthInsuranceMonthly?: number;
  /** Age of the person (for Pflegeversicherung surcharge) */
  age?: number;
}

/** Individual deduction line item */
export interface DeductionItem {
  /** Name of the deduction */
  name: string;
  /** Annual employee share */
  employeeShareAnnual: number;
  /** Annual employer share */
  employerShareAnnual: number;
  /** Monthly employee share */
  employeeShareMonthly: number;
  /** Monthly employer share */
  employerShareMonthly: number;
}

/** Full result of the tax calculation */
export interface TaxResult {
  /** Input that was used */
  input: TaxInput;
  /** Annual gross salary */
  annualGross: number;
  /** Monthly gross salary */
  monthlyGross: number;

  /** Lohnsteuer (income tax) annual */
  lohnsteuerAnnual: number;
  /** Solidaritaetszuschlag annual */
  soliAnnual: number;
  /** Kirchensteuer annual */
  kirchensteuerAnnual: number;

  /** Krankenversicherung employee annual */
  krankenversicherungEmployeeAnnual: number;
  /** Krankenversicherung employer annual */
  krankenversicherungEmployerAnnual: number;

  /** Pflegeversicherung employee annual */
  pflegeversicherungEmployeeAnnual: number;
  /** Pflegeversicherung employer annual */
  pflegeversicherungEmployerAnnual: number;

  /** Rentenversicherung employee annual */
  rentenversicherungEmployeeAnnual: number;
  /** Rentenversicherung employer annual */
  rentenversicherungEmployerAnnual: number;

  /** Arbeitslosenversicherung employee annual */
  arbeitslosenversicherungEmployeeAnnual: number;
  /** Arbeitslosenversicherung employer annual */
  arbeitslosenversicherungEmployerAnnual: number;

  /** Total annual deductions (employee only) */
  totalDeductionsAnnual: number;
  /** Total monthly deductions (employee only) */
  totalDeductionsMonthly: number;

  /** Annual net salary */
  annualNet: number;
  /** Monthly net salary */
  monthlyNet: number;

  /** Deduction items for table display */
  deductions: DeductionItem[];
}
