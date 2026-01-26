'use client';

import { useState, useTransition } from 'react';
import { Bell, BellOff, Loader2, Check } from 'lucide-react';
import PartySizePicker from '@/components/ui/PartySizePicker';
import DateRangePicker from '@/components/ui/DateRangePicker';
import { updateUserRestaurant } from '@/lib/actions/restaurants';
import type { UserRestaurant } from '@/lib/types/database';

interface RestaurantNotificationSettingsProps {
  userRestaurant: UserRestaurant;
  onUpdate?: () => void;
}

/**
 * Restaurant Notification Settings Component
 * Form for editing per-restaurant notification settings
 */
export default function RestaurantNotificationSettings({
  userRestaurant,
  onUpdate,
}: RestaurantNotificationSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [partySize, setPartySize] = useState(userRestaurant.party_size);
  const [notifyEnabled, setNotifyEnabled] = useState(
    userRestaurant.notify_new_releases
  );
  const [startDate, setStartDate] = useState<string | null>(
    userRestaurant.notify_date_start
  );
  const [endDate, setEndDate] = useState<string | null>(
    userRestaurant.notify_date_end
  );
  const [timeStart, setTimeStart] = useState<string | null>(
    userRestaurant.preferred_time_start
  );
  const [timeEnd, setTimeEnd] = useState<string | null>(
    userRestaurant.preferred_time_end
  );

  const handleSave = () => {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateUserRestaurant(userRestaurant.id, {
        party_size: partySize,
        notify_new_releases: notifyEnabled,
        notify_date_start: startDate,
        notify_date_end: endDate,
        preferred_time_start: timeStart,
        preferred_time_end: timeEnd,
      });

      if (result.success) {
        setSuccess(true);
        onUpdate?.();
        // Clear success message after 2 seconds
        setTimeout(() => setSuccess(false), 2000);
      } else {
        setError(result.error || 'Failed to save settings');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Notification Toggle */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          {notifyEnabled ? (
            <div className="p-2 bg-orange-100 rounded-lg">
              <Bell className="w-5 h-5 text-orange-600" />
            </div>
          ) : (
            <div className="p-2 bg-gray-100 rounded-lg">
              <BellOff className="w-5 h-5 text-gray-400" />
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">Notifications</p>
            <p className="text-sm text-gray-500">
              {notifyEnabled
                ? 'You will be notified of new availability'
                : 'Notifications are paused'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setNotifyEnabled(!notifyEnabled)}
          disabled={isPending}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            notifyEnabled ? 'bg-orange-600' : 'bg-gray-200'
          } disabled:opacity-50`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              notifyEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>Settings saved successfully</span>
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
          <div>
            <input
              type="time"
              value={timeStart || ''}
              onChange={(e) => setTimeStart(e.target.value || null)}
              disabled={isPending}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
            />
            <span className="block text-xs text-gray-400 mt-1">From</span>
          </div>
          <div>
            <input
              type="time"
              value={timeEnd || ''}
              onChange={(e) => setTimeEnd(e.target.value || null)}
              disabled={isPending}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
            />
            <span className="block text-xs text-gray-400 mt-1">To</span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="w-full flex items-center justify-center space-x-2 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Settings</span>
          )}
        </button>
      </div>
    </div>
  );
}
