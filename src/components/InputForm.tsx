import { useEffect, useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import type { Bundesland, HealthInsuranceType, Steuerklasse, TaxInput } from '../lib/types';
import { KV_DEFAULT_ZUSATZBEITRAG } from '../lib/constants';

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
  salaryMode: 'annual' | 'monthly';
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
  salaryMode: 'annual',
  grossSalary: 50000,
  taxClass: 1,
  state: 'Bayern',
  churchMember: false,
  childrenCount: 0,
  healthInsuranceType: 'gesetzlich',
  zusatzbeitragRate: KV_DEFAULT_ZUSATZBEITRAG * 100,
  privatHealthInsuranceMonthly: 300,
  age: 30,
};

export function formValuesToTaxInput(values: InputFormValues): TaxInput {
  const annualGrossSalary =
    values.salaryMode === 'monthly' ? values.grossSalary * 12 : values.grossSalary;
  return {
    annualGrossSalary,
    taxClass: values.taxClass,
    state: values.state,
    churchMember: values.churchMember,
    childrenCount: values.childrenCount,
    healthInsuranceType: values.healthInsuranceType,
    zusatzbeitragRate: values.zusatzbeitragRate / 100,
    privatHealthInsuranceMonthly: values.privatHealthInsuranceMonthly,
    age: values.age,
  };
}

interface InputFormProps {
  onChange: (values: InputFormValues) => void;
}

export default function InputForm({ onChange }: InputFormProps) {
  const form = useForm({
    defaultValues: DEFAULT_VALUES,
  });

  const values = useStore(form.store, (s) => s.values);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current(values);
  }, [values]);

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="space-y-4"
      aria-label="Tax calculator input form"
    >
      {/* Salary input */}
      <div className="form-control">
        <label className="label" htmlFor="grossSalary">
          <span className="label-text font-semibold">Bruttoeinkommen (EUR)</span>
        </label>
        <div className="join w-full">
          <form.Field name="grossSalary">
            {(field) => (
              <input
                id="grossSalary"
                type="number"
                min={0}
                step={100}
                className="input input-bordered join-item flex-1"
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
                onChange={(e) => field.handleChange(e.target.value as 'annual' | 'monthly')}
                aria-label="Salary period"
              >
                <option value="annual">Jaehrlich</option>
                <option value="monthly">Monatlich</option>
              </select>
            )}
          </form.Field>
        </div>
      </div>

      {/* Tax class */}
      <div className="form-control">
        <label className="label" htmlFor="taxClass">
          <span className="label-text font-semibold">Steuerklasse</span>
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
                  Steuerklasse {sk}
                </option>
              ))}
            </select>
          )}
        </form.Field>
      </div>

      {/* Bundesland */}
      <div className="form-control">
        <label className="label" htmlFor="state">
          <span className="label-text font-semibold">Bundesland</span>
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
                  {bl.replace(/-/g, '-')}
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
                aria-label="Church member"
              />
            )}
          </form.Field>
          <span className="label-text font-semibold">Kirchenmitglied</span>
        </label>
      </div>

      {/* Children count */}
      <div className="form-control">
        <label className="label" htmlFor="childrenCount">
          <span className="label-text font-semibold">Anzahl Kinder</span>
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
          <span className="label-text font-semibold">Alter</span>
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
          <span className="label-text font-semibold">Krankenversicherung</span>
        </label>
        <form.Field name="healthInsuranceType">
          {(field) => (
            <select
              id="healthInsuranceType"
              className="select select-bordered w-full"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value as HealthInsuranceType)}
            >
              <option value="gesetzlich">Gesetzlich (GKV)</option>
              <option value="privat">Privat (PKV)</option>
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
                <span className="label-text font-semibold">Zusatzbeitrag (%)</span>
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
                <span className="label-text font-semibold">PKV Monatsbeitrag (EUR)</span>
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
