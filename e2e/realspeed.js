// Verify the fare meter still ticks at realistic city driving speed (~54 km/h)
const axios = require('axios');
const { io } = require('socket.io-client');
const API = 'https://taxiapp-api-production.up.railway.app/api/v1';
const WS = 'https://taxiapp-api-production.up.railway.app/trips';
const R = { lat: 24.7136, lng: 46.6753 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function guest() {
  const res = await axios.post(`${API}/auth/guest`);
  return { api: axios.create({ baseURL: API, headers: { Authorization: `Bearer ${res.data.accessToken}` }, timeout: 20000 }), token: res.data.accessToken };
}
function sock(token) {
  return new Promise((res, rej) => {
    const s = io(WS, { auth: { token }, transports: ['websocket'] });
    s.once('connect', () => res(s)); s.once('connect_error', rej);
  });
}

(async () => {
  const pax = await guest();
  const drv = await guest();
  const suf = Date.now().toString(36);
  await drv.api.post('/drivers/register', { licenseNumber: `RS-${suf}`, carMake: 'Kia', carModel: 'Rio', carYear: 2022, carColor: 'Red', carPlate: `RS-${suf}` });
  await drv.api.put('/drivers/toggle-online', { isOnline: true });
  await drv.api.put('/drivers/location', { lat: R.lat, lng: R.lng });

  const trip = (await pax.api.post('/trips/request', {
    pickupAddress: 'a', pickupLat: R.lat, pickupLng: R.lng,
    dropoffAddress: 'b', dropoffLat: R.lat + 0.02, dropoffLng: R.lng,
    paymentMethod: 'CASH', rideType: 'ECONOMY',
  })).data;
  await drv.api.put(`/trips/${trip.id}/accept`);
  await drv.api.put(`/trips/${trip.id}/arrived`);
  await drv.api.put(`/trips/${trip.id}/start`);

  const paxS = await sock(pax.token);
  const drvS = await sock(drv.token);
  const fares = [];
  paxS.on('server:fare-update', (d) => fares.push(d));

  // Realistic: 15m per ping, 1 ping/second = 54 km/h city driving
  const stepDeg = 0.000135; // ≈15 m
  for (let i = 0; i <= 20; i++) {
    drvS.emit('driver:location-update', { lat: R.lat + stepDeg * i, lng: R.lng, heading: 0 });
    await sleep(1000);
  }
  await sleep(1500);

  const last = fares.filter((f) => f.moving).at(-1);
  const ticked = (last?.distanceKm ?? 0) >= 0.2 && (last?.currentFare ?? 0) > 5;
  console.log(`${ticked ? '✅' : '❌'} meter ticks at 54 km/h — ${fares.length} updates, ${last?.distanceKm} km, ${last?.currentFare} SAR`);

  await drv.api.put(`/trips/${trip.id}/complete`);
  drvS.emit('driver:trip-completed', { tripId: trip.id });
  await sleep(1500);
  const final = (await pax.api.get(`/trips/${trip.id}`)).data;
  const ok = final.finalFare > 5 && final.finalFare < 12;
  console.log(`${ok ? '✅' : '❌'} final fare from real km — ${final.finalFare} SAR for ${final.distanceKm} km`);
  process.exit(ticked && ok ? 0 : 1);
})().catch((e) => { console.error('aborted:', e.response?.data ?? e.message); process.exit(1); });
