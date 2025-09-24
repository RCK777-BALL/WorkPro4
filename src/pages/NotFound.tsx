import { ArrowLeft, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-md space-y-6 text-center">
        <div className="inline-flex items-center justify-center rounded-full bg-brand/10 p-4 text-brand">
          <Search className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-semibold text-fg">Page not found</h1>
        <p className="text-sm text-mutedfg">We couldn’t find the page you were looking for. It may have been moved or archived.</p>
        <div className="flex justify-center">
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-fg">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
