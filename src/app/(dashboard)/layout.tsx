import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { signOut } from '@/lib/actions/user';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react';

/**
 * Dashboard Layout
 * Navigation header with user info and responsive design
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Nav Links */}
            <div className="flex items-center">
              {/* Logo */}
              <Link href="/dashboard" className="flex-shrink-0 flex items-center">
                <span className="text-2xl font-bold text-orange-600">
                  Foody SF
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                <NavLink href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />}>
                  Dashboard
                </NavLink>
                <NavLink href="/restaurants" icon={<UtensilsCrossed className="w-4 h-4" />}>
                  Restaurants
                </NavLink>
                <NavLink href="/settings" icon={<Settings className="w-4 h-4" />}>
                  Settings
                </NavLink>
              </div>
            </div>

            {/* User Info and Logout */}
            <div className="flex items-center space-x-4">
              <span className="hidden sm:block text-sm text-gray-600">
                {user.email}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </form>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <MobileMenu />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center space-x-2 px-1 pt-1 text-sm font-medium text-gray-600 hover:text-orange-600 border-b-2 border-transparent hover:border-orange-600 transition-colors"
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}

function MobileMenu() {
  return (
    <div className="relative group">
      <button className="p-2 rounded-lg text-gray-600 hover:bg-gray-100">
        <Menu className="w-5 h-5" />
      </button>
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
        <div className="py-2">
          <Link
            href="/dashboard"
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/restaurants"
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Restaurants</span>
          </Link>
          <Link
            href="/settings"
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
