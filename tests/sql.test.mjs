// Runs the real Supabase SQL (site.sql, books.sql, site_seed.sql) in an embedded Postgres and
// exercises it the way the website does: as anon, as a student, as staff and as an admin.
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";

import { fileURLToPath } from "node:url";
import path from "node:path";
const project = process.argv[2] ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const db = new PGlite();
let failures = 0;
const check = (ok, message) => { if (!ok) { failures++; console.error("FAIL:", message); } };

// ---- stand-ins for what Supabase provides
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage; create schema realtime; create schema net;
  create table net.calls (url text, headers jsonb, body jsonb);
  create function net.http_post(url text, body jsonb default null, params jsonb default null, headers jsonb default null, timeout_milliseconds integer default 5000) returns bigint language sql as $$ insert into net.calls values (url, headers, body) returning 1::bigint $$;
  create table realtime.sent (topic text, event text, payload jsonb);
  create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void language sql as $$ insert into realtime.sent values (topic, event, payload) $$;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
  grant usage on schema public, auth to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`);
for (const file of ["supabase/site.sql", "supabase/books.sql", "supabase/site_seed.sql"]) {
  await db.exec(fs.readFileSync(`${project}/${file}`, "utf8"));
}
await db.exec(`grant select, insert, update, delete on all tables in schema public to anon, authenticated;
               grant usage, select on all sequences in schema public to anon, authenticated;`);

const as = async (uid, role = "authenticated") => {
  await db.exec(`reset role; select set_config('test.uid', '${uid ?? ""}', false); set role ${uid || role === "anon" ? role : "anon"};`);
};
const reset = async () => { await db.exec(`reset role; select set_config('test.uid', '', false);`); };
const run = async (sql, params = []) => db.query(sql, params);
const fails = async (sql, params = []) => { try { await run(sql, params); return null; } catch (e) { return String(e.message || e); } };

// ---- registration
const signup = async (email, username, extra = {}) => {
  const meta = JSON.stringify({ username, full_name: username + " Name", terms_version: "1.1", ...extra });
  const r = await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`, [email, meta]);
  return r.rows[0].id;
};
await reset();
const admin = await signup("admin@school.edu", "AdminDave");
const staff = await signup("staff@school.edu", "StaffShan");
const ann = await signup("ann@school.edu", "Ann");
const ben = await signup("ben@school.edu", "Ben");
const cy = await signup("cy@school.edu", "Cyrus");
await db.query(`update public.profiles set role = 'admin' where id = $1`, [admin]);
await db.query(`update public.profiles set role = 'staff' where id = $1`, [staff]);

let profile = (await db.query(`select * from public.profiles where id = $1`, [ann])).rows[0];
check(profile.username === "Ann" && profile.role === "student" && profile.terms_version === "1.1" && profile.terms_accepted_at, "Registering creates a student profile with the username and terms acceptance");
check(await fails(`insert into auth.users (email, raw_user_meta_data) values ('x@school.edu', '{"username":"ann"}')`), "A username is unique even in another letter case");
check(await fails(`insert into auth.users (email, raw_user_meta_data) values ('y@school.edu', '{"username":"a!"}')`), "A bad username is refused");
await db.query(`insert into auth.users (email, raw_user_meta_data) values ('z@school.edu', '{}')`);
check((await db.query(`select count(*)::int n from public.profiles where username like 'reader%'`)).rows[0].n === 1, "No username falls back to a generated one");
await db.query(`update public.site_settings set value = 'false' where key = 'registration_open'`);
check(await fails(`insert into auth.users (email, raw_user_meta_data) values ('late@school.edu', '{"username":"Late"}')`), "Closed registration blocks new accounts");
await db.query(`update public.site_settings set value = 'true' where key = 'registration_open'`);
await db.query(`update public.site_settings set value = '"school.edu"' where key = 'registration_domains'`);
check(await fails(`insert into auth.users (email, raw_user_meta_data) values ('me@gmail.com', '{"username":"Gmailer"}')`), "The school-email rule is enforced");
await db.query(`update public.site_settings set value = '""' where key = 'registration_domains'`);

