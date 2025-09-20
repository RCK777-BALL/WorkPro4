import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export default function NotFound() {
  const { colors } = useTheme();

  return (
    <div
      className="flex flex-col items-center justify-center text-center h-full py-24 px-4"
      style={{ backgroundColor: colors.background }}
    >
      <div className="max-w-lg space-y-6">
        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: colors.mutedForeground }}>
          404 Error
        </p>
        <h1 className="text-4xl font-bold" style={{ color: colors.foreground }}>
          We can't find that page
        </h1>
        <p className="text-lg" style={{ color: colors.mutedForeground }}>
          The page you're looking for may have been moved, deleted, or might never have existed.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium shadow-sm"
            style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
          >
            Go back home
          </Link>
          <Link
            to="/documents"
            className="inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium border"
            style={{
              color: colors.foreground,
              borderColor: colors.border
            }}
          >
            View documentation
          </Link>
        </div>
      </div>
    </div>
  );
}
