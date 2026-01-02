# Map View Setup Instructions

## Overview
The appointment map view has been implemented with interactive markers, hover effects, and detailed info windows. This document outlines the setup requirements.

## Required Packages

Install the following packages:

```bash
npm install react-leaflet leaflet @types/leaflet
```

## Database Migration

Run the migration to add latitude and longitude columns to the contacts table:

```bash
# For local Supabase
make supabase-apply-appointments
# or
npx supabase migration up

# For remote Supabase
npx supabase db push
```

The migration file is located at:
`supabase/migrations/20250131000000_add_coordinates_to_contacts.sql`

## Features Implemented

### ✅ Map Container
- Full-width container with rounded corners (rounded-lg)
- Default height of 625px
- Clean, modern appearance

### ✅ Individual Appointment Markers
- Rounded rectangle markers with downward-pointing arrow
- Status-based background colors:
  - Completed: Green (#10b981)
  - Cancelled: Red (#ef4444)
  - Confirmed: Blue (#3b82f6)
  - Scheduled: Amber (#f59e0b)
- Appointment type border colors:
  - Doctor on Call: Blue (#3b82f6)
  - Lab Test: Green (#10b981)
  - Teleconsultation: Purple (#8b5cf6)
  - Physiotherapy: Orange (#f59e0b)
  - Caregiver: Red (#ef4444)
  - IV Therapy: Cyan (#06b6d4)
- Time display in HH:MM format
- Hover effects with bounce animation
- Selection state with blue ring
- Click ripple animation

### ✅ Info Window
- Detailed information display
- Status badges with icons
- Appointment type badges
- Patient information
- Staff information
- Address display
- Smooth hover persistence

### ✅ Coordinate System
- Uses stored latitude/longitude from database
- Fallback to default location with random offset if coordinates missing
- Address construction from individual components

## Pending Features

### ⏳ Marker Clustering
Clustering is currently a placeholder. For full implementation, consider:
- Using `react-leaflet-cluster` or
- Implementing `supercluster` with custom marker grouping

## Usage

The map view is accessible from the Appointments page via the view toggle. Select "Map" to view appointments on the interactive map.

## Coordinate Input

Patients can have coordinates entered via:
1. Direct coordinate entry (latitude, longitude)
2. Google Maps link (with coordinate extraction)
3. Manual entry in patient form

The system will use stored coordinates when available, or fall back to a default location.

