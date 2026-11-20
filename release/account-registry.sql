-- STAGED ONLY. Run through the Account repository's reviewed migration process
-- after release authorization, BEFORE the one-shot public OAuth registration.
begin;
insert into public.account_apps (slug,name,description,path,product_url,sort_order,active)
values ('bunshou','Bunshō','Japanese sentence immersion. Guest-first, device-local learning with optional THIEPN identity.','/bunshou/','https://japanese.thiepn.dev/bunshou/',81,true);
insert into public.account_app_manifests (app_slug,manifest_version,identity_scope,data_scope,export_scope,capabilities,core_app_id)
values ('bunshou',1,'shared','isolated','app-owned','{"account":true,"guestFirst":true,"sync":false,"cloud_saves":false,"export_data":true,"isolatedData":true,"sharedIdentity":true,"activityTracking":false}'::jsonb,null);
insert into public.account_app_permissions (app_slug,permission_id,name,description,required,mutable_by_user,sensitivity,sort_order,active)
values ('bunshou','identity.basic','Basic account identity','Use your THIEPN identity to select your local Bunshō workspace.',true,false,'basic',10,true);
commit;
-- Deliberately fails on conflict rather than overwriting concurrent registry changes.
