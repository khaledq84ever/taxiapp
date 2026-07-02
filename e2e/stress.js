// Booking stress test: hit the live API ~50 different ways to find every error.
const axios = require('axios');

const API = 'https://taxiapp-api-production.up.railway.app/api/v1';
const R = { lat: 24.7136, lng: 46.6753 }; // Riyadh center

const results = [];
let n = 0;
function log(name, ok, detail = '') {
  n++;
  results.push({ n, name, ok, detail });
  console.log(`${String(n).padStart(2)}. ${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function guest() {
  const res = await axios.post(`${API}/auth/guest`);
  return axios.create({ baseURL: API, headers: { Authorization: `Bearer ${res.data.accessToken}` }, timeout: 20000 });
}

const basePayload = (over = {}) => ({
  pickupAddress: 'King Fahd Rd, Riyadh',
  pickupLat: R.lat, pickupLng: R.lng,
  dropoffAddress: 'Olaya St, Riyadh',
  dropoffLat: R.lat + 0.02, dropoffLng: R.lng,
  paymentMethod: 'CASH',
  rideType: 'ECONOMY',
  ...over,
});

// expectOk: booking should succeed. expectFail: should be rejected with clear 400 (not 500!)
async function book(name, payload, { expectFail = false, api = null } = {}) {
  const a = api ?? (await guest());
  try {
    const res = await a.post('/trips/request', payload);
    if (expectFail) log(name, false, `should have been rejected but got trip ${res.data.id}`);
    else log(name, true, `fare=${res.data.fareEstimate} type=${res.data.tripType ?? 'RIDE'}/${res.data.rideType}`);
    return res.data;
  } catch (e) {
    const st = e.response?.status;
    const msg = JSON.stringify(e.response?.data?.message ?? e.message).slice(0, 90);
    if (expectFail && st === 400) log(name, true, `correctly rejected 400: ${msg}`);
    else if (st >= 500) log(name, false, `SERVER CRASH ${st}: ${msg}`);
    else log(name, expectFail, `status=${st}: ${msg}`);
    return null;
  }
}

(async () => {
  // ── Valid bookings: every combination ──────────────────────────
  for (const rideType of ['ECONOMY', 'COMFORT', 'PREMIUM']) {
    for (const paymentMethod of ['CASH', 'CARD']) {
      await book(`ride ${rideType}/${paymentMethod}`, basePayload({ rideType, paymentMethod }));
    }
  }

  // Distances: short / medium / long / cross-city
  for (const [label, dLat, dLng] of [['300m', 0.003, 0], ['5km', 0.045, 0], ['20km', 0.18, 0], ['diagonal 10km', 0.06, 0.06]]) {
    await book(`ride distance ${label}`, basePayload({ dropoffLat: R.lat + dLat, dropoffLng: R.lng + dLng }));
  }

  // Other Saudi cities
  for (const [city, lat, lng] of [['Jeddah', 21.4858, 39.1925], ['Dammam', 26.4207, 50.0888], ['Mecca', 21.3891, 39.8579]]) {
    await book(`ride in ${city}`, basePayload({ pickupLat: lat, pickupLng: lng, dropoffLat: lat + 0.02, dropoffLng: lng + 0.01 }));
  }

  // Deliveries: valid variants
  await book('delivery full info', basePayload({ tripType: 'DELIVERY', packageDescription: 'Documents', receiverName: 'Salem', receiverPhone: '+966501112222' }));
  await book('delivery no receiver', basePayload({ tripType: 'DELIVERY', packageDescription: 'Food box' }));
  await book('delivery forces economy price', basePayload({ tripType: 'DELIVERY', packageDescription: 'Gift', rideType: 'PREMIUM' })).then((t) => {
    if (t) log('delivery ignores PREMIUM (economy fare)', t.rideType === 'ECONOMY', `saved rideType=${t.rideType}`);
  });
  await book('delivery arabic text', basePayload({ tripType: 'DELIVERY', packageDescription: 'وثائق مهمة', receiverName: 'أبو سالم' }));
  await book('delivery long description', basePayload({ tripType: 'DELIVERY', packageDescription: 'x'.repeat(500) }));

  // Address edge cases
  await book('emoji address', basePayload({ dropoffAddress: '🏠 home 🏠' }));
  await book('very long address', basePayload({ dropoffAddress: 'A'.repeat(300) }));
  await book('arabic address', basePayload({ pickupAddress: 'طريق الملك فهد', dropoffAddress: 'شارع العليا' }));
  await book('coordinates-as-address', basePayload({ dropoffAddress: '24.7336, 46.6753' }));

  // Same pickup/dropoff → tiny fare but shouldn't crash
  await book('same pickup & dropoff', basePayload({ dropoffLat: R.lat, dropoffLng: R.lng }));

  // ── Rebooking flows (the reported bug) ─────────────────────────
  const reuser = await guest();
  const first = await book('book then rebook: first', basePayload(), { api: reuser });
  await book('rebook while REQUESTED replaces old (was the bug!)', basePayload(), { api: reuser });
  await book('rebook 3rd time still works', basePayload({ tripType: 'DELIVERY', packageDescription: 'Box' }), { api: reuser });
  // Cancel then book again
  const canceller = await guest();
  const c1 = await book('cancel flow: book', basePayload(), { api: canceller });
  if (c1) {
    await canceller.put(`/trips/${c1.id}/cancel`, { reason: 'test' });
    log('cancel trip', true);
    await book('book again after cancel', basePayload(), { api: canceller });
  }

  // Rapid double-tap booking (double submit)
  const doubler = await guest();
  const [r1, r2] = await Promise.allSettled([
    doubler.post('/trips/request', basePayload()),
    doubler.post('/trips/request', basePayload()),
  ]);
  const okCount = [r1, r2].filter((r) => r.status === 'fulfilled').length;
  const crashed = [r1, r2].some((r) => r.status === 'rejected' && r.reason.response?.status >= 500);
  log('double-tap booking (no crash)', !crashed, `${okCount}/2 succeeded, no 500s=${!crashed}`);

  // ── Invalid input: must be clean 400s, never 500 ───────────────
  await book('missing dropoff', { ...basePayload(), dropoffLat: undefined, dropoffLng: undefined }, { expectFail: true });
  await book('missing pickup address', { ...basePayload(), pickupAddress: undefined }, { expectFail: true });
  await book('lat out of range (95)', basePayload({ dropoffLat: 95 }), { expectFail: true });
  await book('lng out of range (200)', basePayload({ dropoffLng: 200 }), { expectFail: true });
  await book('lat as string', basePayload({ pickupLat: 'abc' }), { expectFail: true });
  await book('invalid rideType', basePayload({ rideType: 'HELICOPTER' }), { expectFail: true });
  await book('invalid paymentMethod', basePayload({ paymentMethod: 'BITCOIN' }), { expectFail: true });
  await book('invalid tripType', basePayload({ tripType: 'TELEPORT' }), { expectFail: true });
  await book('delivery without package description', basePayload({ tripType: 'DELIVERY' }), { expectFail: true });
  await book('empty body', {}, { expectFail: true });
  await book('nulls everywhere', { pickupAddress: null, pickupLat: null, pickupLng: null, dropoffAddress: null, dropoffLat: null, dropoffLng: null, paymentMethod: null }, { expectFail: true });

  // No auth / bad auth
  try {
    await axios.post(`${API}/trips/request`, basePayload(), { timeout: 20000 });
    log('booking without login rejected', false, 'accepted without token!');
  } catch (e) {
    log('booking without login rejected', e.response?.status === 401, `status=${e.response?.status}`);
  }
  try {
    await axios.post(`${API}/trips/request`, basePayload(), { headers: { Authorization: 'Bearer garbage.token.here' }, timeout: 20000 });
    log('booking with fake token rejected', false, 'accepted fake token!');
  } catch (e) {
    log('booking with fake token rejected', e.response?.status === 401, `status=${e.response?.status}`);
  }

  // Estimate endpoint edge cases
  const est = await guest();
  try {
    const r = await est.post('/trips/estimate', { pickupLat: R.lat, pickupLng: R.lng, dropoffLat: R.lat + 0.02, dropoffLng: R.lng });
    log('estimate returns 3 options', r.data.options?.length === 3, `${r.data.options?.map((o) => o.type + ':' + o.fare).join(' ')}`);
    log('estimate fares ordered eco<comfort<premium',
      r.data.options[0].fare < r.data.options[1].fare && r.data.options[1].fare < r.data.options[2].fare);
  } catch (e) {
    log('estimate returns 3 options', false, e.message);
  }
  try {
    await est.post('/trips/estimate', { pickupLat: 'x', pickupLng: null });
    log('estimate invalid input rejected', false, 'accepted garbage');
  } catch (e) {
    log('estimate invalid input rejected', e.response?.status === 400, `status=${e.response?.status}`);
  }

  // Concurrency: 5 different passengers book at the same time
  const apis = await Promise.all([guest(), guest(), guest(), guest(), guest()]);
  const parallel = await Promise.allSettled(apis.map((a, i) => a.post('/trips/request', basePayload({ dropoffLat: R.lat + 0.01 + i * 0.005 }))));
  const okP = parallel.filter((p) => p.status === 'fulfilled').length;
  log('5 passengers book simultaneously', okP === 5, `${okP}/5 succeeded`);

  // ── Summary ────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.ok);
  console.log(`\n═══ ${results.length - failed.length}/${results.length} passed ═══`);
  if (failed.length) {
    console.log('FAILURES:');
    failed.forEach((f) => console.log(`  ${f.n}. ${f.name} — ${f.detail}`));
  }
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('aborted:', e.response?.data ?? e.message); process.exit(1); });
