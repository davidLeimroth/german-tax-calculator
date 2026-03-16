import { useState, useMemo } from 'react';
import InputForm, { DEFAULT_VALUES, formValuesToTaxInput } from './InputForm';
import type { InputFormValues } from './InputForm';
import { calculateNetSalary } from '../lib/tax-engine';
import type { TaxResult } from '../lib/types';
import { formatEur } from '../lib/format';
import SalaryChart from './SalaryChart';
import BreakdownBar from './BreakdownBar';
import BreakdownTable from './BreakdownTable';
import MarginalRateChart from './MarginalRateChart';
import IncomeBreakdownChart from './IncomeBreakdownChart';
import TaxClassChart from './TaxClassChart';
import EffectiveRateChart from './EffectiveRateChart';
import InsuranceComparisonChart from './InsuranceComparisonChart';
import { useI18n } from '../i18n/i18n';
import InfoTooltip from './InfoTooltip';

function ResultsSummary({ result }: { result: TaxResult }) {
  const { t } = useI18n();
  return (
    <div className="stats stats-vertical lg:stats-horizontal shadow w-full bg-base-100">
      <div className="stat">
        <div className="stat-title">{t.results.grossMonthly}</div>
        <div className="stat-value text-lg">{formatEur(result.monthlyGross)}</div>
        <div className="stat-desc">{formatEur(result.annualGross)} {t.results.perYear}</div>
      </div>
      <div className="stat">
        <div className="stat-title">{t.results.deductionsMonthly}</div>
        <div className="stat-value text-lg text-error">
          -{formatEur(result.totalDeductionsMonthly)}
        </div>
        <div className="stat-desc">-{formatEur(result.totalDeductionsAnnual)} {t.results.perYear}</div>
      </div>
      <div className="stat">
        <div className="stat-title">{t.results.netMonthly}</div>
        <div className="stat-value text-lg text-success">{formatEur(result.monthlyNet)}</div>
        <div className="stat-desc">{formatEur(result.annualNet)} {t.results.perYear}</div>
      </div>
    </div>
  );
}


export default function TaxCalculator() {
  const { t } = useI18n();
  const [formValues, setFormValues] = useState<InputFormValues>(DEFAULT_VALUES);

  const result = useMemo(() => {
    const input = formValuesToTaxInput(formValues);
    if (input.grossSalary <= 0) return null;
    return calculateNetSalary(input);
  }, [formValues]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-1/3 w-full">
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title text-xl">{t.input.heading}</h2>
            <InputForm onChange={setFormValues} />
          </div>
        </div>
      </div>
      <div className="lg:w-2/3 w-full space-y-6" role="region" aria-label={t.results.resultsAriaLabel}>
        {result ? (
          <>
            <h2 className="sr-only">{t.results.heading}</h2>
            <ResultsSummary result={result} />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="card bg-base-100 shadow">
                <div className="card-body">
                  <h2 className="card-title text-xl">
                    {t.results.distribution} ({result.input.salaryMode === 'monthly' ? t.input.monthly : t.input.annual})
                  </h2>
                  <SalaryChart result={result} />
                </div>
              </div>
              <div className="card bg-base-100 shadow">
                <div className="card-body">
                  <h2 className="card-title text-xl">{t.results.monthlyView}</h2>
                  <BreakdownBar result={result} />
                </div>
              </div>
              <div className="card bg-base-100 shadow">
                <div className="card-body">
                  <h2 className="card-title text-xl">{t.chart.taxClassTitle} <InfoTooltip text={t.chart.taxClassInfo} /></h2>
                  <TaxClassChart baseInput={result.input} />
                </div>
              </div>
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title text-xl">{t.chart.incomeBreakdownTitle} <InfoTooltip text={t.chart.incomeBreakdownInfo} /></h2>
                <IncomeBreakdownChart baseInput={result.input} />
              </div>
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title text-xl">{t.chart.marginalTitle} <InfoTooltip text={t.chart.marginalInfo} /></h2>
                <MarginalRateChart baseInput={result.input} />
              </div>
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title text-xl">{t.chart.effectiveRateTitle} <InfoTooltip text={t.chart.effectiveRateInfo} /></h2>
                <EffectiveRateChart baseInput={result.input} />
              </div>
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title text-xl">{t.chart.insuranceTitle} <InfoTooltip text={t.chart.insuranceInfo} /></h2>
                <InsuranceComparisonChart baseInput={result.input} />
              </div>
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title text-xl">{t.results.breakdown} <InfoTooltip text={t.table.info} /></h2>
                <BreakdownTable result={result} />
              </div>
            </div>
          </>
        ) : (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <p className="text-base-content/70">
                {t.results.emptyState}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
