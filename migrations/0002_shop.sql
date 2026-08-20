-- Foldline shop book: customers, price book, jobs, takeoff lines

create table if not exists shop_settings (
  user_id text primary key,
  company_name text not null default 'My Shop',
  default_labor_rate double precision not null default 92,
  default_overhead_pct double precision not null default 18,
  default_profit_pct double precision not null default 12,
  default_tax_pct double precision not null default 0,
  default_waste_pct double precision not null default 10,
  has_seeded boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id serial primary key,
  user_id text not null,
  name text not null,
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists customers_user_id_idx on customers (user_id);

create table if not exists catalog_items (
  id serial primary key,
  user_id text not null,
  name text not null,
  category text not null default 'other',
  material text not null default 'galvalume',
  gauge text not null default '',
  unit text not null default 'lf',
  material_unit_cost double precision not null default 0,
  labor_hours_per_unit double precision not null default 0,
  waste_pct double precision not null default 10,
  notes text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists catalog_items_user_id_idx on catalog_items (user_id);

create table if not exists jobs (
  id serial primary key,
  user_id text not null,
  customer_id integer references customers(id) on delete set null,
  job_number text not null,
  name text not null,
  site_address text not null default '',
  status text not null default 'estimating',
  bid_date date,
  due_date date,
  labor_rate double precision not null default 92,
  overhead_pct double precision not null default 18,
  profit_pct double precision not null default 12,
  tax_pct double precision not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jobs_user_id_idx on jobs (user_id);
create unique index if not exists jobs_user_number_idx on jobs (user_id, job_number);

create table if not exists estimate_items (
  id serial primary key,
  user_id text not null,
  job_id integer not null references jobs(id) on delete cascade,
  catalog_item_id integer references catalog_items(id) on delete set null,
  category text not null default 'other',
  description text not null,
  material text not null default 'galvalume',
  gauge text not null default '',
  unit text not null default 'lf',
  quantity double precision not null default 0,
  waste_pct double precision not null default 10,
  material_unit_cost double precision not null default 0,
  labor_hours_per_unit double precision not null default 0,
  sort_order integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists estimate_items_job_idx on estimate_items (job_id);
create index if not exists estimate_items_user_idx on estimate_items (user_id);