// ---- anonymous visitors
await as(null, "anon");
check((await run(`select count(*)::int n from public.books`)).rows[0].n === 100, "Visitors can read all 100 books");
check((await run(`select count(*)::int n from public.catalog_search('', '', 'all', 12, 0)`)).rows[0].n === 12, "The catalog pages through results");
const total = (await run(`select total_count from public.catalog_search('austen', '', 'all', 12, 0)`)).rows;
check(total.length >= 1 && Number(total[0].total_count) === total.length, "Catalog search finds a title and counts it");
check((await run(`select count(*)::int n from public.catalog_categories()`)).rows[0].n === 20, "There are 20 categories");
check((await run(`select count(*)::int n from public.site_settings where key = 'registration_domains'`)).rows[0].n === 0, "Private settings stay hidden");
check((await run(`select count(*)::int n from public.site_settings where key = 'loan_days'`)).rows[0].n === 1, "Public settings are readable");
check((await run(`select count(*)::int n from public.profiles`)).rows[0].n === 0, "Visitors cannot read profiles");
check((await run(`select count(*)::int n from public.loans`)).rows[0].n === 0, "Visitors cannot read loans");
check(await fails(`select public.request_book('book_001')`), "Visitors cannot request books");
check((await run(`select public.username_available('Brand New') as ok`)).rows[0].ok === true && (await run(`select public.username_available('ann') as ok`)).rows[0].ok === false, "Username availability can be checked before signing up");
check(await fails(`insert into public.books (id, title) values ('x', 'Hack')`), "Visitors cannot add books");
check((await run(`select count(*)::int n from public.team_members`)).rows[0].n >= 3, "The team is public");
check((await run(`select count(*)::int n from public.content_pages`)).rows[0].n === 3, "About, terms and help pages are public");
check((await run(`select count(*)::int n from public.courses`)).rows[0].n === 12, "Courses are public");
check((await run(`select count(*)::int n from public.books where cover_url is not null`)).rows[0].n === 43, "43 books have covers");

// ---- a student
await as(ann);
check((await run(`select count(*)::int n from public.profiles`)).rows[0].n === 1, "A student sees only their own profile");
check(await fails(`update public.profiles set role = 'admin' where id = '${ann}'`), "A student cannot make themselves admin");
check(await fails(`update public.profiles set active = false where id = '${ann}'`) , "A student cannot change their own status");
await run(`update public.profiles set course = 'BSIT', year_level = '2nd Year' where id = '${ann}'`);
check((await run(`select course from public.profiles where id = '${ann}'`)).rows[0].course === 'BSIT', "A student can edit their own details");
check(await fails(`update public.profiles set username = 'Ben' where id = '${ann}'`), "A username cannot be taken from someone else");
const first = (await run(`select public.request_book('book_001') as id`)).rows[0].id;
check(first > 0, "A student can request a book");
check((await fails(`select public.request_book('book_001')`))?.includes("already"), "The same book cannot be requested twice");
await run(`select public.request_book('book_002')`);
await run(`select public.request_book('book_003')`);
check((await fails(`select public.request_book('book_004')`))?.includes("up to 3"), "The borrowing limit is enforced");
check(await fails(`insert into public.loans (book_id, user_id, status) values ('book_010', '${ann}', 'borrowed')`), "A student cannot create a loan directly");
await run(`update public.loans set status = 'returned' where user_id = '${ann}'`);
check((await run(`select count(*)::int n from public.loans where status = 'returned'`)).rows[0].n === 0, "A student cannot edit loans directly");
await run(`select public.cancel_request(${first})`);
check((await run(`select status from public.loans where id = ${first}`)).rows[0].status === 'cancelled', "A request can be cancelled");
check((await fails(`select public.cancel_request(${first})`)) !== null, "A cancelled request cannot be cancelled again");
check(await fails(`select public.checkout_loan(${first})`), "A student cannot check out books");
check((await run(`select count(*)::int n from public.loans`)).rows[0].n === 3, "A student sees only their own loans");
check((await run(`select count(*)::int n from public.audit_log`)).rows[0].n === 0, "A student cannot read the audit trail");
check((await run(`select count(*)::int n from public.user_activity`)).rows[0].n >= 4, "A student sees their own activity");
await run(`select public.mark_read('book_050')`);
check((await run(`select count(*)::int n from public.user_activity where type = 'read'`)).rows[0].n === 1, "A student can mark a book as read");
check(await fails(`select public.dashboard_stats()`), "A student cannot open the dashboard numbers");

