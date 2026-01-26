'use client';

import { useState, useTransition } from 'react';
import { Bell, Clock, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import PartySizePicker from '@/components/ui/PartySizePicker';
import DateRangePicker from '@/components/ui/DateRangePicker';
import { trackRestaurantWithSettings } from '@/lib/actions/restaurants';
import type { Restaurant } from '@/lib/types/database';
import { format, addDays } from 'date-fns';

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant;
  onTrackingComplete: (restaurantId: string, success: boolean) => void;
}

/**
 * Tracking Modal Component
 * Modal for tracking a restaurant with party size and date range settings
 */
export default function TrackingModal({
  isOpen,
  onClose,
  restaurant,
  onTrackingComplete,
}: TrackingModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state with defaults
  const [partySize, setPartySize] = useState(2);
  const [startDate, setStartDate] = useState<string | null>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string | null>(
    format(addDays(new Date(), 60), 'yyyy-MM-dd')
  );
  const [timeStart, setTimeStart] = useState<string | null>('17:00');
  const [timeEnd, setTimeEnd] = useState<string | null>('21:00');

  const handleSubmit = () => {
    setError(null);

    startTransition(async () => {
      const result = await trackRestaurantWithSettings(restaurant.id, {
        party_size: partySize,
        notify_date_start: startDate,
        notify_date_end: endDate,
        preferred_time_start: timeStart,
        preferred_time_end: timeEnd,
      });

      if (result.success) {
        onTrackingComplete(restaurant.id, true);
        onClose();
      } else {
        setError(result.error || 'Failed to track restaurant');
        onTrackingComplete(restaurant.id, false);
      }
    });
  };

  const handleClose = () => {
    if (!isPending) {
      setError(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Track Restaurant" size="md">
      <div className="space-y-6">
        {/* Restaurant Info */}
        <div className="flex items-center space-x-4 pb-4 border-b border-gray-100">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center overflow-hidden">
            {restaurant.image_url ? (
              <img
                src={restaurant.image_url}
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Bell className="w-6 h-6 text-orange-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
            {restaurant.location && (
              <p className="text-sm text-gray-500">{restaurant.location}</p>
            )}
            {restaurant.platform && (
              <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                {restaurant.platform}
              </span>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Party Size */}
        <PartySizePicker
          value={partySize}
          onChange={setPartySize}
          disabled={isPending}
        />

        {/* Date Range */}
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          disabled={isPending}
        />

        {/* Time Preferences */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Preferred Time Window
          </label>
          <p className="text-xs text-gray-500">
            Only notify me about slots within these hours
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="time"
                value={timeStart || ''}
                onChange={(e) => setTimeStart(e.target.value || null)}
                disabled={isPending}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
              />
              <span className="block text-xs text-gray-400 mt-1">From</span>
            </div>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="time"
                value={timeEnd || ''}
                onChange={(e) => setTimeEnd(e.target.value || null)}
                disabled={isPending}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
              />
              <span className="block text-xs text-gray-400 mt-1">To</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
          <button
            onClick={handleClose}
            disabled={isPending}
            className="px-4 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center space-x-2 px-6 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Tracking...</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                <span>Start Tracking</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
