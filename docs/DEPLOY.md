# Deploying to Vercel (free plan) with Supabase

The app runs on Vercel and stores its data in a Supabase Postgres database. Both free plans are enough:
the Bible text and catechism together are under 10 MB.

You will need: the code pushed to GitHub, a Vercel account, a Supabase account, and the WEB text file
(`eng-web_vpl.txt` from https://ebible.org/Scriptures/eng-web_vpl.zip).

## 1. Create the Supabase database

1. At https://supabase.com, choose **New project**.
   - **Name:** `biblequiz`
   - **Database password:** generate a strong one and keep it somewhere safe.
   - **Region:** the one closest to most of your users (e.g. Mumbai or Singapore for India).
     Remember it, because Vercel should use the same region (step 3).
2. When the project is ready, click **Connect** (top of the dashboard) → **ORMs** → **Prisma**.
   It shows two lines. Copy them, replacing `[YOUR-PASSWORD]` with the database password:
   - `DATABASE_URL`: the **transaction pooler**, port **6543**, ending in `?pgbouncer=true`
   - `DIRECT_URL`: the **session pooler**, port **5432**

## 2. Load the data (once, from your computer)

In the project folder, create a file named **`.env.production.local`**. It is ignored by git, so it is never
uploaded.

```
DATABASE_URL="<transaction pooler URL from step 1>"
DIRECT_URL="<session pooler URL from step 1>"
ADMIN_EMAIL="you@example.com"
ADMIN_PASSWORD="<a strong password, at least 12 characters>"
ADMIN_NAME="Kamal"
```

Then run, in this order:

```bash
npm run prod:migrate
```
```bash
npm run prod:seed
```
```bash
npm run prod:bible:import -- path/to/eng-web_vpl.txt
```
```bash
npm run prod:wsc:import
```

These create the tables, then your admin account (without the sample quiz), then the 31,103 WEB verses,
then the 107 catechism questions and 11 **draft** quizzes. Each step is safe to re-run.

After this you can delete `ADMIN_PASSWORD` from `.env.production.local`. It was only needed to create
the account.

## 3. Create the Vercel project

1. At https://vercel.com, choose **Add New → Project**, import the `biblequiz` GitHub repository, and keep
   the detected framework (**Next.js**).
2. Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | transaction pooler URL (port 6543, `?pgbouncer=true`) |
   | `DIRECT_URL` | session pooler URL (port 5432) |
   | `AUTH_SECRET` | a **new** value from `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

   `SITE_URL` is optional. Set it only if you add your own domain (e.g. `https://quiz.example.org`).
3. Click **Deploy**. The build runs `npm run vercel-build`, which applies any database migrations and then
   builds the app.
4. After the first deploy, go to **Settings → Functions → Function Region** and pick the region nearest
   your Supabase region, then redeploy. This keeps pages fast.

## 4. Check it

- Open `https://<your-project>.vercel.app/admin`, sign in with the admin email and password from step 2,
  then preview and publish the quizzes.
- Open a published quiz on your phone and share its link on WhatsApp to check the preview card.

## Later

- **Updating the app:** push to the `main` branch on GitHub. Vercel redeploys automatically, and new
  database migrations are applied during the build.
- **Forgotten admin password:** put the new password in `.env.production.local` and run
  `npm run prod:reset-password -- "<new password>"`.
- **Supabase free plan pauses projects after 7 days without activity.** Visitors keep it awake. If it does
  pause, open the Supabase dashboard and click **Restore**.
- **Backups:** the Supabase free plan does not include downloadable daily backups. Export important data
  occasionally (Supabase → Database → Backups, or `pg_dump`).
