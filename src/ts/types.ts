// Shapes of the rows the database returns. Keep in step with supabase/site.sql.
export type Role = "student" | "staff" | "admin";
export type LoanStatus = "requested" | "borrowed" | "returned" | "rejected" | "cancelled";

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  role: Role;
  student_id: string | null;
  gender: "Male" | "Female" | null;
  course: string | null;
  major: string | null;
  college: string | null;
  year_level: string | null;
  phone: string | null;
  photo_url: string | null;
  terms_version: string | null;
  terms_accepted_at: string | null;
  active: boolean;
  permissions: string[];
  created_at: string;
}

export interface Book {
  id: string;
  isbn?: string | null; // bare digits; null until staff add it (tools/add-isbn.sql adds the column)
  title: string;
  author: string;
  category: string;
  genre: string;
  published: string;
  publication_label: string;
  publisher: string;
  language: string;
  synopsis: string;
  copies: number;
  shelf: string;
  cover_url: string | null;
  archived?: boolean;
  created_at?: string;
}

export interface CatalogBook extends Book {
  available: number;
  borrowed: number;
  reserved: number;
}

// one live stock update from the library-stock channel (counts only)
export interface StockEvent {
  book_id: string;
  copies: number;
  borrowed: number;
  reserved: number;
  available: number;
}

export interface CatalogPage {
  books: CatalogBook[];
  total: number;
}

export interface Loan {
  id: number;
  book_id: string;
  user_id: string;
  status: LoanStatus;
  requested_at: string;
  borrowed_at: string | null;
  due_at: string | null;
  returned_at: string | null;
  note: string | null;
  pickup_code?: string;
  book?: Pick<Book, "id" | "title" | "author" | "cover_url" | "category"> | null;
  profile?: Pick<Profile, "id" | "username" | "full_name" | "student_id"> | null;
}

export interface Notice {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  published: boolean;
  created_at: string;
}

export interface TeamMember {
  id: number;
  team_group: "library_staff" | "dev_team";
  name: string;
  position: string;
  email: string;
  photo_url: string | null;
  character?: string | null;
  bio: string;
  display_order: number;
  is_active: boolean;
}

export interface Course {
  id: number;
  college: string;
  program: string;
  code: string;
  majors: string[];
  sort: number;
}

export interface ContentPage {
  slug: string;
  title: string;
  body: ContentBody;
  updated_at: string;
}

export interface ContentSection {
  title: string;
  paragraphs: string[];
}

export interface ContentBody {
  paragraphs?: string[];
  version?: string;
  last_updated?: string;
  sections?: ContentSection[];
  items?: { title: string; body: string }[];
}

export interface Activity {
  id: number;
  type: string;
  book_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  book?: { title: string } | null;
}

export interface AuditRow {
  id: number;
  actor_id: string | null;
  action: string;
  module: string;
  details: string;
  created_at: string;
}

export interface DashboardStats {
  requests_now: number;
  requests_before: number;
  series: { day: string; total: number }[];
  full_titles: { title: string; copies: number }[];
  recent: { type: string; created_at: string; username: string; title: string | null }[];
  titles: number;
  copies: number;
  borrowed: number;
  requested: number;
  overdue: number;
  due_soon: number;
  students: number;
  new_students: number;
  popular: { title: string; total: number }[];
  categories: { category: string; total: number }[];
}

export type SiteSettings = Record<string, unknown>;
