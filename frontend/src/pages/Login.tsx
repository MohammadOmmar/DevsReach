import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Shield, User, Car, School, UserCheck } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'verify';

export const Login: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'parent' | 'driver' | 'school' | 'rto'>('parent');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const navigate = useNavigate();

  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/auth/request-verification', { email, name, role, password });
      setPendingId(res.data.pendingId);
      setSuccess('Verification code sent! Check server console for demo code.');
      setMode('verify');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/verify-email', { pendingId, code: verificationCode });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate(`/${user.role}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate(`/${user.role}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'parent', label: 'Parent', icon: User },
    { value: 'driver', label: 'Driver', icon: Car },
    { value: 'school', label: 'School', icon: School },
    { value: 'rto', label: 'RTO Admin', icon: UserCheck },
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center text-white mb-3 shadow-md">
            <Shield size={28} />
          </div>
          <span className="text-xs font-bold text-teal-600 tracking-wider uppercase">Safe School Bus Kashmir</span>
          <h2 className="text-2xl font-extrabold text-slate-800 mt-1">
            {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Verify Email'}
          </h2>
          <p className="text-sm text-slate-500 text-center mt-2">
            {mode === 'login' ? 'Enter your credentials to access the portal.' : mode === 'register' ? 'Register with your email and role.' : 'Enter the verification code sent to your email.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-3 text-xs font-medium mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-teal-50 text-teal-700 border border-teal-200 rounded-lg p-3 text-xs font-medium mb-4">
            {success}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-teal-500"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-teal-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-lg text-sm transition-all shadow-md disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => { setMode('register'); setError(''); setSuccess(''); }} className="text-xs text-teal-600 font-semibold hover:underline">
                Create new account
              </button>
            </div>
          </form>
        )}

        {/* Demo Login Section */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="bg-gradient-to-br from-teal-50 to-blue-50 border border-teal-200 rounded-lg p-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield size={14} className="text-teal-600" />
              Demo Accounts
            </h3>
            <p className="text-[10px] text-slate-600 mb-3">Click below to login with demo credentials:</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => { setEmail('parent@demo.com'); setPassword('demo123'); setRole('parent'); }}
                className="w-full bg-white hover:bg-teal-50 border-2 border-teal-200 hover:border-teal-400 text-slate-700 hover:text-teal-700 font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center gap-2"
              >
                <User size={14} />
                <div className="text-left flex-1">
                  <div className="font-bold">Parent Demo</div>
                  <div className="text-[9px] text-slate-500">M Omar - View child's bus</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('school@demo.com'); setPassword('demo123'); setRole('school'); }}
                className="w-full bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-400 text-slate-700 hover:text-blue-700 font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center gap-2"
              >
                <School size={14} />
                <div className="text-left flex-1">
                  <div className="font-bold">School Admin Demo</div>
                  <div className="text-[9px] text-slate-500">M Omar - Manage fleet</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('driver@demo.com'); setPassword('demo123'); setRole('driver'); }}
                className="w-full bg-white hover:bg-orange-50 border-2 border-orange-200 hover:border-orange-400 text-slate-700 hover:text-orange-700 font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center gap-2"
              >
                <Car size={14} />
                <div className="text-left flex-1">
                  <div className="font-bold">Driver Demo</div>
                  <div className="text-[9px] text-slate-500">M Omar - Trip console</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('rto@demo.com'); setPassword('demo123'); setRole('rto'); }}
                className="w-full bg-white hover:bg-purple-50 border-2 border-purple-200 hover:border-purple-400 text-slate-700 hover:text-purple-700 font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center gap-2"
              >
                <UserCheck size={14} />
                <div className="text-left flex-1">
                  <div className="font-bold">RTO Admin Demo</div>
                  <div className="text-[9px] text-slate-500">M Omar - Fleet oversight</div>
                </div>
              </button>
            </div>
            <div className="mt-3 pt-2 border-t border-teal-200">
              <p className="text-[9px] text-slate-500 text-center">
                <strong>Demo Credentials (Password same for all):</strong><br />
                Parent: parent@demo.com<br />
                School: school@demo.com<br />
                Driver: driver@demo.com<br />
                RTO: rto@demo.com<br />
                Password: demo123
              </p>
            </div>
          </div>
        </div>

        {mode === 'register' && (
          <form onSubmit={handleRequestVerification} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-teal-500"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-teal-500"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value as any)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                      role === opt.value ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <opt.icon size={14} className="inline mr-1" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-teal-500"
                placeholder="Min 6 characters"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-teal-500"
                placeholder="Repeat password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-lg text-sm transition-all shadow-md disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="text-xs text-slate-500 font-semibold hover:underline">
                Already have an account? Sign in
              </button>
            </div>
          </form>
        )}

        {mode === 'verify' && (
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Verification Code</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                maxLength={6}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-teal-500 text-center tracking-widest"
                placeholder="000000"
              />
              <p className="text-[10px] text-slate-400 mt-1">Check the server console for your demo code.</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-lg text-sm transition-all shadow-md disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};