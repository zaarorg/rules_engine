-- Extensions require superuser; run via Docker entrypoint before Flyway
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "ltree";
