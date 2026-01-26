import Link from 'next/link';
import { getCurrentUser } from '@/lib/actions/user';
import {
  getUserRestaurants,
  getMultipleRestaurantsAvailability,
} from '@/lib/actions/restaurants';
import { UtensilsCrossed, Calendar, Bell, Plus } from 'lucide-react';
import TrackedRestaurantsGrid from '@/components/dashboard/TrackedRestaurantsGrid';

/**
 * Main Dashboard Page
 * Shows welcome message, stats, and tracked restaurants
 */
export default async function DashboardPage() {
  // Parallelize independent fetches (async-parallel)
  const [{ email }, { data: userRestaurants }] = await Promise.all([
    getCurrentUser(),
    getUserRestaurants(),
  ]);

  // Get availability for tracked restaurants (depends on userRestaurants)
  const restaurantIds = userRestaurants?.map((ur) => ur.restaurant_id) || [];
  const { data: availability } =
    await getMultipleRestaurantsAvailability(restaurantIds);

  // Calculate stats
  const trackedCount = userRestaurants?.length || 0;
  const upcomingAvailability = availability
    ? Object.values(availability).reduce((sum, snapshots) => {
        return (
          sum +
          snapshots.filter((s) => s.time_slots && s.time_slots.length > 0).length
        );
      }, 0)
    : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back!</h1>
        <p className="mt-1 text-gray-600">
          {email && `Signed in as ${email}`}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Tracked Restaurants"
          value={trackedCount}
          icon={<UtensilsCrossed className="w-6 h-6 text-orange-600" />}
          description="Restaurants you're monitoring"
        />
        <StatCard
          title="Upcoming Availability"
          value={upcomingAvailability}
          icon={<Calendar className="w-6 h-6 text-green-600" />}
          description="Days with open slots"
        />
        <StatCard
          title="Active Notifications"
          value={trackedCount}
          icon={<Bell className="w-6 h-6 text-blue-600" />}
          description="Notification subscriptions"
        />
      </div>

      {/* Tracked Restaurants Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Your Tracked Restaurants
          </h2>
          <Link
            href="/restaurants"
            className="inline-flex items-center space-x-2 text-orange-600 hover:text-orange-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add more</span>
          </Link>
        </div>

        {trackedCount === 0 ? (
          <EmptyState />
        ) : (
          <TrackedRestaurantsGrid
            userRestaurants={userRestaurants || []}
            availability={availability || {}}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">{icon}</div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
        <UtensilsCrossed className="w-8 h-8 text-orange-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No restaurants tracked yet
      </h3>
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">
        Start tracking your favorite SF restaurants to get notified when tables
        become available.
      </p>
      <Link
        href="/restaurants"
        className="inline-flex items-center space-x-2 bg-orange-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-orange-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>Browse Restaurants</span>
      </Link>
    </div>
  );
}