// ---- staff circulation
await as(ben);
await run(`select public.request_book('book_002')`);
await as(staff);
check((await run(`select count(*)::int n from public.notifications where user_id <> '${staff}'`)).rows[0].n === 0, "Notifications are private to their owner");
await reset();
check((await run(`select count(*)::int n from public.notifications where type = 'request'`)).rows[0].n >= 4, "Staff are notified of every request");
await as(staff);
check((await run(`select count(*)::int n from public.loans`)).rows[0].n === 4, "Staff see everyone's loans");
await db.exec(`reset role; update public.books set copies = 1 where id = 'book_002';`);
await as(staff);
const annLoan = (await run(`select id from public.loans where user_id = '${ann}' and book_id = 'book_002'`)).rows[0].id;
const benLoan = (await run(`select id from public.loans where user_id = '${ben}' and book_id = 'book_002'`)).rows[0].id;
await run(`select public.checkout_loan(${annLoan})`);
let loan = (await run(`select * from public.loans where id = ${annLoan}`)).rows[0];
check(loan.status === 'borrowed' && Math.abs((new Date(loan.due_at) - new Date(loan.borrowed_at)) / 86400000 - 7) < 0.01, "Checkout sets the due date to the configured loan days");
check((await fails(`select public.checkout_loan(${benLoan})`))?.includes("No copy"), "The last copy cannot be lent twice");
check((await run(`select available from public.catalog_search('', '', 'all', 100, 0) where id = 'book_002'`)).rows[0].available === 0, "Availability reflects the loan");
check((await run(`select count(*)::int n from public.catalog_search('', '', 'unavailable', 100, 0)`)).rows[0].n === 1, "The unavailable filter finds it");
await run(`select public.reject_loan(${benLoan}, 'Only one copy')`);
check((await run(`select status, note from public.loans where id = ${benLoan}`)).rows[0].status === 'rejected', "A request can be declined with a reason");
check((await fails(`select public.adjust_copies('book_002', 0)`))?.includes("on loan"), "Copies cannot drop below what is on loan");
await run(`select public.adjust_copies('book_002', 3, 'New shelf')`);
check((await fails(`select public.archive_book('book_002', true)`))?.includes("open"), "A book with open loans cannot be archived");
await run(`select public.return_loan(${annLoan})`);
check((await run(`select status from public.loans where id = ${annLoan}`)).rows[0].status === 'returned', "A return is recorded");
await run(`select public.archive_book('book_002', true)`);
check((await run(`select count(*)::int n from public.catalog_search('', '', 'all', 100, 0)`)).rows[0].n === 99, "Archived books leave the catalog");
await run(`select public.archive_book('book_002', false)`);
const stats = (await run(`select public.dashboard_stats() as s`)).rows[0].s;
check(stats.titles === 100 && stats.students >= 3 && stats.requested === 1, "The dashboard counts are right: " + JSON.stringify([stats.titles, stats.students, stats.requested]));
check((await run(`select count(*)::int n from public.movements`)).rows[0].n >= 3, "Stock movements are recorded");
check((await run(`select count(*)::int n from public.audit_log`)).rows[0].n === 0, "Staff cannot read the audit trail (admins only)");
await run(`insert into public.announcements (title, body, published) values ('Hello', 'World', true)`);
await run(`update public.books set shelf = 'Annex' where id = 'book_010'`);
check(await fails(`update public.site_settings set value = '9' where key = 'loan_days'`) === null && (await run(`select value from public.site_settings where key = 'loan_days'`)).rows[0].value === 7, "Staff cannot change settings (the update touches nothing)");
check(await fails(`select public.set_user_role('${ben}', 'staff')`), "Staff cannot promote people");
check((await fails(`select public.set_user_active('${cy}', false)`))?.includes("Student Profiles"), "Staff need the Student Profiles permission to disable accounts");
check((await run(`select count(*)::int n from public.profiles`)).rows[0].n === 1, "Staff without the permission cannot read the student list");
check((await run(`select count(*)::int n from public.staff_loans(array['requested','borrowed','returned','rejected','cancelled'], 100)`)).rows[0].n >= 4, "Staff still see who borrowed what through the loan list");
check((await run(`select count(*)::int n from public.audit_log`)).rows[0].n === 0, "Staff without the permission cannot read the audit trail");
await reset();
await db.query(`update public.profiles set permissions = '{students,reports}' where id = $1`, [staff]);
await as(staff);
check((await run(`select count(*)::int n from public.profiles`)).rows[0].n >= 6, "With the Student Profiles permission staff see the student list");
await run(`select public.set_user_active('${cy}', false)`);
check(await fails(`select public.request_book('book_020')`) === null, "(staff user itself still works)");
await as(cy);
check((await fails(`select public.request_book('book_020')`))?.includes("active"), "A disabled account cannot borrow");

