import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import type { TaxResult } from '../lib/types';

interface TableRow {
  name: string;
  employeeMonthly: number;
  employerMonthly: number;
  totalMonthly: number;
  percentOfGross: number;
  isSummary?: boolean;
  isNet?: boolean;
}

function formatEur(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

const columnHelper = createColumnHelper<TableRow>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Abzug',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('employeeMonthly', {
    header: 'Arbeitnehmer',
    cell: (info) => formatEur(info.getValue()),
    meta: { align: 'right' },
  }),
  columnHelper.accessor('employerMonthly', {
    header: 'Arbeitgeber',
    cell: (info) => formatEur(info.getValue()),
    meta: { align: 'right' },
  }),
  columnHelper.accessor('totalMonthly', {
    header: 'Gesamt',
    cell: (info) => formatEur(info.getValue()),
    meta: { align: 'right' },
  }),
  columnHelper.accessor('percentOfGross', {
    header: '% vom Brutto',
    cell: (info) => `${info.getValue().toFixed(1)} %`,
    meta: { align: 'right' },
  }),
];

export default function BreakdownTable({ result }: { result: TaxResult }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const data = useMemo<TableRow[]>(() => {
    return result.deductions
      .filter((d) => d.employeeShareMonthly > 0 || d.employerShareMonthly > 0)
      .map((d) => ({
        name: d.name,
        employeeMonthly: d.employeeShareMonthly,
        employerMonthly: d.employerShareMonthly,
        totalMonthly: d.employeeShareMonthly + d.employerShareMonthly,
        percentOfGross:
          result.monthlyGross > 0
            ? ((d.employeeShareMonthly + d.employerShareMonthly) / result.monthlyGross) * 100
            : 0,
      }));
  }, [result]);

  const totalEmployeeMonthly = result.totalDeductionsMonthly;
  const totalEmployerMonthly = useMemo(
    () => result.deductions.reduce((sum, d) => sum + d.employerShareMonthly, 0),
    [result],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto" role="region" aria-label="Detaillierte Aufschluesselung">
      <table className="table table-sm table-zebra" aria-label="Deductions breakdown">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const align = (header.column.columnDef.meta as { align?: string })?.align;
                return (
                  <th
                    key={header.id}
                    className={`cursor-pointer select-none hover:bg-base-200 ${align === 'right' ? 'text-right' : ''}`}
                    onClick={header.column.getToggleSortingHandler()}
                    aria-sort={
                      header.column.getIsSorted() === 'asc'
                        ? 'ascending'
                        : header.column.getIsSorted() === 'desc'
                          ? 'descending'
                          : 'none'
                    }
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as string] ?? ''}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover">
              {row.getVisibleCells().map((cell) => {
                const align = (cell.column.columnDef.meta as { align?: string })?.align;
                return (
                  <td key={cell.id} className={align === 'right' ? 'text-right' : ''}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold border-t-2">
            <td>Gesamt Abzuege</td>
            <td className="text-right">{formatEur(totalEmployeeMonthly)}</td>
            <td className="text-right">{formatEur(totalEmployerMonthly)}</td>
            <td className="text-right">{formatEur(totalEmployeeMonthly + totalEmployerMonthly)}</td>
            <td className="text-right">
              {result.monthlyGross > 0
                ? `${(((totalEmployeeMonthly + totalEmployerMonthly) / result.monthlyGross) * 100).toFixed(1)} %`
                : '0.0 %'}
            </td>
          </tr>
          <tr className="font-bold text-success">
            <td>Netto</td>
            <td className="text-right">{formatEur(result.monthlyNet)}</td>
            <td className="text-right">-</td>
            <td className="text-right">{formatEur(result.monthlyNet)}</td>
            <td className="text-right">
              {result.monthlyGross > 0
                ? `${((result.monthlyNet / result.monthlyGross) * 100).toFixed(1)} %`
                : '0.0 %'}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
