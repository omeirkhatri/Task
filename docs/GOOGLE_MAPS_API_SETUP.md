# Map Setup

## Current Implementation

The map uses **OpenStreetMap** for standard map view and **Esri World Imagery** for satellite view via react-leaflet. **No API key is required** - both services are free and work reliably.

## Map Features

- ✅ **Standard Map View**: OpenStreetMap tiles (free, no API key needed)
- ✅ **Satellite View**: Esri World Imagery tiles (free, no API key needed)
- ✅ **Interactive Markers**: Appointment markers with hover effects and info windows
- ✅ **No Configuration Required**: Works out of the box

## If You Want Google Maps Features

If you need full Google Maps functionality (geocoding, directions, etc.), you would need to:

1. **Switch to Google Maps JavaScript API** (requires code changes)
2. **Get a Google Maps API Key** from [Google Cloud Console](https://console.cloud.google.com/)

However, for just displaying a map with markers (which is what we're doing), the current implementation works perfectly without an API key.

## Alternative Tile Providers

If you want to use a different tile service, you can modify the `TileLayer` component in `AppointmentMapView.tsx`:

- **Mapbox** (requires API key, free tier available)
- **CartoDB** (free, no API key needed)
- **Stamen Maps** (free, no API key needed)

## Current Status

✅ **The map works without an API key**  
✅ **OpenStreetMap tiles for standard view**  
✅ **Esri World Imagery for satellite view**  
✅ **No additional configuration needed**

