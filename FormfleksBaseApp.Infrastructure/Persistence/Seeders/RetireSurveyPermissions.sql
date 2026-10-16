-- Preserve retired permission definitions and role links before removing them.
DO $cleanup$
DECLARE
    retired_ids uuid[];
BEGIN
    SELECT array_agg(id)
    INTO retired_ids
    FROM public.permissions
    WHERE name IN (
        'Surveys.Results.View',
        'Surveys.Results.ViewIdentified',
        'Surveys.Settings',
        'Surveys.Results.ManagePrivacy',
        'Surveys.Results.ManageTextCoding',
        'Surveys.Results.ViewDataQuality'
    );

    IF cardinality(retired_ids) > 0 THEN
        INSERT INTO public.audit_logs (
            id,
            entity_type,
            entity_id,
            action_type,
            actor_user_id,
            detail_json,
            created_at
        )
        VALUES (
            gen_random_uuid(),
            'SurveyPermissions',
            '00000000-0000-0000-0000-000000000000',
            'RetiredSurveyPermissionsRemoved',
            NULL,
            jsonb_build_object(
                'reason', 'Remove unused role permissions; retain campaign-scoped result grants.',
                'permissions', (
                    SELECT jsonb_agg(to_jsonb(p))
                    FROM public.permissions p
                    WHERE p.id = ANY(retired_ids)
                ),
                'rolePermissions', (
                    SELECT COALESCE(jsonb_agg(to_jsonb(rp)), '[]'::jsonb)
                    FROM public.role_permissions rp
                    WHERE rp.permission_id = ANY(retired_ids)
                )
            ),
            CURRENT_TIMESTAMP
        );

        DELETE FROM public.role_permissions
        WHERE permission_id = ANY(retired_ids);

        DELETE FROM public.permissions
        WHERE id = ANY(retired_ids);
    END IF;
END;
$cleanup$;
