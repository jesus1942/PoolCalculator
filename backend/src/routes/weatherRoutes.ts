import express from 'express';
import { getWeather, getHourlyWeather } from '../controllers/weatherController';

const router = express.Router();

router.get('/weather', getWeather);
router.get('/weather/hourly', getHourlyWeather);

export default router;
