// Draws one program flowchart per DFD process (0, and 1.0 to 6.0 of the Level 1 diagram) into docs/program-flowcharts/,
// as SVG and PNG (through headless Edge/Chrome). The flow names match docs/dfd-level0 and docs/dfd-level1.
// Run: node tools/make-program-flowcharts.mjs
//
// A chart is a list of steps down one main column. Decisions branch three ways:
//   down:  the label of the line that carries on down the column
//   left:  { label, to }          a loop back up to an earlier step (drawn on the left)
//   right: { label, to, steps? }  a jump to another step, through an optional side column of steps (drawn on the right)
// A plain step with `jump: id` leaves to the right instead of falling through to the next step.
// `store: [name, "read" | "write" | "both"]` links a step to a data store on the far left.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "program-flowcharts");
const C = { primary: "#0a2e9c", edge: "#061c63", ink: "#14204a", tint: "#dfe8fb", soft: "#eef2fc", accent: "#f5a800", yes: "#2E8540", no: "#B3261E" };

const charts = [
  { file: "0-cmu-library-explorer-system", title: "0 · CMU Library Explorer System (main program)", steps: [
    { id: "start", t: "term", text: "Start" },
    { t: "io", text: "Open the website landing page" },
    { t: "proc", text: "Load the site settings and any saved session", store: ["D6 Settings & Audit Log", "read"] },
    { id: "signed", t: "dec", text: "Signed in?", down: "Yes", right: { label: "No", to: "signed", steps: [{ t: "sub", text: "1.0 Registration & Authentication" }] } },
    { id: "menu", t: "io", text: "Read the option picked from the menu (shown by role)" },
    { t: "dec", text: "Catalog or books?", down: "No", right: { label: "Yes", to: "again", steps: [{ t: "sub", text: "2.0 Catalog & Book Management" }] } },
    { t: "dec", text: "Borrow, ticket, pickup or return?", down: "No", right: { label: "Yes", to: "again", steps: [{ t: "sub", text: "3.0 Borrowing & Circulation" }] } },
    { t: "dec", text: "Notifications or announcements?", down: "No", right: { label: "Yes", to: "again", steps: [{ t: "sub", text: "4.0 Notifications & Announcements" }] } },
    { t: "dec", text: "Reports or analytics?", down: "No", right: { label: "Yes", to: "again", steps: [{ t: "sub", text: "5.0 Reports & Analytics" }] } },
    { t: "dec", text: "System administration?", down: "No", right: { label: "Yes", to: "again", steps: [{ t: "sub", text: "6.0 System Administration" }] } },
    { t: "dec", text: "Open the 2D-3D library game?", down: "No", right: { label: "Yes", to: "again", steps: [{ t: "proc", text: "Launch the game with the same session" }] } },
    { id: "again", t: "dec", text: "Another task?", down: "No", left: { label: "Yes", to: "menu" } },
    { t: "proc", text: "Log out and clear the session" },
    { id: "end", t: "term", text: "End" },
  ] },

  { file: "1-registration-and-authentication", title: "1.0 · Registration & Authentication", steps: [
    { t: "term", text: "Start" },
    { t: "io", text: "Choose Sign in or Create account" },
    { t: "dec", text: "Create account?", down: "Yes", right: { label: "No", to: "login" } },
    { id: "details", t: "io", text: "Enter Registration Details: username, email, password, student ID, course, year" },
    { t: "dec", text: "Details valid, username and email free?", down: "Yes", left: { label: "No", to: "details" } },
    { t: "proc", text: "Email a 6-digit verification code" },
    { id: "code", t: "io", text: "Enter the verification code" },
    { t: "dec", text: "Code correct?", down: "Yes", left: { label: "No", to: "code" } },
    { t: "proc", text: "Create the account and student profile", store: ["D1 User Accounts", "write"] },
    { id: "login", t: "io", text: "Enter Login Credentials (email and password)" },
    { t: "dec", text: "Sign-in locked for this email?", down: "No", right: { label: "Yes", to: "login", steps: [{ t: "io", text: "Show the time left until the lock ends" }] } },
    { t: "proc", text: "Check the credentials against User Accounts", store: ["D1 User Accounts", "read"] },
    { t: "dec", text: "Credentials valid?", down: "Yes", right: { label: "No", to: "login", steps: [{ t: "proc", text: "Count the failed try; lock after too many" }] } },
    { t: "proc", text: "Load the profile and role; start the session", store: ["D1 User Accounts", "read"] },
    { t: "dec", text: "Open the game?", down: "No", right: { label: "Yes", to: "end", steps: [{ t: "io", text: "Show the 2D-3D Library Game with the same session" }] } },
    { t: "dec", text: "Staff or admin?", down: "No", right: { label: "Yes", to: "end", steps: [{ t: "io", text: "Open the staff dashboard" }] } },
    { t: "io", text: "Open the student catalog (Discover)" },
    { id: "end", t: "term", text: "End" },
  ] },

  { file: "2-catalog-and-book-management", title: "2.0 · Catalog & Book Management", steps: [
    { t: "term", text: "Start" },
    { t: "dec", text: "Staff or admin?", down: "No", right: { label: "Yes", to: "manage" } },
    { t: "io", text: "Enter search words, subject and availability (View Catalog)" },
    { t: "proc", text: "Search Books & Copies", store: ["D2 Books & Copies", "read"] },
    { t: "io", text: "Show matching books and copies free" },
    { t: "dec", text: "Open a book?", down: "Yes", right: { label: "No", to: "end" } },
    { t: "io", text: "Show book details, availability and loan period", jump: "end" },
    { id: "manage", t: "io", text: "Choose Add, Edit or Archive a book (Manage Book)" },
    { id: "form", t: "io", text: "Enter book details: ISBN, title, authors, copies, cover" },
    { t: "dec", text: "ISBN valid and not a duplicate?", down: "Yes", left: { label: "No", to: "form" } },
    { t: "proc", text: "Save the book record", store: ["D2 Books & Copies", "write"] },
    { t: "dec", text: "Added by staff (needs approval)?", down: "Yes", right: { label: "No", to: "end" } },
    { t: "proc", text: "Keep it out of the catalog; list it for the admin (Book Manage Request)" },
    { t: "io", text: "Admin reviews it (Book Manage Request)" },
    { t: "dec", text: "Approved?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "proc", text: "Send it back with a revision note (Book Approval Results)" }] } },
    { t: "proc", text: "Publish the book to the catalog", store: ["D2 Books & Copies", "write"] },
    { id: "end", t: "term", text: "End" },
  ] },

  { file: "3-borrowing-and-circulation", title: "3.0 · Borrowing & Circulation", steps: [
    { t: "term", text: "Start" },
    { t: "io", text: "Student sends a Borrow Request (website or game)" },
    { t: "dec", text: "Copy free and under the borrowing limit?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "io", text: "Show that the book cannot be requested now" }] } },
    { t: "proc", text: "Reserve a copy; save the loan as requested with a pickup code", store: ["D3 Loans & Movements", "write"] },
    { t: "doc", text: "Make the Pickup QR Ticket; show it in My books and the game; email it" },
    { t: "dec", text: "Request Cancellation by the student?", down: "No", right: { label: "Yes", to: "end", steps: [{ t: "proc", text: "Cancel the request; the copy goes back on the shelf" }] } },
    { t: "dec", text: "Picked up within 2 days?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "proc", text: "Cancel it automatically and email the student" }] } },
    { t: "io", text: "Staff scan the QR ticket at the desk (Pickup QR Scan)" },
    { t: "proc", text: "Check out: mark borrowed, set the due date (Fiction 5 days, Circulation 3 days)", store: ["D3 Loans & Movements", "write"] },
    { t: "dec", text: "Returned by the due date?", down: "Yes", right: { label: "No", to: "ret", steps: [{ t: "proc", text: "Add a fine for each late weekday; show Due Dates & Overdue Fines" }] } },
    { id: "ret", t: "io", text: "Staff record the Book Return" },
    { t: "proc", text: "Mark returned, log the movement, copy back on the shelf", store: ["D3 Loans & Movements", "write"] },
    { t: "io", text: "Update the Circulation & Movement Records" },
    { id: "end", t: "term", text: "End" },
  ] },

  { file: "4-notifications-and-announcements", title: "4.0 · Notifications & Announcements", steps: [
    { t: "term", text: "Start" },
    { t: "io", text: "Receive an event: loan change, due reminder or new announcement" },
    { t: "dec", text: "Announcement or site content from staff?", down: "No", right: { label: "Yes", to: "notice", steps: [{ t: "io", text: "Staff write the Announcement & Site Content" }, { t: "proc", text: "Publish it on the Updates page" }] } },
    { t: "proc", text: "Find the student the notice is for" },
    { id: "notice", t: "proc", text: "Create the in-app notification", store: ["D4 Notifications & Announcements", "write"] },
    { t: "dec", text: "Needs an email?", down: "Yes", right: { label: "No", to: "show" } },
    { t: "doc", text: "Send the email: ticket, receipt, due or overdue reminder" },
    { t: "proc", text: "Record it in the email log so it is sent only once", store: ["D4 Notifications & Announcements", "write"] },
    { id: "show", t: "io", text: "Show it in Notifications, the bell badge and Updates" },
    { t: "dec", text: "Student opens it?", down: "No", right: { label: "Yes", to: "end", steps: [{ t: "proc", text: "Mark the notification as read" }] } },
    { id: "end", t: "term", text: "End" },
  ] },

  { file: "5-reports-and-analytics", title: "5.0 · Reports & Analytics", steps: [
    { t: "term", text: "Start" },
    { t: "io", text: "Choose the Analytics Dashboard or Generated Reports" },
    { t: "dec", text: "Analytics dashboard?", down: "No", right: { label: "Yes", to: "end", steps: [{ t: "io", text: "Pick the period: 30 days, 90 days, 12 months or all" }, { t: "proc", text: "Count loans, students and trends" }, { t: "io", text: "Show the Analytics Dashboard" }] } },
    { t: "io", text: "Choose the report (catalog, loans, overdue, movements) and filters" },
    { t: "proc", text: "Read the activity and usage data", store: ["D5 User Activity", "read"] },
    { t: "io", text: "Preview the report" },
    { t: "dec", text: "Download it?", down: "Yes", right: { label: "No", to: "end" } },
    { t: "doc", text: "Make the Excel file (Generated Reports)" },
    { t: "proc", text: "Record the Report Download", store: ["D5 User Activity", "write"] },
    { id: "end", t: "term", text: "End" },
  ] },

  { file: "6-system-administration", title: "6.0 · System Administration", steps: [
    { t: "term", text: "Start" },
    { t: "dec", text: "Admin, or staff with the system permission?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "io", text: "Show that access is not allowed" }] } },
    { t: "io", text: "Choose users and permissions, settings, or the audit trail" },
    { t: "dec", text: "View the audit trail?", down: "No", right: { label: "Yes", to: "end", steps: [{ t: "proc", text: "Read the audit records" }, { t: "io", text: "Show the Audit Trail Logs with filters" }] } },
    { id: "change", t: "io", text: "Enter the change: Manage Users & Permission or settings" },
    { t: "dec", text: "Valid?", down: "Yes", left: { label: "No", to: "change" } },
    { t: "proc", text: "Save the settings or staff account", store: ["D6 Settings & Audit Log", "write"] },
    { t: "proc", text: "Write the audit entry: who, what and when", store: ["D6 Settings & Audit Log", "write"] },
    { t: "io", text: "Show that the change is saved" },
    { id: "end", t: "term", text: "End" },
  ] },

  // ---- one chart per user: everything they can do, with the DFD process each part belongs to
  { file: "student-all-processes", title: "Student · all processes", steps: [
    { t: "term", text: "Start" },
    { t: "io", text: "Open the website landing page" },
    { t: "dec", text: "Has an account?", down: "Yes", right: { label: "No", to: "login", steps: [
      { t: "io", text: "Enter Registration Details (1.0)" }, { t: "proc", text: "Confirm the 6-digit email code and create the account (D1)" }] } },
    { id: "login", t: "io", text: "Enter Login Credentials (1.0)" },
    { t: "proc", text: "Check the credentials", store: ["D1 User Accounts", "read"] },
    { t: "dec", text: "Valid?", down: "Yes", left: { label: "No", to: "login" } },
    { id: "where", t: "dec", text: "Browse in the 2D-3D game?", down: "No", right: { label: "Yes", to: "pick", steps: [
      { t: "proc", text: "2D-3D Library Game: enter it with the same session (1.0)" }, { t: "io", text: "Walk to the librarian (NPC) or to a shelf" }] } },
    { t: "proc", text: "Search and filter the catalog: View Catalog (2.0)", store: ["D2 Books & Copies", "read"] },
    { id: "pick", t: "io", text: "Open a book: details and copies free" },
    { t: "dec", text: "Send a Borrow Request? (3.0)", down: "Yes", right: { label: "No", to: "more" } },
    { t: "dec", text: "Copy free and under the limit?", down: "Yes", right: { label: "No", to: "more", steps: [{ t: "io", text: "Show that it cannot be requested now" }] } },
    { t: "doc", text: "Reserve the copy; get the Pickup QR Ticket on the site, in the game and by email", store: ["D3 Loans & Movements", "write"] },
    { t: "dec", text: "Cancel the request?", down: "No", right: { label: "Yes", to: "more", steps: [{ t: "proc", text: "Request Cancellation: the copy goes back on the shelf" }] } },
    { t: "dec", text: "Picked up within 2 days?", down: "Yes", right: { label: "No", to: "more", steps: [{ t: "proc", text: "Request cancelled by itself; email sent" }] } },
    { t: "io", text: "Show the QR ticket at the desk and take the book" },
    { t: "dec", text: "Returned by the due date?", down: "Yes", right: { label: "No", to: "ret", steps: [{ t: "io", text: "See Due Dates & Overdue Fines" }] } },
    { id: "ret", t: "io", text: "Return the book at the desk" },
    { id: "more", t: "dec", text: "Read notifications? (4.0)", down: "No", right: { label: "Yes", to: "again", steps: [
      { t: "io", text: "Read the Notifications & Email Reminders (D4)" }] } },
    { id: "again", t: "dec", text: "Another task?", down: "No", left: { label: "Yes", to: "where" } },
    { t: "proc", text: "Log out" },
    { id: "end", t: "term", text: "End" },
  ] },

  { file: "library-staff-all-processes", title: "Library Staff · all processes", steps: [
    { t: "term", text: "Start" },
    { id: "login", t: "io", text: "Enter Login Credentials (1.0)" },
    { t: "proc", text: "Check the credentials", store: ["D1 User Accounts", "read"] },
    { t: "dec", text: "Valid?", down: "Yes", left: { label: "No", to: "login" } },
    { id: "menu", t: "io", text: "Open the staff dashboard and choose a task" },
    { t: "dec", text: "Manage Book? (2.0)", down: "No", right: { label: "Yes", to: "again", steps: [
      { t: "io", text: "Enter book details: ISBN, title, authors, copies, cover" }, { t: "proc", text: "Save it; it waits for admin approval (D2)" }, { t: "io", text: "See the Book Approval Results" }] } },
    { t: "dec", text: "Check the Pending Borrow Requests? (3.0)", down: "No", right: { label: "Yes", to: "again", steps: [
      { t: "io", text: "View the requests waiting for pickup; decline one if needed (D3)" }] } },
    { t: "dec", text: "Student at the desk for pickup? (3.0)", down: "No", right: { label: "Yes", to: "again", steps: [
      { t: "io", text: "Pickup QR Scan: scan the student's ticket" }, { t: "proc", text: "Check the book out; due date set (D3)" }] } },
    { t: "dec", text: "Book being returned? (3.0)", down: "No", right: { label: "Yes", to: "again", steps: [
      { t: "io", text: "Scan the ticket or find the loan" }, { t: "proc", text: "Record the Book Return; copy back on the shelf (D3)" }] } },
    { t: "dec", text: "View the Circulation & Movement Records? (3.0)", down: "No", right: { label: "Yes", to: "again", steps: [
      { t: "io", text: "Filter the loans and movements (D3)" }] } },
    { t: "dec", text: "Generated Reports? (5.0)", down: "No", right: { label: "Yes", to: "again", steps: [
      { t: "doc", text: "Preview and download the report (Excel)" }] } },
    { id: "again", t: "dec", text: "Another task?", down: "No", left: { label: "Yes", to: "menu" } },
    { t: "proc", text: "Log out" },
    { id: "end", t: "term", text: "End" },
  ] },

  { file: "administrator-all-processes", title: "Administrator · all processes", steps: [
    { t: "term", text: "Start" },
    { id: "login", t: "io", text: "Enter Login Credentials (1.0)" },
    { t: "proc", text: "Check the credentials", store: ["D1 User Accounts", "read"] },
    { t: "dec", text: "Valid?", down: "Yes", left: { label: "No", to: "login" } },
    { id: "menu", t: "io", text: "Open the admin dashboard and choose a task" },
    { t: "dec", text: "Book Manage Request? (2.0)", down: "No", right: { label: "Yes", to: "again", steps: [
      { t: "io", text: "Review a waiting book, or add, edit or archive one" }, { t: "proc", text: "Save the decision or the book (D2); write the audit entry (D6)" }] } },
    { t: "dec", text: "Manage Users & Permission? (6.0)", down: "No", right: { label: "Yes", to: "again", steps: [
      { t: "io", text: "Add staff, change permissions, or disable an account" }, { t: "proc", text: "Save and write the audit entry (D1, D6)" }] } },
    { t: "dec", text: "Analytics Dashboard? (5.0)", down: "No", right: { label: "Yes", to: "again", steps: [
      { t: "io", text: "Pick the period and view the charts (D3, D5)" }] } },
    { t: "dec", text: "Generated Reports? (5.0)", down: "No", right: { label: "Yes", to: "again", steps: [
      { t: "doc", text: "Preview and download the report (Excel)" }] } },
    { t: "dec", text: "View the Audit Trail Logs? (6.0)", down: "No", right: { label: "Yes", to: "again", steps: [
      { t: "io", text: "Search and filter who did what and when (D6)" }] } },
    { t: "dec", text: "Library Staff tasks? (3.0)", down: "No", right: { label: "Yes", to: "again", steps: [
      { t: "sub", text: "Same tasks as the Library Staff chart" }] } },
    { id: "again", t: "dec", text: "Another task?", down: "No", left: { label: "Yes", to: "menu" } },
    { t: "proc", text: "Log out" },
    { id: "end", t: "term", text: "End" },
  ] },
];

// ---- one chart per Level 0 data flow (24): Student 9 (5 in, 4 out), Library Staff 8 (4 in, 4 out), Administrator 7 (3 in, 4 out)
// "in" charts start with what the user enters; "out" charts show how the system makes what it sends to the user
const login = (who, home, perms) => [
  { t: "term", text: "Start" },
  { id: "login", t: "io", text: `${who} enters the Login Credentials (email and password)` },
  { t: "dec", text: "Sign-in locked for this email?", down: "No", right: { label: "Yes", to: "end", steps: [{ t: "io", text: "Show the time left until the lock ends" }] } },
  { t: "proc", text: "Check the email and password against User Accounts", store: ["D1 User Accounts", "read"] },
  { t: "dec", text: "Credentials valid?", down: "Yes", right: { label: "No", to: "login", steps: [{ t: "proc", text: "Count the failed try; lock sign-in after too many tries" }] } },
  { t: "dec", text: "Account active?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "io", text: "Show that the account is disabled" }] } },
  { t: "proc", text: perms, store: ["D1 User Accounts", "read"] },
  { t: "io", text: home },
  { id: "end", t: "term", text: "End" },
];
const report = (who, perm) => [
  { t: "term", text: "Start" },
  ...(perm ? [{ t: "dec", text: "Staff has the Reports permission?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "io", text: "Hide the Reports tab" }] } }] : []),
  { id: "pick", t: "io", text: `${who} chooses the report (catalog, loans, overdue or movements) and the filters` },
  { t: "proc", text: "Read the books, loans and movements", store: ["D3 Loans & Movements", "read"] },
  { t: "dec", text: "Any rows match?", down: "Yes", left: { label: "No", to: "pick" } },
  { t: "io", text: "Show the summary and preview the report" },
  { t: "dec", text: "Download it?", down: "Yes", right: { label: "No", to: "end" } },
  { t: "doc", text: "Make the Excel file: Generated Reports" },
  { t: "proc", text: "Record the download", store: ["D5 User Activity", "write"] },
  { id: "end", t: "term", text: "End" },
];
charts.push(
  // ------------------------------------------------ Student (9): 1-5 into the system, 6-9 out to the student
  { file: "student/1-registration-details", title: "Student 1 · Registration Details (in)", steps: [
    { t: "term", text: "Start" },
    { t: "proc", text: "Read the registration setting", store: ["D6 Settings & Audit Log", "read"] },
    { t: "dec", text: "Registration open?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "io", text: "Show that registration is closed" }] } },
    { id: "form", t: "io", text: "Enter Registration Details: username, email, password, name, student ID, course, major, year" },
    { t: "dec", text: "All fields valid and password strong?", down: "Yes", left: { label: "No", to: "form" } },
    { t: "proc", text: "Check that the username and email are not taken", store: ["D1 User Accounts", "read"] },
    { t: "dec", text: "Username and email free?", down: "Yes", left: { label: "No", to: "form" } },
    { t: "dec", text: "Agrees to the Terms and Conditions?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "io", text: "Show that no account was made" }] } },
    { t: "doc", text: "Email a 6-digit verification code" },
    { id: "code", t: "io", text: "Enter the verification code" },
    { t: "dec", text: "Code correct?", down: "Yes", left: { label: "No", to: "code" } },
    { t: "proc", text: "Create the account and student profile", store: ["D1 User Accounts", "write"] },
    { t: "io", text: "Show 'Email confirmed' and open the catalog" },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "student/2-login-credentials", title: "Student 2 · Login Credentials (in)", steps: login("The student", "Open the student catalog (Discover)", "Start the session and load the student profile") },
  { file: "student/3-view-catalog", title: "Student 3 · View Catalog (in)", steps: [
    { t: "term", text: "Start" },
    { id: "search", t: "io", text: "Enter search words, subject and availability" },
    { t: "proc", text: "Search Books & Copies", store: ["D2 Books & Copies", "read"] },
    { t: "dec", text: "Any books found?", down: "Yes", left: { label: "No", to: "search" } },
    { t: "io", text: "Show the book cards with copies free and the student's own status" },
    { t: "dec", text: "Open a book?", down: "Yes", right: { label: "No", to: "end" } },
    { t: "proc", text: "Read the book's details and copies free", store: ["D2 Books & Copies", "read"] },
    { t: "io", text: "Show author, ISBN, shelf, loan period and availability" },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "student/4-borrow-request", title: "Student 4 · Borrow Request (in)", steps: [
    { t: "term", text: "Start" },
    { t: "io", text: "Press Request to borrow (website or game)" },
    { t: "proc", text: "Count the student's open loans and the copies free", store: ["D3 Loans & Movements", "read"] },
    { t: "dec", text: "A copy free?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "io", text: "Show that the book is not available" }] } },
    { t: "dec", text: "Under the borrowing limit and not already requested?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "io", text: "Show the borrowing limit message" }] } },
    { t: "proc", text: "Reserve a copy; save the loan as requested with a pickup code", store: ["D3 Loans & Movements", "write"] },
    { t: "sub", text: "Student 7 · Pickup QR Ticket" },
    { t: "io", text: "Show the request in My books: pick up within 2 days" },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "student/5-request-cancellation", title: "Student 5 · Request Cancellation (in)", steps: [
    { t: "term", text: "Start" },
    { t: "io", text: "Open My books and press Cancel on a request" },
    { t: "proc", text: "Read the loan", store: ["D3 Loans & Movements", "read"] },
    { t: "dec", text: "Still requested (not picked up)?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "io", text: "Show that it can no longer be cancelled" }] } },
    { t: "dec", text: "Student confirms?", down: "Yes", right: { label: "No", to: "end" } },
    { t: "proc", text: "Mark the loan cancelled; the copy goes back on the shelf", store: ["D3 Loans & Movements", "write"] },
    { t: "doc", text: "Email the cancellation notice" },
    { t: "io", text: "Show the request under History" },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "student/6-2d-3d-library-game", title: "Student 6 · 2D-3D Library Game (out)", steps: [
    { t: "term", text: "Start" },
    { t: "io", text: "Student opens the Game page" },
    { t: "proc", text: "Read the game status", store: ["D6 Settings & Audit Log", "read"] },
    { t: "dec", text: "Game online and published?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "io", text: "Show 'Under maintenance' or 'Coming soon'" }] } },
    { id: "signed", t: "dec", text: "Signed in?", down: "Yes", right: { label: "No", to: "signed", steps: [{ t: "sub", text: "Student 2 · Login Credentials" }] } },
    { t: "proc", text: "Load the student's name and books", store: ["D1 User Accounts", "read"] },
    { t: "io", text: "Show the 2D-3D Library Game with the same session" },
    { t: "dec", text: "Request a book in the game?", down: "No", right: { label: "Yes", to: "end", steps: [{ t: "sub", text: "Student 4 · Borrow Request" }] } },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "student/7-pickup-qr-ticket", title: "Student 7 · Pickup QR Ticket (out)", steps: [
    { t: "term", text: "Start" },
    { t: "proc", text: "Read the student's requested loans and pickup code", store: ["D3 Loans & Movements", "read"] },
    { t: "dec", text: "Any request waiting for pickup?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "io", text: "Show 'No ticket yet'" }] } },
    { t: "dec", text: "Still within the 2-day pickup window?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "proc", text: "Cancel the request and put the copy back (D3)" }, { t: "doc", text: "Email that the request expired" }] } },
    { t: "proc", text: "Make the QR code from the pickup code" },
    { t: "doc", text: "Show the Pickup QR Ticket in My books and in the game; email it" },
    { t: "io", text: "Student shows the ticket at the desk" },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "student/8-due-dates-and-overdue-fines", title: "Student 8 · Due Dates & Overdue Fines (out)", steps: [
    { t: "term", text: "Start" },
    { t: "proc", text: "Read the student's borrowed books", store: ["D3 Loans & Movements", "read"] },
    { t: "dec", text: "Any books borrowed?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "io", text: "Show 'No books borrowed'" }] } },
    { t: "proc", text: "Read the loan rules: days and fine for each material, and the holidays", store: ["D6 Settings & Audit Log", "read"] },
    { id: "next", t: "proc", text: "Take the next loan and its due date" },
    { t: "dec", text: "Past the due date?", down: "Yes", right: { label: "No", to: "more", steps: [{ t: "proc", text: "Count the school days left" }] } },
    { t: "proc", text: "Count the late weekdays (not holidays) and multiply by the daily fine" },
    { id: "more", t: "dec", text: "More loans?", down: "No", left: { label: "Yes", to: "next" } },
    { t: "io", text: "Show the Due Dates & Overdue Fines in My books" },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "student/9-notifications-and-email-reminders", title: "Student 9 · Notifications & Email Reminders (out)", steps: [
    { t: "term", text: "Start" },
    { t: "io", text: "An event happens: loan requested, picked up, returned, declined, due soon or overdue" },
    { t: "proc", text: "Read the loan and the student", store: ["D3 Loans & Movements", "read"] },
    { t: "proc", text: "Create the in-app notification", store: ["D4 Notifications & Announcements", "write"] },
    { t: "dec", text: "Already emailed about this event?", down: "No", right: { label: "Yes", to: "show" } },
    { t: "doc", text: "Send the email: ticket, receipt or reminder" },
    { t: "proc", text: "Record it in the email log so it is sent only once", store: ["D4 Notifications & Announcements", "write"] },
    { id: "show", t: "io", text: "Show it in Notifications and the bell badge" },
    { t: "dec", text: "Student opens it?", down: "No", right: { label: "Yes", to: "end", steps: [{ t: "proc", text: "Mark the notification as read (D4)" }] } },
    { id: "end", t: "term", text: "End" },
  ] },

  // ------------------------------------------------ Library Staff (8): 1-4 into the system, 5-8 out to the staff
  { file: "library-staff/1-login-credentials", title: "Library Staff 1 · Login Credentials (in)", steps: login("Staff", "Open the staff dashboard with the allowed tabs", "Start the session; load the role and permissions") },
  { file: "library-staff/2-manage-book", title: "Library Staff 2 · Manage Book (in)", steps: [
    { t: "term", text: "Start" },
    { t: "io", text: "Choose Add, Edit or Archive a book" },
    { t: "dec", text: "Archive?", down: "No", right: { label: "Yes", to: "audit", steps: [{ t: "io", text: "Choose where it is kept and why" }, { t: "proc", text: "Move the book to the archive (D2)" }] } },
    { id: "form", t: "io", text: "Enter the book details: ISBN, title, authors, edition, subject, copies, cover" },
    { t: "dec", text: "ISBN valid and not a duplicate?", down: "Yes", left: { label: "No", to: "form" } },
    { t: "dec", text: "Copies not below those on loan?", down: "Yes", left: { label: "No", to: "form" } },
    { t: "proc", text: "Save the book and its copy codes as 'waiting for approval'", store: ["D2 Books & Copies", "write"] },
    { t: "proc", text: "Keep it out of the catalog and notify the admins" },
    { id: "audit", t: "proc", text: "Record the change in the audit trail", store: ["D6 Settings & Audit Log", "write"] },
    { t: "sub", text: "Library Staff 7 · Book Approval Results" },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "library-staff/3-pickup-qr-scan-checkout", title: "Library Staff 3 · Pickup QR Scan (Checkout) (in)", steps: [
    { t: "term", text: "Start" },
    { id: "scan", t: "io", text: "Scan the student's QR ticket (camera or typed code)" },
    { t: "proc", text: "Look up the ticket's loans", store: ["D3 Loans & Movements", "read"] },
    { t: "dec", text: "Ticket found?", down: "Yes", left: { label: "No", to: "scan" } },
    { t: "dec", text: "Still requested and within 2 days?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "io", text: "Show that the request expired or was cancelled" }] } },
    { t: "io", text: "Show the student and the books on the ticket" },
    { t: "proc", text: "Check out: mark borrowed; set the due date (Fiction 5 days, Circulation 3 days, school days only)", store: ["D3 Loans & Movements", "write"] },
    { t: "doc", text: "Email the student the due dates" },
    { t: "io", text: "Show the book as borrowed" },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "library-staff/4-book-returns", title: "Library Staff 4 · Book Returns (in)", steps: [
    { t: "term", text: "Start" },
    { id: "find", t: "io", text: "Scan the ticket or search the loan" },
    { t: "proc", text: "Read the loan", store: ["D3 Loans & Movements", "read"] },
    { t: "dec", text: "Borrowed and not yet returned?", down: "Yes", left: { label: "No", to: "find" } },
    { t: "dec", text: "Returned late?", down: "No", right: { label: "Yes", to: "ret", steps: [{ t: "proc", text: "Work out the fine for each late weekday" }] } },
    { id: "ret", t: "proc", text: "Mark returned, log the movement, copy back on the shelf", store: ["D3 Loans & Movements", "write"] },
    { t: "doc", text: "Email the return receipt" },
    { t: "io", text: "Show the book as returned" },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "library-staff/5-pending-borrow-requests", title: "Library Staff 5 · Pending Borrow Requests (out)", steps: [
    { t: "term", text: "Start" },
    { t: "proc", text: "Cancel requests past the 2-day pickup window and email the students", store: ["D3 Loans & Movements", "write"] },
    { t: "proc", text: "Read the requests waiting for pickup", store: ["D3 Loans & Movements", "read"] },
    { t: "dec", text: "Any pending requests?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "io", text: "Show 'Nothing waiting'" }] } },
    { t: "io", text: "Show the Pending Borrow Requests: student, book, ticket and time left" },
    { t: "dec", text: "Student at the desk?", down: "No", right: { label: "Yes", to: "end", steps: [{ t: "sub", text: "Library Staff 3 · Pickup QR Scan (Checkout)" }] } },
    { t: "dec", text: "Decline the request?", down: "Yes", right: { label: "No", to: "end" } },
    { t: "io", text: "Write the reason" },
    { t: "proc", text: "Mark it declined; the copy goes back on the shelf", store: ["D3 Loans & Movements", "write"] },
    { t: "doc", text: "Email the student that it was declined" },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "library-staff/6-circulation-and-movement-records", title: "Library Staff 6 · Circulation & Movement Records (out)", steps: [
    { t: "term", text: "Start" },
    { id: "filter", t: "io", text: "Choose the view (borrowed, history or movements) and the filters: dates, type, book, student" },
    { t: "proc", text: "Read the loans and book movements", store: ["D3 Loans & Movements", "read"] },
    { t: "dec", text: "Any records match?", down: "Yes", left: { label: "No", to: "filter" } },
    { t: "io", text: "Show the Circulation & Movement Records: checkouts, returns, acquisitions, withdrawals" },
    { t: "dec", text: "Open a record?", down: "Yes", right: { label: "No", to: "end" } },
    { t: "io", text: "Show the loan's timeline and the emails sent" },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "library-staff/7-book-approval-results", title: "Library Staff 7 · Book Approval Results (out)", steps: [
    { t: "term", text: "Start" },
    { t: "proc", text: "Read the admin's decision on the staff member's book", store: ["D2 Books & Copies", "read"] },
    { t: "dec", text: "Approved?", down: "Yes", right: { label: "No", to: "send", steps: [{ t: "proc", text: "Result: 'Needs revision' with the admin's note" }] } },
    { t: "proc", text: "Result: 'Approved', the book is now in the catalog" },
    { id: "send", t: "proc", text: "Notify the staff member", store: ["D4 Notifications & Announcements", "write"] },
    { t: "io", text: "Show the Book Approval Results in Notifications and on the Books page" },
    { t: "dec", text: "Needs revision?", down: "No", right: { label: "Yes", to: "end", steps: [{ t: "sub", text: "Library Staff 2 · Manage Book (fix and resubmit)" }] } },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "library-staff/8-generated-reports", title: "Library Staff 8 · Generated Reports (out)", steps: report("Staff", true) },

  // ------------------------------------------------ Administrator (7): 1-3 into the system, 4-7 out to the admin
  { file: "administrator/1-login-credentials", title: "Administrator 1 · Login Credentials (in)", steps: login("The admin", "Open the admin dashboard", "Start the session; load the admin role") },
  { file: "administrator/2-book-manage-request", title: "Administrator 2 · Book Manage Request (in)", steps: [
    { t: "term", text: "Start" },
    { t: "io", text: "Choose: review a book waiting for approval, or add, edit or archive a book" },
    { t: "dec", text: "Review a waiting book?", down: "No", right: { label: "Yes", to: "audit", steps: [
      { t: "io", text: "Approve, or send back with a revision note" }, { t: "proc", text: "Save the decision on the book (D2)" }, { t: "sub", text: "Library Staff 7 · Book Approval Results" }] } },
    { id: "form", t: "io", text: "Enter the book details, or choose where an archived book is kept" },
    { t: "dec", text: "ISBN valid, not a duplicate and copies not below those on loan?", down: "Yes", left: { label: "No", to: "form" } },
    { t: "proc", text: "Save the book; an admin's book goes straight to the catalog", store: ["D2 Books & Copies", "write"] },
    { id: "audit", t: "proc", text: "Record it in the audit trail", store: ["D6 Settings & Audit Log", "write"] },
    { t: "io", text: "Show that the book is saved" },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "administrator/3-manage-users-and-permission", title: "Administrator 3 · Manage Users & Permission (in)", steps: [
    { t: "term", text: "Start" },
    { t: "io", text: "Open the Students or Staff page" },
    { t: "dec", text: "Add a staff member?", down: "No", right: { label: "Yes", to: "perms", steps: [{ t: "io", text: "Find the account by email" }, { t: "proc", text: "Make the account staff" }] } },
    { t: "io", text: "Choose a user" },
    { t: "dec", text: "Disable, enable or change the role?", down: "No", right: { label: "Yes", to: "audit", steps: [{ t: "proc", text: "Change the account status or role (D1)" }] } },
    { id: "perms", t: "io", text: "Tick the permissions: students, game, system, reports, audit" },
    { t: "proc", text: "Save the account and permissions", store: ["D1 User Accounts", "write"] },
    { id: "audit", t: "proc", text: "Record it in the audit trail", store: ["D6 Settings & Audit Log", "write"] },
    { t: "io", text: "Show the updated list" },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "administrator/4-book-manage-request", title: "Administrator 4 · Book Manage Request (out)", steps: [
    { t: "term", text: "Start" },
    { t: "proc", text: "Read the books waiting for approval", store: ["D2 Books & Copies", "read"] },
    { t: "dec", text: "Any books waiting?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "io", text: "Show 'Waiting for approval: 0'" }] } },
    { t: "proc", text: "Notify the admins of each new book", store: ["D4 Notifications & Announcements", "write"] },
    { t: "io", text: "Show the Book Manage Request: count on the Books tab, the list and who added each book" },
    { t: "dec", text: "Open a book to review?", down: "Yes", right: { label: "No", to: "end" } },
    { t: "sub", text: "Administrator 2 · Book Manage Request (in)" },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "administrator/5-analytics-dashboard", title: "Administrator 5 · Analytics Dashboard (out)", steps: [
    { t: "term", text: "Start" },
    { t: "io", text: "Open Analytics and pick the period: 30 days, 90 days, 12 months or all" },
    { t: "proc", text: "Read the loans and movements", store: ["D3 Loans & Movements", "read"] },
    { t: "proc", text: "Read the activity and usage data", store: ["D5 User Activity", "read"] },
    { t: "dec", text: "Any data in this period?", down: "Yes", right: { label: "No", to: "end", steps: [{ t: "io", text: "Show 'No activity in this period'" }] } },
    { t: "proc", text: "Count requests, loans, returns, overdue, active students and popular books" },
    { t: "io", text: "Show the Analytics Dashboard: number cards and charts" },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "administrator/6-audit-trail-logs", title: "Administrator 6 · Audit Trail Logs (out)", steps: [
    { t: "term", text: "Start" },
    { id: "filter", t: "io", text: "Open the Audit trail and set the filters: search, module and dates" },
    { t: "proc", text: "Read the audit records", store: ["D6 Settings & Audit Log", "read"] },
    { t: "dec", text: "Any records match?", down: "Yes", left: { label: "No", to: "filter" } },
    { t: "io", text: "Show the Audit Trail Logs: date and time, who, action, module and details" },
    { t: "dec", text: "Download it?", down: "Yes", right: { label: "No", to: "end" } },
    { t: "doc", text: "Make the Excel file of the audit trail" },
    { id: "end", t: "term", text: "End" },
  ] },
  { file: "administrator/7-generated-reports", title: "Administrator 7 · Generated Reports (out)", steps: report("The admin", false) },
);

// ---------------------------------------------------------------- measuring
const CH = 7.3; // average width of one character at 14px
const wrap = (text, width) => {
  const max = Math.max(8, Math.floor(width / CH));
  const lines = [];
  for (const word of text.split(" ")) {
    const last = lines[lines.length - 1];
    if (last && (last + " " + word).length <= max) lines[lines.length - 1] = last + " " + word;
    else lines.push(word);
  }
  return lines;
};
const SIZE = { term: [170, 50], proc: [300], io: [300], sub: [300], doc: [300], dec: [270] };
function measure(step) {
  const w = SIZE[step.t][0];
  if (step.t === "term") return { w, h: 50, lines: [step.text] };
  if (step.t === "dec") { const lines = wrap(step.text, w * 0.52); return { w, h: Math.max(110, 70 + lines.length * 19), lines }; }
  const lines = wrap(step.text, w - (step.t === "sub" ? 60 : step.t === "io" ? 70 : 34));
  return { w, h: Math.max(54, 26 + lines.length * 19) + (step.t === "doc" ? 12 : 0), lines };
}

// ---------------------------------------------------------------- drawing
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const text = (x, y, lines, { size = 14, weight = 600, fill = C.ink } = {}) =>
  lines.map((l, i) => `<text x="${x}" y="${y + (i - (lines.length - 1) / 2) * size * 1.3}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle" dominant-baseline="central">${esc(l)}</text>`).join("");
function shape(n) {
  const { x, y, w, h, t, lines } = n, l = x - w / 2, r = x + w / 2, top = y - h / 2, bot = y + h / 2;
  const s = `stroke="${C.primary}" stroke-width="2.4"`;
  if (t === "term") return `<rect x="${l}" y="${top}" width="${w}" height="${h}" rx="${h / 2}" fill="${C.primary}" stroke="${C.edge}" stroke-width="2.4"/>${text(x, y, lines, { size: 16, weight: 700, fill: "#fff" })}`;
  if (t === "dec") return `<polygon points="${x},${top} ${r},${y} ${x},${bot} ${l},${y}" fill="${C.tint}" ${s}/>${text(x, y, lines, { size: 13.5, weight: 700 })}`;
  if (t === "io") { const k = 16; return `<polygon points="${l + k},${top} ${r + k},${top} ${r - k},${bot} ${l - k},${bot}" fill="${C.soft}" ${s}/>${text(x, y, lines)}`; }
  if (t === "sub") return `<rect x="${l}" y="${top}" width="${w}" height="${h}" fill="#fff" ${s}/><path d="M${l + 14},${top}V${bot}M${r - 14},${top}V${bot}" ${s}/>${text(x, y, lines, { weight: 700 })}`;
  if (t === "doc") { const wave = `C${x + w / 4},${bot + 10} ${x - w / 4},${bot - 22} ${l},${bot - 8}`; return `<path d="M${l},${top}H${r}V${bot - 8}${wave}Z" fill="#fff" ${s}/>${text(x, y - 5, lines)}`; }
  return `<rect x="${l}" y="${top}" width="${w}" height="${h}" rx="6" fill="#fff" ${s}/>${text(x, y, lines)}`;
}
const store = (x, y, name) => {
  const w = 170, r = 9, [id, ...rest] = name.split(" ");
  const label = [id, ...wrap(rest.join(" "), w - 24)], h = Math.max(64, 30 + label.length * 16);
  return `<path d="M${x - w / 2},${y - h / 2 + r} a${w / 2},${r} 0 0 1 ${w},0 v${h - 2 * r} a${w / 2},${r} 0 0 1 ${-w},0 z" fill="#fff8e6" stroke="${C.accent}" stroke-width="2.4"/><path d="M${x - w / 2},${y - h / 2 + r} a${w / 2},${r} 0 0 0 ${w},0" fill="none" stroke="${C.accent}" stroke-width="2.4"/>`
    + text(x, y + 6, label, { size: 12.5 });
};
const pill = (x, y, label, tone) => { const w = label.length * 7.4 + 16; return `<rect x="${x - w / 2}" y="${y - 11}" width="${w}" height="22" rx="11" fill="#fff" stroke="${tone}" stroke-width="1.4"/>${text(x, y, [label], { size: 12.5, weight: 700, fill: tone })}`; };
const tone = (label) => (/^no$/i.test(label) ? C.no : /^yes$/i.test(label) ? C.yes : C.primary);

function render(chart) {
  const MX = 620, SX = 1040, TOP = 120, GAP = 44, STORE_X = 130;
  const nodes = new Map(), side = [], placed = [];
  const rightTargets = new Set(chart.steps.flatMap((s) => [s.right?.to, s.jump].filter(Boolean)));
  let y = TOP, sideBottom = 0;
  chart.steps.forEach((step, i) => {
    const m = measure(step);
    const id = step.id ?? `s${i}`;
    // anything that leaves to the right, or is reached from the right, sits below the side column drawn so far
    if (step.right || step.jump || rightTargets.has(id)) y = Math.max(y, sideBottom + GAP);
    const n = { ...step, ...m, id, x: MX, y: y + m.h / 2 };
    nodes.set(id, n); placed.push(n);
    y += m.h + GAP;
    if (step.right?.steps) {
      let sy = n.y, prev = null;
      for (const s of step.right.steps) {
        const sm = measure(s);
        const cy = prev ? prev.y + prev.h / 2 + GAP + sm.h / 2 : sy;
        prev = { ...s, ...sm, x: SX, y: cy };
        side.push({ node: prev, owner: n });
      }
      n.sideLast = prev;
      sideBottom = prev.y + prev.h / 2;
      y = Math.max(y, sideBottom - 30); // keep the column moving so the next side branch has room
    } else if (step.right || step.jump) sideBottom = Math.max(sideBottom, n.y + 14);
  });
  const height = Math.ceil(y + 140); // whole pixels: the browser ignores a window size like 1400,2451.5

  const lines = [], labels = [], segs = [];
  const arrow = (pts, { label = "", at = 0, dx = 0, dy = -13, head = true } = {}) => {
    for (let k = 1; k < pts.length; k++) segs.push([pts[k - 1], pts[k]]);
    lines.push(`<path d="${pts.map(([px, py], k) => `${k ? "L" : "M"}${px},${py}`).join(" ")}" fill="none" stroke="${C.edge}" stroke-width="2.1" ${head ? 'marker-end="url(#arrow)"' : ""}/>`);
    if (label) { const [a, b] = [pts[at], pts[at + 1]]; labels.push(pill((a[0] + b[0]) / 2 + dx, (a[1] + b[1]) / 2 + dy, label, tone(label))); }
  };
  const leftEdge = (n) => n.x - n.w / 2, rightEdge = (n) => n.x + n.w / 2;

  // main column
  placed.forEach((n, i) => {
    const next = placed[i + 1];
    if (!next || n.jump || (n.t === "term" && i > 0)) return;
    const fromY = n.y + n.h / 2 - (n.t === "doc" ? 6 : 0), toY = next.y - next.h / 2;
    arrow([[MX, fromY], [MX, toY]], n.t === "dec" && n.down ? { label: n.down, dx: 24, dy: 0 } : {});
  });
  // side columns: in from the decision, down between their boxes
  for (const n of placed) if (n.right?.steps) {
    const first = side.find((s) => s.owner === n).node;
    arrow([[rightEdge(n), n.y], [leftEdge(first) - (first.t === "io" ? 0 : 0), n.y]], { label: n.right.label, dy: -14 });
    const mine = side.filter((s) => s.owner === n).map((s) => s.node);
    mine.forEach((s, k) => { if (mine[k + 1]) arrow([[SX, s.y + s.h / 2 - (s.t === "doc" ? 6 : 0)], [SX, mine[k + 1].y - mine[k + 1].h / 2]]); });
  }

  // lanes: one per target on each side; a longer reach gets an outer lane so the lines nest without crossing
  const rightRoutes = [], leftRoutes = [];
  for (const n of placed) {
    if (n.right) rightRoutes.push({ from: n.sideLast ?? n, to: nodes.get(n.right.to), label: n.sideLast ? "" : n.right.label, fromY: (n.sideLast ?? n).y, self: n.right.to === n.id });
    if (n.jump) rightRoutes.push({ from: n, to: nodes.get(n.jump), label: "", fromY: n.y });
    if (n.left) leftRoutes.push({ from: n, to: nodes.get(n.left.to), label: n.left.label });
  }
  const laneOf = (routes) => {
    const reach = new Map();
    for (const r of routes) { const span = Math.abs(r.to.y - r.from.y); reach.set(r.to.id, Math.max(reach.get(r.to.id) ?? 0, span)); }
    return new Map([...reach].sort((a, b) => a[1] - b[1]).map(([target], k) => [target, k]));
  };
  const rl = laneOf(rightRoutes), ll = laneOf(leftRoutes);
  const RL0 = SX + 150 + 34, LL0 = MX - 150 - 34;
  for (const r of rightRoutes) {
    const x = RL0 + 24 * rl.get(r.to.id);
    // into a decision whose right corner is taken by its own branch (or back to the one it came from): come round and in from the top
    if (r.self || (r.to.t === "dec" && r.to.right)) { const top = r.to.y - r.to.h / 2, over = top - 9; arrow([[rightEdge(r.from), r.fromY], [x, r.fromY], [x, over], [MX, over], [MX, top]], r.label ? { label: r.label, dy: -14 } : {}); continue; }
    arrow([[rightEdge(r.from), r.fromY], [x, r.fromY], [x, r.to.y], [rightEdge(r.to), r.to.y]], r.label ? { label: r.label, dy: -14 } : {});
  }
  for (const r of leftRoutes) {
    const x = LL0 - 24 * ll.get(r.to.id);
    arrow([[leftEdge(r.from), r.from.y], [x, r.from.y], [x, r.to.y], [leftEdge(r.to) - (r.to.t === "io" ? 0 : 0), r.to.y]], { label: r.label, dy: -14 });
  }

  // where a sideways line crosses an upright one, the sideways line hops over it so the two do not read as joined
  const hops = [];
  for (const [[ax, ay], [bx, by]] of segs) {
    if (ay !== by) continue;
    for (const [[cx, cy], [dx, dy]] of segs) {
      if (cx !== dx || cx <= Math.min(ax, bx) + 8 || cx >= Math.max(ax, bx) - 8 || ay <= Math.min(cy, dy) + 8 || ay >= Math.max(cy, dy) - 8) continue;
      hops.push(`<path d="M${cx - 7},${ay}H${cx + 7}" stroke="#fff" stroke-width="5"/><path d="M${cx - 7},${ay}A7,7 0 0 1 ${cx + 7},${ay}" fill="none" stroke="${C.edge}" stroke-width="2.1"/>`);
    }
  }
  lines.push(...hops);

  // data stores
  const stores = [];
  for (const n of placed) if (n.store) {
    const [name, mode] = n.store;
    stores.push(store(STORE_X, n.y, name));
    const a = [STORE_X + 85, n.y], b = [leftEdge(n) - (n.t === "io" ? 8 : 0), n.y];
    const [p, q] = mode === "read" ? [a, b] : [b, a];
    lines.push(`<path d="M${p.join(",")}L${q.join(",")}" fill="none" stroke="${C.accent}" stroke-width="2.1" stroke-dasharray="7 5" marker-end="url(#arrowGold)" ${mode === "both" ? 'marker-start="url(#arrowGold)"' : ""}/>`);
  }

  const width = Math.max(RL0 + 24 * Math.max(rl.size, 1) + 40, 1400);
  const lg = [[`<rect x="0" y="-12" width="40" height="24" rx="12" fill="${C.primary}"/>`, "Start / End"], [`<rect x="0" y="-12" width="40" height="24" rx="4" fill="#fff" stroke="${C.primary}" stroke-width="2"/>`, "Process"],
    [`<polygon points="20,-14 40,0 20,14 0,0" fill="${C.tint}" stroke="${C.primary}" stroke-width="2"/>`, "Decision"], [`<polygon points="8,-12 46,-12 38,12 0,12" fill="${C.soft}" stroke="${C.primary}" stroke-width="2"/>`, "Input / Output"],
    [`<rect x="0" y="-12" width="40" height="24" fill="#fff" stroke="${C.primary}" stroke-width="2"/><path d="M7,-12V12M33,-12V12" stroke="${C.primary}" stroke-width="2"/>`, "Predefined process"],
    [`<path d="M0,-12H40V8C30,16 12,0 0,10Z" fill="#fff" stroke="${C.primary}" stroke-width="2"/>`, "Document / email"], [`<rect x="0" y="-13" width="40" height="26" rx="8" fill="#fff8e6" stroke="${C.accent}" stroke-width="2"/>`, "Data store"],
    [`<path d="M0,0H40" stroke="${C.accent}" stroke-width="2.1" stroke-dasharray="7 5"/>`, "Data read / saved"]];
  const legend = lg.map(([icon, label], i) => `<g transform="translate(${50 + (i % 4) * 300},${height - 78 + Math.floor(i / 4) * 36})">${icon}<text x="58" y="0" font-size="13.5" font-weight="600" fill="${C.ink}" dominant-baseline="central">${label}</text></g>`).join("");

  return { width, height, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Segoe UI, Arial, sans-serif">
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.edge}"/></marker>
  <marker id="arrowGold" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.accent}"/></marker>
</defs>
<rect width="100%" height="100%" fill="#fff"/>
<rect width="${width}" height="58" fill="${C.primary}"/>
<text x="${width / 2}" y="29" font-size="21" font-weight="800" fill="#fff" text-anchor="middle" dominant-baseline="central" letter-spacing="1">PROGRAM FLOWCHART · ${esc(chart.title.toUpperCase())}</text>
${lines.join("\n")}
${placed.map(shape).join("\n")}
${side.map((s) => shape(s.node)).join("\n")}
${stores.join("\n")}
${labels.join("\n")}
<line x1="40" x2="${width - 40}" y1="${height - 110}" y2="${height - 110}" stroke="${C.tint}" stroke-width="2"/>
${legend}
</svg>
` };
}

fs.mkdirSync(outDir, { recursive: true });
const browser = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((b) => fs.existsSync(b));
for (const chart of charts) {
  const { width, height, svg } = render(chart);
  const svgFile = path.join(outDir, `${chart.file}.svg`);
  fs.mkdirSync(path.dirname(svgFile), { recursive: true });
  fs.writeFileSync(svgFile, svg);
  if (browser) execFileSync(browser, ["--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2", `--window-size=${width},${height}`,
    `--screenshot=${path.join(outDir, `${chart.file}.png`)}`, "file:///" + svgFile.replace(/\\/g, "/")], { stdio: "ignore" });
  console.log(`wrote ${chart.file}`);
}
