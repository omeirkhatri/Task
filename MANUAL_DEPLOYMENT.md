# 📋 Manual Deployment Guide for BestDOC Task Manager

Since the CLI linking is having permission issues, we'll deploy manually through the Supabase dashboard. This is actually straightforward!

## Step 1: Deploy Database Migrations

### Option A: Using Supabase Dashboard SQL Editor (Recommended)

1. **Go to SQL Editor:**
   - Visit: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/sql/new

2. **Run migrations in order:**
   - Open each migration file from `supabase/migrations/` (sorted by timestamp)
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press Cmd+Enter
   - Repeat for each migration file

### Migration Files to Run (in order):

Run these migrations in chronological order:

1. `20250131000000_add_coordinates_to_contacts.sql`
2. `20250217000000_create_staff.sql`
3. `20250218000000_create_appointments.sql`
4. `20250229000000_add_isclient_to_contacts_summary.sql`
5. `20251229131254_add_recurring_appointments.sql`
6. `20260102165313_create_payment_tracking.sql`
7. `20260102174731_update_package_status_on_usage.sql`
8. `20260103000000_add_renewed_from_package_id.sql`
9. `20260103000000_remove_confirmed_status.sql`
10. `20260104000000_add_color_to_services.sql`
11. `20260104000000_add_next_payment_date_to_packages.sql`
12. `20260104000001_ensure_payment_packages_only_clients.sql`
13. `20260104000002_update_client_validation_trigger.sql`
14. `20260105000000_add_name_to_payment_packages.sql`

**Note:** Skip any files starting with `._` (these are macOS metadata files)

### Option B: Run All Migrations at Once

You can also copy all migration contents into one SQL script and run it, but running them individually is safer and easier to debug.

## Step 2: Deploy Edge Functions

### Using Supabase Dashboard

1. **Go to Edge Functions:**
   - Visit: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/functions

2. **Deploy each function:**

   **Function 1: `installment-reminders`**
   - Click "Create a new function"
   - Name: `installment-reminders`
   - Copy contents from: `supabase/functions/installment-reminders/index.ts`
   - Paste into the editor
   - Click "Deploy"

   **Function 2: `postmark`**
   - Click "Create a new function"
   - Name: `postmark`
   - Copy contents from: `supabase/functions/postmark/index.ts`
   - Paste into the editor
   - Click "Deploy"

   **Function 3: `updatePassword`**
   - Click "Create a new function"
   - Name: `updatePassword`
   - Copy contents from: `supabase/functions/updatePassword/index.ts`
   - Paste into the editor
   - Click "Deploy"

   **Function 4: `users`**
   - Click "Create a new function"
   - Name: `users`
   - Copy contents from: `supabase/functions/users/index.ts`
   - Paste into the editor
   - Click "Deploy"

## Step 3: Verify Deployment

1. **Check Database:**
   - Go to: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/editor
   - Verify tables are created (payment_packages, payment_transactions, etc.)

2. **Check Functions:**
   - Go to: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/functions
   - Verify all functions are deployed and active

## Step 4: Deploy to Vercel

Now that Supabase is set up, deploy the frontend:

1. **Go to Vercel:**
   - Visit: https://vercel.com/new
   - Click "Continue with GitHub"
   - Select repository: `omeirkhatri/Task`
   - Click "Import"

2. **Add Environment Variables:**
   - `VITE_SUPABASE_URL` = `https://vzwcxhydyqdudngxyres.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_r05iMsuhCXEVgWXV9QY4TQ_4W2dC_nA`
   - `VITE_IS_DEMO` = `false`

3. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Copy your Vercel URL

## Step 5: Configure Supabase Auth

After you get your Vercel URL:

1. Go to: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/auth/url-configuration
2. Add Redirect URL: `https://your-vercel-url.vercel.app/auth-callback.html`
3. Set Site URL: `https://your-vercel-url.vercel.app`
4. Click "Save"

## ✅ You're Done!

Your BestDOC Task Manager should now be fully deployed and live!

## 🆘 Troubleshooting

### Migration Errors:
- If a migration fails, check the error message
- Some migrations might already be applied - that's okay, skip them
- Make sure you're running migrations in order

### Function Deployment Errors:
- Check that all dependencies are available
- Verify the function code is correct
- Check function logs in the dashboard

### Vercel Build Errors:
- Check build logs in Vercel dashboard
- Verify environment variables are set correctly
- Ensure all dependencies are in `package.json`

