'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { UtensilsCrossed, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type {
  UserRestaurantWithRestaurant,
  AvailabilitySnapshot,
} from '@/lib/types/database';

// Dynamic import for modal to reduce initial bundle
const RestaurantDetailModal = dynamic(
  () => import('@/components/restaurant/RestaurantDetailModal'),
  { ssr: false }
);

interface TrackedRestaurantsGridProps {
  userRestaurants: UserRestaurantWithRestaurant[];
  availability: Record<string, AvailabilitySnapshot[]>;
}

/**
 * Client component for the tracked restaurants grid on the dashboard
 * Handles modal state for clicking on restaurant cards
 */
export default function TrackedRestaurantsGrid({
  userRestaurants: initialUserRestaurants,
  availability,
}: TrackedRestaurantsGridProps) {
  const [userRestaurants, setUserRestaurants] = useState(initialUserRestaurants);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<UserRestaurantWithRestaurant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = (userRestaurant: UserRestaurantWithRestaurant) => {
    setSelectedRestaurant(userRestaurant);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRestaurant(null);
  };

  const handleUntrack = () => {
    // Remove the restaurant from the local state
    if (selectedRestaurant) {
      setUserRestaurants((prev) =>
        prev.filter((ur) => ur.id !== selectedRestaurant.id)
      );
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userRestaurants.map((ur) => (
          <RestaurantCard
            key={ur.id}
            userRestaurant={ur}
            availability={availability[ur.restaurant_id]}
            onClick={() => handleCardClick(ur)}
          />
        ))}
      </div>

      {/* Restaurant Detail Modal */}
      {selectedRestaurant && (
        <RestaurantDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          userRestaurant={selectedRestaurant}
          onUntrack={handleUntrack}
        />
      )}
    </>
  );
}

function RestaurantCard({
  userRestaurant,
  availability,
  onClick,
}: {
  userRestaurant: UserRestaurantWithRestaurant;
  availability?: AvailabilitySnapshot[];
  onClick: () => void;
}) {
  const { restaurant, party_size } = userRestaurant;

  // Get next available date
  const nextAvailable = availability?.find(
    (a) => a.time_slots && a.time_slots.length > 0
  );

  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-orange-200 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
    >
      {/* Image */}
      <div className="h-40 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
        {restaurant.image_url ? (
          <img
            src={restaurant.image_url}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <UtensilsCrossed className="w-12 h-12 text-orange-300" />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {restaurant.name}
            </h3>
            {restaurant.location && (
              <p className="text-sm text-gray-500 flex items-center mt-1 truncate">
                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                {restaurant.location}
              </p>
            )}
          </div>
          {restaurant.platform && (
            <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded ml-2 flex-shrink-0">
              {restaurant.platform}
            </span>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Party size: {party_size}</span>
            {nextAvailable ? (
              <span className="text-green-600 font-medium">
                Available {format(parseISO(nextAvailable.date), 'MMM d')}
              </span>
            ) : (
              <span className="text-gray-400">No availability</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
