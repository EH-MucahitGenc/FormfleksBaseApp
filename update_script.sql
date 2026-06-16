CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
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
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
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
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE TABLE departments (
        id uuid NOT NULL,
        code character varying(50) NOT NULL,
        name character varying(150) NOT NULL,
        active boolean NOT NULL,
        CONSTRAINT "PK_departments" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
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
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
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
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
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
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
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
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE TABLE form_sections (
        id uuid NOT NULL,
        form_type_id uuid NOT NULL,
        title character varying(200) NOT NULL,
        sort_order integer NOT NULL,
        CONSTRAINT "PK_form_sections" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
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
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE TABLE roles (
        id uuid NOT NULL,
        code character varying(50) NOT NULL,
        name character varying(150) NOT NULL,
        active boolean NOT NULL,
        CONSTRAINT "PK_roles" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE TABLE user_departments (
        user_id uuid NOT NULL,
        department_id uuid NOT NULL,
        is_primary boolean NOT NULL,
        CONSTRAINT "PK_user_departments" PRIMARY KEY (user_id, department_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE TABLE user_roles (
        user_id uuid NOT NULL,
        role_id uuid NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY (user_id, role_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE TABLE workflow_definitions (
        id uuid NOT NULL,
        form_type_id uuid NOT NULL,
        version_no integer NOT NULL,
        is_active boolean NOT NULL,
        CONSTRAINT "PK_workflow_definitions" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
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
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE INDEX "IX_audit_logs_entity_type_entity_id_created_at" ON audit_logs (entity_type, entity_id, created_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE UNIQUE INDEX "IX_authorization_matrix_form_type_id_role_id_user_id" ON authorization_matrix (form_type_id, role_id, user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE UNIQUE INDEX "IX_departments_code" ON departments (code);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE UNIQUE INDEX "IX_form_fields_form_type_id_field_key" ON form_fields (form_type_id, field_key);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE INDEX "IX_form_fields_form_type_id_sort_order" ON form_fields (form_type_id, sort_order);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE INDEX "IX_form_request_approvals_request_id_step_no" ON form_request_approvals (request_id, step_no);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE INDEX "IX_form_request_approvals_status_assignee_role_id_assignee_use~" ON form_request_approvals (status, assignee_role_id, assignee_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE UNIQUE INDEX "IX_form_request_values_request_id_field_id" ON form_request_values (request_id, field_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE INDEX "IX_form_request_values_request_id_field_key" ON form_request_values (request_id, field_key);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE UNIQUE INDEX "IX_form_requests_request_no" ON form_requests (request_no);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE INDEX "IX_form_requests_requestor_user_id_created_at" ON form_requests (requestor_user_id, created_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE INDEX "IX_form_requests_status_current_step_no" ON form_requests (status, current_step_no);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE INDEX "IX_form_sections_form_type_id_sort_order" ON form_sections (form_type_id, sort_order);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE UNIQUE INDEX "IX_form_types_code" ON form_types (code);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE UNIQUE INDEX "IX_roles_code" ON roles (code);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE INDEX "IX_workflow_definitions_form_type_id_is_active" ON workflow_definitions (form_type_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE UNIQUE INDEX "IX_workflow_definitions_form_type_id_version_no" ON workflow_definitions (form_type_id, version_no);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    CREATE UNIQUE INDEX "IX_workflow_steps_workflow_definition_id_step_no" ON workflow_steps (workflow_definition_id, step_no);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260309114625_InitialDynamicForms') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260309114625_InitialDynamicForms', '8.0.28');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322184116_AddQdmsPersonelSync') THEN
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
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322184116_AddQdmsPersonelSync') THEN
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
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322184116_AddQdmsPersonelSync') THEN
    CREATE INDEX "IX_qdms_personel_sync_logs_start_time" ON qdms_personel_sync_logs (start_time);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322184116_AddQdmsPersonelSync') THEN
    CREATE INDEX "IX_qdms_personeller_linked_user_id" ON qdms_personeller (linked_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322184116_AddQdmsPersonelSync') THEN
    CREATE INDEX "IX_qdms_personeller_pozisyon_kodu" ON qdms_personeller (pozisyon_kodu);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322184116_AddQdmsPersonelSync') THEN
    CREATE UNIQUE INDEX "IX_qdms_personeller_sicil_no" ON qdms_personeller (sicil_no);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322184116_AddQdmsPersonelSync') THEN
    CREATE INDEX "IX_qdms_personeller_ust_pozisyon_kodu" ON qdms_personeller (ust_pozisyon_kodu);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322184116_AddQdmsPersonelSync') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260322184116_AddQdmsPersonelSync', '8.0.28');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322192140_EnterpriseWorkflowUpdate') THEN
    ALTER TABLE workflow_steps ADD fallback_action smallint NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322192140_EnterpriseWorkflowUpdate') THEN
    ALTER TABLE workflow_steps ADD fallback_user_id uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322192140_EnterpriseWorkflowUpdate') THEN
    ALTER TABLE workflow_steps ADD is_parallel boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322192140_EnterpriseWorkflowUpdate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260322192140_EnterpriseWorkflowUpdate', '8.0.28');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322220853_AddUserDelegations') THEN
    CREATE TABLE user_delegations (
        id uuid NOT NULL,
        delegator_user_id uuid NOT NULL,
        delegatee_user_id uuid NOT NULL,
        start_date timestamp with time zone NOT NULL,
        end_date timestamp with time zone NOT NULL,
        is_active boolean NOT NULL,
        reason character varying(300),
        created_at timestamp with time zone NOT NULL,
        CONSTRAINT "PK_user_delegations" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322220853_AddUserDelegations') THEN
    CREATE INDEX "IX_user_delegations_delegator_user_id" ON user_delegations (delegator_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322220853_AddUserDelegations') THEN
    CREATE INDEX "IX_user_delegations_delegator_user_id_is_active" ON user_delegations (delegator_user_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322220853_AddUserDelegations') THEN
    CREATE INDEX "IX_user_delegations_start_date_end_date" ON user_delegations (start_date, end_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322220853_AddUserDelegations') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260322220853_AddUserDelegations', '8.0.28');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260512084509_AddHrAuthorizations') THEN
    CREATE TABLE hr_authorizations (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        is_global_manager boolean NOT NULL,
        location_name character varying(150),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        active boolean NOT NULL,
        CONSTRAINT "PK_hr_authorizations" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260512084509_AddHrAuthorizations') THEN
    CREATE INDEX "IX_hr_authorizations_is_global_manager" ON hr_authorizations (is_global_manager);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260512084509_AddHrAuthorizations') THEN
    CREATE INDEX "IX_hr_authorizations_location_name_active" ON hr_authorizations (location_name, active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260512084509_AddHrAuthorizations') THEN
    CREATE INDEX "IX_hr_authorizations_user_id_active" ON hr_authorizations (user_id, active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260512084509_AddHrAuthorizations') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260512084509_AddHrAuthorizations', '8.0.28');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260512135713_CleanUpUnusedTables') THEN
    DROP TABLE authorization_matrix;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260512135713_CleanUpUnusedTables') THEN
    DROP TABLE department_approval_mapping;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260512135713_CleanUpUnusedTables') THEN
    DROP TABLE user_departments;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260512135713_CleanUpUnusedTables') THEN
    DROP TABLE departments;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260512135713_CleanUpUnusedTables') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260512135713_CleanUpUnusedTables', '8.0.28');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260514065053_UserLocationRoles') THEN
    DROP TABLE hr_authorizations;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260514065053_UserLocationRoles') THEN
    ALTER TABLE workflow_steps ADD "TargetLocationRoleId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260514065053_UserLocationRoles') THEN
    CREATE TABLE user_location_roles (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        role_id uuid NOT NULL,
        location_name character varying(150),
        is_global_manager boolean NOT NULL,
        is_active boolean NOT NULL,
        CONSTRAINT "PK_user_location_roles" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260514065053_UserLocationRoles') THEN
    CREATE INDEX "IX_user_location_roles_location_name" ON user_location_roles (location_name);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260514065053_UserLocationRoles') THEN
    CREATE INDEX "IX_user_location_roles_user_id_role_id" ON user_location_roles (user_id, role_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260514065053_UserLocationRoles') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260514065053_UserLocationRoles', '8.0.28');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260514132710_AddFormAuthorizationColumns') THEN
    ALTER TABLE form_types ADD "AllowedCreateRoleCodesJson" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260514132710_AddFormAuthorizationColumns') THEN
    ALTER TABLE form_types ADD "AllowedReportRoleCodesJson" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260514132710_AddFormAuthorizationColumns') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260514132710_AddFormAuthorizationColumns', '8.0.28');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260518085102_AddAppNotifications') THEN
    CREATE TABLE app_notifications (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        title character varying(200) NOT NULL,
        message text NOT NULL,
        reference_id uuid,
        action_url character varying(500),
        is_read boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        CONSTRAINT "PK_app_notifications" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260518085102_AddAppNotifications') THEN
    CREATE INDEX "IX_app_notifications_created_at" ON app_notifications (created_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260518085102_AddAppNotifications') THEN
    CREATE INDEX "IX_app_notifications_user_id_is_read" ON app_notifications (user_id, is_read);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260518085102_AddAppNotifications') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260518085102_AddAppNotifications', '8.0.28');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260518131933_AddSystemSettings') THEN
    CREATE TABLE system_settings (
        id character varying(100) NOT NULL,
        value jsonb NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT "PK_system_settings" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260518131933_AddSystemSettings') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260518131933_AddSystemSettings', '8.0.28');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260520102725_AddSoftDeleteToDelegations') THEN
    ALTER TABLE user_delegations ADD deleted_at timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260520102725_AddSoftDeleteToDelegations') THEN
    ALTER TABLE user_delegations ADD is_deleted boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260520102725_AddSoftDeleteToDelegations') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260520102725_AddSoftDeleteToDelegations', '8.0.28');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260615081521_AddIsGlobalManagerInfoOnly') THEN
    ALTER TABLE workflow_steps ADD "IsGlobalManagerInfoOnly" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260615081521_AddIsGlobalManagerInfoOnly') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260615081521_AddIsGlobalManagerInfoOnly', '8.0.28');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260616130051_AddFormRequestManualAssignments') THEN
    CREATE TABLE form_request_manual_assignments (
        id uuid NOT NULL,
        form_request_id uuid NOT NULL,
        step_no integer NOT NULL,
        assignee_user_id uuid,
        CONSTRAINT "PK_form_request_manual_assignments" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260616130051_AddFormRequestManualAssignments') THEN
    CREATE UNIQUE INDEX "IX_form_request_manual_assignments_form_request_id_step_no" ON form_request_manual_assignments (form_request_id, step_no);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260616130051_AddFormRequestManualAssignments') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260616130051_AddFormRequestManualAssignments', '8.0.28');
    END IF;
END $EF$;
COMMIT;

