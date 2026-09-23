# Weather App

Simple CRUD weather app (Phase 1 scratch project).

## Getting started

```bash
npm install
npm start
```

Then open http://localhost:3000 in your browser.

## What the app does

- Shows the current weather in Linköping (home location) at the top.
- Search for any place in the search box.
- Click the star to save a place to "My List" (Create).
- Saved places with current weather are shown in the list (Read).
- Click a place (search result or saved item) to see detailed weather info: feels-like temperature, humidity, wind, and today's high/low.
- Click "Remove" to delete a place from the list (Delete).
- The °C/°F toggle at the top switches the unit everywhere.

## Tech stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML/CSS/JS (no build process)
- **Database:** simple JSON file (`locations.json`, created automatically)
- **Weather data:** Open-Meteo API (search + forecast), no API key required

## Architecture

```
Browser (index.html)
    │  fetch() to /api/...
    ▼
Express (server.js)
    │
    ├─ Open-Meteo Geocoding API   (place search)
    ├─ Open-Meteo Forecast API    (weather data)
    └─ locations.json             (saved places, Create/Read/Delete)
```

## GenAI usage

Built with the help of Claude (Anthropic).
