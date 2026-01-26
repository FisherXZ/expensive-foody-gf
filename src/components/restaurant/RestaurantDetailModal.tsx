'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { ExternalLink, MapPin, Loader2, Settings, Calendar, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import AvailabilityCalendar from './AvailabilityCalendar';
import RestaurantNotificationSettings from './RestaurantNotificationSettings';
import { getAvailability, toggleRestaurant } from '@/lib/actions/restaurants';
import type {
  UserRestaurantWithRestaurant,
  UserRestaurant,
  AvailabilitySnapshot,
} from '@/lib/types/database';

interface RestaurantDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRestaurant: UserRestaurantWithRestaurant;
  onUntrack?: () => void;
}

type Tab = 'calendar' | 'settings';

// Hoisted static values (rendering-hoist-jsx)
const PLATFORM_COLORS: Record<string, string> = {
  resy: 'bg-red-100 text-red-700',
  tock: 'bg-blue-100 text-blue-700',
  opentable: 'bg-green-100 text-green-700',
};

// Custom hook for loading availability data
function useAvailability(restaurantId: string, isOpen: boolean) {
  const [availability, setAvailability] = useState<AvailabilitySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !restaurantId) return;
    if (loadedRef.current === restaurantId) return;

    let cancelled = false;

    getAvailability(restaurantId).then((result) => {
      if (cancelled) return;
      if (result.data) {
        setAvailability(result.data);
      }
      setLoading(false);
      loadedRef.current = restaurantId;
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, restaurantId]);

  return { availability, loading };
}

/**
 * Restaurant Detail Modal Component
 * Shows availability calendar, booking link, and notification settings
 */
export default function RestaurantDetailModal({
  isOpen,
  onClose,
  userRestaurant,
  onUntrack,
}: RestaurantDetailModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('calendar');
  const [isPending, startTransition] = useTransition();
  const [localUserRestaurant, setLocalUserRestaurant] = useState(userRestaurant);

  const { restaurant } = localUserRestaurant;

  // Handler to update local state when settings change
  const handleSettingsUpdate = (updates: Partial<UserRestaurant>) => {
    setLocalUserRestaurant(prev => ({ ...prev, ...updates }));
  };
  const { availability, loading: loadingAvailability } = useAvailability(
    restaurant.id,
    isOpen
  );

  // Generate booking URL based on platform
  const getBookingUrl = () => {
    const { platform, name } = restaurant;
    const encodedName = encodeURIComponent(name);
    // Derive slug from name: lowercase, replace spaces with hyphens
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    switch (platform) {
      case 'resy':
        return `https://resy.com/cities/san-francisco-ca/venues/${slug}?seats=${localUserRestaurant.party_size}`;
      case 'tock':
        return `https://www.exploretock.com/${slug}`;
      case 'opentable':
        return `https://www.opentable.com/s?term=${encodedName}`;
      default:
        return null;
    }
  };

  const handleUntrack = () => {
    startTransition(async () => {
      const result = await toggleRestaurant(restaurant.id);
      if (result.success && !result.isTracking) {
        onUntrack?.();
        onClose();
      }
    });
  };

  const bookingUrl = getBookingUrl();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={restaurant.name} size="lg">
      <div className="space-y-6">
        {/* Restaurant Header */}
        <div className="flex items-start space-x-4">
          <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {restaurant.image_url ? (
              <img
                src={restaurant.image_url}
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Calendar className="w-10 h-10 text-orange-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {restaurant.location && (
              <p className="text-sm text-gray-500 flex items-center mb-2">
                <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                {restaurant.location}
              </p>
            )}
            <div className="flex items-center space-x-2">
              {restaurant.platform && (
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    PLATFORM_COLORS[restaurant.platform] ||
                    'bg-gray-100 text-gray-600'
                  }`}
                >
                  {restaurant.platform}
                </span>
              )}
              <span className="text-xs text-gray-500">
                Party size: {localUserRestaurant.party_size}
              </span>
            </div>

            {/* Booking Link */}
            {bookingUrl && (
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                <span>Book on {restaurant.platform}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-6">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'calendar'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Availability</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === 'calendar' && (
            <>
              {loadingAvailability ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                </div>
              ) : (
                <AvailabilityCalendar
                  availability={availability}
                  partySize={localUserRestaurant.party_size}
                />
              )}
            </>
          )}

          {activeTab === 'settings' && (
            <RestaurantNotificationSettings
              userRestaurant={localUserRestaurant}
              onUpdate={handleSettingsUpdate}
            />
          )}
        </div>

        {/* Untrack Button */}
        <div className="pt-4 border-t border-gray-100">
          <button
            onClick={handleUntrack}
            disabled={isPending}
            className="flex items-center justify-center space-x-2 w-full py-2.5 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Removing...</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                <span>Stop Tracking</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
