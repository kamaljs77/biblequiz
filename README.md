# Bible Quiz

A web app for Bible quizzes where every question is drawn from Scripture. The participant reads the
question and its verses (World English Bible), thinks while a timer runs, and then chooses from the
answers. See [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) for the full requirements.

## Getting started

Requires Node.js 20+ and a PostgreSQL database: a local install, or a separate free Supabase project
for development.

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET and ADMIN_PASSWORD
npm run db:migrate        # creates the tables
npm run db:seed           # creates the admin account and a sample quiz
npm run dev
```

To put the site online, follow [docs/DEPLOY.md](docs/DEPLOY.md) (Vercel + Supabase).

- Public site: http://localhost:3000 (sample quiz at `/quiz/sample-quiz`)
- Admin: http://localhost:3000/admin (sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`)

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Create the admin and the sample quiz (safe to re-run) |
| `npm run bible:import -- <file>` | Load the full WEB text (see below) |
| `npm run wsc:import` | Import the 107 Westminster Shorter Catechism questions and 11 draft quizzes (safe to re-run) |
| `npm run admin:reset-password -- <new>` | Reset a forgotten admin password |
| `npm run typecheck` / `npm run lint` | Checks |
| `npm run prod:*` | The same data commands against production, using `.env.production.local` (see [docs/DEPLOY.md](docs/DEPLOY.md)) |

## Loading content

1. Download the World English Bible (public domain) from eBible.org:
   https://ebible.org/Scriptures/eng-web_vpl.zip, and unzip it.
2. `npm run bible:import -- path/to/eng-web_vpl.txt` (loads the 66 canonical books, 31,103 verses).
3. `npm run wsc:import` checks every proof text against the WEB, then creates the catechism
   questions (`prisma/data/wsc.ts`) as drafts plus 11 draft quizzes. Review them in the admin, then publish.

## How it fits together

- **Next.js 15** (App Router) serves both the public pages and the `/admin` pages.
- **Prisma** with PostgreSQL (Supabase in production). `DATABASE_URL` is the pooled connection the app
  uses; `DIRECT_URL` is for migrations, which Vercel applies during `npm run vercel-build`.
- **Publishing freezes a quiz**: `lib/quizzes.ts` stores a JSON snapshot (`QuizSnapshot`), and public
  pages read only that snapshot, so later edits to the question bank never change a shared link.
- **Answers are released by the server** (`app/api/attempts/[id]/route.ts`): options are sent only after
  the thinking time (or "I'm ready", when allowed), and correct answers only after submitting.
- **Admin auth** is a single account with a signed, HTTP-only session cookie (`lib/auth.ts`).
