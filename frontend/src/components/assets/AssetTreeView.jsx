import { useMemo } from 'react';
import { Building2, GitBranch } from 'lucide-react';

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

export function AssetTreeView({ assets }) {
  const grouped = useMemo(() => groupByLocation(assets), [assets]);
  const locations = Object.entries(grouped);

  if (locations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
        No assets available for the tree view.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {locations.map(([location, items]) => (
        <div key={location} className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b bg-gray-50 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Building2 className="h-4 w-4 text-gray-500" />
              {location}
            </div>
            <span className="text-xs text-gray-500">{items.length} assets</span>
          </div>

          <div className="space-y-3 px-5 py-4">
            {items.map((asset) => (
              <div
                key={asset.id || asset.tag || asset.name}
                className="relative rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3 shadow-sm"
              >
                <div className="absolute left-0 top-1/2 h-full w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-gray-200 to-transparent" />
                <div className="flex items-start gap-3">
                  <GitBranch className="mt-1 h-4 w-4 text-gray-400" />
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{asset.name || 'Untitled asset'}</p>
                      {asset.tag && (
                        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wide">
                          {asset.tag}
                        </Badge>
                      )}
                      {asset.status && (
                        <Badge className={getStatusColor(asset.status)}>{asset.status}</Badge>
                      )}
                    </div>
                    {asset.type && (
                      <p className="text-xs text-gray-500">Type: {asset.type}</p>
                    )}
                    {asset.description && (
                      <p className="text-xs text-gray-500">{asset.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
