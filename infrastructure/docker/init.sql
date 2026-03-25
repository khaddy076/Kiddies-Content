-- Kiddies Content - PostgreSQL initialization
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Read-only reporting user
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kiddies_readonly') THEN
    CREATE USER kiddies_readonly WITH PASSWORD 'readonly_secret';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE kiddies_content TO kiddies_readonly;
GRANT USAGE ON SCHEMA public TO kiddies_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO kiddies_readonly;
