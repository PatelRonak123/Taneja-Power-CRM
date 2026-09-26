import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size'> {
  /** The controlled search value from parent state */
  value?: string;
  /** Callback fired with debounced query value, or immediately on clear / enter */
  onChange: (value: string) => void;
  /** Debounce delay in milliseconds (default: 350ms) */
  debounceDelay?: number;
  /** Optional callback to reset pagination to page 1 whenever search query changes */
  onResetPage?: () => void;
  /** Input size: 'sm' (h-8), 'md' (h-9, default), 'lg' (h-10) */
  inputSize?: 'sm' | 'md' | 'lg';
  /** Show loading spinner instead of search icon or alongside clear button */
  isLoading?: boolean;
  /** Optional callback fired immediately when Enter is pressed or input is cleared */
  onImmediateSearch?: (value: string) => void;
  /** Optional container/wrapper classes */
  wrapperClassName?: string;
  /** Optional input field classes */
  inputClassName?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      debounceDelay = 350,
      onResetPage,
      inputSize = 'md',
      isLoading = false,
      onImmediateSearch,
      placeholder = 'Search...',
      wrapperClassName = '',
      inputClassName = '',
      disabled,
      ...restProps
    },
    ref
  ) => {
    const [localValue, setLocalValue] = useState<string>(value ?? '');
    const lastEmittedValueRef = useRef<string>(value ?? '');
    const inputRef = useRef<HTMLInputElement | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Sync external value changes (e.g. parent clicked Reset Filters)
    useEffect(() => {
      const incoming = value ?? '';
      if (incoming !== lastEmittedValueRef.current) {
        setLocalValue(incoming);
        lastEmittedValueRef.current = incoming;
      }
    }, [value]);

    // Handle debounced search when local value changes
    useEffect(() => {
      // If local matches what was already emitted, do nothing
      if (localValue === lastEmittedValueRef.current) {
        return;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        lastEmittedValueRef.current = localValue;
        onChange(localValue);
        onResetPage?.();
      }, debounceDelay);

      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, [localValue, debounceDelay, onChange, onResetPage]);

    const handleClear = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setLocalValue('');
      lastEmittedValueRef.current = '';
      onChange('');
      onResetPage?.();
      onImmediateSearch?.('');
      inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        if (localValue !== lastEmittedValueRef.current) {
          lastEmittedValueRef.current = localValue;
          onChange(localValue);
          onResetPage?.();
        }
        onImmediateSearch?.(localValue);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      }
      restProps.onKeyDown?.(e);
    };

    const sizeStyles = {
      sm: {
        container: 'h-8 text-xs',
        padding: 'pl-8 pr-7',
        iconLeft: 'left-2.5',
        iconRight: 'right-2',
        iconSize: 13,
      },
      md: {
        container: 'h-9 text-[13px]',
        padding: 'pl-9 pr-8',
        iconLeft: 'left-3',
        iconRight: 'right-2.5',
        iconSize: 15,
      },
      lg: {
        container: 'h-10 text-sm',
        padding: 'pl-10 pr-9',
        iconLeft: 'left-3.5',
        iconRight: 'right-3',
        iconSize: 17,
      },
    }[inputSize];

    return (
      <div className={`relative flex items-center w-full min-w-0 ${wrapperClassName}`}>
        {/* Search Icon */}
        <span
          className={`absolute ${sizeStyles.iconLeft} top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center justify-center`}
        >
          {isLoading ? (
            <Loader2 size={sizeStyles.iconSize} className="animate-spin text-blue-600" />
          ) : (
            <Search size={sizeStyles.iconSize} />
          )}
        </span>

        {/* Input Field */}
        <input
          ref={(node) => {
            inputRef.current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
            }
          }}
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full bg-white border border-border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all disabled:opacity-50 disabled:bg-slate-100 ${
            sizeStyles.container
          } ${sizeStyles.padding} ${inputClassName}`}
          {...restProps}
        />

        {/* Clear Button */}
        {localValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute ${sizeStyles.iconRight} top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer transition-colors`}
            title="Clear search"
            aria-label="Clear search"
          >
            <X size={sizeStyles.iconSize} />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;
