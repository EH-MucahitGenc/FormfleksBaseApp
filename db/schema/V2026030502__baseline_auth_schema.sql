CREATE TABLE IF NOT EXISTS schema_version (
    version      varchar(32) PRIMARY KEY,
    applied_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description  text NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id             uuid PRIMARY KEY,
    email          varchar(320) NOT NULL,
    auth_provider  varchar(30) NOT NULL DEFAULT 'Local',
    external_id    varchar(200),
    display_name   varchar(200),
    password_hash  varchar(500),
    created_at     timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     timestamptz NULL,
    active         boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id                     uuid PRIMARY KEY,
    user_id                uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash             varchar(200) NOT NULL,
    expires_at             timestamptz NOT NULL,
    revoked_at             timestamptz NULL,
    replaced_by_token_hash varchar(200),
    created_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             timestamptz NULL,
    active                 boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email
    ON users (email);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_auth_provider_external_id
    ON users (auth_provider, external_id)
    WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_id
    ON refresh_tokens (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_refresh_tokens_token_hash
    ON refresh_tokens (token_hash);

INSERT INTO schema_version(version, description)
VALUES ('2026030502', 'Baseline auth schema and indexes')
ON CONFLICT (version) DO NOTHING;
