# Investment Journal

A focused investment journal that helps you capture initial capital, log every trade, and visualize how each decision impacts total equity.

## Features

- **Seed onboarding** - set your starting capital on first sign-in.
- **Trade logging** - capture ticker, profit or loss, rationale, and trade date.
- **Capital progression chart** - see how cumulative results move your seed over time.
- **Persistent API** - Express server stores seed and trades as JSON for quick local development.

## Getting Started

```bash
npm install
npm run server # starts the Express API on http://localhost:4000
npm run dev    # launches Vite dev server on http://localhost:5173
```

Ensure `VITE_API_BASE_URL` is set if the API runs on a different host.

## API Overview

| Method | Endpoint                  | Description                 |
| ------ | ------------------------- | --------------------------- |
| GET    | `/api/portfolio`          | Fetch seed and all trades.  |
| POST   | `/api/portfolio/seed`     | Set or update initial seed. |
| POST   | `/api/portfolio/trades`   | Create a new trade entry.   |

## Tech Stack

- React 18, TypeScript, Vite
- Tailwind CSS for styling
- Zustand for state management
- Recharts for capital visualization
- Express for the JSON-backed API

## Environment Variables

- `VITE_API_BASE_URL` - defaults to `http://localhost:4000/api`.
- `VITE_APP_LOCALE` - locale passed to `Intl.NumberFormat` (defaults to `en-US`).
- `VITE_APP_CURRENCY` - ISO currency code used for formatting (defaults to `USD`).

## License

MIT