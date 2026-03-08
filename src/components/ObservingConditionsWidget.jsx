import React, { useEffect, useMemo, useState } from "react";
import * as Astronomy from "astronomy-engine";
import {
  Clock3,
  MapPin,
  RefreshCw,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  Eye,
  Cloud,
  MoonStar,
  Sunrise,
  Sunset,
  Star,
  Compass,
  Orbit,
} from "lucide-react";

const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

const PLANETS = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];
const DEG = Math.PI / 180;

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Math.round(value)}%`;
}

function formatDistanceKm(valueMeters) {
  if (valueMeters === null || valueMeters === undefined || Number.isNaN(valueMeters)) return "—";
  return `${(valueMeters / 1000).toFixed(1)} km`;
}

function formatDurationHours(seconds) {
  if (!seconds && seconds !== 0) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatTemp(value, units = "°F") {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Math.round(value)}${units}`;
}

function formatTime(value, timezone) {
  if (!value) return "—";
  const date = toDateTime(value);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

function formatTimeWithZone(value, timezone) {
  if (!value) return "—";
  const date = toDateTime(value);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(date);
}

function formatDateTime(value, timezone) {
  if (!value) return "—";
  const date = toDateTime(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

function cardinalDirection(deg) {
  if (deg === null || deg === undefined || Number.isNaN(deg)) return "—";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function moonPhaseName(phaseAngle) {
  const angle = ((phaseAngle % 360) + 360) % 360;
  if (angle < 22.5) return "New Moon";
  if (angle < 67.5) return "Waxing Crescent";
  if (angle < 112.5) return "First Quarter";
  if (angle < 157.5) return "Waxing Gibbous";
  if (angle < 202.5) return "Full Moon";
  if (angle < 247.5) return "Waning Gibbous";
  if (angle < 292.5) return "Last Quarter";
  if (angle < 337.5) return "Waning Crescent";
  return "New Moon";
}

function moonIlluminationPercent(phaseAngle) {
  return ((1 - Math.cos(phaseAngle * DEG)) / 2) * 100;
}

function phaseIcon(phaseAngle) {
  const angle = ((phaseAngle % 360) + 360) % 360;
  if (angle < 22.5 || angle >= 337.5) return "●";
  if (angle < 67.5) return "◔";
  if (angle < 112.5) return "◑";
  if (angle < 157.5) return "◕";
  if (angle < 202.5) return "○";
  if (angle < 247.5) return "◕";
  if (angle < 292.5) return "◑";
  return "◔";
}

function getWeatherCodeLabel(code) {
  const labels = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Severe hailstorm",
  };
  return labels[code] || "Conditions unavailable";
}

function getQualityLabel(score) {
  if (score >= 82) return "Excellent";
  if (score >= 68) return "Good";
  if (score >= 52) return "Fair";
  if (score >= 36) return "Poor";
  return "Very Poor";
}

function getRiskLabel(value) {
  if (value >= 70) return "High";
  if (value >= 40) return "Moderate";
  return "Low";
}

function toDateTime(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value * 1000);
  return new Date(value);
}

function roundCoord(value) {
  return typeof value === "number" ? Number(value.toFixed(3)) : null;
}

function getHorizontal(body, date, observer) {
  const eq = Astronomy.Equator(body, date, observer, true, true);
  return Astronomy.Horizon(date, observer, eq.ra, eq.dec, "normal");
}

function interpolateCrossing(body, observer, startDate, endDate, targetAltitude, rising) {
  let left = startDate.getTime();
  let right = endDate.getTime();
  for (let i = 0; i < 18; i += 1) {
    const mid = (left + right) / 2;
    const midAlt = getHorizontal(body, new Date(mid), observer).altitude - targetAltitude;
    const leftAlt = getHorizontal(body, new Date(left), observer).altitude - targetAltitude;
    if ((leftAlt <= 0 && midAlt >= 0) || (leftAlt >= 0 && midAlt <= 0)) {
      right = mid;
    } else {
      left = mid;
    }
  }
  const date = new Date((left + right) / 2);
  const before = getHorizontal(body, new Date(date.getTime() - 5 * 60 * 1000), observer).altitude;
  const after = getHorizontal(body, new Date(date.getTime() + 5 * 60 * 1000), observer).altitude;
  const isRising = after > before;
  if (isRising !== rising) return null;
  return date;
}

function findCrossing(body, observer, startDate, endDate, targetAltitude, rising, stepMinutes = 10) {
  let cursor = new Date(startDate);
  let lastAlt = getHorizontal(body, cursor, observer).altitude - targetAltitude;
  while (cursor < endDate) {
    const next = new Date(Math.min(cursor.getTime() + stepMinutes * 60 * 1000, endDate.getTime()));
    const nextAlt = getHorizontal(body, next, observer).altitude - targetAltitude;
    const crossed = (lastAlt <= 0 && nextAlt >= 0) || (lastAlt >= 0 && nextAlt <= 0);
    if (crossed) {
      const crossing = interpolateCrossing(body, observer, cursor, next, targetAltitude, rising);
      if (crossing) return crossing;
    }
    cursor = next;
    lastAlt = nextAlt;
  }
  return null;
}

function getTonightWindow(observer, now) {
  const lookBack = new Date(now.getTime() - 18 * 60 * 60 * 1000);
  const lookAhead = new Date(now.getTime() + 36 * 60 * 60 * 1000);

  const lastDusk = findCrossing("Sun", observer, lookBack, now, -18, false, 10);
  const nextDawn = findCrossing("Sun", observer, now, lookAhead, -18, true, 10);

  if (lastDusk && nextDawn) {
    return { start: lastDusk, end: nextDawn, inNight: true };
  }

  const nextDusk = findCrossing("Sun", observer, now, lookAhead, -18, false, 10);
  const dawnAfterNextDusk = nextDusk
    ? findCrossing("Sun", observer, new Date(nextDusk.getTime() + 30 * 60 * 1000), new Date(nextDusk.getTime() + 18 * 60 * 60 * 1000), -18, true, 10)
    : null;

  return { start: nextDusk, end: dawnAfterNextDusk, inNight: false };
}

function getPlanetVisibility(body, observer, start, end) {
  if (!start || !end || end <= start) {
    return { body, visible: false, maxAltitude: -90, bestTime: null, direction: null, hoursVisible: 0, currentlyUp: false };
  }

  let maxAltitude = -90;
  let bestTime = null;
  let direction = null;
  let visibleSamples = 0;
  let totalSamples = 0;

  for (let t = start.getTime(); t <= end.getTime(); t += 20 * 60 * 1000) {
    totalSamples += 1;
    const current = new Date(t);
    const hor = getHorizontal(body, current, observer);
    if (hor.altitude > 10) visibleSamples += 1;
    if (hor.altitude > maxAltitude) {
      maxAltitude = hor.altitude;
      bestTime = current;
      direction = cardinalDirection(hor.azimuth);
    }
  }

  const nowHor = getHorizontal(body, new Date(), observer);
  return {
    body,
    visible: maxAltitude > 10,
    maxAltitude,
    bestTime,
    direction,
    hoursVisible: totalSamples ? (visibleSamples * 20) / 60 : 0,
    currentlyUp: nowHor.altitude > 0,
    altitudeNow: nowHor.altitude,
    azimuthNow: nowHor.azimuth,
  };
}

function nearestHourIndex(times, targetDate) {
  if (!times?.length) return -1;
  let bestIndex = 0;
  let bestDiff = Math.abs(toDateTime(times[0]).getTime() - targetDate.getTime());
  for (let i = 1; i < times.length; i += 1) {
    const diff = Math.abs(toDateTime(times[i]).getTime() - targetDate.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function average(arr) {
  if (!arr?.length) return null;
  return arr.reduce((sum, value) => sum + value, 0) / arr.length;
}

function useLiveClock(timezone) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        timeZone: timezone || undefined,
      }).format(now),
    [now, timezone]
  );
}

function Stat({ icon: Icon, label, value, subvalue }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm">
      <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className="text-lg font-semibold text-white">{value}</div>
      {subvalue ? <div className="mt-1 text-xs text-slate-400">{subvalue}</div> : null}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
      <Icon className="h-4 w-4 text-cyan-300" />
      <span>{children}</span>
    </div>
  );
}