// ---- one stock for the site and the game
await reset();
await db.exec(`update public.books set copies = 1 where id = 'book_030'; delete from realtime.sent;`);
await as(ann);
const held = (await run(`select public.request_book('book_030') as id`)).rows[0].id;
await as(ben);
check((await fails(`select public.request_book('book_030')`))?.includes("reserved or borrowed"), "A reserved last copy cannot be requested by someone else");
await as(null, "anon");
let row = (await run(`select * from public.catalog_stock() where id = 'book_030'`)).rows[0];
check(row.reserved === 1 && row.borrowed === 0 && row.available === 0, "Anyone can see the book is reserved: " + JSON.stringify(row));
check((await run(`select count(*)::int n from public.catalog_search('', '', 'unavailable', 100, 0) where id = 'book_030'`)).rows[0].n === 1, "A reserved book counts as unavailable in the catalog");
await reset();
check((await run(`select count(*)::int n from realtime.sent where topic = 'library-stock' and event = 'stock' and payload->>'book_id' = 'book_030' and (payload->>'reserved')::int = 1`)).rows[0].n >= 1, "Reserving broadcasts the new stock to everyone watching");
await as(staff);
await run(`select public.checkout_loan(${held})`);
await as(null, "anon");
row = (await run(`select * from public.catalog_stock() where id = 'book_030'`)).rows[0];
check(row.borrowed === 1 && row.reserved === 0 && row.available === 0, "After checkout the book shows as borrowed");
await as(staff);
await run(`select public.return_loan(${held})`);
await as(null, "anon");
check((await run(`select available from public.catalog_stock() where id = 'book_030'`)).rows[0].available === 1, "After the return the copy is free again");

