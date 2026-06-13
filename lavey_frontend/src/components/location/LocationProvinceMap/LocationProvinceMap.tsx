import { useMemo } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import worldTopology from 'world-atlas/countries-110m.json';
import {
  isSouthAfricaCountry,
  normalizeSouthAfricaProvince,
  SOUTH_AFRICA_PROVINCES,
} from '@/data/southAfricaProvinces.data';
import './LocationProvinceMap.css';

const MAP_WIDTH = 640;
const MAP_HEIGHT = 360;
const MAP_GEO_ZOOM = 1.12;
const FILL_BASE = '#9eb5e8';
const FILL_ACTIVE = '#3b59d8';
const FILL_COUNTRY = '#c5d4f5';

interface LocationProvinceMapProps {
  latitude: number;
  longitude: number;
  country: string;
  province: string;
  suburb?: string;
  isLoading?: boolean;
}

function buildSouthAfricaProjection(collection: FeatureCollection) {
  const projection = geoMercator().fitExtent(
    [
      [20, 14],
      [MAP_WIDTH - 20, MAP_HEIGHT - 14],
    ],
    collection,
  );
  projection.scale(projection.scale() * MAP_GEO_ZOOM);
  return projection;
}

function buildWorldProjection(collection: FeatureCollection) {
  const projection = geoMercator().fitExtent(
    [
      [28, 20],
      [MAP_WIDTH - 28, MAP_HEIGHT - 20],
    ],
    collection,
  );
  projection.scale(projection.scale() * MAP_GEO_ZOOM);
  return projection;
}

export function LocationProvinceMap({
  latitude,
  longitude,
  country,
  province,
  suburb,
  isLoading = false,
}: LocationProvinceMapProps) {
  const isSouthAfrica = isSouthAfricaCountry(country);
  const activeProvince = normalizeSouthAfricaProvince(province);

  const { paths, marker, label } = useMemo(() => {
    const topology = worldTopology as unknown as Topology<{ countries: GeometryCollection }>;
    const world = feature(topology, topology.objects.countries) as FeatureCollection;
    const southAfricaCountry = world.features.find(
      (item) => (item.properties?.name as string | undefined) === 'South Africa',
    );

    if (isSouthAfrica) {
      const collection: FeatureCollection = {
        type: 'FeatureCollection',
        features: southAfricaCountry
          ? [southAfricaCountry, ...SOUTH_AFRICA_PROVINCES.features]
          : SOUTH_AFRICA_PROVINCES.features,
      };
      const projection = buildSouthAfricaProjection(collection);
      const pathGen = geoPath(projection);
      const markerPoint = projection([longitude, latitude]);

      const provincePaths = SOUTH_AFRICA_PROVINCES.features.map((item) => {
        const name = item.properties?.name as string;
        const isActive = name === activeProvince;
        return {
          key: name,
          d: pathGen(item as Feature) ?? '',
          isActive,
        };
      });

      const countryPath = southAfricaCountry
        ? (pathGen(southAfricaCountry as Feature) ?? '')
        : '';

      return {
        paths: { countryPath, provincePaths },
        marker: markerPoint,
        label: activeProvince || province || 'South Africa',
      };
    }

    const targetCountry =
      world.features.find((item) => {
        const name = (item.properties?.name as string | undefined) ?? '';
        return name.toLowerCase() === country.trim().toLowerCase();
      }) ?? southAfricaCountry;

    const focusCollection: FeatureCollection = {
      type: 'FeatureCollection',
      features: targetCountry ? [targetCountry] : world.features.slice(0, 12),
    };
    const projection = buildWorldProjection(focusCollection);
    const pathGen = geoPath(projection);
    const markerPoint = projection([longitude, latitude]);

    return {
      paths: {
        countryPath: targetCountry ? (pathGen(targetCountry as Feature) ?? '') : '',
        provincePaths: [] as Array<{ key: string; d: string; isActive: boolean }>,
      },
      marker: markerPoint,
      label: province || country || 'Your location',
    };
  }, [activeProvince, country, isSouthAfrica, latitude, longitude, province]);

  const markerX = marker?.[0];
  const markerY = marker?.[1];
  const hasMarker = Number.isFinite(markerX) && Number.isFinite(markerY);

  return (
    <div className={`location-province-map ${isLoading ? 'location-province-map--loading' : ''}`}>
      <div className="location-province-map__canvas">
        <svg
          className="location-province-map__svg"
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Map showing your location in ${label}`}
        >
          <rect className="location-province-map__bg" width={MAP_WIDTH} height={MAP_HEIGHT} />

          {paths.countryPath ? (
            <path className="location-province-map__country" d={paths.countryPath} fill={FILL_COUNTRY} />
          ) : null}

          {paths.provincePaths.map((item) => (
            <path
              key={item.key}
              className={`location-province-map__province ${item.isActive ? 'location-province-map__province--active' : ''}`}
              d={item.d}
              fill={item.isActive ? FILL_ACTIVE : FILL_BASE}
            />
          ))}

          {hasMarker ? (
            <g className="location-province-map__marker" transform={`translate(${markerX} ${markerY})`}>
              <circle className="location-province-map__marker-pulse" r={14} />
              <circle className="location-province-map__marker-dot" r={6} />
            </g>
          ) : null}
        </svg>

        {isLoading ? (
          <div className="location-province-map__loading" role="status">
            <span className="location-province-map__loading-spinner" aria-hidden />
            <span>Loading your map…</span>
          </div>
        ) : null}
      </div>

      <div className="location-province-map__caption">
        <strong>{label}</strong>
        {suburb ? <span>{suburb}</span> : null}
      </div>
    </div>
  );
}
