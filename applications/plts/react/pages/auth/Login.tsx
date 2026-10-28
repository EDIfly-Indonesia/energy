// src/pages/auth/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { toast } from '@/hooks/useSweetAlert';
import bgImage from '@/assets/images/bg.png';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [form, setForm] = useState({
    email: 'superadmin@plts.com',
    password: 'password123',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // If already authenticated, redirect to dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(form.email, form.password);

    if (result.success) {
      toast.success('Login berhasil!');
      navigate('/dashboard');
    } else {
      setError(result.message || 'Login gagal');
      toast.error(result.message || 'Login gagal');
    }

    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-[1100px] grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side: Illustration */}
        <div className="hidden lg:flex flex-col items-center justify-center relative">
          <div className="relative w-full aspect-square max-w-[500px] flex items-center justify-center">
            <img
              src={bgImage}
              alt="Tower PLTS"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Right side: Login Card */}
        <div className="flex justify-center lg:justify-start">
          <div className="w-full max-w-[420px] bg-[#214761] border border-[#2a5573] rounded-lg shadow-2xl p-8">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-white text-3xl font-bold tracking-tighter text-center">
                  SCADA Monitoring Platform
                </span>
              </div>
              <h1 className="text-white text-2xl font-normal">Login</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                name="email"
                type="text"
                value={form.email}
                onChange={handleChange}
                placeholder="Email Address / Username"
                required
                className="bg-white text-slate-900"
              />

              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Password"
                  required
                  className="bg-white text-slate-900 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center justify-center text-slate-400 hover:text-slate-600 transition z-10"
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-right mt-1">
                <a href="#" className="text-white text-xs hover:underline">
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                loading={loading}
                className="w-full bg-[#007fb4] hover:bg-[#006e9c] mt-2 py-2"
              >
                Login
              </Button>

              {error && (
                <p className="mt-4 text-center text-xs text-red-300 bg-red-900/20 py-2 border border-red-900/50 rounded">
                  {error}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
