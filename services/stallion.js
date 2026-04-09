// services/stallion.js
  const STALLION_BASE = process.env.STALLION_BASE_URL;
  const API_KEY       = process.env.STALLION_API_KEY;
  const REGION        = process.env.STALLION_REGION || 'ON';
  const MARKUP        = parseFloat(process.env.SHIPPING_MARKUP || '0.10');

  const ORIGIN_ADDRESS = {
    name:          process.env.ORIGIN_NAME,
    address1:      process.env.ORIGIN_ADDRESS,
    city:          process.env.ORIGIN_CITY,
    province_code: process.env.ORIGIN_PROVINCE,
    postal_code:   process.env.ORIGIN_POSTAL,
    country_code:  process.env.ORIGIN_COUNTRY,
    phone:         process.env.ORIGIN_PHONE,
  };

  function headers(idempotencyKey = null) {
    const h = {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Accept':        'application/json',
    };
    if (idempotencyKey) h['Idempotency-Key'] = idempotencyKey;
    return h;
  }

  async function stallionFetch(method, path, body = null, idempotencyKey =
  null) {
    const url = `${STALLION_BASE}${path}`;
    const options = {
      method,
      headers: headers(idempotencyKey),
      ...(body ? { body: JSON.stringify(body) } : {}),
    };

    const response = await fetch(url, options);
    const data     = await response.json();

    if (!response.ok || data.success === false) {
      const msg = data.message || data.error || `Stallion API error
  ${response.status}`;
      throw new Error(msg);
    }
    return data;
  }

  function applyMarkup(cents) {
    return Math.ceil(cents * (1 + MARKUP));
  }

  function formatRate(rate) {
    const totalWithMarkup = applyMarkup(rate.total);
    return {
      id:            rate.postage_type,
      carrier:       rate.postage_type,
      package_type:  rate.package_type,
      trackable:     rate.trackable,
      price_cents:   totalWithMarkup,
      price_display: `${(totalWithMarkup / 100).toFixed(2)} CAD`,
      delivery_days: rate.delivery_days ? `${rate.delivery_days} jour(s)` :
  'Délai variable',
      currency:      rate.currency || 'CAD',
    };
  }

  async function getRates({ toAddress, weight, weightUnit, length, width,
  height, sizeUnit, items }) {
    const body = {
      to_address:  toAddress,
      weight_unit: weightUnit || 'lbs',
      weight,
      size_unit:   sizeUnit || 'in',
      length,
      width,
      height,
      package_type: 'Parcel',
      region:       REGION,
      items:        items || [],
    };

    const data  = await stallionFetch('POST', '/rates', body);
    const rates = (data.rates || []).map(formatRate);
    return rates.sort((a, b) => a.price_cents - b.price_cents);
  }

  async function createShipment({ toAddress, postageType, weight,
  weightUnit, length, width, height, sizeUnit, items, orderId }) {
    const idempotencyKey = `order_${orderId}_${Date.now()}`;

    const body = {
      to_address:   toAddress,
      postage_type: { name: postageType },
      package_type: { name: 'Parcel' },
      weight_unit:  weightUnit || 'lbs',
      weight,
      size_unit:    sizeUnit || 'in',
      length,
      width,
      height,
      items:        items || [],
      label_format: 'pdf',
      region:       REGION,
    };

    const data = await stallionFetch('POST', '/shipments', body,
  idempotencyKey);

    return {
      tracking_code: data.tracking_code,
      ship_code:     data.shipment?.ship_code,
      label_base64:  data.label,
      rate_paid:     data.rate,
    };
  }

  async function trackShipment(trackingCode) {
    const data = await stallionFetch('GET',
  `/track?tracking_code=${encodeURIComponent(trackingCode)}`);
    return {
      status: data.status,
      events: data.events || [],
      url:    data.details?.url || null,
    };
  }

  module.exports = { getRates, createShipment, trackShipment, ORIGIN_ADDRESS
   };