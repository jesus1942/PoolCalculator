import axios from 'axios';

// Usando Open-Meteo (API gratuita sin necesidad de key)
const WEATHER_API_BASE = 'https://api.open-meteo.com/v1';

export interface WeatherData {
  current: {
    temperature: number;
    weatherCode: number;
    windSpeed: number;
    humidity: number;
  };
  daily: {
    date: string;
    maxTemp: number;
    minTemp: number;
    weatherCode: number;
    precipitation: number;
    windSpeed: number;
  }[];
}

export interface HourlyWeatherData {
  time: string;
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  precipitation: number;
}

// Códigos de clima a descripción
export const getWeatherDescription = (code: number): string => {
  const weatherCodes: { [key: number]: string } = {
    0: 'Despejado',
    1: 'Mayormente despejado',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Neblina',
    48: 'Neblina con escarcha',
    51: 'Llovizna ligera',
    53: 'Llovizna moderada',
    55: 'Llovizna densa',
    61: 'Lluvia ligera',
    63: 'Lluvia moderada',
    65: 'Lluvia fuerte',
    71: 'Nieve ligera',
    73: 'Nieve moderada',
    75: 'Nieve fuerte',
    77: 'Granizo',
    80: 'Chaparrones ligeros',
    81: 'Chaparrones moderados',
    82: 'Chaparrones fuertes',
    85: 'Nevadas ligeras',
    86: 'Nevadas fuertes',
    95: 'Tormenta',
    96: 'Tormenta con granizo ligero',
    99: 'Tormenta con granizo fuerte',
  };
  return weatherCodes[code] || 'Desconocido';
};

// Ícono emoji basado en código de clima
export const getWeatherEmoji = (code: number, checkNightTime: boolean = false): string => {
  // Si es despejado y es de noche, mostrar luna
  if (code === 0 && checkNightTime && isNightTime()) return '🌙';

  if (code === 0) return '☀️';
  if (code <= 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 55) return '🌦️';
  if (code >= 61 && code <= 65) return '🌧️';
  if (code >= 71 && code <= 77) return '🌨️';
  if (code >= 80 && code <= 82) return '⛈️';
  if (code >= 85 && code <= 86) return '❄️';
  if (code >= 95) return '⚡';
  return '🌡️';
};

// Determinar si el clima es bueno para trabajar
export const isGoodWorkingWeather = (code: number, windSpeed: number, precipitation: number): boolean => {
  // Clima malo: lluvia fuerte, tormenta, viento fuerte (>30 km/h), mucha precipitación
  if (code >= 63 && code <= 65) return false; // Lluvia fuerte
  if (code >= 80 && code <= 82) return false; // Chaparrones
  if (code >= 95) return false; // Tormentas
  if (windSpeed > 30) return false; // Viento fuerte
  if (precipitation > 5) return false; // Mucha precipitación
  return true;
};

// Determinar si es de noche (entre 20:00 y 06:00)
export const isNightTime = (): boolean => {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 6;
};

export const weatherService = {
  // Obtener clima para una ubicación (lat, lon)
  // Por defecto: Puerto Madryn, Chubut, Argentina
  async getWeather(latitude: number = -42.7692, longitude: number = -65.0385): Promise<WeatherData> {
    try {
      const response = await axios.get(`${WEATHER_API_BASE}/forecast`, {
        params: {
          latitude,
          longitude,
          current: 'temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m',
          daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
          timezone: 'America/Argentina/Buenos_Aires',
          forecast_days: 7,
        },
      });

      const data = response.data;

      return {
        current: {
          temperature: Math.round(data.current.temperature_2m),
          weatherCode: data.current.weather_code,
          windSpeed: Math.round(data.current.wind_speed_10m),
          humidity: Math.round(data.current.relative_humidity_2m),
        },
        daily: data.daily.time.map((date: string, index: number) => ({
          date,
          maxTemp: Math.round(data.daily.temperature_2m_max[index]),
          minTemp: Math.round(data.daily.temperature_2m_min[index]),
          weatherCode: data.daily.weather_code[index],
          precipitation: data.daily.precipitation_sum[index],
          windSpeed: Math.round(data.daily.wind_speed_10m_max[index]),
        })),
      };
    } catch (error) {
      console.error('Error fetching weather:', error);
      throw error;
    }
  },

  // Obtener clima por hora (por defecto 7 días para poder ver el detalle de cada día)
  async getHourlyWeather(latitude: number = -42.7692, longitude: number = -65.0385, forecastDays: number = 7): Promise<HourlyWeatherData[]> {
    try {
      const response = await axios.get(`${WEATHER_API_BASE}/forecast`, {
        params: {
          latitude,
          longitude,
          hourly: 'temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,precipitation',
          timezone: 'America/Argentina/Buenos_Aires',
          forecast_days: forecastDays,
        },
      });

      const data = response.data;

      return data.hourly.time.map((time: string, index: number) => ({
        time,
        temperature: Math.round(data.hourly.temperature_2m[index]),
        weatherCode: data.hourly.weather_code[index],
        windSpeed: Math.round(data.hourly.wind_speed_10m[index]),
        humidity: Math.round(data.hourly.relative_humidity_2m[index]),
        precipitation: data.hourly.precipitation[index],
      }));
    } catch (error) {
      console.error('Error fetching hourly weather:', error);
      throw error;
    }
  },
};
