'use client';

import { useMemo } from 'react';
import { Users } from 'lucide-react';

interface PartySizePickerProps {
  value: number;
  onChange: (size: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

/**
 * Party Size Picker Component
 * Dropdown for selecting party size (1-20 by default)
 */
export default function PartySizePicker({
  value,
  onChange,
  min = 1,
  max = 20,
  disabled = false,
}: PartySizePickerProps) {
  // Memoize options array to avoid recreation on every render (rerender-memo)
  const options = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, i) => min + i),
    [min, max]
  );

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Party Size
      </label>
      <div className="relative">
        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none cursor-pointer"
        >
          {options.map((size) => (
            <option key={size} value={size}>
              {size} {size === 1 ? 'guest' : 'guests'}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
