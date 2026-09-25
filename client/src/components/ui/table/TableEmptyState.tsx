import React from 'react';

export interface TableEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  colSpan?: number;
  className?: string;
}

export const TableEmptyState: React.FC<TableEmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  colSpan,
  className = '',
}) => {
  const content = (
    <div className={`p-12 flex flex-col items-center justify-center gap-3 text-center ${className}`}>
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {description && <p className="text-xs text-slate-500 max-w-md">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );

  if (colSpan !== undefined) {
    return (
      <tr>
        <td colSpan={colSpan} className="p-0">
          {content}
        </td>
      </tr>
    );
  }

  return content;
};

export interface TableLoadingStateProps {
  columns: number;
  rows?: number;
}

export const TableLoadingState: React.FC<TableLoadingStateProps> = ({
  columns,
  rows = 5,
}) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={`loading-row-${rIdx}`} className="animate-pulse">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <td key={`loading-cell-${cIdx}`} className="py-3 px-3.5">
              <div
                className={`h-4 bg-slate-200/80 rounded ${
                  cIdx === 0 ? 'w-3/4' : cIdx === columns - 1 ? 'w-16 ml-auto' : 'w-1/2'
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};
