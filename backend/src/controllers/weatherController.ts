import { Request, Response } from 'express';
import axios from 'axios';

const WEATHER_API_BASE = process.env.WEATHER_API_BASE || 'https://api.open-meteo.com/v1/forecast';
const WEATHER_PROVIDER = (process.env.WEATHER_PROVIDER || 'metno').toLowerCase();
const WEATHER_FALLBACK = (process.env.WEATHER_FALLBACK || 'wttr').toLowerCase();
const WTTR_BASE = 'https://wttr.in';
const METNO_BASE = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const OPEN_METEO_COOLDOWN_MS = 10 * 60 * 1000;
let openMeteoDownUntil = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

type CacheEntry<T> = {
  timestamp: number;
  data: T;
};

type CurrentWeatherResponse = {
  current: {
    temperature: number;
    weatherCode: number;
    windSpeed: number;
    windGust: number | null;
    humidity: number;
  };
  daily: {
    date: string;
    maxTemp: number;
    minTemp: number;
    weatherCode: number;
    precipitation: number;
    windSpeed: number;
    windGust: number | null;
  }[];
  provider?: string;
};

type HourlyWeatherResponse = {
  time: string;
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  windGust: number | null;
  humidity: number;
  precipitation: number;
}[];

const currentCache = new Map<string, CacheEntry<CurrentWeatherResponse>>();
const hourlyCache = new Map<string, CacheEntry<HourlyWeatherResponse>>();

const withTimeout = async (url: string, timeoutMs: number) =>
  axios.get(url, {
    timeout: timeoutMs,
    headers: { 'User-Agent': 'PoolCalculator/1.0' },
  });

