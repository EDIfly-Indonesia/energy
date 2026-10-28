// src/components/layout/DefaultLayout.tsx
import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Filter, X, LogOut } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { useAuthStore } from '@/stores/auth.store';

export const DefaultLayout: React.FC = () => {
  const location = useLocation();
  const authStore = useAuthStore();
  const user = authStore.user;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);

  const pathParts = location.pathname.split('/');
  const pageTitle = pathParts[pathParts.length - 1] || 'Dashboard';
  const formattedTitle = pageTitle.charAt(0).toUpperCase() + pageTitle.slice(1);

  const userInitials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'US';

  const userName = user?.name || 'User';
  const role = (user?.role as any) || {};
  const userRole = role?.name || role?.role_name || user?.role_name || 'User';

  const handleLogout = async () => {
    await authStore.logout();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-scada-bg">
      <AppSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div
        className={`fixed inset-0 z-20 bg-black/30 lg:hidden transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        <header className="h-16 bg-white dark:bg-scada-card flex items-center justify-between px-6 shadow-sm border-b border-gray-200 dark:border-scada-border">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-expanded={isSidebarOpen}
            >
              <Menu className="w-5 h-5 text-gray-500 dark:text-scada-muted" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-scada-text">
              {formattedTitle}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSearchDrawerOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Filter className="w-5 h-5 text-gray-500 dark:text-scada-muted" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-scada-600 flex items-center justify-center text-white text-xs font-bold">
                {userInitials}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-700 dark:text-scada-text leading-none">
                  {userName}
                </p>
                <p className="text-xs text-gray-500 dark:text-scada-muted mt-1">
                  {userRole}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {isSearchDrawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsSearchDrawerOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-scada-card shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-scada-border">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-scada-text">Filter</h2>
              <button
                onClick={() => setIsSearchDrawerOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-scada-muted" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto h-[calc(100%-4rem)]">
              {/* Filter content will be rendered via Outlet */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};