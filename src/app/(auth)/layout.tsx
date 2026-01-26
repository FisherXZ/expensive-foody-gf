/**
 * Auth Layout
 * Simple centered layout for authentication pages
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-orange-600">Foody SF</h1>
          <p className="mt-2 text-gray-600">
            Track SF restaurant reservations
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
