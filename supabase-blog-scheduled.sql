-- Add 'scheduled' as a valid status for blog posts
alter table blog_posts drop constraint if exists blog_posts_status_check;
alter table blog_posts add constraint blog_posts_status_check
  check (status in ('draft', 'scheduled', 'published', 'archived'));
