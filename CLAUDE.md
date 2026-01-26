# Claude Code Notes

Project-specific knowledge and pitfalls for AI assistants working on this codebase.

## Running Scripts with Environment Variables

**Pitfall:** Using `source .env.local` loads variables into your shell, but they are NOT exported to child processes like Node.js.

**Wrong:**
```bash
source .env.local && npx tsx scripts/seed-restaurants.ts
# Variables won't be available in Node.js
```

**Correct:**
```bash
npx dotenv -e .env.local -- tsx scripts/seed-restaurants.ts
```

**Dependencies needed:**
- `dotenv-cli` - loads .env files for any command
- `tsx` - runs TypeScript files directly

## Project Structure

- `supabase/migrations/` - SQL migrations (run in order via Supabase dashboard or CLI)
- `scripts/` - Standalone scripts (excluded from Next.js build in tsconfig.json)
- `data/` - Static data files (e.g., restaurant seed data)
- `plans/` - Implementation plans and documentation

## Database

- Uses Supabase (PostgreSQL)
- Service role key required for scripts that bypass RLS
- Migrations should be run manually via Supabase dashboard or `npx supabase db push`
