'use client';

import { useState, useEffect, useTransition } from 'react';
import dynamic from 'next/dynamic';
import {
  getRestaurants,
  getUserRestaurantIds,
  toggleRestaurant,
} from '@/lib/actions/restaurants';
import { UtensilsCrossed, MapPin, Check, Plus, Loader2 } from 'lucide-react';
import type { Restaurant } from '@/lib/types/database';

// Hoisted static values (rendering-hoist-jsx)
const PLATFORM_COLORS: Record<string, string> = {
  resy: 'bg-red-100 text-red-700',
  tock: 'bg-blue-100 text-blue-700',
  opentable: 'bg-green-100 text-green-700',
};

// Dynamic import for modal to reduce initial bundle
const TrackingModal = dynamic(
  () => import('@/components/tracking/TrackingModal'),
  { ssr: false }
);

/**
 * Restaurant Selection Page
 * Grid of all restaurants with toggle to track/untrack
 */
export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [restaurantsResult, trackedResult] = await Promise.all([
          getRestaurants(),
          getUserRestaurantIds(),
        ]);

        if (restaurantsResult.error) {
          setError(restaurantsResult.error);
          return;
        }

        if (restaurantsResult.data) {
          setRestaurants(restaurantsResult.data);
        }

        if (trackedResult.data) {
          setTrackedIds(new Set(trackedResult.data));
        }
      } catch {
        setError('Failed to load restaurants');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleTrackClick = (restaurant: Restaurant) => {
    const isTracked = trackedIds.has(restaurant.id);
    if (isTracked) {
      // Direct untrack for already tracked restaurants
      handleUntrack(restaurant.id);
    } else {
      // Open modal for new tracking
      setSelectedRestaurant(restaurant);
      setIsModalOpen(true);
    }
  };

  const handleUntrack = async (restaurantId: string) => {
    // Optimistic update
    setTrackedIds((prev) => {
      const next = new Set(prev);
      next.delete(restaurantId);
      return next;
    });

    const result = await toggleRestaurant(restaurantId);

    if (!result.success) {
      // Revert on error
      setTrackedIds((prev) => {
        const next = new Set(prev);
        next.add(restaurantId);
        return next;
      });
    }
  };

  const handleTrackingComplete = (restaurantId: string, success: boolean) => {
    if (success) {
      setTrackedIds((prev) => new Set([...prev, restaurantId]));
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRestaurant(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Restaurants</h1>
        <p className="mt-1 text-gray-600">
          Browse and track SF restaurants for availability notifications
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center space-x-4 text-sm">
        <span className="text-gray-600">
          {restaurants.length} restaurants available
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-orange-600 font-medium">
          {trackedIds.size} tracked
        </span>
      </div>

      {/* Restaurant Grid */}
      {restaurants.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <UtensilsCrossed className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No restaurants yet
          </h3>
          <p className="text-gray-600">
            Restaurants will appear here once they are added to the system.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              isTracked={trackedIds.has(restaurant.id)}
              onToggle={handleTrackClick}
            />
          ))}
        </div>
      )}

      {/* Tracking Modal */}
      {selectedRestaurant && (
        <TrackingModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          restaurant={selectedRestaurant}
          onTrackingComplete={handleTrackingComplete}
        />
      )}
    </div>
  );
}

function RestaurantCard({
  restaurant,
  isTracked,
  onToggle,
}: {
  restaurant: Restaurant;
  isTracked: boolean;
  onToggle: (restaurant: Restaurant) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      onToggle(restaurant);
    });
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
        isTracked ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-100'
      }`}
    >
      {/* Image */}
      <div className="relative h-36 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
        {restaurant.image_url ? (
          <img
            src={restaurant.image_url}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <UtensilsCrossed className="w-10 h-10 text-orange-300" />
        )}

        {/* Platform Badge */}
        {restaurant.platform && (
          <span
            className={`absolute top-3 right-3 text-xs font-medium px-2 py-1 rounded ${
              PLATFORM_COLORS[restaurant.platform] || 'bg-gray-100 text-gray-600'
            }`}
          >
            {restaurant.platform}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{restaurant.name}</h3>
        {restaurant.location && (
          <p className="text-sm text-gray-500 flex items-center mt-1 truncate">
            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
            {restaurant.location}
          </p>
        )}

        {/* Track Button */}
        <button
          onClick={handleClick}
          disabled={isPending}
          className={`mt-4 w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-colors ${
            isTracked
              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } disabled:opacity-50`}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isTracked ? (
            <>
              <Check className="w-4 h-4" />
              <span>Tracking</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Track</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
