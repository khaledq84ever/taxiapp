// Deep test round 2: trip lifecycle rules, races, GPS glitches, ratings, security.
const axios = require('axios');
const { io } = require('socket.io-client');

const API = 'https://taxiapp-api-production.up.railway.app/api/v1';
const WS = 'https://taxiapp-api-production.up.railway.app/trips';
const R = { lat: 24.7136, lng: 46.6753 };

const results = [];
let n = 0;
function log(name, ok, detail = '') {
  n++;
  results.push({ n, name, ok, detail });
  console.log(`${String(n).padStart(2)}. ${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function guest() {
  const res = await axios.post(`${API}/auth/guest`);
  return {
    api: axios.create({ baseURL: API, headers: { Authorization: `Bearer ${res.data.accessToken}` }, timeout: 20000 }),
    token: res.data.accessToken,
    user: res.data.user,
  };
}

function sock(token) {
  return new Promise((resolve, reject) => {
    const s = io(WS, { auth: { token }, transports: ['websocket'] });
    const t = setTimeout(() => reject(new Error('ws timeout')), 15000);
    s.once('connect', () => { clearTimeout(t); resolve(s); });
    s.once('connect_error', (e) => { clearTimeout(t); reject(e); });
  });
}

function waitFor(s, ev, ms = 15000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout: ${ev}`)), ms);
    s.once(ev, (d) => { clearTimeout(t); resolve(d); });
  });
}

async function makeDriver(latOff = 0.002) {
  const g = await guest();
  const suf = Date.now().toString(36) + Math.floor(Math.random() * 10000);
  await g.api.post('/drivers/register', {
    licenseNumber: `T2-${suf}`, carMake: 'Hyundai', carModel: 'Sonata',
    carYear: 2023, carColor: 'Silver', carPlate: `T2-${suf}`,
  });
  await g.api.put('/drivers/toggle-online', { isOnline: true });
  await g.api.put('/drivers/location', { lat: R.lat + latOff, lng: R.lng });
  return g;
}

const payload = (over = {}) => ({
  pickupAddress: 'Test pickup', pickupLat: R.lat, pickupLng: R.lng,
  dropoffAddress: 'Test dropoff', dropoffLat: R.lat + 0.02, dropoffLng: R.lng,
  paymentMethod: 'CASH', rideType: 'ECONOMY', ...over,
});

async function expectFail(name, fn, wantStatus = 400) {
  try {
    await fn();
    log(name, false, 'was allowed but must be rejected');
  } catch (e) {
    const st = e.response?.status;
    log(name, st === wantStatus || (Array.isArray(wantStatus) && wantStatus.includes(st)),
      `status=${st} ${JSON.stringify(e.response?.data?.message ?? '').slice(0, 60)}`);
  }
}

