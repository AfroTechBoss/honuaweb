-- Migration 011: add role column to profiles for admin access control
alter table profiles add column if not exists role text default 'user' check (role in ('user', 'admin', 'moderator'));
