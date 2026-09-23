import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, "locations.json");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Home location - Linköping. Change the coordinates if you want a different home city.
const HOME_LOCATION = {
  name: "Linköping",
  country: "Sweden",
  lat: 58.4109,
  lon: 15.6216,
};

// ---------- Simple "database" (JSON file) ----------
async function readLocations() {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeLocations(locations) {
  await fs.writeFile(DB_FILE, JSON.stringify(locations, null, 2));
}

// ---------- Helper: fetch weather from Open-Meteo ----------
// detailed = true also fetches today's high/low and the "feels like"
// temperature, for the detail view. Otherwise only what the list views
// need is fetched.
async function fetchWeather(lat, lon, unit, detailed = false) {
  const tempUnit = unit === "F" ? "fahrenheit" : "celsius";
  const currentFields = [
    "temperature_2m",
    "apparent_temperature",
    "weather_code",
    "wind_speed_10m",
    "relative_humidity_2m",
  ];
  const dailyFields = ["temperature_2m_max", "temperature_2m_min"];

  let url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=${currentFields.join(",")}` +
    `&temperature_unit=${tempUnit}&timezone=auto`;

  if (detailed) {
    url += `&daily=${dailyFields.join(",")}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not fetch weather data");
  const data = await res.json();

  if (detailed) {
    return {
      ...data.current,
      temp_max_today: data.daily?.temperature_2m_max?.[0],
      temp_min_today: data.daily?.temperature_2m_min?.[0],
    };
  }
  return data.current;
}

// ---------- API: weather for the home location ----------
app.get("/api/home", async (req, res) => {
  try {
    const unit = req.query.unit === "F" ? "F" : "C";
    const weather = await fetchWeather(HOME_LOCATION.lat, HOME_LOCATION.lon, unit);
    res.json({ location: HOME_LOCATION, weather });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- API: search places (Open-Meteo Geocoding) ----------
app.get("/api/search", async (req, res) => {
  const q = req.query.q;
  if (!q || q.trim().length < 2) {
    return res.json({ results: [] });
  }
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      q
    )}&count=6&language=en`;
    const r = await fetch(url);
    const data = await r.json();
    const results = (data.results || []).map((p) => ({
      name: p.name,
      country: p.country,
      admin1: p.admin1 || "",
      lat: p.latitude,
      lon: p.longitude,
    }));
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- API: weather for an arbitrary place ----------
// ?detailed=1 also returns "feels like" temperature and today's high/low,
// for the detail view shown when a place is clicked.
app.get("/api/weather", async (req, res) => {
  const { lat, lon } = req.query;
  const unit = req.query.unit === "F" ? "F" : "C";
  const detailed = req.query.detailed === "1";
  if (!lat || !lon) return res.status(400).json({ error: "lat/lon missing" });
  try {
    const weather = await fetchWeather(lat, lon, unit, detailed);
    res.json({ weather });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- CRUD: My List ----------

// READ - get saved locations
app.get("/api/locations", async (req, res) => {
  const locations = await readLocations();
  res.json({ locations });
});

// CREATE - save a location (star click)
app.post("/api/locations", async (req, res) => {
  const { name, country, admin1, lat, lon } = req.body;
  if (!name || lat === undefined || lon === undefined) {
    return res.status(400).json({ error: "Incomplete data" });
  }
  const locations = await readLocations();

  const exists = locations.some(
    (l) => l.name === name && l.lat === lat && l.lon === lon
  );
  if (exists) return res.status(200).json({ locations });

  const newLocation = {
    id: Date.now().toString(),
    name,
    country: country || "",
    admin1: admin1 || "",
    lat,
    lon,
  };
  locations.push(newLocation);
  await writeLocations(locations);
  res.status(201).json({ locations });
});

// DELETE - remove a location from the list
app.delete("/api/locations/:id", async (req, res) => {
  let locations = await readLocations();
  locations = locations.filter((l) => l.id !== req.params.id);
  await writeLocations(locations);
  res.json({ locations });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Weather app running on http://localhost:${PORT}`);
});
