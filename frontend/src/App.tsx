import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar.js';
import { DiscoverPage } from './pages/DiscoverPage.js';
import { FeedPage } from './pages/FeedPage.js';
import { MyListPage } from './pages/MyListPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { AuthPage } from './pages/AuthPage.js';
import { useAuthStore } from './store/authStore.js';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#020806] text-slate-100 flex flex-col font-sans">
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/*"
            element={
              <>
                <Navbar />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<DiscoverPage />} />
                    <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
                    <Route path="/my-list" element={<ProtectedRoute><MyListPage /></ProtectedRoute>} />
                    <Route path="/profile/:username" element={<ProfilePage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
};
