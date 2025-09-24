import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Building2, Shield, Users, Wrench } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { colors } = useTheme();
  const { login, isLoading, error: authError } = useAuth();

  useEffect(() => {
    setError(authError ?? '');
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div 
      className="flex min-h-screen"
      style={{ backgroundColor: colors.background }}
    >
      {/* Left Side - Branding */}
      <div 
        className="relative hidden overflow-hidden lg:flex lg:w-1/2"
        style={{ backgroundColor: colors.primary }}
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 mr-4 bg-white/20 rounded-xl">
                <Wrench className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">WorkPro3</h1>
                <p className="text-white/80">CMMS Platform</p>
              </div>
            </div>
            
            <h2 className="mb-4 text-4xl font-bold leading-tight">
              Streamline Your<br />
              Maintenance Operations
            </h2>
            <p className="mb-12 text-xl leading-relaxed text-white/80">
              Complete maintenance management solution for modern facilities. 
              Track assets, manage work orders, and optimize your operations.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 mr-4 rounded-lg bg-white/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Asset Management</h3>
                <p className="text-sm text-white/80">Complete asset lifecycle tracking</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 mr-4 rounded-lg bg-white/20">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Preventive Maintenance</h3>
                <p className="text-sm text-white/80">Automated scheduling and tracking</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 mr-4 rounded-lg bg-white/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Team Collaboration</h3>
                <p className="text-sm text-white/80">Real-time updates and notifications</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute w-32 h-32 rounded-full top-20 right-20 bg-white/10 blur-xl"></div>
        <div className="absolute w-24 h-24 rounded-full bottom-20 right-32 bg-white/10 blur-xl"></div>
        <div className="absolute w-16 h-16 rounded-full top-1/2 right-10 bg-white/10 blur-xl"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center flex-1 px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center mb-6 lg:hidden">
              <div 
                className="flex items-center justify-center w-12 h-12 mr-3 rounded-xl"
                style={{ backgroundColor: colors.primary }}
              >
                <Wrench className="text-white w-7 h-7" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold" style={{ color: colors.foreground }}>WorkPro3</h1>
                <p className="text-sm" style={{ color: colors.mutedForeground }}>CMMS Platform</p>
              </div>
            </div>
            
            <h2 className="mb-2 text-3xl font-bold" style={{ color: colors.foreground }}>Welcome back</h2>
            <p style={{ color: colors.mutedForeground }}>Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="email" 
                className="block mb-2 text-sm font-medium"
                style={{ color: colors.foreground }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 transition-colors border rounded-lg focus:ring-2 focus:ring-offset-2"
                style={{ 
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground
                }}
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label 
                htmlFor="password" 
                className="block mb-2 text-sm font-medium"
                style={{ color: colors.foreground }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 transition-colors border rounded-lg focus:ring-2 focus:ring-offset-2"
                  style={{ 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground
                  }}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute transition-colors -translate-y-1/2 right-3 top-1/2 hover:opacity-70"
                  style={{ color: colors.mutedForeground }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded focus:ring-2"
                  style={{ 
                    accentColor: colors.primary,
                    borderColor: colors.border
                  }}
                />
                <span className="ml-2 text-sm" style={{ color: colors.mutedForeground }}>Remember me</span>
              </label>
              <a 
                href="#" 
                className="text-sm font-medium hover:opacity-80"
                style={{ color: colors.primary }}
              >
                Forgot password?
              </a>
            </div>

            {error && (
              <div 
                className="p-3 text-sm border rounded-lg"
                style={{ 
                  backgroundColor: `${colors.error}10`,
                  borderColor: colors.error,
                  color: colors.error
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 font-medium transition-colors rounded-lg focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: colors.primary,
                color: 'white'
              }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 mr-2 border-2 rounded-full border-white/30 border-t-white animate-spin"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p style={{ color: colors.mutedForeground }}>
              Don't have an account?{' '}
              <a href="#" className="font-medium hover:opacity-80" style={{ color: colors.primary }}>
                Contact your administrator
              </a>
            </p>
          </div>

          <div className="pt-6 mt-8" style={{ borderTop: `1px solid ${colors.border}` }}>
            <p className="text-xs text-center" style={{ color: colors.mutedForeground }}>
              By signing in, you agree to our{' '}
              <a href="#" className="hover:opacity-80" style={{ color: colors.primary }}>Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="hover:opacity-80" style={{ color: colors.primary }}>Privacy Policy</a>
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="p-4 mt-6 rounded-lg" style={{ backgroundColor: colors.muted }}>
            <h4 className="mb-2 text-sm font-medium" style={{ color: colors.foreground }}>Demo Credentials:</h4>
            <div className="space-y-1 text-xs" style={{ color: colors.mutedForeground }}>
              <div>Admin: admin@demo.com / Password123</div>
              <div>Planner: planner@demo.com / Password123</div>
              <div>Tech: tech@demo.com / Password123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}