function ScorePill({ score }) {
  const label = getQualityLabel(score);
  return (
    <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-200">
      {label} • {Math.round(score)}/100
    </div>
  );
}

export default function ObservingConditionsWidget({
  latitude,
  longitude,
  elevation = 0,
  locationLabel,
  variant = "full",
  className = "",
  temperatureUnit = "fahrenheit",
  windSpeedUnit = "mph",
  showCoordinates = false,
  autoLocate = true,
  siteBortleClass,
}) {
  const [coords, setCoords] = useState(
    latitude !== undefined && longitude !== undefined
      ? { latitude, longitude, elevation }
      : null
  );
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (latitude !== undefined && longitude !== undefined) {
      setCoords({ latitude, longitude, elevation });
      return;
    }
    if (!autoLocate || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          elevation: position.coords.altitude || elevation || 0,
        });
      },
      () => {
        setError("Location permission denied. Pass latitude/longitude props or allow location access.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  }, [latitude, longitude, elevation, autoLocate]);

  useEffect(() => {
    if (!coords?.latitude || !coords?.longitude) return;

    let cancelled = false;
    const fetchWeather = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          latitude: String(coords.latitude),
          longitude: String(coords.longitude),
          timezone: "auto",
          timeformat: "unixtime",
          models: "best_match",
          cell_selection: "land",
          forecast_hours: "36",
          past_hours: "3",
          temperature_unit: temperatureUnit,
          wind_speed_unit: windSpeedUnit,
          forecast_days: "3",
          current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "dew_point_2m",
            "weather_code",
            "precipitation",
            "cloud_cover",
            "cloud_cover_low",
            "cloud_cover_mid",
            "cloud_cover_high",
            "pressure_msl",
            "surface_pressure",
            "visibility",
            "wind_speed_10m",
            "wind_gusts_10m",
            "wind_direction_10m",
            "is_day",
          ].join(","),
          hourly: [
            "temperature_2m",
            "dew_point_2m",
            "relative_humidity_2m",
            "precipitation_probability",
            "precipitation",
            "cloud_cover",
            "cloud_cover_low",
            "cloud_cover_mid",
            "cloud_cover_high",
            "visibility",
            "pressure_msl",
            "wind_speed_10m",
            "wind_gusts_10m",
            "wind_direction_10m",
          ].join(","),
          daily: [
            "sunrise",
            "sunset",
            "daylight_duration",
            "uv_index_max",
          ].join(","),
        });

        const response = await fetch(`${WEATHER_URL}?${params.toString()}`);
        if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
        const data = await response.json();
        if (!cancelled) {
          setWeather({ ...data, fetchedAt: new Date().toISOString() });
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load observing conditions.");
          setLoading(false);
        }
      }
    };

    fetchWeather();
    return () => {
      cancelled = true;
    };
  }, [coords, refreshKey, temperatureUnit, windSpeedUnit]);

  const timezone = weather?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const liveClock = useLiveClock(timezone);

  const astronomy = useMemo(() => {
    if (!coords?.latitude || !coords?.longitude) return null;

    const now = weather?.current?.time ? toDateTime(weather.current.time) : new Date();
    const observer = new Astronomy.Observer(coords.latitude, coords.longitude, coords.elevation || 0);
    const moonHor = getHorizontal("Moon", now, observer);
    const phaseAngle = Astronomy.MoonPhase(now);
    const tonight = getTonightWindow(observer, now);

    const civilDusk = findCrossing("Sun", observer, new Date(now.getTime() - 18 * 3600 * 1000), new Date(now.getTime() + 36 * 3600 * 1000), -6, false, 10);
    const nauticalDusk = findCrossing("Sun", observer, new Date(now.getTime() - 18 * 3600 * 1000), new Date(now.getTime() + 36 * 3600 * 1000), -12, false, 10);
    const astroDusk = tonight.start;
    const astroDawn = tonight.end;
    const nauticalDawn = astroDawn ? findCrossing("Sun", observer, new Date(astroDawn.getTime() - 3 * 3600 * 1000), new Date(astroDawn.getTime() + 3 * 3600 * 1000), -12, true, 10) : null;
    const civilDawn = astroDawn ? findCrossing("Sun", observer, new Date(astroDawn.getTime() - 3 * 3600 * 1000), new Date(astroDawn.getTime() + 3 * 3600 * 1000), -6, true, 10) : null;

    const moonrise = findCrossing("Moon", observer, new Date(now.getTime() - 18 * 3600 * 1000), new Date(now.getTime() + 36 * 3600 * 1000), 0, true, 10);
    const moonset = findCrossing("Moon", observer, new Date(now.getTime() - 18 * 3600 * 1000), new Date(now.getTime() + 36 * 3600 * 1000), 0, false, 10);

    const planets = PLANETS.map((planet) => getPlanetVisibility(planet, observer, tonight.start, tonight.end))
      .filter((planet) => planet.visible)
      .sort((a, b) => b.maxAltitude - a.maxAltitude);

    return {
      phaseAngle,
      moonPhase: moonPhaseName(phaseAngle),
      moonIllumination: moonIlluminationPercent(phaseAngle),
      moonAltitude: moonHor.altitude,
      moonAzimuth: moonHor.azimuth,
      moonrise,
      moonset,
      tonight,
      civilDusk,
      nauticalDusk,
      astroDusk,
      astroDawn,
      nauticalDawn,
      civilDawn,
      planets,
    };
  }, [coords, weather]);

  const derived = useMemo(() => {
    if (!weather?.current || !astronomy) return null;

    const current = weather.current;
    const hourly = weather.hourly;
    const tonightStart = astronomy.tonight?.start;
    const tonightEnd = astronomy.tonight?.end;

    let tonightIndices = [];
    if (tonightStart && tonightEnd && hourly?.time?.length) {
      tonightIndices = hourly.time
        .map((time, index) => ({ time: toDateTime(time), index }))
        .filter(({ time }) => time >= tonightStart && time <= tonightEnd)
        .map(({ index }) => index);
    }

    const tonightCloudLow = average(tonightIndices.map((i) => hourly.cloud_cover_low?.[i]).filter((v) => v !== undefined));
    const tonightCloudMid = average(tonightIndices.map((i) => hourly.cloud_cover_mid?.[i]).filter((v) => v !== undefined));
    const tonightCloudHigh = average(tonightIndices.map((i) => hourly.cloud_cover_high?.[i]).filter((v) => v !== undefined));
    const tonightCloudTotal = average(tonightIndices.map((i) => hourly.cloud_cover?.[i]).filter((v) => v !== undefined));
    const tonightVisibility = average(tonightIndices.map((i) => hourly.visibility?.[i]).filter((v) => v !== undefined));
    const tonightWind = average(tonightIndices.map((i) => hourly.wind_speed_10m?.[i]).filter((v) => v !== undefined));
    const tonightDewSpread = average(
      tonightIndices
        .map((i) => {
          const t = hourly.temperature_2m?.[i];
          const d = hourly.dew_point_2m?.[i];
          return t !== undefined && d !== undefined ? t - d : undefined;
        })
        .filter((v) => v !== undefined)
    );

    const dewSpreadNow = current.temperature_2m - current.dew_point_2m;
    const moonInterference = clamp((astronomy.moonIllumination / 100) * clamp((astronomy.moonAltitude + 10) / 80, 0, 1) * 100, 0, 100);
    const cloudPenalty = (tonightCloudLow || current.cloud_cover_low || 0) * 0.42 + (tonightCloudMid || current.cloud_cover_mid || 0) * 0.28 + (tonightCloudHigh || current.cloud_cover_high || 0) * 0.14 + (tonightCloudTotal || current.cloud_cover || 0) * 0.16;
    const dewPenalty = dewSpreadNow <= 2 ? 26 : dewSpreadNow <= 4 ? 17 : dewSpreadNow <= 7 ? 9 : 2;
    const windPenalty = (tonightWind || current.wind_speed_10m || 0) > 20 ? 18 : (tonightWind || current.wind_speed_10m || 0) > 12 ? 10 : 4;
    const visibilityBonus = clamp(((tonightVisibility || current.visibility || 0) / 24000) * 12, 0, 12);

    const observingScore = clamp(100 - cloudPenalty * 0.7 - dewPenalty - windPenalty - moonInterference * 0.2 + visibilityBonus, 0, 100);

    const hourlyNowIndex = nearestHourIndex(hourly.time, current?.time ? toDateTime(current.time) : new Date());
    const nextSixHours = hourly.time
      ?.slice(hourlyNowIndex, hourlyNowIndex + 6)
      .map((time, offset) => ({
        time,
        cloud: hourly.cloud_cover?.[hourlyNowIndex + offset],
        low: hourly.cloud_cover_low?.[hourlyNowIndex + offset],
        mid: hourly.cloud_cover_mid?.[hourlyNowIndex + offset],
        high: hourly.cloud_cover_high?.[hourlyNowIndex + offset],
        dewSpread:
          hourly.temperature_2m?.[hourlyNowIndex + offset] !== undefined && hourly.dew_point_2m?.[hourlyNowIndex + offset] !== undefined
            ? hourly.temperature_2m[hourlyNowIndex + offset] - hourly.dew_point_2m[hourlyNowIndex + offset]
            : null,
      }));

    return {
      observingScore,
      qualityLabel: getQualityLabel(observingScore),
      currentConditionLabel: getWeatherCodeLabel(current.weather_code),
      dewSpreadNow,
      tonightDewSpread,
      tonightCloudLow,
      tonightCloudMid,
      tonightCloudHigh,
      tonightCloudTotal,
      tonightVisibility,
      tonightWind,
      moonInterference,
      dewRisk: dewSpreadNow <= 2 ? 85 : dewSpreadNow <= 4 ? 55 : 20,
      windRisk: clamp(((tonightWind || current.wind_speed_10m || 0) / 25) * 100, 0, 100),
      transparencyScore: clamp(100 - ((tonightCloudHigh || current.cloud_cover_high || 0) * 0.4 + (tonightCloudMid || current.cloud_cover_mid || 0) * 0.35 + (tonightCloudLow || current.cloud_cover_low || 0) * 0.25), 0, 100),
      nextSixHours,
    };
  }, [weather, astronomy]);

  const current = weather?.current;
  const daily = weather?.daily;
  const locationText = locationLabel || (coords ? `Current location • ${roundCoord(coords.latitude)}, ${roundCoord(coords.longitude)}` : "Locating…");
  const tempSuffix = temperatureUnit === "fahrenheit" ? "°F" : "°C";

  if (loading && !weather) {
    return (
      <div className={cn("overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/90 p-6 text-slate-200 shadow-2xl shadow-cyan-950/20", className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-56 rounded-full bg-white/10" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className={cn("rounded-[28px] border border-rose-400/20 bg-slate-950/90 p-6 text-rose-100", className)}>
        <div className="text-sm font-medium">{error}</div>
      </div>
    );
  }

const compact = variant === "mini";
const standard = variant === "standard";
const stream = variant === "stream";

if (compact) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-transparent text-slate-100 shadow-none",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 px-0 py-0 text-[11px] sm:text-xs">
        <div className="mr-1 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2 py-1 font-semibold text-white/90">
          <Star className="h-3 w-3 text-white/80" />
          <span>{Math.round(derived?.observingScore || 0)}/100</span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2 py-1 text-white/80">
          <Clock3 className="h-3 w-3 text-white/60" />
          <span>{liveClock}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2 py-1 text-white/80">
          <Thermometer className="h-3 w-3 text-white/60" />
          <span>{formatTemp(current?.temperature_2m, tempSuffix)}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2 py-1 text-white/80">
          <Cloud className="h-3 w-3 text-white/60" />
          <span>{current?.weather_code === 0 || current?.weather_code === 1 ? "Clear sky" : `Low ${formatPercent(current?.cloud_cover_low ?? current?.cloud_cover)}`}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2 py-1 text-white/80">
          <Droplets className="h-3 w-3 text-white/60" />
          <span>Dew {formatTemp(current?.dew_point_2m, tempSuffix)}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2 py-1 text-white/80">
          <MoonStar className="h-3 w-3 text-white/60" />
          <span>{phaseIcon(astronomy?.phaseAngle)} {formatPercent(astronomy?.moonIllumination)}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2 py-1 text-white/80">
          <Orbit className="h-3 w-3 text-white/60" />
          <span>{astronomy?.planets?.length ?? 0} planets</span>
        </div>

        <div className="ml-auto hidden text-[10px] text-white/45 sm:block">
          {locationText}
        </div>
      </div>
    </section>
  );
}

