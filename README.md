# FC26 Stats

Live EA Sports FC 26 Pro Clubs statistics for PS4 / Xbox One (last gen) and PS5 / Xbox Series (current gen). Search any club, view skill rating, squad stats, and a SofaScore-style match lineup with live EA player ratings.

Data is pulled from EA's unofficial Pro Clubs API (`proclubs.ea.com`) through a small server-side proxy with short-lived in-memory caching, so the site stays fast and doesn't hammer EA's servers.

## Tech stack

- **Frontend:** React 19 + React Router, Vite build
- **Backend:** [Hono](https://hono.dev) running on Node (`@hono/node-server`)
- No database — everything is fetched live from EA and cached in memory (45s–3min TTLs depending on endpoint)

## Local development

Requires Node.js 20+.

```bash
npm install
npm run dev
```

This starts a single server on `http://localhost:3000` that proxies API requests to EA and serves the Vite dev server with hot reload for everything else.

## Production build

```bash
npm run build   # builds the frontend into dist/
npm start       # builds nothing — just runs the server, serving dist/ as static files
```

The server reads `PORT` from the environment (defaults to `3000`) and `NODE_ENV=production` to switch from the Vite dev middleware to serving the built `dist/` folder.

## Deploying online

This app needs a **persistent Node process** (it's not a static site) because it proxies requests to EA's API with the right headers — EA blocks browser-origin requests without them. Any host that runs a long-lived Node server works. A few options:

### Option 1: Render (easiest, has a free tier)

1. Push this repo to GitHub (see below).
2. Go to [render.com](https://render.com) → **New +** → **Web Service** → connect your GitHub repo.
3. Render will detect `render.yaml` in this repo and pre-fill the settings:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Health check: `/api/health`
4. Click **Create Web Service**. Render gives you a `https://your-app.onrender.com` URL automatically.
5. Optional: add a custom domain under the service's **Settings → Custom Domains**.

Note: Render's free tier spins the service down after ~15 minutes of inactivity, so the first request after idling will be slow (cold start).

### Option 2: Railway / Fly.io (Docker-based)

A `Dockerfile` is included, so any Docker-friendly host works:

```bash
# Railway
railway init
railway up

# Fly.io
fly launch   # detects the Dockerfile automatically
fly deploy
```

Both platforms auto-assign a public URL and let you attach a custom domain.

### Option 3: Any VPS (DigitalOcean, Linode, a home server, etc.)

```bash
git clone <your-repo-url>
cd fc26-stats
npm install
npm run build
NODE_ENV=production PORT=3000 npm start
```

Run it behind a reverse proxy (nginx/Caddy) for HTTPS and a custom domain, and use a process manager like `pm2` or a systemd service so it restarts on crash/reboot.

## Pushing this repo to GitHub

```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/fc26-stats.git
git push -u origin main
```

## Disclaimer

This project uses EA's **unofficial**, undocumented Pro Clubs API. It is not affiliated with or endorsed by Electronic Arts. Endpoints can change or go down without notice, and heavy traffic may get rate-limited or blocked by EA — the built-in caching layer helps, but there are no guarantees of uptime or accuracy.
