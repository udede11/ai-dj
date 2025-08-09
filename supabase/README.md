# Supabase Backend Configuration

## Local Development Setup

1. Install Supabase CLI:
   ```bash
   brew install supabase/tap/supabase
   ```

2. Initialize Supabase in this directory:
   ```bash
   supabase init
   ```

3. Start local Supabase:
   ```bash
   supabase start
   ```

4. Get your local credentials:
   ```bash
   supabase status
   ```

5. Update `Supabase.swift` with your project URL and anon key.

## Database Schema (Example)

```sql
-- Example parties table
CREATE TABLE parties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mood TEXT,
    energy_level DECIMAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Environment Variables

Create a `.env` file in the app directory:
```
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
```