import React, { createContext, useContext, forwardRef } from 'react';

export type TableDensity = 'compact' | 'standard' | 'comfortable';

interface TableContextValue {
  density: TableDensity;
}

const TableContext = createContext<TableContextValue>({
  density: 'standard',
});

export const useTableContext = () => useContext(TableContext);

/* ==========================================================================
   Table Container
   ========================================================================== */

export interface TableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  card?: boolean;
}

export const TableContainer = forwardRef<HTMLDivElement, TableContainerProps>(
  ({ card = true, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`w-full overflow-hidden ${
          card ? 'bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col' : ''
        } ${className}`}
        {...props}
      >
        <div className="w-full overflow-x-auto">{children}</div>
      </div>
    );
  }
);

TableContainer.displayName = 'TableContainer';

/* ==========================================================================
   Table Root
   ========================================================================== */

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  density?: TableDensity;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ density = 'standard', className = '', children, ...props }, ref) => {
    return (
      <TableContext.Provider value={{ density }}>
        <table
          ref={ref}
          className={`w-full text-left border-collapse ${className}`}
          {...props}
        >
          {children}
        </table>
      </TableContext.Provider>
    );
  }
);

Table.displayName = 'Table';

/* ==========================================================================
   Table Header (thead)
   ========================================================================== */

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  sticky?: boolean;
}

export const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ sticky = false, className = '', children, ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={`bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider ${
          sticky ? 'sticky top-0 z-10 backdrop-blur-xs' : ''
        } ${className}`}
        {...props}
      >
        {children}
      </thead>
    );
  }
);

TableHeader.displayName = 'TableHeader';

/* ==========================================================================
   Table Body (tbody)
   ========================================================================== */

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <tbody
        ref={ref}
        className={`divide-y divide-slate-100 bg-white text-[13px] ${className}`}
        {...props}
      >
        {children}
      </tbody>
    );
  }
);

TableBody.displayName = 'TableBody';

/* ==========================================================================
   Table Row (tr)
   ========================================================================== */

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  clickable?: boolean;
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ selected = false, clickable = false, className = '', children, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={`transition-colors ${
          selected
            ? 'bg-blue-50/50 hover:bg-blue-50/80'
            : 'hover:bg-slate-50/70'
        } ${clickable ? 'cursor-pointer' : ''} ${className}`}
        {...props}
      >
        {children}
      </tr>
    );
  }
);

TableRow.displayName = 'TableRow';

/* ==========================================================================
   Table Head Cell (th)
   ========================================================================== */

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
}

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ align = 'left', className = '', children, ...props }, ref) => {
    const { density } = useTableContext();

    const densityClasses = {
      compact: 'py-2 px-3',
      standard: 'py-2.5 px-3.5',
      comfortable: 'py-3.5 px-4',
    };

    const alignClasses = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    };

    return (
      <th
        ref={ref}
        scope="col"
        className={`${densityClasses[density]} ${alignClasses[align]} font-semibold text-slate-500 text-[11px] uppercase tracking-wider select-none ${className}`}
        {...props}
      >
        {children}
      </th>
    );
  }
);

TableHead.displayName = 'TableHead';

/* ==========================================================================
   Table Cell (td)
   ========================================================================== */

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
  numeric?: boolean;
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ align, numeric = false, className = '', children, ...props }, ref) => {
    const { density } = useTableContext();

    const densityClasses = {
      compact: 'py-1.5 px-3',
      standard: 'py-2.5 px-3.5',
      comfortable: 'py-3.5 px-4',
    };

    // If numeric is true, default alignment is right and tabular-nums is enabled
    const resolvedAlign = align || (numeric ? 'right' : 'left');

    const alignClasses = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    };

    return (
      <td
        ref={ref}
        className={`${densityClasses[density]} ${alignClasses[resolvedAlign]} ${
          numeric ? 'tabular-nums' : ''
        } align-middle text-[13px] text-slate-900 ${className}`}
        {...props}
      >
        {children}
      </td>
    );
  }
);

TableCell.displayName = 'TableCell';
