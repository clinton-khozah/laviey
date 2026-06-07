import { useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import worldTopology from 'world-atlas/countries-110m.json';
import { LAVEY_USERS_BY_COUNTRY } from './adminWorldMap.data';
import './AdminWorldUserMap.css';

const MAP_WIDTH = 960;
const MAP_HEIGHT = 520;
const MAP_GEO_ZOOM = 1.38;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 3.2;

const MAP_FILL_BASE = '#b8c8f0';
const MAP_FILL_ACTIVE = '#3b59d8';

/** No hover/tooltip — avoids huge polar shapes and open-ocean artifacts */
const NON_INTERACTIVE_COUNTRIES = new Set(['Antarctica']);

interface MapTransform {
  x: number;
  y: number;
  k: number;
}

const DEFAULT_TRANSFORM: MapTransform = { x: 0, y: 0, k: 1 };

function buildMapProjection(collection: FeatureCollection) {
  const inhabited: FeatureCollection = {
    type: 'FeatureCollection',
    features: collection.features.filter(
      (country) => !NON_INTERACTIVE_COUNTRIES.has(country.properties?.name as string),
    ),
  };

  const projection = geoMercator().fitExtent(
    [
      [18, 14],
      [MAP_WIDTH - 18, MAP_HEIGHT - 14],
    ],
    inhabited,
  );

  projection.scale(projection.scale() * MAP_GEO_ZOOM);
  const [translateX, translateY] = projection.translate();
  projection.translate([translateX, translateY + 6]);

  return projection;
}

const COUNTRY_DISPLAY_NAMES: Record<string, string> = {
  'United States of America': 'United States',
  'United Kingdom': 'United Kingdom',
  'United Arab Emirates': 'UAE',
};

function mixChannel(base: number, active: number, t: number): number {
  return Math.round(base + (active - base) * t);
}

function displayCountryName(name: string): string {
  return COUNTRY_DISPLAY_NAMES[name] ?? name;
}

function fillForUsers(users: number, maxUsers: number, isHovered: boolean): string {
  if (isHovered) return MAP_FILL_ACTIVE;
  if (users <= 0) return MAP_FILL_BASE;

  const t = Math.min(1, Math.sqrt(users / maxUsers));
  const r = mixChannel(0xb8, 0x3b, t);
  const g = mixChannel(0xc8, 0x59, t);
  const b = mixChannel(0xf0, 0xd8, t);
  return `rgb(${r}, ${g}, ${b})`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function AdminWorldUserMap() {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [transform, setTransform] = useState<MapTransform>(DEFAULT_TRANSFORM);
  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const { countries, pathGenerator, maxUsers } = useMemo(() => {
    const topology = worldTopology as unknown as Topology<{ countries: GeometryCollection }>;
    const collection = feature(topology, topology.objects.countries) as FeatureCollection;
    const projection = buildMapProjection(collection);
    const generator = geoPath(projection);
    const max = Math.max(...Object.values(LAVEY_USERS_BY_COUNTRY), 1);

    return {
      countries: collection.features,
      pathGenerator: generator,
      maxUsers: max,
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const pointerX = ((event.clientX - rect.left) / rect.width) * MAP_WIDTH;
      const pointerY = ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT;
      const zoomFactor = event.deltaY < 0 ? 1.12 : 0.89;

      setTransform((current) => {
        const nextK = clamp(current.k * zoomFactor, MIN_ZOOM, MAX_ZOOM);
        const ratio = nextK / current.k;

        return {
          k: nextK,
          x: pointerX - ratio * (pointerX - current.x),
          y: pointerY - ratio * (pointerY - current.y),
        };
      });
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, []);

  const hoveredFeature = countries.find(
    (country) => (country.properties?.name as string | undefined) === hoveredCountry,
  );
  const hoveredUsers = hoveredCountry ? (LAVEY_USERS_BY_COUNTRY[hoveredCountry] ?? 0) : 0;

  const tooltipPoint = useMemo(() => {
    if (!hoveredFeature) return null;
    const point = pathGenerator.centroid(hoveredFeature as Feature);
    if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) return null;
    return point;
  }, [hoveredFeature, pathGenerator]);

  const tooltipStyle = useMemo(() => {
    if (!tooltipPoint) return null;
    const x = tooltipPoint[0] * transform.k + transform.x;
    const y = tooltipPoint[1] * transform.k + transform.y;

    return {
      left: `${(x / MAP_WIDTH) * 100}%`,
      top: `${(y / MAP_HEIGHT) * 100}%`,
    };
  }, [tooltipPoint, transform]);

  const mapPointFromClient = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * MAP_WIDTH,
      y: ((clientY - rect.top) / rect.height) * MAP_HEIGHT,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
    };
    setIsDragging(true);
    setHoveredCountry(null);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;

    const start = mapPointFromClient(dragRef.current.startX, dragRef.current.startY);
    const current = mapPointFromClient(event.clientX, event.clientY);
    if (!start || !current) return;

    setTransform((prev) => ({
      ...prev,
      x: dragRef.current!.originX + (current.x - start.x),
      y: dragRef.current!.originY + (current.y - start.y),
    }));
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const resetView = () => {
    setTransform(DEFAULT_TRANSFORM);
    setHoveredCountry(null);
  };

  return (
    <div className="admin-world-map">
      <div
        ref={viewportRef}
        className={`admin-world-map__viewport ${isDragging ? 'admin-world-map__viewport--dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <svg
          ref={svgRef}
          className="admin-world-map__svg"
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          role="img"
          aria-label="World map of Lavey user density by country"
        >
          <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
            <rect className="admin-world-map__bg" width={MAP_WIDTH} height={MAP_HEIGHT} />

            {countries.map((country) => {
              const name = country.properties?.name as string;
              if (NON_INTERACTIVE_COUNTRIES.has(name)) return null;
              const users = LAVEY_USERS_BY_COUNTRY[name] ?? 0;
              const path = pathGenerator(country as Feature) ?? '';
              const isHovered = hoveredCountry === name;

              return (
                <path
                  key={name}
                  className={`admin-world-map__country ${isHovered ? 'admin-world-map__country--active' : ''}`}
                  d={path}
                  fill={fillForUsers(users, maxUsers, isHovered)}
                  stroke="#ffffff"
                  strokeWidth={0.65 / transform.k}
                  onMouseEnter={() => {
                    if (!isDragging) setHoveredCountry(name);
                  }}
                  onMouseLeave={() => setHoveredCountry(null)}
                  onFocus={() => setHoveredCountry(name)}
                  onBlur={() => setHoveredCountry(null)}
                />
              );
            })}
          </g>
        </svg>

        {hoveredCountry && tooltipStyle && (
          <div className="admin-world-map__tooltip" style={tooltipStyle} role="tooltip">
            <p className="admin-world-map__tooltip-country">{displayCountryName(hoveredCountry)}</p>
            {hoveredUsers > 0 ? (
              <p className="admin-world-map__tooltip-users">
                <span>{hoveredUsers.toLocaleString()}</span> active users
              </p>
            ) : (
              <p className="admin-world-map__tooltip-users admin-world-map__tooltip-users--muted">No active users</p>
            )}
          </div>
        )}
      </div>

      <div className="admin-world-map__controls">
        <span>Drag to pan · Scroll to zoom</span>
        <button type="button" onClick={resetView}>
          Reset view
        </button>
      </div>
    </div>
  );
}
