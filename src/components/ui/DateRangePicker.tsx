'use client';

import { Calendar } from 'lucide-react';
import { format, parseISO, isValid, isBefore, startOfDay, addDays } from 'date-fns';

interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
  disabled?: boolean;
  minDate?: string;
}

/**
 * Date Range Picker Component
 * Two date inputs for start/end date selection with validation
 */
export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled = false,
  minDate,
}: DateRangePickerProps) {
  // Default min date is today
  const effectiveMinDate = minDate || format(startOfDay(new Date()), 'yyyy-MM-dd');

  // Default start date for new selections is today
  const defaultStart = effectiveMinDate;
  // Default end date is 2 months from today
  const defaultEnd = format(addDays(new Date(), 60), 'yyyy-MM-dd');

  const handleStartChange = (value: string) => {
    if (!value) {
      onStartDateChange(null);
      return;
    }

    const date = parseISO(value);
    if (!isValid(date)) return;

    onStartDateChange(value);

    // If end date is before new start date, update end date
    if (endDate && isBefore(parseISO(endDate), date)) {
      onEndDateChange(value);
    }
  };

  const handleEndChange = (value: string) => {
    if (!value) {
      onEndDateChange(null);
      return;
    }

    const date = parseISO(value);
    if (!isValid(date)) return;

    // Don't allow end date before start date
    if (startDate && isBefore(date, parseISO(startDate))) {
      return;
    }

    onEndDateChange(value);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Date Range
      </label>
      <p className="text-xs text-gray-500">
        Only notify me about availability within these dates
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Start Date */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={startDate || ''}
            onChange={(e) => handleStartChange(e.target.value)}
            min={effectiveMinDate}
            disabled={disabled}
            placeholder={defaultStart}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          />
          <span className="block text-xs text-gray-400 mt-1">From</span>
        </div>

        {/* End Date */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={endDate || ''}
            onChange={(e) => handleEndChange(e.target.value)}
            min={startDate || effectiveMinDate}
            disabled={disabled}
            placeholder={defaultEnd}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          />
          <span className="block text-xs text-gray-400 mt-1">To</span>
        </div>
      </div>
    </div>
  );
}
