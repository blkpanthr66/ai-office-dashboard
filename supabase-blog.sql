-- Blog posts table
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text,
  cover_image text,
  category text default 'General',
  tags text[] default '{}',
  status text default 'draft' check (status in ('draft', 'published', 'archived')),
  author text default 'PinPoint Local AI',
  authored_by text default 'human' check (authored_by in ('human', 'ai')),
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Allow authenticated users to manage posts
alter table blog_posts enable row level security;

drop policy if exists "Authenticated users can manage blog posts" on blog_posts;
create policy "Authenticated users can manage blog posts"
  on blog_posts for all
  to authenticated
  using (true)
  with check (true);

-- Allow public (website) to read published posts
drop policy if exists "Public can read published posts" on blog_posts;
create policy "Public can read published posts"
  on blog_posts for select
  to anon
  using (status = 'published');
