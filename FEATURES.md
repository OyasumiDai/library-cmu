# Feature check: the old PHP system vs this site

Compared against "CMU Library Explorer, Complete Feature List" (14 pages, version 1.1).
**Done** = built and tested. **Different** = built, but works differently on purpose. **Not possible** = needs something a static site cannot do (reason given).

## Guest
| Feature | Status |
| --- | --- |
| Home hero with live counts (titles, student readers, games hosted) | Done |
| Quick catalog search with All / Genre / Category / Available now (asks to sign in) | Done |
| Feature cards, 4-step guide (Discover, Signal, Request, Building), About preview | Done |
| Library staff and development team section (admin managed) | Done |
| Footer with hours, contact and links | Different: hours and contact are editable in Settings (the old system had them fixed) |
| About, Terms (v1.1, sections from the database), Privacy | Done |
| Sign up: name, gender, student ID, email, password + confirm, live checks, strength meter, common passwords refused | Done |
| School email rule (told to the user and enforced by the database), closed registration, terms accepted and time recorded | Done |
| One sign-in page, role based landing, remember my email, session-expired notice, return to the page you were on | Done |
| Lockout: 3 wrong passwords, 1 / 3 / 5 / 10 / 15 / 30 / 60 minutes, live countdown | Different: counted per email on that device. Attacks from elsewhere are slowed by Supabase's own rate limit |
| Forgot password in 3 steps with a 6-digit code, digits-only box, paste, resend after 60 s, different email, success screen, same reply for unknown emails, other devices signed out, lock lifted | Done (needs the Supabase email template and SMTP, see the README) |
| Theme switch, site notice (dismissible), sign-in redirects, phone/tablet/desktop | Done (the theme picker is in Settings, as you asked) |

## Student
| Feature | Status |
| --- | --- |
| Catalog search, category and availability filters, 12 per page, book details, request with a confirmation step | Done, plus live Reserved / All borrowed status shared with the game |
| Borrowing limit, one open request per book | Done |
| My borrowing: statuses, due dates, overdue flag, cancel | Done |
| Updates, Game (offline / maintenance / live, opens inside the page), Help | Done |
| Profile: reminder banner, PH phone check, searchable course list, major only when the course has majors, year level | Done |
| Photo upload, change, remove (JPG, PNG, WEBP) | Done |
| Change password: needs the current one, 5 tries per 15 minutes, strength meter | Done |
| My activity: current / due soon / overdue / returned / read counts, Borrowed / Returned / Books read tabs, mark as read, timeline | Done |
| Emails: reset codes and formal library notices | Done, all in the library design with the crest logo |
| Borrow email with book details and a QR code (one QR per student for all their books, one compact email), pickup confirmation, return, declined, cancelled | New: works without n8n, sent once per loan, also for loans made in the game |
| Staff scan desk: scan the QR (camera or typed code) to confirm a pickup or record a return | New: `/pickup` |
| Assistant (n8n): answers, finds books, shows the asker's own loans, staff summary | New: read-only tools with limits, see `ASSISTANT_PROMPT.md` |
| Student notifications screen | Done (the old system did not have one) |

## Staff
| Feature | Status |
| --- | --- |
| Dashboard: greeting, quick search, 4 tiles, 14-day chart with change, waiting requests with check out / reject, overdue with Email, full titles, recent activity, quick actions, site status, refreshes every minute | Done |
| Analytics: 30 / 90 days, 12 months, all time; tiles; 4 charts; hover and keyboard; Chart / Table switch | Done |
| Manage Books: tiles, search, category filter, sorting, table or cover view, copies bar, drag-and-drop cover, suggestions, duplicate warning, copies counter with a reason, save and add another, archive | Done (the editor opens as a window rather than a side panel) |
| Borrowing: needs-attention first with "3 days overdue" labels, check out shows the due date, reject, record return, email, search | Done |
| Movements: day by day, type and date filters, CSV, links back to loans | Done |
| Announcements: filters, search, live preview, publish / unpublish, delete with confirmation | Done |
| My profile and notifications (filter, mark read, mark all, delete) | Done |
| Sidebar groups and notification bell | Different: groups are Manage / Library / Account; it collapses on phones |
| Permissions an admin can grant: Student Profiles, Edit Game, Host Game, Manage System, Reports, Audit Trail | Done, enforced by the database |
| Student Profiles: list with tiles as filters, search, filters, sorting, table or cards, profile panel (next / previous, counts, Overview / Loans / Books read / Activity), send notice with live preview | Done |
| Game management: details with student preview, hosting (live / maintenance / offline), start file checked before going live | Done |
| Manage System: library name, loan days, books per student, registration, domains, site notice | Done |
| Reports: 4 reports with filters, preview and CSV | Done (plain CSV, not formatted spreadsheets) |
| Audit trail: search by module, person and date, before-and-after for edits, CSV | Done |

## Administrator
| Feature | Status |
| --- | --- |
| Staff management: tiles, search, filters, cards, permission presets, edit permissions, enable / disable, reset password, staff notified | Done |
| Create staff accounts with a generated password | Different: the person registers first, then the admin makes them staff (creating accounts needs Supabase's secret key, which must never be in a website) |
| Manage team (photo, position, email, bio, groups, order) | Done |
| Locked accounts list with Unlock | Not possible: locks live on the device. Server-side locks need a Supabase Auth hook (paid plans) |
| Admin alerts: new staff account, system setting changed, permissions changed | Done. "Account locked repeatedly" is not possible for the reason above |

## System
| Feature | Status |
| --- | --- |
| Passwords hashed, forged-form protection, security headers | Done: Supabase hashes passwords (bcrypt); there are no cookies so forged forms do not apply; strict headers and a Content-Security-Policy are in `vercel.json` |
| Sessions end after 30 minutes idle or 8 hours total | Done |
| Rate limits on sign-in, registration, resets, uploads, reports, emails | Done: Supabase limits sign-in, sign-up and reset; the assistant and email functions limit themselves |
| Upload checks: type, size, dimensions, random names | Done |
| Email through the library's Gmail account, formal letter layout | Done: `api/notice.mjs` (set GMAIL_USER and GMAIL_APP_PASSWORD) |
| Audit log: sign-ins, catalog, loans, settings, staff and permission changes, report downloads, email notices | Done. Failed sign-ins are not logged (Supabase does not tell the database) |
| In-app notifications for staff (overdue loans, settings and permission changes) | Done. Overdue notices are produced when staff open the dashboard (a free plan has no scheduler) |
| Database and setup tools | Different: Supabase (Postgres). `supabase/*.sql` is the setup |
| Automated tests | Done: database rules, login lock and passwords, assistant, email, CSS completeness, broken links |
| Dark and light themes, keyboard navigation, screen-reader labels, reduced motion | Done (three themes) |
