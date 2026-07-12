# fetch_merge_up_osm

This folder contains a script to fetch Uttar Pradesh district boundaries from OpenStreetMap (Overpass API), convert to GeoJSON and merge the missing district features into geojson/states/uttar-pradesh.geojson.

How to run (locally):

1. Ensure you have Node.js (>=14) and npm installed.
2. From the repository root run:

   npm install node-fetch@2 osmtogeojson

3. Run the script:

   node scripts/fetch_merge_up_osm.js

What it does:
- Calls the Overpass API to get relations with `admin_level=6` within the Uttar Pradesh administrative area.
- Converts OSM JSON to GeoJSON using `osmtogeojson`.
- Merges features into existing `geojson/states/uttar-pradesh.geojson` if a feature with the same district name (case-insensitive) isn't already present.
- Sets properties for added features:
  - `district`: OSM relation name
  - `st_nm`: "Uttar Pradesh"
  - `st_code`: "09"
  - `year`: "osm"
  - `dt_code`: omitted

Notes:
- The script uses the public Overpass API endpoint (https://overpass-api.de/api/interpreter). If you hit rate limits, try a different endpoint or run later.
- After running, review the merged GeoJSON and the added districts.