if (stream) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[28px] border border-white/10 bg-black/40 text-slate-100 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/55">
            <Star className="h-3.5 w-3.5 text-white/60" />
            <span>Observing conditions</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/88">
            <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-white/55" /> {liveClock}</span>
            <span className="inline-flex items-center gap-2 text-white/68"><MapPin className="h-4 w-4 text-white/45" /> {locationText}</span>
          </div>
        </div>
        {derived ? (
          <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-right">
            <div className="text-xs font-semibold text-cyan-100">{derived.qualityLabel || "Good"}</div>
            <div className="text-xs text-cyan-200/90">{Math.round(derived.observingScore || 0)}/100</div>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="grid gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
              <Thermometer className="h-3.5 w-3.5" /> Temp
            </div>
            <div className="text-4xl font-semibold tracking-tight text-white">{formatTemp(current?.temperature_2m, tempSuffix)}</div>
            <div className="mt-1 text-sm text-white/48">Feels like {formatTemp(current?.apparent_temperature, tempSuffix)}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
              <Cloud className="h-3.5 w-3.5" /> Sky
            </div>
            <div className="text-2xl font-semibold text-white">{derived?.currentConditionLabel || (current?.weather_code === 0 || current?.weather_code === 1 ? "Clear" : "Mixed")}</div>
            <div className="mt-1 text-sm text-white/48">Low {formatPercent(current?.cloud_cover_low)} • High {formatPercent(current?.cloud_cover_high)}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
              <Droplets className="h-3.5 w-3.5" /> Dew point
            </div>
            <div className="text-2xl font-semibold text-white">{formatTemp(current?.dew_point_2m, tempSuffix)}</div>
            <div className="mt-1 text-sm text-white/48">Risk {getRiskLabel(derived?.dewRisk || 0)}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
              <MoonStar className="h-3.5 w-3.5" /> Moon
            </div>
            <div className="text-2xl font-semibold text-white">{astronomy?.moonPhase || "—"}</div>
            <div className="mt-1 text-sm text-white/48">{formatPercent(astronomy?.moonIllumination)} illuminated</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">Tonight at a glance</div>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3 text-white/72"><span>Astronomical dusk</span><span className="font-medium text-white">{formatTime(astronomy?.astroDusk, timezone)}</span></div>
            <div className="flex items-center justify-between gap-3 text-white/72"><span>Moonrise / set</span><span className="font-medium text-white">{formatTime(astronomy?.moonrise, timezone)} / {formatTime(astronomy?.moonset, timezone)}</span></div>
            <div className="flex items-center justify-between gap-3 text-white/72"><span>Planets visible</span><span className="font-medium text-white">{astronomy?.planets?.length ?? 0}</span></div>
            <div className="flex items-center justify-between gap-3 text-white/72"><span>Transparency</span><span className="font-medium text-white">{getQualityLabel(derived?.transparencyScore || 0)}</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

return (
  <section
      className={cn(
        "overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_rgba(15,23,42,0.94)_32%,_rgba(2,6,23,0.98)_78%)] text-slate-100 shadow-[0_20px_80px_rgba(2,8,23,0.45)]",
        className
      )}
    >
      <div className="border-b border-white/10 px-5 py-5 md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/90">
              <Star className="h-3.5 w-3.5" />
              <span>Observing Conditions</span>
            </div>
            <div className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Professional time + weather + astronomy widget</div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-cyan-300" /> {locationText}</span>
              <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-cyan-300" /> {liveClock}</span>
              <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4 text-cyan-300" /> Updated {formatTimeWithZone(weather?.fetchedAt, timezone)}</span>
              {showCoordinates && coords ? <span className="text-slate-400">Lat {roundCoord(coords.latitude)} • Lon {roundCoord(coords.longitude)}</span> : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {derived ? <ScorePill score={derived.observingScore} /> : null}
            {siteBortleClass ? (
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                Bortle {siteBortleClass}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-5 py-5 md:px-6 md:py-6">
        <div className={cn("grid gap-3", compact ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-4 xl:grid-cols-8")}>
          <Stat icon={Thermometer} label="Temp" value={formatTemp(current?.temperature_2m, tempSuffix)} subvalue={`Feels like ${formatTemp(current?.apparent_temperature, tempSuffix)}`} />
          <Stat icon={Droplets} label="Dew point" value={formatTemp(current?.dew_point_2m, tempSuffix)} subvalue={`Spread ${formatNumber(derived?.dewSpreadNow, 1)}${tempSuffix.replace("°", "")}`} />
          <Stat icon={Cloud} label="Cloud cover" value={formatPercent(current?.cloud_cover)} subvalue={`Low ${formatPercent(current?.cloud_cover_low)} • Mid ${formatPercent(current?.cloud_cover_mid)} • High ${formatPercent(current?.cloud_cover_high)}`} />
          <Stat icon={Wind} label="Wind" value={`${formatNumber(current?.wind_speed_10m)} ${windSpeedUnit === "mph" ? "mph" : windSpeedUnit === "ms" ? "m/s" : windSpeedUnit}`} subvalue={`Gust ${formatNumber(current?.wind_gusts_10m)} • ${cardinalDirection(current?.wind_direction_10m)}`} />
          {!compact ? <Stat icon={Gauge} label="Pressure" value={`${formatNumber(current?.pressure_msl)} hPa`} subvalue={`Surface ${formatNumber(current?.surface_pressure)} hPa`} /> : null}
          {!compact ? <Stat icon={Eye} label="Visibility" value={formatDistanceKm(current?.visibility)} subvalue={derived?.currentConditionLabel} /> : null}
          {!compact ? <Stat icon={MoonStar} label="Moon" value={`${phaseIcon(astronomy?.phaseAngle)} ${astronomy?.moonPhase || "—"}`} subvalue={`${formatPercent(astronomy?.moonIllumination)} illuminated`} /> : null}
          {!compact ? <Stat icon={Orbit} label="Planets tonight" value={astronomy?.planets?.length ?? 0} subvalue={astronomy?.planets?.slice(0, 3).map((p) => p.body).join(" • ") || "None strong tonight"} /> : null}
        </div>

        {!compact ? (
          <div className={cn("grid gap-6", standard ? "lg:grid-cols-2" : "xl:grid-cols-[1.2fr_1fr] ") }>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 md:p-5">
              <SectionTitle icon={Compass}>Sky quality summary</SectionTitle>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Stat icon={Star} label="Observing score" value={`${Math.round(derived?.observingScore || 0)}/100`} subvalue={derived?.qualityLabel} />
                <Stat icon={Cloud} label="Transparency" value={`${Math.round(derived?.transparencyScore || 0)}/100`} subvalue={getQualityLabel(derived?.transparencyScore || 0)} />
                <Stat icon={Droplets} label="Dew risk" value={getRiskLabel(derived?.dewRisk || 0)} subvalue={`Tonight spread ${formatNumber(derived?.tonightDewSpread, 1)}${tempSuffix.replace("°", "")}`} />
                <Stat icon={MoonStar} label="Moon impact" value={getRiskLabel(derived?.moonInterference || 0)} subvalue={`Moon alt ${formatNumber(astronomy?.moonAltitude, 0)}°`} />
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <div className="mb-3 text-sm font-medium text-slate-200">Next 6 hours</div>
                <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                  {derived?.nextSixHours?.map((hour) => (
                    <div key={hour.time} className="rounded-2xl border border-white/8 bg-white/5 p-3 text-xs">
                      <div className="font-medium text-slate-100">{formatTime(hour.time, timezone)}</div>
                      <div className="mt-2 space-y-1 text-slate-300">
                        <div>Total cloud {formatPercent(hour.cloud)}</div>
                        <div>Low cloud {formatPercent(hour.low)}</div>
                        <div>Dew spread {hour.dewSpread !== null ? `${formatNumber(hour.dewSpread, 1)}${tempSuffix.replace("°", "")}` : "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 md:p-5">
              <SectionTitle icon={MoonStar}>Sun, moon, and darkness</SectionTitle>
              <div className="grid gap-3 md:grid-cols-2">
                <Stat icon={Sunset} label="Sunset" value={formatTime(daily?.sunset?.[0], timezone)} subvalue={`Astronomical dusk ${formatTime(astronomy?.astroDusk, timezone)}`} />
                <Stat icon={Sunrise} label="Sunrise" value={formatTime(daily?.sunrise?.[0], timezone)} subvalue={`Astronomical dawn ${formatTime(astronomy?.astroDawn, timezone)}`} />
                <Stat icon={Clock3} label="Civil / nautical dusk" value={`${formatTime(astronomy?.civilDusk, timezone)} / ${formatTime(astronomy?.nauticalDusk, timezone)}`} subvalue="Evening darkness thresholds" />
                <Stat icon={Clock3} label="Civil / nautical dawn" value={`${formatTime(astronomy?.civilDawn, timezone)} / ${formatTime(astronomy?.nauticalDawn, timezone)}`} subvalue="Morning brightening thresholds" />
                <Stat icon={MoonStar} label="Moonrise / moonset" value={`${formatTime(astronomy?.moonrise, timezone)} / ${formatTime(astronomy?.moonset, timezone)}`} subvalue={`${formatPercent(astronomy?.moonIllumination)} illuminated`} />
                <Stat icon={Clock3} label="Daylight" value={formatDurationHours(daily?.daylight_duration?.[0])} subvalue={`UV max ${formatNumber(daily?.uv_index_max?.[0], 1)}`} />
              </div>
            </div>
          </div>
        ) : null}

        {!compact ? (
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 md:p-5">
            <SectionTitle icon={Orbit}>Planets visible tonight</SectionTitle>
            {astronomy?.planets?.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {astronomy.planets.map((planet) => (
                  <div key={planet.body} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-base font-semibold text-white">{planet.body}</div>
                      <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
                        {planet.currentlyUp ? "Up now" : "Later"}
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-slate-300">
                      <div>Best altitude: <span className="font-medium text-slate-100">{formatNumber(planet.maxAltitude, 0)}°</span></div>
                      <div>Best time: <span className="font-medium text-slate-100">{formatTime(planet.bestTime, timezone)}</span></div>
                      <div>Direction: <span className="font-medium text-slate-100">{planet.direction || "—"}</span></div>
                      <div>Useful hours (&gt;10°): <span className="font-medium text-slate-100">{formatNumber(planet.hoursVisible, 1)}h</span></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/20 p-4 text-sm text-slate-300">
                No major planets reach a strong observing altitude during the computed dark-sky window tonight.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
