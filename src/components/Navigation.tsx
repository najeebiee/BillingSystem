import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export function Navigation() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const isBillsRoute = location.pathname.startsWith('/bills');
  const isEventFormsRoute =
    location.pathname.startsWith('/event-forms') ||
    location.pathname.startsWith('/forms');
  const isSalesDashboardRoute = location.pathname.startsWith('/sales-dashboard');

  return (
    <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 print:hidden">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: App Name & Navigation */}
        <div className="flex items-center gap-8">
          <div className="text-xl font-semibold text-gray-900">AccuCount</div>
          <div className="flex items-center gap-2">
            <Link
              to="/bills"
              className={`px-4 py-2 rounded-md transition-colors ${
                isBillsRoute
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Bills
            </Link>
            <Link
              to="/event-forms"
              className={`px-4 py-2 rounded-md transition-colors ${
                isEventFormsRoute
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Event Forms
            </Link>
            <Link
              to="/sales-dashboard"
              className={`px-4 py-2 rounded-md transition-colors ${
                isSalesDashboardRoute
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Sales Dashboard
            </Link>
          </div>
        </div>

        {/* Right: User Menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 hover:bg-gray-50 rounded-md px-3 py-2 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              KE
            </div>
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
                {user?.email && (
                  <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                    {user.email}
                  </div>
                )}
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setDropdownOpen(false)}
                >
                  Profile
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setDropdownOpen(false);
                    signOut().then(() => navigate('/login'));
                  }}
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
