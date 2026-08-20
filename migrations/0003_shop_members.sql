-- Invite-only shop accounts.
-- When shop_members has ANY row, only listed emails (or user_ids) may use the book.
-- Empty table = open bootstrap (preview / first deploy). Seed the owner after first sign-in.

create table if not exists shop_members (
  id serial primary key,
  email text not null,
  user_id text,
  role text not null default 'estimator',
  invited_by text,
  created_at timestamptz not null default now()
);

create unique index if not exists shop_members_email_idx
  on shop_members (lower(email));

create index if not exists shop_members_user_id_idx
  on shop_members (user_id)
  where user_id is not null;
