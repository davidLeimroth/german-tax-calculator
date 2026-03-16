import { useCallback, useMemo, useRef, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import type { TaxResult } from '../lib/types';
import { formatEur } from '../lib/format';
import { useI18n } from '../i18n/i18n';
import type { Translations } from '../i18n/i18n';

interface TableRow {
  name: string;
  displayName: string;
  employeeMonthly: number;
  employerMonthly: number;
  totalMonthly: number;
  percentOfGross: number;
}

const columnHelper = createColumnHelper<TableRow>();

function createColumns(t: Translations): ColumnDef<TableRow, unknown>[] {
  return [
    columnHelper.accessor('displayName', {
      header: t.table.deduction,
      cell: (info) => info.getValue(),
    }) as ColumnDef<TableRow, unknown>,
    columnHelper.accessor('employeeMonthly', {
      header: t.table.employee,
      cell: (info) => formatEur(info.getValue()),
      meta: { align: 'right' },
    }) as ColumnDef<TableRow, unknown>,
    columnHelper.accessor('employerMonthly', {
      header: t.table.employer,
      cell: (info) => formatEur(info.getValue()),
      meta: { align: 'right' },
    }) as ColumnDef<TableRow, unknown>,
    columnHelper.accessor('totalMonthly', {
      header: t.table.total,
      cell: (info) => formatEur(info.getValue()),
      meta: { align: 'right' },
    }) as ColumnDef<TableRow, unknown>,
    columnHelper.accessor('percentOfGross', {
      header: t.table.percentOfGross,
      cell: (info) => `${info.getValue().toFixed(1)} %`,
      meta: { align: 'right' },
    }) as ColumnDef<TableRow, unknown>,
  ];
}

export default function BreakdownTable({ result }: { result: TaxResult }) {
  const { t } = useI18n();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollRight(el.scrollWidth - el.scrollLeft - el.clientWidth > 1);
  }, []);

  const scrollContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      (scrollRef as React.MutableRefObject<HTMLDivElement>).current = node;
      checkScroll();
      const observer = new ResizeObserver(checkScroll);
      observer.observe(node);
      node.addEventListener('scroll', checkScroll, { passive: true });
    }
  }, [checkScroll]);

  const columns = useMemo(() => createColumns(t), [t]);

  const data = useMemo<TableRow[]>(() => {
    return result.deductions
      .filter((d) => d.employeeShareMonthly > 0 || d.employerShareMonthly > 0)
      .map((d) => ({
        name: d.name,
        displayName: t.deductions[d.name as keyof typeof t.deductions] || d.name,
        employeeMonthly: d.employeeShareMonthly,
        employerMonthly: d.employerShareMonthly,
        totalMonthly: d.employeeShareMonthly + d.employerShareMonthly,
        percentOfGross:
          result.monthlyGross > 0
            ? ((d.employeeShareMonthly + d.employerShareMonthly) / result.monthlyGross) * 100
            : 0,
      }));
  }, [result, t]);

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
    <div className="relative">
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto"
        role="region"
        aria-label={t.table.ariaLabel}
      >
      <table className="table table-sm table-zebra" aria-label={t.table.tableAriaLabel}>
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        header.column.getToggleSortingHandler()?.(e);
                      }
                    }}
                    tabIndex={0}
                    role="columnheader"
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
            <td>{t.table.totalDeductions}</td>
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
            <td>{t.table.netto}</td>
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
      {canScrollRight && (
        <div
          className="pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-base-100 to-transparent"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
