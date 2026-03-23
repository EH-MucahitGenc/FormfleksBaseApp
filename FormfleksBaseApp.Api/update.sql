Build started...
Build succeeded.
CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

CREATE TABLE audit_logs (
    id uuid NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id uuid NOT NULL,
    action_type character varying(80) NOT NULL,
    actor_user_id uuid,
    detail_json jsonb,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_audit_logs" PRIMARY KEY (id)
);

CREATE TABLE authorization_matrix (
    id uuid NOT NULL,
    form_type_id uuid NOT NULL,
    role_id uuid,
    user_id uuid,
    can_create boolean NOT NULL,
    can_view_all boolean NOT NULL,
    can_approve boolean NOT NULL,
    CONSTRAINT "PK_authorization_matrix" PRIMARY KEY (id)
);

CREATE TABLE departments (
    id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    active boolean NOT NULL,
    CONSTRAINT "PK_departments" PRIMARY KEY (id)
);

CREATE TABLE form_fields (
    id uuid NOT NULL,
    form_type_id uuid NOT NULL,
    section_id uuid,
    field_key character varying(100) NOT NULL,
    label character varying(200) NOT NULL,
    field_type smallint NOT NULL,
    is_required boolean NOT NULL,
    placeholder character varying(200),
    help_text text,
    sort_order integer NOT NULL,
    default_value text,
    visibility_rule_json jsonb,
    validation_rule_json jsonb,
    options_json jsonb,
    active boolean NOT NULL,
    CONSTRAINT "PK_form_fields" PRIMARY KEY (id)
);

CREATE TABLE form_request_approvals (
    id uuid NOT NULL,
    request_id uuid NOT NULL,
    step_no integer NOT NULL,
    workflow_step_id uuid NOT NULL,
    status smallint NOT NULL,
    assignee_user_id uuid,
    assignee_role_id uuid,
    action_by_user_id uuid,
    action_comment text,
    action_at timestamp with time zone,
    concurrency_token bigint NOT NULL,
    CONSTRAINT "PK_form_request_approvals" PRIMARY KEY (id)
);

CREATE TABLE form_request_values (
    id uuid NOT NULL,
    request_id uuid NOT NULL,
    field_id uuid NOT NULL,
    field_key character varying(100) NOT NULL,
    value_text text,
    value_number numeric(18,6),
    value_datetime timestamp with time zone,
    value_bool boolean,
    value_json jsonb,
    CONSTRAINT "PK_form_request_values" PRIMARY KEY (id)
);

CREATE TABLE form_requests (
    id uuid NOT NULL,
    form_type_id uuid NOT NULL,
    request_no character varying(50) NOT NULL,
    requestor_user_id uuid NOT NULL,
    status smallint NOT NULL,
    current_step_no integer,
    concurrency_token bigint NOT NULL,
    created_at timestamp with time zone NOT NULL,
    submitted_at timestamp with time zone,
    completed_at timestamp with time zone,
    CONSTRAINT "PK_form_requests" PRIMARY KEY (id)
);

CREATE TABLE form_sections (
    id uuid NOT NULL,
    form_type_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    sort_order integer NOT NULL,
    CONSTRAINT "PK_form_sections" PRIMARY KEY (id)
);

CREATE TABLE form_types (
    id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    active boolean NOT NULL,
    created_by_user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_form_types" PRIMARY KEY (id)
);

CREATE TABLE roles (
    id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    active boolean NOT NULL,
    CONSTRAINT "PK_roles" PRIMARY KEY (id)
);

CREATE TABLE user_departments (
    user_id uuid NOT NULL,
    department_id uuid NOT NULL,
    is_primary boolean NOT NULL,
    CONSTRAINT "PK_user_departments" PRIMARY KEY (user_id, department_id)
);

CREATE TABLE user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    CONSTRAINT "PK_user_roles" PRIMARY KEY (user_id, role_id)
);

CREATE TABLE workflow_definitions (
    id uuid NOT NULL,
    form_type_id uuid NOT NULL,
    version_no integer NOT NULL,
    is_active boolean NOT NULL,
    CONSTRAINT "PK_workflow_definitions" PRIMARY KEY (id)
);

CREATE TABLE workflow_steps (
    id uuid NOT NULL,
    workflow_definition_id uuid NOT NULL,
    step_no integer NOT NULL,
    name character varying(150) NOT NULL,
    assignee_type smallint NOT NULL,
    assignee_user_id uuid,
    assignee_role_id uuid,
    dynamic_rule_json jsonb,
    allow_return_for_revision boolean NOT NULL,
    CONSTRAINT "PK_workflow_steps" PRIMARY KEY (id)
);

