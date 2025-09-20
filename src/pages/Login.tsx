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
      className="min-h-screen flex"
      style={{ backgroundColor: colors.background }}
    >
      {/* Left Side - Branding */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ backgroundColor: colors.primary }}
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                <Wrench className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">WorkPro3</h1>
                <p className="text-white/80">CMMS Platform</p>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              Streamline Your<br />
              Maintenance Operations
            </h2>
            <p className="text-xl text-white/80 mb-12 leading-relaxed">
              Complete maintenance management solution for modern facilities. 
              Track assets, manage work orders, and optimize your operations.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Asset Management</h3>
                <p className="text-white/80 text-sm">Complete asset lifecycle tracking</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Preventive Maintenance</h3>
                <p className="text-white/80 text-sm">Automated scheduling and tracking</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Team Collaboration</h3>
                <p className="text-white/80 text-sm">Real-time updates and notifications</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-32 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 right-10 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="lg:hidden flex items-center justify-center mb-6">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center mr-3"
                style={{ backgroundColor: colors.primary }}
              >
                <Wrench className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold" style={{ color: colors.foreground }}>WorkPro3</h1>
                <p className="text-sm" style={{ color: colors.mutedForeground }}>CMMS Platform</p>
              </div>
            </div>
            
            <h2 className="text-3xl font-bold mb-2" style={{ color: colors.foreground }}>Welcome back</h2>
            <p style={{ color: colors.mutedForeground }}>Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium mb-2"
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
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-offset-2 transition-colors"
                style={{ 
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                  focusRingColor: colors.primary
                }}
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium mb-2"
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
                  className="w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-offset-2 transition-colors"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
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
                className="border rounded-lg p-3 text-sm"
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
              className="w-full py-3 px-4 rounded-lg font-medium focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: colors.primary,
                color: 'white'
              }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
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

          <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${colors.border}` }}>
            <p className="text-xs text-center" style={{ color: colors.mutedForeground }}>
              By signing in, you agree to our{' '}
              <a href="#" className="hover:opacity-80" style={{ color: colors.primary }}>Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="hover:opacity-80" style={{ color: colors.primary }}>Privacy Policy</a>
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: colors.muted }}>
            <h4 className="text-sm font-medium mb-2" style={{ color: colors.foreground }}>Demo Credentials:</h4>
            <div className="text-xs space-y-1" style={{ color: colors.mutedForeground }}>
              <div>Admin: admin@demo.com / password</div>
              <div>Planner: planner@demo.com / password</div>
              <div>Tech: tech@demo.com / password</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}