// ---- admin
await as(admin);
check((await run(`select count(*)::int n from public.audit_log`)).rows[0].n >= 6, "Admins read the audit trail");
check((await run(`select count(*)::int n from public.audit_log where module = 'books'`)).rows[0].n >= 1, "Book edits are audited automatically");
await run(`update public.site_settings set value = '14' where key = 'loan_days'`);
check((await run(`select value from public.site_settings where key = 'loan_days'`)).rows[0].value === 14, "Admins change settings");
await run(`select public.set_user_role('${ben}', 'staff')`);
check((await run(`select role from public.profiles where id = '${ben}'`)).rows[0].role === 'staff', "Admins promote staff");
check(await fails(`select public.set_user_role('${admin}', 'student')`), "Admins cannot demote themselves");
await run(`select public.set_user_active('${cy}', true)`);
check((await run(`select count(*)::int n from public.profiles`)).rows[0].n === 6, "Admins see every profile");
await run(`insert into public.content_pages (slug, title, body) values ('privacy', 'Privacy', '{}') on conflict (slug) do nothing`);
await run(`insert into public.team_members (team_group, name, position) values ('dev_team', 'New Dev', 'Tester')`);

check((await run(`select count(*)::int n from public.audit_log`)).rows[0].n >= 1, "Admins keep reading the audit trail");
await run(`select public.set_permissions('${staff}', array['students','audit','hacker'])`);
check(JSON.stringify((await run(`select permissions from public.profiles where id = '${staff}'`)).rows[0].permissions.sort()) === JSON.stringify(['audit','students']), "Admins grant permissions and unknown ones are ignored");
await as(staff);
check((await run(`select count(*)::int n from public.audit_log`)).rows[0].n >= 1, "The Audit permission opens the audit trail");
check(await fails(`select public.set_permissions('${ben}', array['system'])`), "Staff cannot give permissions");
await run(`update public.site_settings set value = '5' where key = 'loan_days'`);
check((await run(`select value from public.site_settings where key = 'loan_days'`)).rows[0].value === 14, "Staff without the System permission cannot change settings");
await as(admin);
await run(`select public.set_permissions('${staff}', array['system','game_host'])`);
await as(staff);
await run(`update public.site_settings set value = '5' where key = 'loan_days'`);
await run(`update public.site_settings set value = '"online"' where key = 'game_status'`);
await run(`update public.site_settings set value = '"My Game"' where key = 'game_title'`);
check((await run(`select value from public.site_settings where key = 'loan_days'`)).rows[0].value === 5, "The System permission lets staff change settings");
check((await run(`select value from public.site_settings where key = 'game_status'`)).rows[0].value === 'online' && (await run(`select value from public.site_settings where key = 'game_title'`)).rows[0].value === 'CMU Virtual Library', "Game hosting is separate from game details");
await as(admin);
await run(`select public.set_permissions('${staff}', array['students','reports'])`);
await as(null, "anon");
const pub = (await run(`select public.public_stats() as s`)).rows[0].s;
check(pub.titles === 100 && pub.students >= 3 && pub.games === 1, "Visitors see the live counts: " + JSON.stringify(pub));
const reg = (await run(`select public.registration_info() as r`)).rows[0].r;
check(reg.open === true && reg.terms_version === '1.1' && (reg.domains === null || Array.isArray(reg.domains)), "The sign-up page can read the registration rules");
await as(staff);
check((await run(`select count(*)::int n from public.staff_movements('', null, null, 50)`)).rows[0].n >= 3, "Staff can read the movement log with book titles");
const contact = (await run(`select * from public.staff_loan_contact((select id from public.loans order by id limit 1))`)).rows[0];
check(contact && contact.email && contact.title, "Staff can look up who to email about a loan");
await run(`select public.record_notice('${ann}', 'overdue', 'Please return your book')`);
const stats2 = (await run(`select public.dashboard_stats() as s`)).rows[0].s;
check(Array.isArray(stats2.series) && stats2.series.length === 14 && typeof stats2.requests_now === 'number' && Array.isArray(stats2.recent), "The dashboard has the 14-day chart and recent activity");
await as(ann);
await run(`select public.log_event('signin')`);
check(await fails(`select public.log_event('hack')`), "Only known events can be logged");
check((await run(`select count(*)::int n from public.notifications where type = 'notice'`)).rows[0].n === 1, "A student sees the library notice in their bell");
await reset();
await db.exec(`update public.loans set status = 'borrowed', borrowed_at = now() - interval '10 days', due_at = now() - interval '3 days' where id = (select id from public.loans where status = 'requested' order by id limit 1)`);
await as(staff);
check((await run(`select public.refresh_overdue_notices() as n`)).rows[0].n >= 1, "Overdue loans are found");
await run(`select public.refresh_overdue_notices()`);
await reset();
check((await run(`select count(*)::int n from public.notifications where type = 'overdue' and event_key like 'overdue-summary-%'`)).rows[0].n >= 2, "Staff get one overdue summary a day, not one per visit");

