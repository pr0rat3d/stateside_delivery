import express from 'express';
import { query } from '../config/db.js';
import { getDistanceMatrix, googleMapsConfigured } from '../utils/googleMaps.js';

const router = express.Router();

// GET real drive-time ETA from a merchant to a delivery pin, when Google Maps is configured.
// Falls back to a flat zone-based estimate otherwise (max_delivery_time_minutes).
router.get('/eta', async (req, res, next) => {
  try {
    const { merchant_id, pin_latitude, pin_longitude, zone_id } = req.query;
    if (!merchant_id || !pin_latitude || !pin_longitude) {
      return res.status(400).json({ error: 'merchant_id, pin_latitude, and pin_longitude are required' });
    }

    const merchantResult = await query('SELECT address, business_name FROM merchants WHERE id = $1', [merchant_id]);
    if (merchantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    const merchant = merchantResult.rows[0];

    if (googleMapsConfigured && merchant.address) {
      try {
        const eta = await getDistanceMatrix(merchant.address, `${pin_latitude},${pin_longitude}`);
        return res.json({ source: 'google_distance_matrix', ...eta });
      } catch (err) {
        console.error('Distance Matrix lookup failed, falling back to zone estimate:', err.message);
      }
    }

    // Fallback: flat estimate from the delivery zone
    let fallbackMinutes = 30;
    if (zone_id) {
      const zoneResult = await query('SELECT max_delivery_time_minutes FROM zones WHERE id = $1', [zone_id]);
      if (zoneResult.rows.length > 0) fallbackMinutes = zoneResult.rows[0].max_delivery_time_minutes;
    }
    res.json({
      source: 'zone_estimate',
      duration_minutes: fallbackMinutes,
      duration_text: `~${fallbackMinutes} min`,
      note: merchant.address
        ? 'Google Maps not configured'
        : `${merchant.business_name} has no address on file — add one to enable real ETAs`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
