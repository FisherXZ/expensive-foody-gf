'use client';

import { useMemo, useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  isBefore,
  startOfDay,
  addMonths,
  getDay,
} from 'date-fns';
import type { AvailabilitySnapshot, TimeSlot } from '@/lib/types/database';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface AvailabilityCalendarProps {
  availability: AvailabilitySnapshot[];
  partySize: number;
}

type AvailabilityStatus = 'available' | 'unavailable' | 'past';

interface DayData {
  date: Date;
  dateString: string;
  status: AvailabilityStatus;
  slots: TimeSlot[];
  matchingSlots: number;
}

// Hoisted static values (rendering-hoist-jsx)
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const STATUS_COLORS: Record<AvailabilityStatus, string> = {
  available: 'bg-green-100 text-green-700 hover:bg-green-200',
  unavailable: 'bg-gray-50 text-gray-400',
  past: 'bg-gray-50 text-gray-300',
};

/**
 * Availability Calendar Component
 * 2-month grid view showing availability status
 * Color coding: green (available), gray (unavailable/past)
 */
export default function AvailabilityCalendar({
  availability,
  partySize,
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  // Create a map of date string to availability data
  const availabilityMap = useMemo(() => {
    const map = new Map<string, AvailabilitySnapshot>();
    availability.forEach((snapshot) => {
      map.set(snapshot.date, snapshot);
    });
    return map;
  }, [availability]);

  // Generate calendar data for displayed months
  const calendarData = useMemo(() => {
    const months = [currentMonth, addMonths(currentMonth, 1)];
    const today = startOfDay(new Date());

    return months.map((month) => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const days = eachDayOfInterval({ start, end });

      // Add padding for week alignment
      const startDayOfWeek = getDay(start);
      const paddingDays = Array(startDayOfWeek).fill(null);

      const dayData: (DayData | null)[] = [
        ...paddingDays,
        ...days.map((date): DayData => {
          const dateString = format(date, 'yyyy-MM-dd');
          const snapshot = availabilityMap.get(dateString);
          const slots = snapshot?.time_slots || [];

          // Filter slots that support the party size
          const matchingSlots = slots.filter((slot) =>
            slot.party_sizes.includes(partySize)
          );

          let status: AvailabilityStatus;
          if (isBefore(date, today)) {
            status = 'past';
          } else if (matchingSlots.length === 0) {
            status = 'unavailable';
          } else {
            status = 'available';
          }

          return {
            date,
            dateString,
            status,
            slots,
            matchingSlots: matchingSlots.length,
          };
        }),
      ];

      return {
        month,
        days: dayData,
      };
    });
  }, [currentMonth, availabilityMap, partySize]);

  const handlePrevMonth = () => {
    const newMonth = addMonths(currentMonth, -1);
    // Don't go before current month
    if (!isBefore(newMonth, startOfMonth(new Date()))) {
      setCurrentMonth(newMonth);
    }
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const canGoPrev = !isBefore(
    addMonths(currentMonth, -1),
    startOfMonth(new Date())
  );

  // Click handler for day selection (rerender-functional-setstate)
  const handleDayClick = (dayData: DayData) => {
    setSelectedDay((prev) =>
      prev?.dateString === dayData.dateString ? null : dayData
    );
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center justify-center space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-200" />
          <span className="text-gray-600">Available</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
          <span className="text-gray-600">Unavailable</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          disabled={!canGoPrev}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-gray-700">
          {format(currentMonth, 'MMMM yyyy')} -{' '}
          {format(addMonths(currentMonth, 1), 'MMMM yyyy')}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {calendarData.map(({ month, days }) => (
          <div key={month.toISOString()} className="space-y-2">
            {/* Month Header */}
            <h4 className="text-sm font-semibold text-gray-700 text-center">
              {format(month, 'MMMM yyyy')}
            </h4>

            {/* Week Days Header */}
            <div className="grid grid-cols-7 gap-1">
              {WEEK_DAYS.map((day) => (
                <div
                  key={day}
                  className="text-xs font-medium text-gray-500 text-center py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((dayData, index) => {
                if (!dayData) {
                  return <div key={`empty-${index}`} className="h-8" />;
                }

                const isClickable = dayData.status === 'available';
                const isSelected = selectedDay?.dateString === dayData.dateString;

                return (
                  <button
                    key={dayData.dateString}
                    onClick={isClickable ? () => handleDayClick(dayData) : undefined}
                    disabled={!isClickable}
                    className={`w-full h-8 text-xs font-medium rounded transition-colors ${
                      STATUS_COLORS[dayData.status]
                    } ${
                      isSelected
                        ? 'ring-2 ring-orange-500'
                        : isToday(dayData.date)
                          ? 'ring-2 ring-orange-400 ring-offset-1'
                          : ''
                    } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {format(dayData.date, 'd')}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Day Detail Panel */}
      {selectedDay && (
        <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-gray-900">
                {format(selectedDay.date, 'EEEE, MMMM d')}
              </h4>
              <p className="text-sm text-gray-600">
                {selectedDay.matchingSlots} slot
                {selectedDay.matchingSlots !== 1 ? 's' : ''} available for{' '}
                {partySize} guest{partySize !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
              aria-label="Close detail panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {selectedDay.slots.length > 0 && (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {selectedDay.slots.map((slot, i) => {
                  const isAvailable = slot.party_sizes.includes(partySize);
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded ${
                        isAvailable
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isAvailable ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      {slot.time}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Available for your party size</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gray-300" />
                  <span>Not available for your party size</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* No Availability Message */}
      {availability.length === 0 && (
        <div className="text-center py-6 text-gray-500 text-sm">
          No availability data yet. Check back soon!
        </div>
      )}
    </div>
  );
}
