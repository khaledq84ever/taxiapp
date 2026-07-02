# TaxiApp E2E Tests

Automated tests that run against the **live API** (https://taxiapp-api-production.up.railway.app).
They create throwaway guest passengers and test drivers, so they are safe to run anytime.

## Run

```bash
cd e2e
npm install
npm test            # run everything
```

Or individually:

| Command | What it tests |
|---|---|
| `npm run test:flow` | Full ride + delivery flow over WebSockets: book → accept → GPS → live fare → complete (27 checks) |
| `npm run test:booking` | 48 booking cases: all ride/payment combos, cities, Arabic text, invalid input, auth, concurrency |
| `npm run test:lifecycle` | Trip state machine rules, two-driver accept race, GPS-glitch fare protection, ratings, chat, security (26 checks) |
| `npm run test:meter` | Fare meter ticks correctly at realistic city driving speed (54 km/h) |

## Bugs these tests caught (and are now guarded against)

- Stale REQUESTED trip blocking every new booking
- GPS teleport glitch adding phantom km (50 km jump → 253 SAR fare)
- Ratings endpoint rejecting all requests (missing DTO validation)
- Two drivers winning the same trip on simultaneous accept
