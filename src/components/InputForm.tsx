import { useEffect, useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import type { Bundesland, HealthInsuranceType, SalaryMode, Steuerklasse, TaxInput } from '../lib/types';
import type { TaxYear } from '../lib/tax-years';
import { AVAILABLE_TAX_YEARS, DEFAULT_TAX_YEAR, getTaxYearConfig } from '../lib/tax-years';
import { useI18n } from '../i18n/i18n';

const BUNDESLAENDER: Bundesland[] = [
  'Baden-Wuerttemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thueringen',
];

const STEUERKLASSEN: Steuerklasse[] = [1, 2, 3, 4, 5, 6];

export interface InputFormValues {
  taxYear: TaxYear;
  salaryMode: SalaryMode;
  grossSalary: number;
  taxClass: Steuerklasse;
  state: Bundesland;
  churchMember: boolean;
  childrenCount: number;
  healthInsuranceType: HealthInsuranceType;
  zusatzbeitragRate: number;
  privatHealthInsuranceMonthly: number;
  age: number;
}

const DEFAULT_VALUES: InputFormValues = {
  taxYear: DEFAULT_TAX_YEAR,
  salaryMode: 'annual',
  grossSalary: 50000,
  taxClass: 1,
  state: 'Baden-Wuerttemberg',
  churchMember: false,
  childrenCount: 0,
  healthInsuranceType: 'gesetzlich',
  zusatzbeitragRate: Math.round(getTaxYearConfig(DEFAULT_TAX_YEAR).kvDefaultZusatzbeitrag * 10000) / 100,
  privatHealthInsuranceMonthly: 300,
  age: 30,
};

/** Short URL param keys to keep shareable URLs compact */
const PARAM_KEYS = {
  taxYear: 'y',
  salaryMode: 'm',
  grossSalary: 's',
  taxClass: 'tc',
  state: 'bl',
  churchMember: 'ch',
  childrenCount: 'k',
  age: 'age',
  healthInsuranceType: 'hi',
  zusatzbeitragRate: 'zb',
  privatHealthInsuranceMonthly: 'pkv',
} as const;

function parseUrlParams(): Partial<InputFormValues> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const result: Partial<InputFormValues> = {};

  const y = params.get(PARAM_KEYS.taxYear);
  if (y && AVAILABLE_TAX_YEARS.includes(Number(y) as TaxYear)) {
    result.taxYear = Number(y) as TaxYear;
  }

  const m = params.get(PARAM_KEYS.salaryMode);
  if (m === 'annual' || m === 'monthly') result.salaryMode = m;

  const s = params.get(PARAM_KEYS.grossSalary);
  if (s != null && !isNaN(Number(s)) && Number(s) >= 0) result.grossSalary = Number(s);

  const tc = params.get(PARAM_KEYS.taxClass);
  if (tc && [1, 2, 3, 4, 5, 6].includes(Number(tc))) result.taxClass = Number(tc) as Steuerklasse;

  const bl = params.get(PARAM_KEYS.state);
  if (bl && BUNDESLAENDER.includes(bl as Bundesland)) result.state = bl as Bundesland;

  const ch = params.get(PARAM_KEYS.churchMember);
  if (ch === '1' || ch === '0') result.churchMember = ch === '1';

  const k = params.get(PARAM_KEYS.childrenCount);
  if (k != null && !isNaN(Number(k)) && Number(k) >= 0) result.childrenCount = Number(k);

  const age = params.get(PARAM_KEYS.age);
  if (age != null && !isNaN(Number(age)) && Number(age) >= 16) result.age = Number(age);

  const hi = params.get(PARAM_KEYS.healthInsuranceType);
  if (hi === 'gesetzlich' || hi === 'privat') result.healthInsuranceType = hi;

  const zb = params.get(PARAM_KEYS.zusatzbeitragRate);
  if (zb != null && !isNaN(Number(zb)) && Number(zb) >= 0) result.zusatzbeitragRate = Number(zb);

  const pkv = params.get(PARAM_KEYS.privatHealthInsuranceMonthly);
  if (pkv != null && !isNaN(Number(pkv)) && Number(pkv) >= 0) result.privatHealthInsuranceMonthly = Number(pkv);

  return result;
}

