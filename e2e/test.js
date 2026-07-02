// End-to-end test: full ride + delivery flow against the live TaxiApp API
const axios = require('axios');
const { io } = require('socket.io-client');

const API = 'https://taxiapp-api-production.up.railway.app/api/v1';
const WS = 'https://taxiapp-api-production.up.railway.app/trips';

// Riyadh test route: ~2 km north
const PICKUP = { lat: 24.7136, lng: 46.6753 };
const DROPOFF = { lat: 24.7336, lng: 46.6753 };

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const s = io(WS, { auth: { token }, transports: ['websocket'] });
    const t = setTimeout(() => reject(new Error('socket connect timeout')), 15000);
    s.once('connect', () => { clearTimeout(t); resolve(s); });
    s.once('connect_error', (e) => { clearTimeout(t); reject(e); });
  });
}

function waitFor(socket, event, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (data) => { clearTimeout(t); resolve(data); });
  });
}

async function makeGuest() {
  const res = await axios.post(`${API}/auth/guest`);
  return { token: res.data.accessToken, user: res.data.user };
}

function authed(token) {
  return axios.create({ baseURL: API, headers: { Authorization: `Bearer ${token}` }, timeout: 15000 });
}

async function makeDriver() {
  const { token } = await makeGuest();
  const api = authed(token);
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 1000);
  await api.post('/drivers/register', {
    licenseNumber: `TEST-${suffix}`,
    carMake: 'Toyota',
    carModel: 'Camry',
    carYear: 2022,
    carColor: 'White',
    carPlate: `TST-${suffix}`,
  });
  await api.put('/drivers/toggle-online', { isOnline: true });
  await api.put('/drivers/location', { lat: PICKUP.lat + 0.002, lng: PICKUP.lng });
  return { token, api };
}

async function runTrip({ label, tripPayload, driver, expectPackage }) {
  console.log(`\n━━━ ${label} ━━━`);
  const passenger = await makeGuest();
  const paxApi = authed(passenger.token);
  const paxSock = await connectSocket(passenger.token);
  const drvSock = await connectSocket(driver.token);
  check(`${label}: sockets connected`, true);

  // Estimate
  const est = await paxApi.post('/trips/estimate', {
    pickupLat: PICKUP.lat, pickupLng: PICKUP.lng,
    dropoffLat: DROPOFF.lat, dropoffLng: DROPOFF.lng,
  });
  const economyFare = est.data.options.find((o) => o.type === 'ECONOMY')?.fare;
  check(`${label}: fare estimate`, est.data.estimatedFare > 0, `${est.data.distanceKm} km · economy ${economyFare} SAR`);

  // Driver listens for the request BEFORE passenger broadcasts
  const reqPromise = waitFor(drvSock, 'server:new-trip-request', 25000);

  // Book
  const trip = (await paxApi.post('/trips/request', tripPayload)).data;
  check(`${label}: trip created`, !!trip.id, `id=${trip.id} type=${trip.tripType} fare=${trip.fareEstimate}`);
  if (expectPackage) {
    check(`${label}: package fields saved`, trip.packageDescription === tripPayload.packageDescription && trip.tripType === 'DELIVERY',
      `desc="${trip.packageDescription}" receiver=${trip.receiverName}/${trip.receiverPhone}`);
    check(`${label}: delivery priced as Economy`, Math.abs(trip.fareEstimate - economyFare) < 0.01,
      `fare=${trip.fareEstimate} vs economy=${economyFare}`);
  }
  paxSock.emit('passenger:trip-request', { tripId: trip.id });

  // Driver receives request
  const req = await reqPromise;
  check(`${label}: driver received request`, req.trip.id === trip.id,
    `tripType=${req.trip.tripType} pkg=${req.trip.packageDescription ?? '-'}`);
  if (expectPackage) {
    check(`${label}: driver sees package info`, req.trip.tripType === 'DELIVERY' && !!req.trip.packageDescription);
  }

  // Driver accepts
  const foundPromise = waitFor(paxSock, 'server:driver-found', 20000);
  await driver.api.put(`/trips/${trip.id}/accept`);
  drvSock.emit('driver:trip-accepted', { tripId: trip.id });
  const found = await foundPromise;
  check(`${label}: passenger got driver-found`, found.tripId === trip.id, `driver=${found.driver?.user?.name ?? found.driver?.id}`);

  // Arrived → start
  await driver.api.put(`/trips/${trip.id}/arrived`);
  await driver.api.put(`/trips/${trip.id}/start`);
  check(`${label}: trip started`, true);

  // Drive: emit GPS pings moving toward dropoff, expect live fare updates
  const fareUpdates = [];
  paxSock.on('server:fare-update', (d) => fareUpdates.push(d));
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const lat = PICKUP.lat + ((DROPOFF.lat - PICKUP.lat) * i) / steps;
    drvSock.emit('driver:location-update', { lat, lng: PICKUP.lng, heading: 0 });
    await sleep(700);
  }
  // Stopped in traffic — two pings at same spot
  drvSock.emit('driver:location-update', { lat: DROPOFF.lat, lng: DROPOFF.lng, heading: 0 });
  await sleep(700);
  drvSock.emit('driver:location-update', { lat: DROPOFF.lat, lng: DROPOFF.lng, heading: 0 });
  await sleep(1500);

  const movingUpdates = fareUpdates.filter((f) => f.moving);
  const pausedUpdates = fareUpdates.filter((f) => !f.moving);
  check(`${label}: live fare meter ticked`, movingUpdates.length >= 3,
    `${movingUpdates.length} moving updates, last fare ${movingUpdates.at(-1)?.currentFare} SAR @ ${movingUpdates.at(-1)?.distanceKm} km`);
  check(`${label}: meter pauses when stopped`, pausedUpdates.length >= 1, `${pausedUpdates.length} paused updates`);
  const faresIncrease = movingUpdates.every((f, i) => i === 0 || f.currentFare >= movingUpdates[i - 1].currentFare);
  check(`${label}: fare only increases`, faresIncrease);

  // Complete
  const completePromise = waitFor(paxSock, 'server:trip-update', 20000);
  await driver.api.put(`/trips/${trip.id}/complete`);
  drvSock.emit('driver:trip-completed', { tripId: trip.id });
  const done = await completePromise;
  check(`${label}: passenger got COMPLETED`, done.status === 'COMPLETED', `finalFare=${done.finalFare} SAR`);

  // Verify DB state
  const saved = (await paxApi.get(`/trips/${trip.id}`)).data;
  check(`${label}: final fare saved to DB`, saved.status === 'COMPLETED' && saved.finalFare > 0,
    `finalFare=${saved.finalFare} distanceKm=${saved.distanceKm}`);

  paxSock.disconnect();
  drvSock.disconnect();
  return saved;
}

