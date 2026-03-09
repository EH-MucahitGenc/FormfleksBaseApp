CREATE TABLE IF NOT EXISTS roles (
    id      uuid PRIMARY KEY,
    code    varchar(50) NOT NULL,
    name    varchar(150) NOT NULL,
    active  boolean NOT NULL DEFAULT true,
    CONSTRAINT uq_roles_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS departments (
    id      uuid PRIMARY KEY,
    code    varchar(50) NOT NULL,
    name    varchar(150) NOT NULL,
    active  boolean NOT NULL DEFAULT true,
    CONSTRAINT uq_departments_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS user_departments (
    user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    is_primary    boolean NOT NULL DEFAULT false,
    PRIMARY KEY (user_id, department_id)
);

CREATE TABLE IF NOT EXISTS form_types (
    id                 uuid PRIMARY KEY,
    code               varchar(50) NOT NULL,
    name               varchar(200) NOT NULL,
    description        text NULL,
    active             boolean NOT NULL DEFAULT true,
    created_by_user_id uuid NOT NULL REFERENCES users(id),
    created_at         timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_form_types_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS form_sections (
    id           uuid PRIMARY KEY,
    form_type_id uuid NOT NULL REFERENCES form_types(id) ON DELETE CASCADE,
    title        varchar(200) NOT NULL,
    sort_order   integer NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_form_sections_form_type_sort
    ON form_sections(form_type_id, sort_order);

CREATE TABLE IF NOT EXISTS form_fields (
    id                    uuid PRIMARY KEY,
    form_type_id          uuid NOT NULL REFERENCES form_types(id) ON DELETE CASCADE,
    section_id            uuid NULL REFERENCES form_sections(id) ON DELETE SET NULL,
    field_key             varchar(100) NOT NULL,
    label                 varchar(200) NOT NULL,
    field_type            smallint NOT NULL,
    is_required           boolean NOT NULL DEFAULT false,
    placeholder           varchar(200) NULL,
    help_text             text NULL,
    sort_order            integer NOT NULL,
    default_value         text NULL,
    visibility_rule_json  jsonb NULL,
    validation_rule_json  jsonb NULL,
    options_json          jsonb NULL,
    active                boolean NOT NULL DEFAULT true,
    CONSTRAINT uq_form_fields_type_key UNIQUE (form_type_id, field_key)
);
CREATE INDEX IF NOT EXISTS ix_form_fields_type_sort
    ON form_fields(form_type_id, sort_order);
CREATE INDEX IF NOT EXISTS ix_form_fields_visibility_gin
    ON form_fields USING gin(visibility_rule_json);
CREATE INDEX IF NOT EXISTS ix_form_fields_validation_gin
    ON form_fields USING gin(validation_rule_json);
CREATE INDEX IF NOT EXISTS ix_form_fields_options_gin
    ON form_fields USING gin(options_json);

CREATE TABLE IF NOT EXISTS workflow_definitions (
    id           uuid PRIMARY KEY,
    form_type_id uuid NOT NULL REFERENCES form_types(id) ON DELETE CASCADE,
    version_no   integer NOT NULL,
    is_active    boolean NOT NULL DEFAULT false,
    CONSTRAINT uq_workflow_definitions_type_version UNIQUE (form_type_id, version_no)
);
CREATE INDEX IF NOT EXISTS ix_workflow_definitions_type_active
    ON workflow_definitions(form_type_id, is_active);

CREATE TABLE IF NOT EXISTS workflow_steps (
    id                      uuid PRIMARY KEY,
    workflow_definition_id  uuid NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    step_no                 integer NOT NULL,
    name                    varchar(150) NOT NULL,
    assignee_type           smallint NOT NULL,
    assignee_user_id        uuid NULL REFERENCES users(id),
    assignee_role_id        uuid NULL REFERENCES roles(id),
    dynamic_rule_json       jsonb NULL,
    allow_return_for_revision boolean NOT NULL DEFAULT true,
    CONSTRAINT uq_workflow_steps_def_step UNIQUE (workflow_definition_id, step_no)
);
CREATE INDEX IF NOT EXISTS ix_workflow_steps_rule_gin
    ON workflow_steps USING gin(dynamic_rule_json);

CREATE TABLE IF NOT EXISTS form_requests (
    id                uuid PRIMARY KEY,
    form_type_id      uuid NOT NULL REFERENCES form_types(id),
    request_no        varchar(50) NOT NULL,
    requestor_user_id uuid NOT NULL REFERENCES users(id),
    status            smallint NOT NULL,
    current_step_no   integer NULL,
    concurrency_token bigint NOT NULL DEFAULT 1,
    created_at        timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at      timestamptz NULL,
    completed_at      timestamptz NULL,
    CONSTRAINT uq_form_requests_request_no UNIQUE (request_no)
);
CREATE INDEX IF NOT EXISTS ix_form_requests_requestor_created
    ON form_requests(requestor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_form_requests_status_step
    ON form_requests(status, current_step_no);

CREATE TABLE IF NOT EXISTS form_request_values (
    id             uuid PRIMARY KEY,
    request_id     uuid NOT NULL REFERENCES form_requests(id) ON DELETE CASCADE,
    field_id       uuid NOT NULL REFERENCES form_fields(id),
    field_key      varchar(100) NOT NULL,
    value_text     text NULL,
    value_number   numeric(18,6) NULL,
    value_datetime timestamptz NULL,
    value_bool     boolean NULL,
    value_json     jsonb NULL,
    CONSTRAINT uq_form_request_values_req_field UNIQUE (request_id, field_id)
);
CREATE INDEX IF NOT EXISTS ix_form_request_values_req_key
    ON form_request_values(request_id, field_key);
CREATE INDEX IF NOT EXISTS ix_form_request_values_json_gin
    ON form_request_values USING gin(value_json);

CREATE TABLE IF NOT EXISTS form_request_approvals (
    id                 uuid PRIMARY KEY,
    request_id         uuid NOT NULL REFERENCES form_requests(id) ON DELETE CASCADE,
    step_no            integer NOT NULL,
    workflow_step_id   uuid NOT NULL REFERENCES workflow_steps(id),
    status             smallint NOT NULL,
    assignee_user_id   uuid NULL REFERENCES users(id),
    assignee_role_id   uuid NULL REFERENCES roles(id),
    action_by_user_id  uuid NULL REFERENCES users(id),
    action_comment     text NULL,
    action_at          timestamptz NULL,
    concurrency_token  bigint NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_form_request_approvals_req_step
    ON form_request_approvals(request_id, step_no);
CREATE INDEX IF NOT EXISTS ix_form_request_approvals_pending
    ON form_request_approvals(status, assignee_role_id, assignee_user_id);

CREATE TABLE IF NOT EXISTS authorization_matrix (
    id            uuid PRIMARY KEY,
    form_type_id  uuid NOT NULL REFERENCES form_types(id) ON DELETE CASCADE,
    role_id       uuid NULL REFERENCES roles(id) ON DELETE CASCADE,
    user_id       uuid NULL REFERENCES users(id) ON DELETE CASCADE,
    can_create    boolean NOT NULL DEFAULT false,
    can_view_all  boolean NOT NULL DEFAULT false,
    can_approve   boolean NOT NULL DEFAULT false,
    CONSTRAINT uq_authorization_matrix UNIQUE (form_type_id, role_id, user_id)
);

CREATE TABLE IF NOT EXISTS department_approval_mapping (
    id            uuid PRIMARY KEY,
    department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    form_type_id  uuid NOT NULL REFERENCES form_types(id) ON DELETE CASCADE,
    step_no       integer NOT NULL,
    approver_role_id uuid NULL REFERENCES roles(id),
    approver_user_id uuid NULL REFERENCES users(id),
    CONSTRAINT uq_department_approval_mapping UNIQUE (department_id, form_type_id, step_no)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id            uuid PRIMARY KEY,
    entity_type   varchar(100) NOT NULL,
    entity_id     uuid NOT NULL,
    action_type   varchar(80) NOT NULL,
    actor_user_id uuid NULL REFERENCES users(id),
    detail_json   jsonb NULL,
    created_at    timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_audit_logs_entity
    ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_audit_logs_detail_gin
    ON audit_logs USING gin(detail_json);

INSERT INTO schema_version(version, description)
VALUES ('2026030503', 'Dynamic forms, workflow approvals, RBAC and audit platform schema')
ON CONFLICT (version) DO NOTHING;
