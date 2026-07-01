-- 0008_employee_self_claim.sql
-- Lets a non-admin's self-service actions (leaving the roster, deleting
-- their own uploaded connections) be verified server-side instead of
-- trusted blindly from the request body. There was previously no link
-- between a login (users) and a roster row (employees), so any member
-- could pass any employeeId to those routes.
--
-- claimed_by_user_id is set the first time a non-admin successfully takes a
-- self-service action on a given roster row (first-come-first-claim); after
-- that, only the claiming user (or an admin, who always bypasses this) may
-- act on that row via the self-service routes.
alter table employees
  add column if not exists claimed_by_user_id uuid references users (id) on delete set null;
create index if not exists employees_claimed_by_user_id_idx on employees (claimed_by_user_id);
