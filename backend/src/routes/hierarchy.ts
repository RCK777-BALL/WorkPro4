import { Router } from 'express';
import { authenticateToken, type AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { asyncHandler, fail, ok } from '../utils/response';

const router = Router();

router.use(authenticateToken);

function toLocationRef(entity: { id: string; name: string; code?: string | null } | null | undefined) {
  if (!entity) {
    return null;
  }

  return {
    id: entity.id,
    name: entity.name,
    code: entity.code ?? null,
  };
}

router.get(
  '/assets',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const tenantId = req.user.tenantId;

    const [sites, areas, lines, stations, assets] = await Promise.all([
      prisma.site.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
      }),
      prisma.area.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
      }),
      prisma.line.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
      }),
      prisma.station.findMany({
        where: { tenantId },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
      }),
      prisma.asset.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
        include: {
          site: true,
          area: true,
          line: true,
          station: true,
        },
      }),
    ]);

    type AssetSummary = {
      id: string;
      tenantId: string;
      code: string;
      name: string;
      status: string;
      criticality: number;
      manufacturer: string | null;
      modelNumber: string | null;
      serialNumber: string | null;
      site: ReturnType<typeof toLocationRef>;
      area: ReturnType<typeof toLocationRef>;
      line: ReturnType<typeof toLocationRef>;
      station: ReturnType<typeof toLocationRef>;
      purchaseDate: string | null;
      commissionedAt: string | null;
      warrantyExpiresAt: string | null;
      createdAt: string;
      updatedAt: string;
    };

    const siteMap = new Map<string, ReturnType<typeof buildSiteNode>>();
    const areaMap = new Map<string, ReturnType<typeof buildAreaNode>>();
    const lineMap = new Map<string, ReturnType<typeof buildLineNode>>();
    const stationMap = new Map<string, ReturnType<typeof buildStationNode>>();

    function buildSiteNode(site: typeof sites[number]) {
      return {
        id: site.id,
        tenantId: site.tenantId,
        code: site.code ?? null,
        name: site.name,
        description: site.description ?? null,
        createdAt: site.createdAt.toISOString(),
        updatedAt: site.updatedAt.toISOString(),
        areas: [] as ReturnType<typeof buildAreaNode>[],
      };
    }

    function buildAreaNode(area: typeof areas[number]) {
      return {
        id: area.id,
        tenantId: area.tenantId,
        siteId: area.siteId,
        code: area.code ?? null,
        name: area.name,
        description: area.description ?? null,
        createdAt: area.createdAt.toISOString(),
        updatedAt: area.updatedAt.toISOString(),
        lines: [] as ReturnType<typeof buildLineNode>[],
      };
    }

    function buildLineNode(line: typeof lines[number]) {
      return {
        id: line.id,
        tenantId: line.tenantId,
        areaId: line.areaId,
        code: line.code ?? null,
        name: line.name,
        description: line.description ?? null,
        createdAt: line.createdAt.toISOString(),
        updatedAt: line.updatedAt.toISOString(),
        stations: [] as ReturnType<typeof buildStationNode>[],
      };
    }

    function buildStationNode(station: typeof stations[number]) {
      return {
        id: station.id,
        tenantId: station.tenantId,
        lineId: station.lineId,
        code: station.code ?? null,
        name: station.name,
        description: station.description ?? null,
        position: station.position ?? null,
        createdAt: station.createdAt.toISOString(),
        updatedAt: station.updatedAt.toISOString(),
        assets: [] as AssetSummary[],
      };
    }

    for (const site of sites) {
      const node = buildSiteNode(site);
      siteMap.set(site.id, node);
    }

    for (const area of areas) {
      const node = buildAreaNode(area);
      areaMap.set(area.id, node);
      const siteNode = siteMap.get(area.siteId);
      if (siteNode) {
        siteNode.areas.push(node);
      }
    }

    for (const line of lines) {
      const node = buildLineNode(line);
      lineMap.set(line.id, node);
      const areaNode = areaMap.get(line.areaId);
      if (areaNode) {
        areaNode.lines.push(node);
      }
    }

    for (const station of stations) {
      const node = buildStationNode(station);
      stationMap.set(station.id, node);
      const lineNode = lineMap.get(station.lineId);
      if (lineNode) {
        lineNode.stations.push(node);
      }
    }

    const fallbackStations = new Map<string, ReturnType<typeof buildStationNode>>();

    function ensureFallbackStation(
      key: string,
      parent: ReturnType<typeof buildLineNode> | undefined,
      label: string,
    ) {
      if (!parent) {
        return null;
      }

      let node = fallbackStations.get(key);
      if (!node) {
        node = {
          id: key,
          tenantId,
          lineId: parent.id,
          code: null,
          name: label,
          description: null,
          position: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          assets: [] as AssetSummary[],
        };
        fallbackStations.set(key, node);
        parent.stations.push(node);
      }
      return node;
    }

    for (const asset of assets) {
      const stationNode = asset.stationId ? stationMap.get(asset.stationId) : undefined;
      const lineNode = asset.lineId ? lineMap.get(asset.lineId) : undefined;

      let targetStation = stationNode;

      if (!targetStation) {
        targetStation = ensureFallbackStation(
          `fallback-station-${asset.lineId ?? 'root'}`,
          lineNode,
          'Unassigned assets',
        ) ?? null;
      }

      if (!targetStation) {
        continue;
      }

      const siteNode = asset.siteId ? siteMap.get(asset.siteId) : undefined;
      const areaNode = asset.areaId ? areaMap.get(asset.areaId) : undefined;

      const summary: AssetSummary = {
        id: asset.id,
        tenantId: asset.tenantId,
        code: asset.code,
        name: asset.name,
        status: asset.status,
        criticality: asset.criticality,
        manufacturer: asset.manufacturer ?? null,
        modelNumber: asset.modelNumber ?? null,
        serialNumber: asset.serialNumber ?? null,
        site: toLocationRef(siteNode),
        area: toLocationRef(areaNode),
        line: toLocationRef(lineNode),
        station: toLocationRef(targetStation),
        purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString() : null,
        commissionedAt: asset.commissionedAt ? asset.commissionedAt.toISOString() : null,
        warrantyExpiresAt: asset.warrantyExpiresAt ? asset.warrantyExpiresAt.toISOString() : null,
        createdAt: asset.createdAt.toISOString(),
        updatedAt: asset.updatedAt.toISOString(),
      };

      targetStation.assets.push(summary);
    }

    const tree = Array.from(siteMap.values()).map((site) => ({
      ...site,
      areas: site.areas.map((area) => ({
        ...area,
        lines: area.lines.map((line) => ({
          ...line,
          stations: line.stations.map((station) => ({
            ...station,
            assets: station.assets.sort((a, b) => a.name.localeCompare(b.name)),
          })),
        })),
      })),
    }));

    return ok(res, { sites: tree });
  }),
);

export default router;
