import api from './api';

export interface WeatherData {
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
}

export interface HourlyWeatherData {
  time: string;
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  windGust: number | null;
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

// Ícono (etiqueta de texto) basado en código de clima
export const getWeatherEmoji = (code: number, checkNightTime: boolean = false): string => {
  if (code === 0 && checkNightTime && isNightTime()) return 'noche';
  if (code === 0) return 'sol';
  if (code <= 2) return 'parcial';
  if (code === 3) return 'nublado';
  if (code >= 45 && code <= 48) return 'niebla';
  if (code >= 51 && code <= 55) return 'lluvia';
  if (code >= 61 && code <= 65) return 'lluvia';
  if (code >= 71 && code <= 77) return 'nieve';
  if (code >= 80 && code <= 82) return 'tormenta';
  if (code >= 85 && code <= 86) return 'nieve';
  if (code >= 95) return 'tormenta';
  return 'clima';
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
      const response = await api.get('/weather', {
        params: { latitude, longitude },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching weather:', error);
      throw error;
    }
  },

  // Obtener clima por hora (por defecto 7 días para poder ver el detalle de cada día)
  async getHourlyWeather(latitude: number = -42.7692, longitude: number = -65.0385, forecastDays: number = 7): Promise<HourlyWeatherData[]> {
    try {
      const response = await api.get('/weather/hourly', {
        params: { latitude, longitude, forecastDays },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching hourly weather:', error);
      throw error;
    }
  },
};
