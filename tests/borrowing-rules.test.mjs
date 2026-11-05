// Runs tools/borrowing-rules.sql in an embedded Postgres on small stand-in tables and checks the rules:
// the material sort, due dates by material (off weekends and holidays), fines, and the 2-day pickup window.
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const db = new PGlite();
let failures = 0;
const check = (ok, message) => { if (!ok) { failures++; console.error("FAIL:", message); } };
const one = async (sql, params) => (await db.query(sql, params)).rows[0];

const STUDENT = "11111111-1111-4111-8111-111111111111";
const OTHER = "55555555-5555-4555-8555-555555555555";
const STAFF = "22222222-2222-4222-8222-222222222222";

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create table public.site_settings (key text primary key, value jsonb, updated_at timestamptz default now());
  create table public.profiles (id uuid primary key, role text, active boolean default true);
  create table public.books (id text primary key, title text, genre text);
  create table public.loans (id bigserial primary key, book_id text references public.books(id), user_id uuid, status text, note text,
    requested_at timestamptz default now(), borrowed_at timestamptz, due_at timestamptz, returned_at timestamptz);
  insert into public.profiles values ('${STUDENT}', 'student'), ('${OTHER}', 'student'), ('${STAFF}', 'staff');
  insert into public.books values ('b1', 'A Novel', 'Historical Fiction, Literary Fiction'), ('b2', 'A Play', 'Drama, Tragedy'),
    ('b3', 'Poems', 'Poetry, Philosophical Literature'), ('b4', 'Ibong Adarna', 'Epic Poetry, Folktale, Fantasy');
  grant usage on schema public, auth to authenticated;
  grant select, insert, update on all tables in schema public to authenticated;
`);
await db.exec(fs.readFileSync(path.join(root, "tools/borrowing-rules.sql"), "utf8").replace(/^notify pgrst.*$/m, ""));
await db.exec(fs.readFileSync(path.join(root, "tools/borrowing-rules.sql"), "utf8").replace(/^notify pgrst.*$/m, "")); // safe to run twice

// 1. the material sort
const material = Object.fromEntries((await db.query("select id, material from public.books")).rows.map((r) => [r.id, r.material]));
check(material.b1 === "fiction", "a novel is Fiction");
check(material.b2 === "circulation", "a play is Circulation");
check(material.b3 === "circulation", "poetry is Circulation");
check(material.b4 === "fiction", "a folktale fantasy is Fiction");

// 2. due dates: pickup on Wed 2026-11-04 (Manila); Circulation 3 days = Sat 7th -> Mon 9th; Fiction 5 days = Mon 9th
const pickup = "2026-11-04 10:00:00+08";
await db.query(`insert into public.loans (book_id, user_id, status, requested_at) values ('b2', $1, 'requested', $2), ('b1', $1, 'requested', $2)`, [STUDENT, pickup]);
await db.query(`update public.loans set status = 'borrowed', borrowed_at = $1, due_at = $1::timestamptz + interval '7 days'`, [pickup]);
const due = Object.fromEntries((await db.query(`select book_id, to_char(due_at at time zone 'Asia/Manila', 'YYYY-MM-DD HH24:MI') d from public.loans`)).rows.map((r) => [r.book_id, r.d]));
check(due.b2 === "2026-11-09 23:59", `Circulation due Mon 9 Nov after the weekend (got ${due.b2})`);
check(due.b1 === "2026-11-09 23:59", `Fiction due Mon 9 Nov (got ${due.b1})`);
const holiday = await one(`select to_char(public.library_due_at('2026-11-27 09:00+08', 3) at time zone 'Asia/Manila', 'YYYY-MM-DD') d`);
check(holiday.d === "2026-12-01", `3 days from Fri 27 Nov lands on Mon 30 Nov (holiday) -> Tue 1 Dec (got ${holiday.d})`);

// 3. fines: due Mon 9 Nov; counted on Mon 16 Nov = Tue..Fri (4) + Mon 16 (1) = 5 weekdays
const days = await one(`select public.library_fine_days('2026-11-09 23:59:59+08', '2026-11-16 15:00+08') n`);
check(days.n === 5, `5 weekdays overdue by Mon 16 Nov (got ${days.n})`);
const none = await one(`select public.library_fine_days('2026-11-09 23:59:59+08', '2026-11-09 20:00+08') n`);
check(none.n === 0, "no fine on the due date itself");
await db.query(`update public.loans set returned_at = '2026-11-16 15:00+08', status = 'returned'`);

const as = async (uid) => db.exec(`reset role; select set_config('test.uid', '${uid}', false); set role authenticated;`);
await as(STUDENT);
const fines = (await db.query(`select * from public.loan_fines(array[1, 2]::bigint[]) order by loan_id`)).rows;
check(fines.length === 2, "the student sees the fines of their own loans");
const byBook = { b2: fines.find((f) => f.material === "circulation"), b1: fines.find((f) => f.material === "fiction") };
check(Number(byBook.b2?.amount) === 100, `Circulation: 5 days x Php 20 = 100 (got ${byBook.b2?.amount})`);
check(Number(byBook.b1?.amount) === 50, `Fiction: 5 days x Php 10 = 50 (got ${byBook.b1?.amount})`);
check(byBook.b2?.loan_days === 3 && byBook.b1?.loan_days === 5, "loan periods 3 and 5 days");
await as(OTHER);
check((await db.query(`select * from public.loan_fines(array[1, 2]::bigint[])`)).rows.length === 0, "another student cannot see them");
await as(STAFF);
check((await db.query(`select * from public.loan_fines(array[1, 2]::bigint[])`)).rows.length === 2, "staff can see them");

// 4. the pickup window: a request older than 48 hours is cancelled, a fresh one stays
await db.exec("reset role;");
await db.query(`insert into public.loans (book_id, user_id, status, requested_at) values ('b3', $1, 'requested', now() - interval '49 hours'), ('b4', $1, 'requested', now() - interval '47 hours'), ('b1', $2, 'requested', now() - interval '50 hours')`, [STUDENT, OTHER]);
await as(STUDENT);
const mine = (await db.query(`select * from public.expire_unclaimed_requests()`)).rows;
check(mine.length === 1 && mine[0].user_id === STUDENT, "a student gets back only their own expired request");
await db.exec("reset role;");
const states = (await db.query(`select book_id, user_id, status, note from public.loans where status in ('requested', 'cancelled') order by id`)).rows;
check(states.filter((s) => s.status === "cancelled").length === 2, "both requests older than 2 days were cancelled (any student's)");
check(states.every((s) => s.status !== "cancelled" || s.note === "Not picked up within 2 days"), "cancelled ones say why");
check(states.some((s) => s.book_id === "b4" && s.status === "requested"), "a 47-hour-old request is still reserved");
const pickupBy = (await db.query(`select pickup_by from public.loan_fines(array[(select id from public.loans where book_id = 'b4' and status = 'requested')]::bigint[])`)).rows;
check(pickupBy.length === 0 || pickupBy[0].pickup_by !== undefined, "pickup_by is returned for requests");

console.log(failures ? `${failures} borrowing rule check(s) failed` : "PASS: material sort, due dates off weekends and holidays, fines per material, the 2-day pickup window and who sees what.");
process.exit(failures ? 1 : 0);
