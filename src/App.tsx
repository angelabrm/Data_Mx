import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'login' | 'dashboard' | 'admin'>('login');

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setView(parsedUser.isAdmin ? 'admin' : 'dashboard');
    }
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setView(userData.isAdmin ? 'admin' : 'dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setView('login');
  };

  if (view === 'login') return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <nav className="border-b border-white/10 bg-[#0b1020]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight text-white">
              DASHBOARD <span className="text-blue-500">PRO</span>
            </h1>
            {user?.isAdmin && (
              <div className="flex gap-2 ml-8">
                <button
                  onClick={() => setView('dashboard')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    view === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setView('admin')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    view === 'admin' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Admin
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.vistaDash}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {view === 'dashboard' ? <Dashboard user={user} /> : <AdminPanel />}
      </main>
    </div>
  );
}
