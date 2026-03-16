import { useState, useMemo } from 'react';
import InputForm, { DEFAULT_VALUES, formValuesToTaxInput } from './InputForm';
import type { InputFormValues } from './InputForm';
import { calculateNetSalary } from '../lib/tax-engine';
import type { TaxResult } from '../lib/types';
import SalaryChart from './SalaryChart';
import BreakdownBar from './BreakdownBar';

function formatEur(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function ResultsSummary({ result }: { result: TaxResult }) {
  return (
    <div className="stats stats-vertical lg:stats-horizontal shadow w-full bg-base-100">
      <div className="stat">
        <div className="stat-title">Brutto / Monat</div>
        <div className="stat-value text-lg">{formatEur(result.monthlyGross)}</div>
        <div className="stat-desc">{formatEur(result.annualGross)} / Jahr</div>
      </div>
      <div className="stat">
        <div className="stat-title">Abzuege / Monat</div>
        <div className="stat-value text-lg text-error">
          -{formatEur(result.totalDeductionsMonthly)}
        </div>
        <div className="stat-desc">-{formatEur(result.totalDeductionsAnnual)} / Jahr</div>
      </div>
      <div className="stat">
        <div className="stat-title">Netto / Monat</div>
        <div className="stat-value text-lg text-success">{formatEur(result.monthlyNet)}</div>
        <div className="stat-desc">{formatEur(result.annualNet)} / Jahr</div>
      </div>
    </div>
  );
}

function DeductionsList({ result }: { result: TaxResult }) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-sm" aria-label="Deductions breakdown">
        <thead>
          <tr>
            <th>Abzug</th>
            <th className="text-right">Monatlich</th>
            <th className="text-right">Jaehrlich</th>
          </tr>
        </thead>
        <tbody>
          {result.deductions.map((d) => (
            <tr key={d.name}>
              <td>{d.name}</td>
              <td className="text-right">{formatEur(d.employeeShareMonthly)}</td>
              <td className="text-right">{formatEur(d.employeeShareAnnual)}</td>
            </tr>
          ))}
          <tr className="font-bold border-t-2">
            <td>Gesamt Abzuege</td>
            <td className="text-right">{formatEur(result.totalDeductionsMonthly)}</td>
            <td className="text-right">{formatEur(result.totalDeductionsAnnual)}</td>
          </tr>
          <tr className="font-bold text-success">
            <td>Netto</td>
            <td className="text-right">{formatEur(result.monthlyNet)}</td>
            <td className="text-right">{formatEur(result.annualNet)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function TaxCalculator() {
  const [formValues, setFormValues] = useState<InputFormValues>(DEFAULT_VALUES);

  const result = useMemo(() => {
    const input = formValuesToTaxInput(formValues);
    if (input.annualGrossSalary <= 0) return null;
    return calculateNetSalary(input);
  }, [formValues]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-1/3 w-full">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-xl">Eingaben</h2>
            <InputForm onChange={setFormValues} />
          </div>
        </div>
      </div>
      <div className="lg:w-2/3 w-full space-y-6">
        {result ? (
          <>
            <ResultsSummary result={result} />
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-xl">Verteilung</h2>
                <SalaryChart result={result} />
              </div>
            </div>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-xl">Monatsansicht</h2>
                <BreakdownBar result={result} />
              </div>
            </div>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-xl">Aufschluesselung</h2>
                <DeductionsList result={result} />
              </div>
            </div>
          </>
        ) : (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <p className="text-base-content/70">
                Bitte geben Sie ein Bruttoeinkommen groesser als 0 ein.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
