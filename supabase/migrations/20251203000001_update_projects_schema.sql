-- Rename name to title
alter table projects rename column name to title;

-- Add status column
alter table projects add column status text default 'active';

-- Add tags column
alter table projects add column tags text[] default '{}';