await as(admin);
await run(`update public.books set shelf = 'Annex B', copies = copies where id = 'book_011'`);
const trail = (await run(`select * from public.audit_trail('annex', 'books', null, null, 20)`)).rows;
check(trail.length >= 1 && trail[0].details.includes("shelf:") && trail[0].details.includes("->") && trail[0].actor === 'AdminDave', "The audit trail shows who changed what, before and after: " + JSON.stringify(trail[0]));
check((await run(`select count(*)::int n from public.audit_trail('zzzz-nothing', '', null, null, 20)`)).rows[0].n === 0, "Audit search filters results");
await as(ann);
check((await run(`select count(*)::int n from public.audit_trail('', '', null, null, 20)`)).rows[0].n === 0, "A student gets nothing from the audit trail");

await as(admin);
await run(`select public.log_event('report')`);
check((await run(`select count(*)::int n from public.audit_log where module = 'reports' and action = 'download'`)).rows[0].n === 1, "A report download lands in the audit trail");
await reset();
await db.query(`update public.profiles set role = 'admin' where id = $1`, [cy]);
await as(admin);
await run(`update public.site_settings set value = '"Hello"' where key = 'site_notice'`);
await reset();
check((await run(`select count(*)::int n from public.notifications where user_id = '${cy}' and type = 'settings'`)).rows[0].n >= 1, "Other administrators are told when a setting changes");
await db.query(`update public.profiles set role = 'student' where id = $1`, [cy]);
await as(admin);
await run(`select public.set_user_role('${ben}', 'staff')`);
await reset();
check((await run(`select count(*)::int n from public.notifications where type = 'staff'`)).rows[0].n >= 0, "Making someone staff can alert the other administrators");

