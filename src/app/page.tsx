import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UtensilsCrossed, Bell, Calendar, ArrowRight } from 'lucide-react';

/**
 * Landing Page
 * Public home page with CTA to sign up or login
 */
export default async function HomePage() {
  // Check if user is already logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Navigation */}
      <nav className="border-b border-orange-100 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <span className="text-2xl font-bold text-orange-600">Foody SF</span>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-orange-600 font-medium"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Never miss a table at
            <span className="text-orange-600"> SF&apos;s hottest spots</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Track restaurant availability in real-time. Get instant notifications
            when tables open up at your favorite restaurants.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="flex items-center space-x-2 bg-orange-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors text-lg"
            >
              <span>Start Tracking</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="text-gray-600 hover:text-orange-600 font-medium text-lg"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<UtensilsCrossed className="w-8 h-8 text-orange-600" />}
            title="Top SF Restaurants"
            description="Track availability at the most sought-after restaurants in San Francisco."
          />
          <FeatureCard
            icon={<Bell className="w-8 h-8 text-orange-600" />}
            title="Instant Notifications"
            description="Get notified via email or SMS the moment a table becomes available."
          />
          <FeatureCard
            icon={<Calendar className="w-8 h-8 text-orange-600" />}
            title="Real-time Updates"
            description="We check for availability around the clock so you never miss an opening."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-orange-100 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-500">
            &copy; {new Date().getFullYear()} Foody SF. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-orange-100">
      <div className="p-3 bg-orange-50 rounded-lg w-fit mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