function updateUrlParams(values: InputFormValues) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();

  // Preserve lang and theme params managed by other components
  const currentParams = new URLSearchParams(window.location.search);
  const lang = currentParams.get('lang');
  if (lang) params.set('lang', lang);
  const theme = currentParams.get('theme');
  if (theme) params.set('theme', theme);

  // Only include values that differ from defaults
  if (values.taxYear !== DEFAULT_VALUES.taxYear) params.set(PARAM_KEYS.taxYear, String(values.taxYear));
  if (values.salaryMode !== DEFAULT_VALUES.salaryMode) params.set(PARAM_KEYS.salaryMode, values.salaryMode);
  if (values.grossSalary !== DEFAULT_VALUES.grossSalary) params.set(PARAM_KEYS.grossSalary, String(values.grossSalary));
  if (values.taxClass !== DEFAULT_VALUES.taxClass) params.set(PARAM_KEYS.taxClass, String(values.taxClass));
  if (values.state !== DEFAULT_VALUES.state) params.set(PARAM_KEYS.state, values.state);
  if (values.churchMember !== DEFAULT_VALUES.churchMember) params.set(PARAM_KEYS.churchMember, values.churchMember ? '1' : '0');
  if (values.childrenCount !== DEFAULT_VALUES.childrenCount) params.set(PARAM_KEYS.childrenCount, String(values.childrenCount));
  if (values.age !== DEFAULT_VALUES.age) params.set(PARAM_KEYS.age, String(values.age));
  if (values.healthInsuranceType !== DEFAULT_VALUES.healthInsuranceType) params.set(PARAM_KEYS.healthInsuranceType, values.healthInsuranceType);
  if (values.zusatzbeitragRate !== DEFAULT_VALUES.zusatzbeitragRate) params.set(PARAM_KEYS.zusatzbeitragRate, String(values.zusatzbeitragRate));
  if (values.privatHealthInsuranceMonthly !== DEFAULT_VALUES.privatHealthInsuranceMonthly) params.set(PARAM_KEYS.privatHealthInsuranceMonthly, String(values.privatHealthInsuranceMonthly));

  const qs = params.toString();
  const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', newUrl);
}

export function formValuesToTaxInput(values: InputFormValues): TaxInput {
  const zusatzbeitragRate =
    values.healthInsuranceType === 'privat'
      ? getTaxYearConfig(values.taxYear).kvDefaultZusatzbeitrag
      : values.zusatzbeitragRate / 100;
  return {
    grossSalary: values.grossSalary,
    salaryMode: values.salaryMode,
    taxYear: values.taxYear,
    taxClass: values.taxClass,
    state: values.state,
    churchMember: values.churchMember,
    childrenCount: values.childrenCount,
    healthInsuranceType: values.healthInsuranceType,
    zusatzbeitragRate,
    privatHealthInsuranceMonthly: values.privatHealthInsuranceMonthly,
    age: values.age,
  };
}

interface InputFormProps {
  onChange: (values: InputFormValues) => void;
}

