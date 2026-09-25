import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  entityName?: string;
  className?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  page,
  totalPages,
  totalCount,
  limit,
  onPageChange,
  entityName = 'records',
  className = '',
}) => {
  const startItem = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalCount);

  return (
    <div
      className={`px-6 py-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-600 select-none ${className}`}
    >
      <div>
        Showing <span className="font-bold text-slate-900 tabular-nums">{startItem}</span> to{' '}
        <span className="font-bold text-slate-900 tabular-nums">{endItem}</span> of{' '}
        <span className="font-bold text-slate-900 tabular-nums">{totalCount}</span> {entityName}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="px-2 font-semibold text-slate-900 tabular-nums">
          Page {page} of {Math.max(1, totalPages)}
        </span>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default TablePagination;
