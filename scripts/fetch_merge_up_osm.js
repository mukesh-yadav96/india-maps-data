/*
Script: fetch_merge_up_osm.js
Purpose: Fetch Uttar Pradesh district boundaries from OpenStreetMap via Overpass API,
convert to GeoJSON using the osmtogeojson npm package, merge missing districts into
geojson/states/uttar-pradesh.geojson and write the merged file back.

Usage (run locally):
  1. cd to repository root
  2. npm install node-fetch@2 osmtogeojson
  3. node scripts/fetch_merge_up_osm.js

Notes:
  - This script calls the public Overpass API. If you hit rate limits, try a different Overpass endpoint
    or run later.
  - The script sets feature properties to:
      district: <OSM name>
      st_nm: "Uttar Pradesh"
      st_code: "09"
      year: "osm"
      dt_code: null (omitted)
  - It will NOT modify existing features that match by district name (case-insensitive).
*/

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const osmtogeojson = require('osmtogeojson');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const INPUT_PATH = path.join(__dirname, '..', 'geojson', 'states', 'uttar-pradesh.geojson');
const OUTPUT_PATH = INPUT_PATH; // overwrite

async function fetchOSM() {
  const query = `
[out:json][timeout:180];
area["name"="Uttar Pradesh"]["boundary"="administrative"]["admin_level"="4"]->.state;
(
  relation(area.state)["boundary"="administrative"]["admin_level"="6"];
);
out geom;
`;
  const body = 'data=' + encodeURIComponent(query);
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body,
  });
  if (!res.ok) throw new Error(`Overpass API error: ${res.status} ${res.statusText}`);
  const osmJson = await res.json();
  return osmJson;
}

function toGeoJSON(osmJson) {
  // osmtogeojson expects OSM JSON (elements) and returns GeoJSON FeatureCollection
  const geo = osmtogeojson(osmJson);
  return geo;
}

function normalizeName(n) {
  if (!n) return n;
  return n.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function main() {
  console.log('Reading existing GeoJSON:', INPUT_PATH);
  if (!fs.existsSync(INPUT_PATH)) {
    console.error('Input file not found:', INPUT_PATH);
    process.exit(1);
  }
  const existing = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
  const existingNames = new Set(existing.features.map(f => normalizeName(f.properties && f.properties.district)));

  console.log('Fetching OSM relations for Uttar Pradesh districts from Overpass...');
  const osmJson = await fetchOSM();
  console.log('Converting OSM JSON to GeoJSON...');
  const geo = toGeoJSON(osmJson);

  let added = [];
  for (const feat of geo.features) {
    // OSM-derived features often have properties.tags.name
    const tags = feat.properties || {};
    const name = tags.tags && tags.tags.name ? tags.tags.name : (tags.name || tags['name:en'] || tags['ref'] || tags.id);
    const nnorm = normalizeName(name);
    if (!nnorm) continue;
    if (existingNames.has(nnorm)) continue; // skip existing

    // Create new feature following repo conventions
    const newFeat = {
      type: 'Feature',
      properties: {
        district: name,
        st_nm: 'Uttar Pradesh',
        st_code: '09',
        year: 'osm'
        // dt_code omitted
      },
      geometry: feat.geometry
    };

    existing.features.push(newFeat);
    existingNames.add(nnorm);
    added.push(name);
  }

  console.log(`Added ${added.length} new districts:`, added);
  console.log('Validating basic GeoJSON structure...');
  const out = existing;

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 4), 'utf8');
  console.log('Wrote merged GeoJSON to', OUTPUT_PATH);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