const logWeatherError = (scope: string, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[WEATHER] ${scope} failed:`, message);
};

const isFresh = (entry?: CacheEntry<any>): entry is CacheEntry<any> =>
  Boolean(entry && Date.now() - entry.timestamp < CACHE_TTL_MS);

const buildCacheKey = (latitude: number, longitude: number, extra?: string) =>
  `${latitude},${longitude}${extra ? `,${extra}` : ''}`;

const parseNumber = (value: any, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const LOCAL_TIMEZONE = 'America/Argentina/Buenos_Aires';
const formatLocalDate = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: LOCAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);

const formatLocalTime = (date: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: LOCAL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);

const buildForecastDates = (days: number) => {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    dates.push(formatLocalDate(d));
  }
  return dates;
};

const mapWttrCodeToOpenMeteo = (code: number): number => {
  const mapping: Record<number, number> = {
    113: 0,
    116: 2,
    119: 3,
    122: 3,
    143: 45,
    176: 61,
    179: 71,
    182: 71,
    185: 51,
    200: 95,
    227: 75,
    230: 75,
    248: 45,
    260: 45,
    263: 51,
    266: 51,
    281: 51,
    284: 51,
    293: 61,
    296: 61,
    299: 63,
    302: 63,
    305: 63,
    308: 65,
    311: 61,
    314: 63,
    317: 71,
    320: 71,
    323: 71,
    326: 71,
    329: 75,
    332: 75,
    335: 75,
    338: 75,
    350: 77,
    353: 80,
    356: 81,
    359: 82,
    362: 71,
    365: 71,
    368: 71,
    371: 75,
    374: 71,
    377: 77,
    386: 95,
    389: 95,
    392: 86,
    395: 86,
  };

  return mapping[code] ?? 3;
};

const buildIsoTime = (date: string, timeValue: string) => {
  const padded = timeValue.padStart(4, '0');
  const hours = padded.slice(0, 2);
  const minutes = padded.slice(2, 4);
  return `${date}T${hours}:${minutes}:00`;
};

const mapMetNoSymbolToOpenMeteo = (symbol: string): number => {
  const normalized = symbol.replace(/_(day|night|polartwilight)$/, '');
  const mapping: Record<string, number> = {
    clearsky: 0,
    fair: 1,
    partlycloudy: 2,
    cloudy: 3,
    fog: 45,
    lightrain: 61,
    rain: 63,
    heavyrain: 65,
    lightsnow: 71,
    snow: 73,
    heavysnow: 75,
    sleet: 77,
    lightrainshowers: 80,
    rainshowers: 81,
    heavyrainshowers: 82,
    snowshowers: 85,
    heavysnowshowers: 86,
    thunderstorm: 95
  };

  return mapping[normalized] ?? 3;
};

const fetchOpenMeteoCurrent = async (latitude: number, longitude: number) => {
  const url = new URL(WEATHER_API_BASE);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,relative_humidity_2m');
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max');
  url.searchParams.set('timezone', 'America/Argentina/Buenos_Aires');
  url.searchParams.set('forecast_days', '7');

  const response = await withTimeout(url.toString(), 7000);
  const data = response.data;

  return {
    current: {
      temperature: Math.round(data.current.temperature_2m),
      weatherCode: data.current.weather_code,
      windSpeed: Math.round(data.current.wind_speed_10m),
      windGust: Number.isFinite(data.current.wind_gusts_10m)
        ? Math.round(data.current.wind_gusts_10m)
        : null,
      humidity: Math.round(data.current.relative_humidity_2m),
    },
    daily: data.daily.time.map((date: string, index: number) => ({
      date,
      maxTemp: Math.round(data.daily.temperature_2m_max[index]),
      minTemp: Math.round(data.daily.temperature_2m_min[index]),
      weatherCode: data.daily.weather_code[index],
      precipitation: data.daily.precipitation_sum[index],
      windSpeed: Math.round(data.daily.wind_speed_10m_max[index]),
      windGust: Number.isFinite(data.daily.wind_gusts_10m_max?.[index])
        ? Math.round(data.daily.wind_gusts_10m_max[index])
        : null,
    })),
  } as CurrentWeatherResponse;
};

const fetchOpenMeteoHourly = async (latitude: number, longitude: number, forecastDays: number) => {
  const url = new URL(WEATHER_API_BASE);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('hourly', 'temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,relative_humidity_2m,precipitation');
  url.searchParams.set('timezone', 'America/Argentina/Buenos_Aires');
  url.searchParams.set('forecast_days', String(forecastDays));

  const response = await withTimeout(url.toString(), 7000);
  const data = response.data;

  return data.hourly.time.map((time: string, index: number) => ({
    time,
    temperature: Math.round(data.hourly.temperature_2m[index]),
    weatherCode: data.hourly.weather_code[index],
    windSpeed: Math.round(data.hourly.wind_speed_10m[index]),
    windGust: Number.isFinite(data.hourly.wind_gusts_10m?.[index])
      ? Math.round(data.hourly.wind_gusts_10m[index])
      : null,
    humidity: Math.round(data.hourly.relative_humidity_2m[index]),
    precipitation: data.hourly.precipitation[index],
  })) as HourlyWeatherResponse;
};

const fetchWttr = async (latitude: number, longitude: number) => {
  const url = `${WTTR_BASE}/${latitude},${longitude}?format=j1`;
  const response = await withTimeout(url, 7000);
  return response.data;
};

const fetchWttrCurrent = async (latitude: number, longitude: number) => {
  const data = await fetchWttr(latitude, longitude);
  const current = data.current_condition?.[0];
  const daily = data.weather || [];

  return {
    current: {
      temperature: Math.round(Number(current?.temp_C ?? 0)),
      weatherCode: mapWttrCodeToOpenMeteo(Number(current?.weatherCode ?? 3)),
      windSpeed: Math.round(Number(current?.windspeedKmph ?? 0)),
      windGust: Number.isFinite(Number(current?.WindGustKmph))
        ? Math.round(Number(current?.WindGustKmph))
        : null,
      humidity: Math.round(Number(current?.humidity ?? 0)),
    },
    daily: daily.map((day: any) => ({
      date: day.date,
      maxTemp: Math.round(Number(day.maxtempC ?? 0)),
      minTemp: Math.round(Number(day.mintempC ?? 0)),
      weatherCode: mapWttrCodeToOpenMeteo(Number(day.hourly?.[4]?.weatherCode ?? day.hourly?.[0]?.weatherCode ?? 3)),
      precipitation: Number(day.totalPrecip_mm ?? 0),
      windSpeed: Math.round(Number(day.hourly?.[4]?.windspeedKmph ?? day.hourly?.[0]?.windspeedKmph ?? 0)),
      windGust: Number.isFinite(Number(day.hourly?.[4]?.WindGustKmph ?? day.hourly?.[0]?.WindGustKmph))
        ? Math.round(Number(day.hourly?.[4]?.WindGustKmph ?? day.hourly?.[0]?.WindGustKmph))
        : null,
    })),
  } as CurrentWeatherResponse;
};

const fetchWttrHourly = async (latitude: number, longitude: number, forecastDays: number) => {
  const data = await fetchWttr(latitude, longitude);
  const days = (data.weather || []).slice(0, forecastDays);
  const hours: HourlyWeatherResponse = [];

  days.forEach((day: any) => {
    (day.hourly || []).forEach((hour: any) => {
      hours.push({
        time: buildIsoTime(day.date, String(hour.time || '0')),
        temperature: Math.round(Number(hour.tempC ?? 0)),
        weatherCode: mapWttrCodeToOpenMeteo(Number(hour.weatherCode ?? 3)),
        windSpeed: Math.round(Number(hour.windspeedKmph ?? 0)),
        windGust: Number.isFinite(Number(hour.WindGustKmph))
          ? Math.round(Number(hour.WindGustKmph))
          : null,
        humidity: Math.round(Number(hour.humidity ?? 0)),
        precipitation: Number(hour.precipMM ?? 0),
      });
    });
  });

  return hours;
};

const fetchMetNo = async (latitude: number, longitude: number) => {
  const url = `${METNO_BASE}?lat=${latitude}&lon=${longitude}`;
  const response = await withTimeout(url, 7000);
  return response.data;
};

const fetchMetNoCurrent = async (latitude: number, longitude: number) => {
  const data = await fetchMetNo(latitude, longitude);
  const entry = data?.properties?.timeseries?.[0];
  const instant = entry?.data?.instant?.details || {};
  const summary = entry?.data?.next_1_hours?.summary || entry?.data?.next_6_hours?.summary || {};

  const weatherCode = mapMetNoSymbolToOpenMeteo(summary.symbol_code || '');

  const dailyDates = buildForecastDates(7);
  const dailyMap: Record<string, any> = {};

  (data?.properties?.timeseries || []).forEach((item: any) => {
    const time = new Date(item.time);
    const dateKey = formatLocalDate(time);
    if (!dailyDates.includes(dateKey)) return;

    const details = item.data?.instant?.details || {};
    const precip = item.data?.next_1_hours?.details?.precipitation_amount ?? 0;
    const symbol = item.data?.next_1_hours?.summary?.symbol_code || '';

    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = {
        date: dateKey,
        maxTemp: Number.NEGATIVE_INFINITY,
        minTemp: Number.POSITIVE_INFINITY,
        precipitation: 0,
        windSpeed: 0,
        windGust: 0,
        weatherCode: mapMetNoSymbolToOpenMeteo(symbol || ''),
      };
    }

    dailyMap[dateKey].maxTemp = Math.max(dailyMap[dateKey].maxTemp, details.air_temperature ?? dailyMap[dateKey].maxTemp);
    dailyMap[dateKey].minTemp = Math.min(dailyMap[dateKey].minTemp, details.air_temperature ?? dailyMap[dateKey].minTemp);
    dailyMap[dateKey].precipitation += Number(precip) || 0;
    dailyMap[dateKey].windSpeed = Math.max(dailyMap[dateKey].windSpeed, details.wind_speed ?? 0);
    dailyMap[dateKey].windGust = Math.max(dailyMap[dateKey].windGust, details.wind_speed_of_gust ?? 0);

    const localHour = formatLocalTime(time);
    if (localHour === '12:00' && symbol) {
      dailyMap[dateKey].weatherCode = mapMetNoSymbolToOpenMeteo(symbol);
    }
  });

  const daily = dailyDates
    .filter((date) => dailyMap[date])
    .map((date) => ({
      date,
      maxTemp: Math.round(dailyMap[date].maxTemp),
      minTemp: Math.round(dailyMap[date].minTemp),
      weatherCode: dailyMap[date].weatherCode,
      precipitation: Number(dailyMap[date].precipitation.toFixed(2)),
      windSpeed: Math.round(dailyMap[date].windSpeed),
      windGust: Number.isFinite(dailyMap[date].windGust)
        ? Math.round(dailyMap[date].windGust)
        : null,
    }));

  return {
    current: {
      temperature: Math.round(instant.air_temperature ?? 0),
      weatherCode,
      windSpeed: Math.round(instant.wind_speed ?? 0),
      windGust: Number.isFinite(instant.wind_speed_of_gust)
        ? Math.round(instant.wind_speed_of_gust)
        : null,
      humidity: Math.round(instant.relative_humidity ?? 0),
    },
    daily,
  } as CurrentWeatherResponse;
};

const fetchMetNoHourly = async (latitude: number, longitude: number, forecastDays: number) => {
  const data = await fetchMetNo(latitude, longitude);
  const dates = buildForecastDates(forecastDays);
  const hours: HourlyWeatherResponse = [];

  (data?.properties?.timeseries || []).forEach((item: any) => {
    const time = new Date(item.time);
    const dateKey = formatLocalDate(time);
    if (!dates.includes(dateKey)) return;

    const details = item.data?.instant?.details || {};
    const summary = item.data?.next_1_hours?.summary || item.data?.next_6_hours?.summary || {};
    const precipitation = item.data?.next_1_hours?.details?.precipitation_amount ?? 0;

    hours.push({
      time: `${dateKey}T${formatLocalTime(time)}:00`,
      temperature: Math.round(details.air_temperature ?? 0),
      weatherCode: mapMetNoSymbolToOpenMeteo(summary.symbol_code || ''),
      windSpeed: Math.round(details.wind_speed ?? 0),
      windGust: Number.isFinite(details.wind_speed_of_gust)
        ? Math.round(details.wind_speed_of_gust)
        : null,
      humidity: Math.round(details.relative_humidity ?? 0),
      precipitation: Number(precipitation) || 0,
    });
  });

  return hours;
};

export const getWeather = async (req: Request, res: Response) => {
  const latitude = parseNumber(req.query.latitude, -42.7692);
  const longitude = parseNumber(req.query.longitude, -65.0385);
  const cacheKey = buildCacheKey(latitude, longitude);

  try {
    let payload: CurrentWeatherResponse;
    let provider = WEATHER_PROVIDER;

    try {
      const shouldSkipOpenMeteo = WEATHER_PROVIDER === 'open-meteo' && Date.now() < openMeteoDownUntil;
      if (WEATHER_PROVIDER === 'metno') {
        payload = await fetchMetNoCurrent(latitude, longitude);
        provider = 'metno';
      } else if (WEATHER_PROVIDER === 'wttr' || shouldSkipOpenMeteo) {
        payload = await fetchWttrCurrent(latitude, longitude);
        provider = 'wttr';
      } else {
        payload = await fetchOpenMeteoCurrent(latitude, longitude);
      }
    } catch (primaryError) {
      logWeatherError(`current (${WEATHER_PROVIDER})`, primaryError);

      if (WEATHER_FALLBACK === 'metno' && WEATHER_PROVIDER !== 'metno') {
        provider = 'metno';
        payload = await fetchMetNoCurrent(latitude, longitude);
      } else if (WEATHER_FALLBACK === 'wttr' && WEATHER_PROVIDER !== 'wttr') {
        if (WEATHER_PROVIDER === 'open-meteo') {
          openMeteoDownUntil = Date.now() + OPEN_METEO_COOLDOWN_MS;
        }
        provider = 'wttr';
        payload = await fetchWttrCurrent(latitude, longitude);
      } else {
        throw primaryError;
      }
    }

    currentCache.set(cacheKey, { timestamp: Date.now(), data: payload });
    res.setHeader('X-Weather-Cache', 'miss');
    res.setHeader('X-Weather-Provider', provider);
    res.json({ ...payload, provider });
  } catch (error) {
    logWeatherError('current', error);
    const cached = currentCache.get(cacheKey);
    if (isFresh(cached)) {
      res.setHeader('X-Weather-Cache', 'hit');
      res.setHeader('X-Weather-Provider', WEATHER_PROVIDER);
      res.json({ ...cached.data, provider: WEATHER_PROVIDER });
      return;
    }

    res.status(502).json({ error: 'No se pudo obtener el clima' });
  }
};

export const getHourlyWeather = async (req: Request, res: Response) => {
  const latitude = parseNumber(req.query.latitude, -42.7692);
  const longitude = parseNumber(req.query.longitude, -65.0385);
  const forecastDays = parseNumber(req.query.forecastDays, 7);
  const cacheKey = buildCacheKey(latitude, longitude, String(forecastDays));

  try {
    let payload: HourlyWeatherResponse;
    let provider = WEATHER_PROVIDER;

    try {
      const shouldSkipOpenMeteo = WEATHER_PROVIDER === 'open-meteo' && Date.now() < openMeteoDownUntil;
      if (WEATHER_PROVIDER === 'metno') {
        payload = await fetchMetNoHourly(latitude, longitude, forecastDays);
        provider = 'metno';
      } else if (WEATHER_PROVIDER === 'wttr' || shouldSkipOpenMeteo) {
        payload = await fetchWttrHourly(latitude, longitude, forecastDays);
        provider = 'wttr';
      } else {
        payload = await fetchOpenMeteoHourly(latitude, longitude, forecastDays);
      }
    } catch (primaryError) {
      logWeatherError(`hourly (${WEATHER_PROVIDER})`, primaryError);

      if (WEATHER_FALLBACK === 'metno' && WEATHER_PROVIDER !== 'metno') {
        provider = 'metno';
        payload = await fetchMetNoHourly(latitude, longitude, forecastDays);
      } else if (WEATHER_FALLBACK === 'wttr' && WEATHER_PROVIDER !== 'wttr') {
        if (WEATHER_PROVIDER === 'open-meteo') {
          openMeteoDownUntil = Date.now() + OPEN_METEO_COOLDOWN_MS;
        }
        provider = 'wttr';
        payload = await fetchWttrHourly(latitude, longitude, forecastDays);
      } else {
        throw primaryError;
      }
    }

    hourlyCache.set(cacheKey, { timestamp: Date.now(), data: payload });
    res.setHeader('X-Weather-Cache', 'miss');
    res.setHeader('X-Weather-Provider', provider);
    res.json(payload);
  } catch (error) {
    logWeatherError('hourly', error);
    const cached = hourlyCache.get(cacheKey);
    if (isFresh(cached)) {
      res.setHeader('X-Weather-Cache', 'hit');
      res.setHeader('X-Weather-Provider', WEATHER_PROVIDER);
      res.json(cached.data);
      return;
    }

    res.status(502).json({ error: 'No se pudo obtener el clima por hora' });
  }
};