async function testPublicDriverFeed(driverToken) {
  console.log('\n━━━ Public driver map feed ━━━');
  const watcher = await makeGuest();
  const watchSock = await connectSocket(watcher.token);
  watchSock.emit('join:public-drivers', {});
  await sleep(500);

  const drvSock = await connectSocket(driverToken);
  const pinPromise = waitFor(watchSock, 'public:driver-location', 15000);
  drvSock.emit('driver:location-update', { lat: PICKUP.lat, lng: PICKUP.lng, heading: 90 });
  try {
    const pin = await pinPromise;
    check('home map: live driver pin received', !!pin.driverId, `driver=${pin.driverId} @ ${pin.lat},${pin.lng}`);
  } catch (e) {
    check('home map: live driver pin received', false, e.message);
  }
  watchSock.disconnect();
  drvSock.disconnect();
}

(async () => {
  try {
    console.log('Setting up test driver...');
    const driver = await makeDriver();
    check('driver registered + auto-approved + online', true);

    await testPublicDriverFeed(driver.token);

    // 1) Normal ride (Comfort)
    await runTrip({
      label: 'RIDE',
      driver,
      tripPayload: {
        pickupAddress: 'King Fahd Rd, Riyadh',
        pickupLat: PICKUP.lat, pickupLng: PICKUP.lng,
        dropoffAddress: 'Olaya St, Riyadh',
        dropoffLat: DROPOFF.lat, dropoffLng: DROPOFF.lng,
        paymentMethod: 'CASH',
        rideType: 'COMFORT',
      },
    });

    // 2) Package delivery
    await runTrip({
      label: 'DELIVERY',
      driver,
      expectPackage: true,
      tripPayload: {
        pickupAddress: 'King Fahd Rd, Riyadh',
        pickupLat: PICKUP.lat, pickupLng: PICKUP.lng,
        dropoffAddress: 'Olaya St, Riyadh',
        dropoffLat: DROPOFF.lat, dropoffLng: DROPOFF.lng,
        paymentMethod: 'CASH',
        tripType: 'DELIVERY',
        packageDescription: 'Documents envelope',
        receiverName: 'Abu Salem',
        receiverPhone: '+966501234567',
      },
    });

    const failed = results.filter((r) => !r.ok);
    console.log(`\n═══ RESULT: ${results.length - failed.length}/${results.length} checks passed ═══`);
    process.exit(failed.length ? 1 : 0);
  } catch (e) {
    console.error('\n💥 Test aborted:', e.response?.data ?? e.message);
    process.exit(1);
  }
})();
