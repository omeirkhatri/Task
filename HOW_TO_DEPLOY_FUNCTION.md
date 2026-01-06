# 🚀 How to Deploy Edge Function to Cloud

## ⚠️ Important: Local vs Cloud

- **localhost:54323** (Local Supabase Studio) = **ONLY for local development**
  - You CANNOT deploy to cloud from here
  - This is just for testing locally
  
- **To deploy to cloud**, you MUST use:
  1. **CLI commands** (this guide)
  2. **Cloud Dashboard** (alternative)

## Step-by-Step: Deploy Using CLI

### Step 1: Check if you're linked to cloud project

Run this command:
```bash
npx supabase projects list
```

**If you see `vzwcxhydyqdudngxyres` with a checkmark (✓):**
- ✅ You're linked! Skip to Step 3

**If you DON'T see it or get an error:**
- ⚠️ You need to link first - go to Step 2

### Step 2: Link to Cloud Project

**Option A: Using Login (Recommended)**
```bash
# 1. Login (opens browser)
npx supabase login

# 2. Link to your project
npx supabase link --project-ref vzwcxhydyqdudngxyres --password YOUR_DB_PASSWORD
```
(Get password from: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/settings/database)

**Option B: Using Access Token (If login doesn't work)**
```bash
# 1. Get token from: https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN=your_token_here

# 2. Link to your project
npx supabase link --project-ref vzwcxhydyqdudngxyres --password YOUR_DB_PASSWORD
```

### Step 3: Deploy the Function

Once linked, deploy:
```bash
npx supabase functions deploy users
```

Or deploy all functions:
```bash
npx supabase functions deploy
```

### Step 4: Verify Deployment

1. Go to: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/functions
2. You should see `users` function listed
3. Try deleting a user - it should work now!

## Alternative: Deploy via Cloud Dashboard

If CLI doesn't work, use the dashboard:

1. **Go to:** https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/functions

2. **Click "Create a new function"**

3. **Name it:** `users`

4. **Copy the code from:** `supabase/functions/users/index.ts`
   - Open the file in your editor
   - Copy ALL the code
   - Paste into the dashboard editor

5. **Click "Deploy"**

## Troubleshooting

### "Command not found: supabase"
```bash
# Make sure you're using npx
npx supabase functions deploy users
```

### "Not authenticated"
```bash
npx supabase login
```

### "Project not linked"
```bash
npx supabase link --project-ref vzwcxhydyqdudngxyres --password YOUR_PASSWORD
```

### "Permission denied"
- Make sure you're logged into the correct Supabase account
- Verify you have access to project `vzwcxhydyqdudngxyres`

## Quick Test

Run this to see your linked projects:
```bash
npx supabase projects list
```

If you see `vzwcxhydyqdudngxyres` ✓, you're ready to deploy!

