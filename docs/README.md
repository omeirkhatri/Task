# Documentation

This directory contains deployment and operational documentation for the project.

## Deployment Guides

- **QUICK_DEPLOY.md** - Quick start guide for deploying the application
- **DEPLOYMENT_GUIDE.md** - Comprehensive deployment guide with detailed instructions
- **DEPLOYMENT_CHECKLIST.md** - Checklist for deployment tasks

## Project Structure

The project follows an AI-friendly structure:

```
/
├── src/                    # Source code
│   ├── components/         # React components organized by feature
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   └── ...
├── docs/                   # Documentation (this directory)
├── scripts/                # Build and deployment scripts
├── supabase/               # Supabase configuration and migrations
├── test-data/              # Test data files
├── public/                 # Static assets
└── doc/                    # Documentation site (Astro/Starlight)
```

## Quick Links

- Main application entry: `src/App.tsx`
- Component library: `src/components/`
- Database migrations: `supabase/migrations/`
- Build scripts: `package.json` scripts section

