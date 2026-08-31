-- =============================================================================
-- 0016_seed_churches.sql — seeds the Participant registration form's Church
-- dropdown (app_config.settings.churches) with the known church list. Only
-- fills the list in when it is still unset/empty, so it never clobbers an
-- admin's edits made via /admin/settings.
--
-- Run AFTER 0015_house_only_results.sql.
-- =============================================================================

update public.app_config
set settings = settings || jsonb_build_object(
    'churches', jsonb_build_array(
        'National headquarters',
        'Fountain of the living word church',
        'FGC Akoka',
        'FGC Iwaya 1',
        'Shepherd courts',
        'Christ Treasured Church',
        'FGC Yabatech',
        'FGC Makoko headquarters',
        'FGC Ajayi',
        'The Father''s place',
        'FGC Ebutemeta',
        'FGC Tejuosho',
        'Oak house'
    )
)
where id = 1
  and coalesce(jsonb_array_length(settings->'churches'), 0) = 0;