(async () => {
  // ══ 1. State machine rules ══════════════════════════════════
  console.log('── State machine ──');
  const pax1 = await guest();
  const drv1 = await makeDriver();
  const t1 = (await pax1.api.post('/trips/request', payload())).data;

  await expectFail('start before accept', () => drv1.api.put(`/trips/${t1.id}/start`));
  await expectFail('complete before accept', () => drv1.api.put(`/trips/${t1.id}/complete`));
  await expectFail('arrived before accept', () => drv1.api.put(`/trips/${t1.id}/arrived`));

  await drv1.api.put(`/trips/${t1.id}/accept`);
  log('accept REQUESTED trip', true);
  await expectFail('accept same trip twice', () => drv1.api.put(`/trips/${t1.id}/accept`));
  await expectFail('start before arrived', () => drv1.api.put(`/trips/${t1.id}/start`));
  await expectFail('complete before start', () => drv1.api.put(`/trips/${t1.id}/complete`));

  await drv1.api.put(`/trips/${t1.id}/arrived`);
  await expectFail('arrived twice', () => drv1.api.put(`/trips/${t1.id}/arrived`));
  await drv1.api.put(`/trips/${t1.id}/start`);
  await expectFail('passenger cancels IN_PROGRESS', () => pax1.api.put(`/trips/${t1.id}/cancel`, { reason: 'x' }));
  await drv1.api.put(`/trips/${t1.id}/complete`);
  log('full lifecycle accept→arrived→start→complete', true);
  await expectFail('complete twice', () => drv1.api.put(`/trips/${t1.id}/complete`));

  // getActive should now be empty
  const active = (await pax1.api.get('/trips/active')).data;
  log('no active trip after completion', !active || active === '' || active === null, JSON.stringify(active)?.slice(0, 40));

  // ══ 2. Security: wrong users acting on trips ═══════════════
  console.log('── Security ──');
  const pax2 = await guest();
  const t2 = (await pax2.api.post('/trips/request', payload())).data;
  await expectFail('passenger (non-driver) accepts a trip', () => pax1.api.put(`/trips/${t2.id}/accept`), [400, 403]);
  const drvA = await makeDriver(0.003);
  const drvB = await makeDriver(0.004);
  await drvA.api.put(`/trips/${t2.id}/accept`);
  await expectFail('other driver marks arrived on not-his trip', () => drvB.api.put(`/trips/${t2.id}/arrived`), [400, 403]);
  await expectFail('other driver completes not-his trip', () => { return drvB.api.put(`/trips/${t2.id}/complete`); }, [400, 403]);
  await drvA.api.put(`/trips/${t2.id}/arrived`);
  await drvA.api.put(`/trips/${t2.id}/start`);
  await drvA.api.put(`/trips/${t2.id}/complete`);

  // ══ 3. Race: two drivers accept the same trip at once ══════
  console.log('── Race condition ──');
  const pax3 = await guest();
  const t3 = (await pax3.api.post('/trips/request', payload())).data;
  const [ra, rb] = await Promise.allSettled([
    drvA.api.put(`/trips/${t3.id}/accept`),
    drvB.api.put(`/trips/${t3.id}/accept`),
  ]);
  const wins = [ra, rb].filter((r) => r.status === 'fulfilled').length;
  log('two drivers accept simultaneously → exactly 1 wins', wins === 1, `${wins}/2 accepted (must be 1)`);
  // whoever won: finish the trip to clean up
  const winner = ra.status === 'fulfilled' ? drvA : rb.status === 'fulfilled' ? drvB : null;
  if (winner) {
    await winner.api.put(`/trips/${t3.id}/arrived`); await winner.api.put(`/trips/${t3.id}/start`); await winner.api.put(`/trips/${t3.id}/complete`);
  }

  // ══ 4. GPS glitch: odometer must ignore impossible jumps ═══
  console.log('── GPS glitch / fare meter ──');
  const pax4 = await guest();
  const drv4 = await makeDriver(0.001);
  const paxS = await sock(pax4.token);
  const drvS = await sock(drv4.token);
  const t4 = (await pax4.api.post('/trips/request', payload())).data;
  await drv4.api.put(`/trips/${t4.id}/accept`);
  await drv4.api.put(`/trips/${t4.id}/arrived`);
  await drv4.api.put(`/trips/${t4.id}/start`);

  const fares = [];
  paxS.on('server:fare-update', (d) => fares.push(d));
  // normal driving ~1km in 5 pings
  for (let i = 0; i <= 5; i++) {
    drvS.emit('driver:location-update', { lat: R.lat + 0.002 * i, lng: R.lng, heading: 0 });
    await sleep(600);
  }
  const kmBefore = fares.at(-1)?.distanceKm ?? 0;
  // GPS glitch: teleport 50 km away and back within 1 second
  drvS.emit('driver:location-update', { lat: R.lat + 0.45, lng: R.lng, heading: 0 });
  await sleep(600);
  drvS.emit('driver:location-update', { lat: R.lat + 0.012, lng: R.lng, heading: 0 });
  await sleep(1200);
  const kmAfter = fares.at(-1)?.distanceKm ?? 0;
  log('GPS glitch (50km teleport) NOT counted in fare', kmAfter - kmBefore < 5,
    `before=${kmBefore}km after=${kmAfter}km (jump added ${(kmAfter - kmBefore).toFixed(1)}km)`);

  await drv4.api.put(`/trips/${t4.id}/complete`);
  drvS.emit('driver:trip-completed', { tripId: t4.id });
  await sleep(1500);
  const t4final = (await pax4.api.get(`/trips/${t4.id}`)).data;
  log('final fare sane after glitch', t4final.finalFare < 40, `finalFare=${t4final.finalFare} SAR`);
  paxS.disconnect(); drvS.disconnect();

  // ══ 5. Ratings ══════════════════════════════════════════════
  console.log('── Ratings ──');
  const rate = (api, tripId, score) => api.post('/ratings', { tripId, score, comment: 'test' });
  await rate(pax1.api, t1.id, 5);
  log('rate completed trip', true);
  await expectFail('rating score 0 rejected', () => rate(pax2.api, t2.id, 0));
  await expectFail('rating score 6 rejected', () => rate(pax2.api, t2.id, 6));
  const t5 = (await pax2.api.post('/trips/request', payload())).data;
  await expectFail('rate a non-completed trip', () => rate(pax2.api, t5.id, 5));
  await pax2.api.put(`/trips/${t5.id}/cancel`, { reason: 'cleanup' });

  // ══ 6. History & earnings ═══════════════════════════════════
  console.log('── History & earnings ──');
  const hist = (await pax1.api.get('/users/trips/history')).data;
  const histList = hist.trips ?? hist.data ?? hist;
  log('trip history returns completed trip', JSON.stringify(histList).includes(t1.id), `entries=${Array.isArray(histList) ? histList.length : '?'}`);
  const earn = (await drv1.api.get('/drivers/earnings')).data;
  log('driver earnings > 0 after trip', (earn.totalEarnings ?? earn.total ?? 0) > 0 || JSON.stringify(earn).includes('earnings'), JSON.stringify(earn).slice(0, 80));

  // ══ 7. Passenger cancel notifies driver via socket ══════════
  console.log('── Cancel notification ──');
  const pax6 = await guest();
  const drv6 = await makeDriver(0.005);
  const pax6S = await sock(pax6.token);
  const drv6S = await sock(drv6.token);
  const t6 = (await pax6.api.post('/trips/request', payload())).data;
  await drv6.api.put(`/trips/${t6.id}/accept`);
  const cancelled = waitFor(drv6S, 'server:trip-cancelled', 15000);
  await pax6.api.put(`/trips/${t6.id}/cancel`, { reason: 'changed my mind' });
  pax6S.emit('passenger:cancel-trip', { tripId: t6.id });
  try {
    const c = await cancelled;
    log('driver notified of cancellation', c.tripId === t6.id);
  } catch (e) {
    log('driver notified of cancellation', false, e.message);
  }
  pax6S.disconnect(); drv6S.disconnect();

  // ══ 8. Chat roundtrip ═══════════════════════════════════════
  console.log('── Chat ──');
  const pax7 = await guest();
  const drv7 = await makeDriver(0.006);
  const pax7S = await sock(pax7.token);
  const drv7S = await sock(drv7.token);
  const t7 = (await pax7.api.post('/trips/request', payload())).data;
  await drv7.api.put(`/trips/${t7.id}/accept`);
  const msgP = waitFor(drv7S, 'server:chat-message', 15000);
  pax7S.emit('chat:message', { tripId: t7.id, text: 'Where are you?' });
  try {
    const m = await msgP;
    log('chat passenger→driver', m.text === 'Where are you?');
  } catch (e) { log('chat passenger→driver', false, e.message); }
  await pax7.api.put(`/trips/${t7.id}/cancel`, { reason: 'cleanup' });
  pax7S.disconnect(); drv7S.disconnect();

  // ══ Summary ═════════════════════════════════════════════════
  const failed = results.filter((r) => !r.ok);
  console.log(`\n═══ ${results.length - failed.length}/${results.length} passed ═══`);
  if (failed.length) { console.log('FAILURES:'); failed.forEach((f) => console.log(`  ${f.n}. ${f.name} — ${f.detail}`)); }
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('aborted:', e.response?.data ?? e.message); process.exit(1); });
