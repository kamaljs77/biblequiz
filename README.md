# Bible Quiz

A web app for Bible quizzes where every question is drawn from Scripture. The participant reads the
question and its verses (World English Bible), thinks while a timer runs, and then chooses from the
answers. See [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) for the full requirements.

## Getting started

Requires Node.js 20+.

```bash
npm install
cp .env.example .env      # then fill in AUTH_SECRET and ADMIN_PASSWORD
npm run db:migrate        # creates prisma/dev.db (SQLite)
npm run db:seed           # creates the admin account and a sample quiz
npm run dev
```

- Public site: http://localhost:3000 (sample quiz at `/quiz/sample-quiz`)
- Admin: http://localhost:3000/admin (sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`)

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Create the admin and the sample quiz (safe to re-run) |
| `npm run bible:import -- <file.csv>` | Load the full WEB text (CSV with `book,chapter,verse,text` columns) |
| `npm run admin:reset-password -- <new>` | Reset a forgotten admin password |
| `npm run typecheck` / `npm run lint` | Checks |

## How it fits together

- **Next.js 15** (App Router) serves both the public pages and the `/admin` pages.
- **Prisma** with SQLite locally; switch the datasource to PostgreSQL for production.
- **Publishing freezes a quiz**: `lib/quizzes.ts` stores a JSON snapshot (`QuizSnapshot`), and public
  pages read only that snapshot, so later edits to the question bank never change a shared link.
- **Answers are released by the server** (`app/api/attempts/[id]/route.ts`): options are sent only after
  the thinking time (or "I'm ready", when allowed), and correct answers only after submitting.
- **Admin auth** is a single account with a signed, HTTP-only session cookie (`lib/auth.ts`).
