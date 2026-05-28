const express = require("express");
  const router = express.Router();
  const stallion = require("../services/stallion");

  function validateAddress(addr) {
    const fields = ["name", "address1", "city", "province_code",
  "postal_code", "country_code"];
    const missing = fields.filter(function(f) {
      return !addr || !addr[f];
    });
    if (missing.length) {
      throw new Error("Adresse incomplete : " + missing.join(", "));
    }
  }

  function validatePackage(data) {
    if (!data.weight || data.weight <= 0) {
      throw new Error("Poids invalide.");
    }
    if (!data.length || !data.width || !data.height) {
      throw new Error("Dimensions requises.");
    }
  }

  router.post("/rates", async function(req, res) {
    try {
      // Format envoyé par le frontend : destination + packages
      const dest     = req.body.destination || {};
      const pkg      = (req.body.packages && req.body.packages[0]) || {};
      const postal   = (dest.postal_code || '').replace(/\s/g, '').toUpperCase();
      const province = dest.province || dest.province_code || 'QC';
      const country  = dest.country  || dest.country_code  || 'CA';
      const weight   = pkg.weight || req.body.weight || 1;
      const length   = pkg.length || req.body.length || 20;
      const width    = pkg.width  || req.body.width  || 15;
      const height   = pkg.height || req.body.height || 10;

      if (!postal) throw new Error("Code postal requis.");

      const toAddress = {
        name:          "Client",
        address1:      "N/A",
        city:          "N/A",
        province_code: province,
        postal_code:   postal,
        country_code:  country,
      };

      const stallionRates = await stallion.getRates({
        toAddress,
        weight,
        weightUnit: "lbs",
        length,
        width,
        height,
        sizeUnit: "in",
        items: req.body.items || [],
      });

      const rates = stallionRates.map(function(r) {
        return {
          service_code:   r.id || r.carrier,
          service_name:   r.carrier || r.id,
          total_charge:   (r.price_cents / 100).toFixed(2),
          estimated_days: r.delivery_days ? r.delivery_days.replace(/\D.*/, '') : null,
          currency:       r.currency || "CAD",
        };
      });

      return res.json({ success: true, rates: rates });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post("/create", async function(req, res) {
    try {
      validateAddress(req.body.to_address);
      validatePackage(req.body);
      if (!req.body.postage_type) {
        throw new Error("postage_type requis.");
      }
      if (!req.body.order_id) {
        throw new Error("order_id requis.");
      }
      const result = await stallion.createShipment({
        toAddress: req.body.to_address,
        postageType: req.body.postage_type,
        weight: req.body.weight,
        weightUnit: req.body.weight_unit,
        length: req.body.length,
        width: req.body.width,
        height: req.body.height,
        sizeUnit: req.body.size_unit,
        items: req.body.items,
        orderId: req.body.order_id
      });
      return res.json({
        success: true,
        tracking_code: result.tracking_code,
        ship_code: result.ship_code,
        label_pdf: result.label_base64,
        rate_paid: result.rate_paid
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get("/track/:trackingCode", async function(req, res) {
    try {
      if (!req.params.trackingCode) {
        throw new Error("trackingCode requis.");
      }
      const result = await stallion.trackShipment(req.params.trackingCode);
      return res.json({
        success: true,
        status: result.status,
        events: result.events,
        url: result.url
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  });

  module.exports = router;