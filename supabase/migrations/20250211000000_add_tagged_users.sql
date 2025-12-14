-- Add tagged_user_ids column to tasks table
alter table "public"."tasks" add column "tagged_user_ids" bigint[];

-- Add tagged_user_ids column to contactNotes table
alter table "public"."contactNotes" add column "tagged_user_ids" bigint[];

-- Add tagged_user_ids column to dealNotes table
alter table "public"."dealNotes" add column "tagged_user_ids" bigint[];

-- Create index for faster queries on tagged users in tasks
create index if not exists "tasks_tagged_user_ids_idx" on "public"."tasks" using gin ("tagged_user_ids");

-- Create index for faster queries on tagged users in contactNotes
create index if not exists "contactNotes_tagged_user_ids_idx" on "public"."contactNotes" using gin ("tagged_user_ids");

-- Create index for faster queries on tagged users in dealNotes
create index if not exists "dealNotes_tagged_user_ids_idx" on "public"."dealNotes" using gin ("tagged_user_ids");


