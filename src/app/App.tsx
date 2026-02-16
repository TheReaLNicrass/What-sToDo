import { RouterProvider } from 'react-router';
import { AppProvider } from './contexts/AppContext';
import { router } from './routes';
import { RoleSelector } from './components/RoleSelector';
import { Sidebar } from './components/Sidebar';
import { useApp } from './contexts/AppContext';
import { RotateCcw, Menu, X } from 'lucide-react';
import { useState } from 'react';

const AppContent = () => {
  const { resetData } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleReset = () => {
    if (confirm('Möchten Sie alle Daten auf die Beispieldaten zurücksetzen?')) {
      resetData();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-blue-500 rounded-md transition-colors"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <h1 className="text-2xl font-bold">Todo-Kartenverwaltung</h1>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-md transition-colors"
              title="Daten zurücksetzen"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
          <RoleSelector />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:relative z-40 h-full transition-transform duration-300`}
        >
          <Sidebar />
        </div>

        {/* Overlay für Mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Page Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <RouterProvider router={router} />
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
