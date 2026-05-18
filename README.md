# MarketFlow Supermarket Inventory

MarketFlow is a browser-first supermarket inventory system for grocery stock, departments, vendors, stock-in, checkout sales, stock counts, users and reports.

## Production Runtime

The frontend is self-contained and runs from the browser using localStorage.

Open:

```txt
frontend/index.html
```

Default login:

```txt
Email: admin@stockflow.com
Password: admin123
```

No batch launcher is required. Data is stored in the browser on the same machine.

## Optional API Backend

The Node/Express/MySQL backend is available for deployments that need shared database storage.

1. Import the database:

```txt
database/inventory.sql
```

2. Configure environment:

```bash
cd backend
copy .env.example .env
```

Set a strong `JWT_SECRET`, configure MySQL credentials, and set `FRONTEND_URL` to the deployed frontend origin.

3. Install and start:

```bash
npm install --prefix backend
npm run start --prefix backend
```

API health:

```txt
http://127.0.0.1:5000/api/health
```

To force the frontend to use the API instead of browser storage, run this once in the browser console:

```js
localStorage.setItem("marketflowUseApi", "true")
```

## Checks

```bash
npm run check
```

## Notes

- Keep `backend/.env` out of source control.
- Browser-mode data can be reset by clearing localStorage for the app.
- The optional API should be served behind HTTPS and a reverse proxy in production.