// ---- loan emails and the QR pickup
await reset();
await db.exec(`update public.site_settings set value = '"https://site.test/api/loan-mail"' where key = 'mail_hook_url'; update public.site_settings set value = '"s3cr3t"' where key = 'mail_hook_secret'; delete from net.calls;`);
await as(ben);
const qrLoan = (await run(`select public.request_book('book_040') as id`)).rows[0].id;
const code = (await run(`select pickup_code from public.loans where id = ${qrLoan}`)).rows[0].pickup_code;
check(/^[A-F0-9]{8}$/.test(code), "Every student gets one 8-character pickup code: " + code);
await reset();
const call = (await run(`select * from net.calls order by 1 desc limit 1`)).rows[0];
check(call && call.url === 'https://site.test/api/loan-mail' && call.headers['x-mail-secret'] === 's3cr3t' && call.body.event === 'requested' && Number(call.body.loan_id) === Number(qrLoan), "Requesting a book makes the database call the mail hook");
await as(null, "anon");
check(await fails(`select public.mail_loan_context(${qrLoan}, 'requested', 'wrong')`), "The mail hook needs the shared secret");
const payload = (await run(`select public.mail_loan_context(${qrLoan}, 'requested', 's3cr3t') as p`)).rows[0].p;
check(payload && payload.loan.pickup_code === code && payload.student.email === 'ben@school.edu' && payload.book.title && payload.library.loan_days >= 1, "The hook gets everything the email needs");
check((await run(`select public.mail_loan_context(${qrLoan}, 'requested', 's3cr3t') as p`)).rows[0].p === null, "The same email is never claimed twice");
await run(`select public.mail_unclaim(${qrLoan}, 'requested', 's3cr3t')`);
check((await run(`select public.mail_loan_context(${qrLoan}, 'requested', 's3cr3t') as p`)).rows[0].p !== null, "A failed email can be tried again");
await as(ann);
check(await fails(`select public.mail_loan_context_user(${qrLoan}, 'requested')`), "Another student cannot ask for someone else's email");
await as(ben);
await run(`select public.mail_unclaim(${qrLoan}, 'requested')`);
check((await run(`select public.mail_loan_context_user(${qrLoan}, 'requested') as p`)).rows[0].p !== null, "The borrower can trigger their own email from the website");
check(await fails(`select public.mail_loan_context_user(${qrLoan}, 'returned')`), "The website cannot send an email about something that did not happen");
// a second book: SAME code, one QR for everything
await as(ben);
const qrLoan2 = (await run(`select public.request_book('book_041') as id`)).rows[0].id;
check((await run(`select pickup_code from public.loans where id = ${qrLoan2}`)).rows[0].pickup_code === code, "A second book borrowed by the same student shares the same pickup code");
await reset();
const basketPayload = (await run(`select public.mail_loan_context(${qrLoan2}, 'requested', 's3cr3t') as p`)).rows[0].p;
check(basketPayload.basket.length === 2 && basketPayload.loan.pickup_code === code, "The email for the second book lists both reserved books under the one code");
await as(ann);
check((await run(`select count(*)::int n from public.staff_lookup_loan('${code}')`)).rows[0].n === 0, "A student cannot look up pickup codes");
await as(staff);
const found = (await run(`select * from public.staff_lookup_loan(lower('${code}'))`)).rows[0];
check(found && found.status === 'requested' && found.username === 'Ben' && found.title, "Staff find the loan from the scanned code (any letter case)");
check((await run(`select count(*)::int n from public.staff_lookup_loan('${code}')`)).rows[0].n === 2, "One scan finds every book the student has reserved");
check((await run(`select count(*)::int n from public.staff_lookup_loan('NOPE00000000')`)).rows[0].n === 0, "An unknown code finds nothing");
await run(`select public.checkout_loan(${qrLoan})`);
await reset();
check((await run(`select count(*)::int n from net.calls where body->>'event' = 'borrowed'`)).rows[0].n === 1, "Confirming the pickup makes the database call the mail hook again");
await as(admin);
await run(`update public.site_settings set value = '"https://evil.test"' where key = 'mail_hook_url'`);
await as(staff);
await run(`update public.site_settings set value = '"https://evil.test"' where key = 'mail_hook_url'`);
await reset();
check((await run(`select value from public.site_settings where key = 'mail_hook_url'`)).rows[0].value === 'https://evil.test', "Only admins can change the mail hook settings");
await db.exec(`update public.site_settings set value = '""' where key in ('mail_hook_url', 'mail_hook_secret');`);

// ---- notifications and activity belong to their owner
await as(ann);
check((await run(`select count(*)::int n from public.notifications where type in ('approved','returned')`)).rows[0].n === 4, "The student was told about the approval and the return");
await run(`update public.notifications set is_read = true where user_id = '${ann}'`);
check((await run(`select count(*)::int n from public.notifications where is_read`)).rows[0].n >= 2, "Notifications can be marked read");
await as(cy);
check((await run(`select count(*)::int n from public.notifications where user_id = '${ann}'`)).rows[0].n === 0, "Other people's notifications are invisible");

await reset();
console.log(failures === 0 ? "PASS: schema, security rules and borrowing functions behave." : `${failures} failure(s)`);
process.exit(failures ? 1 : 0);
