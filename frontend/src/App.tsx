import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { ParentDashboard } from './pages/ParentDashboard';
import { DriverApp } from './pages/DriverApp';
import { SchoolDashboard } from './pages/SchoolDashboard';
import { RtoDashboard } from './pages/RtoDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LogOut, User, Car, School, BarChart3 } from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getActiveTab = () => {
    if (location.pathname.startsWith('/parent')) return 'parent';
    if (location.pathname.startsWith('/driver')) return 'driver';
    if (location.pathname.startsWith('/school')) return 'school';
    if (location.pathname.startsWith('/rto')) return 'rto';
    return '';
  };

  const activeTab = getActiveTab();

  const getNavItems = () => {
    if (!user) return [];
    switch (user.role) {
      case 'parent':
        return [{ path: '/parent', label: 'My Dashboard', icon: User }];
      case 'driver':
        return [{ path: '/driver', label: 'Trip Console', icon: Car }];
      case 'school':
        return [{ path: '/school', label: 'School Dashboard', icon: School }];
      case 'rto':
        return [{ path: '/rto', label: 'RTO Dashboard', icon: BarChart3 }];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      {/* Sidebar - compact */}
      <aside className="w-56 bg-slate-900 text-slate-100 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-slate-900 font-bold text-xs shrink-0">
              SB
            </div>
            <div className="leading-tight">
              <strong className="text-xs font-extrabold block text-white">Safe School Bus</strong>
              <small className="text-[9px] text-teal-400 block uppercase font-bold">Kashmir Pilot</small>
            </div>
          </div>
        </div>

        {user && (
          <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 leading-tight">
              <span className="text-[11px] font-bold text-slate-200 block truncate">{user.name}</span>
              <span className="text-[9px] text-slate-400 uppercase tracking-wide block font-semibold">{user.role}</span>
            </div>
          </div>
        )}

        <nav className="p-3 flex-1 space-y-1">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block px-2.5 mb-1.5">Menu</span>
          
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-bold transition-all ${
                activeTab === item.path.split('/')[1] ? 'bg-teal-500 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={14} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-800 text-[10px] text-slate-400 leading-tight">
            <span className="font-bold text-slate-300 block text-[10px]">Safe School Bus Kashmir</span>
            <span className="text-[9px]">Real-time transport safety</span>
          </div>
          
          <button onClick={handleLogout}
            className="w-full mt-3 flex items-center justify-center gap-1.5 border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold py-1.5 rounded-lg text-[10px] transition-all cursor-pointer">
            <LogOut size={12} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-5 shrink-0">
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Safe School Bus Kashmir</span>
            <h1 className="text-sm font-extrabold text-slate-800 tracking-tight">
              {activeTab === 'parent' && "Parent Dashboard"}
              {activeTab === 'driver' && 'Driver Trip Console'}
              {activeTab === 'school' && 'School Dashboard'}
              {activeTab === 'rto' && 'RTO Dashboard'}
            </h1>
          </div>
          <div className="text-[10px] bg-teal-50 text-teal-700 font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-teal-100">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping"></span>
            Live
          </div>
        </header>

        <main className="p-5 overflow-y-auto flex-1 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/parent" element={
          <ProtectedRoute allowedRoles={['parent']}>
            <Layout><ParentDashboard /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/driver" element={
          <ProtectedRoute allowedRoles={['driver']}>
            <Layout><DriverApp /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/school" element={
          <ProtectedRoute allowedRoles={['school']}>
            <Layout><SchoolDashboard /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/rto" element={
          <ProtectedRoute allowedRoles={['rto']}>
            <Layout><RtoDashboard /></Layout>
          </ProtectedRoute>
        } />

        <Route path="*" element={
          localStorage.getItem('token') ? <Navigate to="/parent" replace /> : <Navigate to="/login" replace />
        } />
      </Routes>
    </Router>
  );
};