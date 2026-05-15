CREATE TABLE IF NOT EXISTS permissions (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone NULL,
    active boolean NOT NULL DEFAULT true,
    name character varying(100) NOT NULL,
    description character varying(500) NULL,
    CONSTRAINT PK_permissions PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS IX_permissions_name ON permissions (name);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    CONSTRAINT PK_role_permissions PRIMARY KEY (role_id, permission_id),
    CONSTRAINT FK_role_permissions_roles_role_id FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
    CONSTRAINT FK_role_permissions_permissions_permission_id FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
);
