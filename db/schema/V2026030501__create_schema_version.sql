CREATE TABLE IF NOT EXISTS schema_version (
    version      varchar(32) PRIMARY KEY,
    applied_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description  text NOT NULL
);

INSERT INTO schema_version(version, description)
VALUES ('2026030501', 'Create schema_version table')
ON CONFLICT (version) DO NOTHING;
