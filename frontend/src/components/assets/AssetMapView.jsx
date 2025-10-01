import { useMemo } from 'react';
import { MapPin } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { getStatusColor } from '@/lib/utils';

function groupByLocation(assets = []) {
  return assets.reduce((acc, asset) => {
    const locationKey = asset.location?.trim() || 'Unassigned location';
    if (!acc[locationKey]) {
      acc[locationKey] = [];
    }
    acc[locationKey].push(asset);
    return acc;
  }, {});
}

export function AssetMapView({ assets }) {
  const grouped = useMemo(() => groupByLocation(assets), [assets]);
  const entries = Object.entries(grouped);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
        No locations available to display on the map.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {entries.map(([location, items]) => (
        <div key={location} className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b bg-gray-50 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <MapPin className="h-4 w-4 text-rose-500" />
              {location}
            </div>
            <span className="text-xs text-gray-500">{items.length} assets</span>
          </div>

          <div className="relative h-56 bg-gradient-to-br from-sky-50 via-white to-emerald-50">
            <div className="absolute inset-4 rounded-2xl border border-dashed border-sky-200" />
            <ul className="relative z-10 flex h-full flex-col gap-2 overflow-y-auto px-6 py-5">
              {items.map((asset, index) => (
                <li
                  key={asset.id || asset.tag || `${location}-${index}`}
                  className="rounded-lg border border-white/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{asset.name || 'Untitled asset'}</p>
                      {asset.tag && (
                        <p className="text-xs font-mono uppercase tracking-wide text-gray-500">{asset.tag}</p>
                      )}
                    </div>
                    {asset.status && <Badge className={getStatusColor(asset.status)}>{asset.status}</Badge>}
                  </div>
                  {asset.type && (
                    <p className="mt-1 text-xs text-gray-500">Type: {asset.type}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