export default function InputForm({ onChange }: InputFormProps) {
  const { t } = useI18n();

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
  });

  // Apply URL params after hydration to avoid SSR mismatch
  const urlApplied = useRef(false);
  useEffect(() => {
    if (urlApplied.current) return;
    urlApplied.current = true;
    const urlOverrides = parseUrlParams();
    if (Object.keys(urlOverrides).length > 0) {
      const merged = { ...DEFAULT_VALUES, ...urlOverrides };
      for (const [key, value] of Object.entries(merged)) {
        if (value !== DEFAULT_VALUES[key as keyof InputFormValues]) {
          form.setFieldValue(key as keyof InputFormValues, value as never);
        }
      }
    }
  }, [form]);

  const values = useStore(form.store, (s) => s.values);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current(values);
    updateUrlParams(values);
  }, [values]);

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="space-y-4"
      aria-label={t.input.formAriaLabel}
    >
      {/* Tax year */}
      <div className="form-control">
        <label className="label" htmlFor="taxYear">
          <span className="label-text font-semibold">{t.input.taxYear}</span>
        </label>
        <form.Field name="taxYear">
          {(field) => (
            <select
              id="taxYear"
              className="select select-bordered w-full"
              value={field.state.value}
              onChange={(e) => {
                const newYear = Number(e.target.value) as TaxYear;
                field.handleChange(newYear);
                // Update Zusatzbeitrag to the new year's default
                const cfg = getTaxYearConfig(newYear);
                form.setFieldValue('zusatzbeitragRate', Math.round(cfg.kvDefaultZusatzbeitrag * 10000) / 100);
              }}
            >
              {AVAILABLE_TAX_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}
        </form.Field>
      </div>

      {/* Salary input */}
      <div className="form-control">
        <label className="label" htmlFor="grossSalary">
          <span className="label-text font-semibold">{t.input.grossIncome}</span>
        </label>
        <div className="join w-full">
          <form.Field name="grossSalary">
            {(field) => (
              <input
                id="grossSalary"
                type="number"
                min={0}
                step={100}
                className="input input-bordered join-item w-full min-w-0"
                value={field.state.value}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  field.handleChange(val >= 0 ? val : 0);
                }}
                onBlur={field.handleBlur}
              />
            )}
          </form.Field>
          <form.Field name="salaryMode">
            {(field) => (
              <select
                className="select select-bordered join-item"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value as SalaryMode)}
                aria-label={t.input.salaryPeriod}
              >
                <option value="annual">{t.input.annual}</option>
                <option value="monthly">{t.input.monthly}</option>
              </select>
            )}
          </form.Field>
        </div>
      </div>

      {/* Tax class */}
      <div className="form-control">
        <label className="label" htmlFor="taxClass">
          <span className="label-text font-semibold">{t.input.taxClass}</span>
        </label>
        <form.Field name="taxClass">
          {(field) => (
            <select
              id="taxClass"
              className="select select-bordered w-full"
              value={field.state.value}
              onChange={(e) => field.handleChange(Number(e.target.value) as Steuerklasse)}
            >
              {STEUERKLASSEN.map((sk) => (
                <option key={sk} value={sk}>
                  {t.input.taxClassOption} {sk}
                </option>
              ))}
            </select>
          )}
        </form.Field>
      </div>

      {/* Bundesland */}
      <div className="form-control">
        <label className="label" htmlFor="state">
          <span className="label-text font-semibold">{t.input.state}</span>
        </label>
        <form.Field name="state">
          {(field) => (
            <select
              id="state"
              className="select select-bordered w-full"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value as Bundesland)}
            >
              {BUNDESLAENDER.map((bl) => (
                <option key={bl} value={bl}>
                  {bl.replace(/-/g, ' ').replace(/ue/g, 'ü')}
                </option>
              ))}
            </select>
          )}
        </form.Field>
      </div>

      {/* Church membership */}
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-3">
          <form.Field name="churchMember">
            {(field) => (
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={field.state.value}
                onChange={(e) => field.handleChange(e.target.checked)}
                aria-label={t.input.churchMemberAria}
              />
            )}
          </form.Field>
          <span className="label-text font-semibold">{t.input.churchMember}</span>
        </label>
      </div>

      {/* Children count */}
      <div className="form-control">
        <label className="label" htmlFor="childrenCount">
          <span className="label-text font-semibold">{t.input.childrenCount}</span>
        </label>
        <form.Field name="childrenCount">
          {(field) => (
            <input
              id="childrenCount"
              type="number"
              min={0}
              max={10}
              className="input input-bordered w-full"
              value={field.state.value}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                field.handleChange(val >= 0 ? val : 0);
              }}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
      </div>

      {/* Age */}
      <div className="form-control">
        <label className="label" htmlFor="age">
          <span className="label-text font-semibold">{t.input.age}</span>
        </label>
        <form.Field name="age">
          {(field) => (
            <input
              id="age"
              type="number"
              min={16}
              max={99}
              className="input input-bordered w-full"
              value={field.state.value}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                field.handleChange(val >= 16 ? val : 16);
              }}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
      </div>

      {/* Health insurance type */}
      <div className="form-control">
        <label className="label" htmlFor="healthInsuranceType">
          <span className="label-text font-semibold">{t.input.healthInsurance}</span>
        </label>
        <form.Field name="healthInsuranceType">
          {(field) => (
            <select
              id="healthInsuranceType"
              className="select select-bordered w-full"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value as HealthInsuranceType)}
            >
              <option value="gesetzlich">{t.input.healthPublic}</option>
              <option value="privat">{t.input.healthPrivate}</option>
            </select>
          )}
        </form.Field>
      </div>

      {/* Zusatzbeitrag (only for gesetzlich) */}
      <form.Subscribe selector={(state) => state.values.healthInsuranceType}>
        {(healthInsuranceType) =>
          healthInsuranceType === 'gesetzlich' ? (
            <div className="form-control">
              <label className="label" htmlFor="zusatzbeitragRate">
                <span className="label-text font-semibold">{t.input.additionalContribution}</span>
              </label>
              <form.Field name="zusatzbeitragRate">
                {(field) => (
                  <input
                    id="zusatzbeitragRate"
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    className="input input-bordered w-full"
                    value={field.state.value}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      field.handleChange(val >= 0 ? val : 0);
                    }}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            </div>
          ) : (
            <div className="form-control">
              <label className="label" htmlFor="privatHealthInsuranceMonthly">
                <span className="label-text font-semibold">{t.input.pkvMonthly}</span>
              </label>
              <form.Field name="privatHealthInsuranceMonthly">
                {(field) => (
                  <input
                    id="privatHealthInsuranceMonthly"
                    type="number"
                    min={0}
                    step={10}
                    className="input input-bordered w-full"
                    value={field.state.value}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      field.handleChange(val >= 0 ? val : 0);
                    }}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            </div>
          )
        }
      </form.Subscribe>
    </form>
  );
}

export { DEFAULT_VALUES };