CREATE INDEX "IX_audit_logs_entity_type_entity_id_created_at" ON audit_logs (entity_type, entity_id, created_at);

CREATE UNIQUE INDEX "IX_authorization_matrix_form_type_id_role_id_user_id" ON authorization_matrix (form_type_id, role_id, user_id);

CREATE UNIQUE INDEX "IX_departments_code" ON departments (code);

CREATE UNIQUE INDEX "IX_form_fields_form_type_id_field_key" ON form_fields (form_type_id, field_key);

CREATE INDEX "IX_form_fields_form_type_id_sort_order" ON form_fields (form_type_id, sort_order);

CREATE INDEX "IX_form_request_approvals_request_id_step_no" ON form_request_approvals (request_id, step_no);

CREATE INDEX "IX_form_request_approvals_status_assignee_role_id_assignee_use~" ON form_request_approvals (status, assignee_role_id, assignee_user_id);

CREATE UNIQUE INDEX "IX_form_request_values_request_id_field_id" ON form_request_values (request_id, field_id);

CREATE INDEX "IX_form_request_values_request_id_field_key" ON form_request_values (request_id, field_key);

CREATE UNIQUE INDEX "IX_form_requests_request_no" ON form_requests (request_no);

CREATE INDEX "IX_form_requests_requestor_user_id_created_at" ON form_requests (requestor_user_id, created_at);

CREATE INDEX "IX_form_requests_status_current_step_no" ON form_requests (status, current_step_no);

CREATE INDEX "IX_form_sections_form_type_id_sort_order" ON form_sections (form_type_id, sort_order);

CREATE UNIQUE INDEX "IX_form_types_code" ON form_types (code);

CREATE UNIQUE INDEX "IX_roles_code" ON roles (code);

CREATE INDEX "IX_workflow_definitions_form_type_id_is_active" ON workflow_definitions (form_type_id, is_active);

CREATE UNIQUE INDEX "IX_workflow_definitions_form_type_id_version_no" ON workflow_definitions (form_type_id, version_no);

CREATE UNIQUE INDEX "IX_workflow_steps_workflow_definition_id_step_no" ON workflow_steps (workflow_definition_id, step_no);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260309114625_InitialDynamicForms', '8.0.25');

COMMIT;

START TRANSACTION;

CREATE TABLE qdms_personel_sync_logs (
    id uuid NOT NULL,
    triggered_by_user_id uuid NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    inserted_count integer NOT NULL,
    updated_count integer NOT NULL,
    deactivated_count integer NOT NULL,
    errors_json jsonb,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone,
    "Active" boolean NOT NULL,
    CONSTRAINT "PK_qdms_personel_sync_logs" PRIMARY KEY (id)
);

CREATE TABLE qdms_personeller (
    id uuid NOT NULL,
    sirket character varying(50) NOT NULL,
    isyeri_kodu character varying(50),
    isyeri_tanimi character varying(150),
    grup_kodu character varying(50),
    grup_kodu_aciklama character varying(150),
    sicil_no character varying(50) NOT NULL,
    adi character varying(100),
    soyadi character varying(100),
    email character varying(150),
    pozisyon_kodu character varying(50),
    pozisyon_aciklamasi character varying(150),
    ust_pozisyon_kodu character varying(50),
    departman_kodu character varying(50),
    departman_adi character varying(150),
    linked_user_id uuid,
    is_active boolean NOT NULL,
    last_sync_date timestamp with time zone,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone,
    "Active" boolean NOT NULL,
    CONSTRAINT "PK_qdms_personeller" PRIMARY KEY (id)
);

CREATE INDEX "IX_qdms_personel_sync_logs_start_time" ON qdms_personel_sync_logs (start_time);

CREATE INDEX "IX_qdms_personeller_linked_user_id" ON qdms_personeller (linked_user_id);

CREATE INDEX "IX_qdms_personeller_pozisyon_kodu" ON qdms_personeller (pozisyon_kodu);

CREATE UNIQUE INDEX "IX_qdms_personeller_sicil_no" ON qdms_personeller (sicil_no);

CREATE INDEX "IX_qdms_personeller_ust_pozisyon_kodu" ON qdms_personeller (ust_pozisyon_kodu);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260322184116_AddQdmsPersonelSync', '8.0.25');

COMMIT;


