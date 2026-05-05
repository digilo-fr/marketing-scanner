import crypto from "node:crypto";
import type {
  Audit,
  Project,
  Recommendation,
  User,
} from "@/types";
import { getSheets, SPREADSHEET_ID } from "./sheets-client";

// ============================================================
// Schema definitions — column order MUST match the sheet headers.
// ============================================================

const PROJECT_COLS = [
  "id",
  "owner_email",
  "name",
  "slug",
  "type",
  "description",
  "created_at",
  "updated_at",
] as const;

const AUDIT_COLS = [
  "id",
  "project_id",
  "owner_email",
  "target_url",
  "tier",
  "status",
  "overall_score",
  "grade",
  "scores_json",
  "report_md_url",
  "pdf_url",
  "llm_used",
  "duration_sec",
  "error",
  "created_at",
  "completed_at",
] as const;

const RECO_COLS = [
  "id",
  "audit_id",
  "category",
  "severity",
  "priority",
  "title",
  "description",
  "impact_estimate_min",
  "impact_estimate_max",
  "timeline",
  "confidence",
] as const;

const USER_COLS = [
  "email",
  "name",
  "role",
  "created_at",
  "last_login",
] as const;

// Numeric columns per entity (for proper typing on read).
const NUMERIC_AUDIT_COLS = new Set([
  "overall_score",
  "duration_sec",
]);
const NUMERIC_RECO_COLS = new Set([
  "impact_estimate_min",
  "impact_estimate_max",
]);

// ============================================================
// Helpers
// ============================================================

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

function rangeForTab(tab: string, lastColLetter: string): string {
  // Skip header row (row 1).
  return `${tab}!A2:${lastColLetter}`;
}

function colLetter(index: number): string {
  // 0 -> A, 25 -> Z, 26 -> AA ...
  let n = index;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

function rowToObject<T>(
  row: unknown[],
  cols: readonly string[],
  numericCols: Set<string> = new Set()
): T {
  const obj: Record<string, unknown> = {};
  for (let i = 0; i < cols.length; i++) {
    const key = cols[i];
    const raw = row[i];
    if (numericCols.has(key)) {
      const v = raw === undefined || raw === null || raw === "" ? 0 : Number(raw);
      obj[key] = Number.isFinite(v) ? v : 0;
    } else {
      obj[key] = raw === undefined || raw === null ? "" : String(raw);
    }
  }
  return obj as T;
}

function objectToRow(
  obj: Record<string, unknown>,
  cols: readonly string[]
): (string | number)[] {
  return cols.map((c) => {
    const v = obj[c];
    if (v === undefined || v === null) return "";
    if (typeof v === "number") return v;
    return String(v);
  });
}

async function fetchAllRows(
  tab: string,
  cols: readonly string[]
): Promise<{ rows: unknown[][]; lastColLetter: string }> {
  const sheets = getSheets();
  const lastColLetter = colLetter(cols.length - 1);
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: rangeForTab(tab, lastColLetter),
    });
    return { rows: (res.data.values ?? []) as unknown[][], lastColLetter };
  } catch (err) {
    throw new Error(
      `[sheets-db] Failed to read tab "${tab}": ${(err as Error).message}`
    );
  }
}

async function appendRow(
  tab: string,
  cols: readonly string[],
  obj: Record<string, unknown>
): Promise<void> {
  const sheets = getSheets();
  const lastColLetter = colLetter(cols.length - 1);
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tab}!A1:${lastColLetter}`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [objectToRow(obj, cols)] },
    });
  } catch (err) {
    throw new Error(
      `[sheets-db] Failed to append to "${tab}": ${(err as Error).message}`
    );
  }
}

async function appendRows(
  tab: string,
  cols: readonly string[],
  objs: Record<string, unknown>[]
): Promise<void> {
  if (objs.length === 0) return;
  const sheets = getSheets();
  const lastColLetter = colLetter(cols.length - 1);
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tab}!A1:${lastColLetter}`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: objs.map((o) => objectToRow(o, cols)) },
    });
  } catch (err) {
    throw new Error(
      `[sheets-db] Failed to bulk-append to "${tab}": ${(err as Error).message}`
    );
  }
}

/**
 * Replace an entire row in `tab` at the 1-based sheet row number.
 */
async function writeRow(
  tab: string,
  cols: readonly string[],
  sheetRowNumber: number,
  obj: Record<string, unknown>
): Promise<void> {
  const sheets = getSheets();
  const lastColLetter = colLetter(cols.length - 1);
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tab}!A${sheetRowNumber}:${lastColLetter}${sheetRowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [objectToRow(obj, cols)] },
    });
  } catch (err) {
    throw new Error(
      `[sheets-db] Failed to update row ${sheetRowNumber} in "${tab}": ${(err as Error).message}`
    );
  }
}

// ============================================================
// Projects
// ============================================================

/**
 * List all projects belonging to the given owner email.
 */
export async function listProjects(ownerEmail: string): Promise<Project[]> {
  const { rows } = await fetchAllRows("projects", PROJECT_COLS);
  return rows
    .map((r) => rowToObject<Project>(r, PROJECT_COLS))
    .filter((p) => p.owner_email === ownerEmail);
}

/**
 * Create a new project. `id`, `created_at`, `updated_at` are auto-generated.
 */
export async function createProject(
  p: Omit<Project, "id" | "created_at" | "updated_at">
): Promise<Project> {
  const now = nowIso();
  const project: Project = {
    ...p,
    id: newId(),
    created_at: now,
    updated_at: now,
  };
  await appendRow("projects", PROJECT_COLS, project as unknown as Record<string, unknown>);
  return project;
}

/**
 * Get a single project by id, or null if not found.
 */
export async function getProject(id: string): Promise<Project | null> {
  const { rows } = await fetchAllRows("projects", PROJECT_COLS);
  for (const r of rows) {
    if (r[0] === id) return rowToObject<Project>(r, PROJECT_COLS);
  }
  return null;
}

// ============================================================
// Audits
// ============================================================

/**
 * List audits for an owner. Optionally filter by project id.
 */
export async function listAudits(
  ownerEmail: string,
  projectId?: string
): Promise<Audit[]> {
  const { rows } = await fetchAllRows("audits", AUDIT_COLS);
  return rows
    .map((r) => rowToObject<Audit>(r, AUDIT_COLS, NUMERIC_AUDIT_COLS))
    .filter((a) => a.owner_email === ownerEmail)
    .filter((a) => (projectId ? a.project_id === projectId : true));
}

/**
 * Create a new pending audit. Result fields are initialized empty/zero.
 */
export async function createAudit(
  a: Omit<
    Audit,
    | "id"
    | "created_at"
    | "completed_at"
    | "overall_score"
    | "grade"
    | "scores_json"
    | "report_md_url"
    | "pdf_url"
    | "llm_used"
    | "duration_sec"
    | "error"
  >
): Promise<Audit> {
  const audit: Audit = {
    ...a,
    id: newId(),
    overall_score: 0,
    grade: "F",
    scores_json: "",
    report_md_url: "",
    pdf_url: "",
    llm_used: "",
    duration_sec: 0,
    error: "",
    created_at: nowIso(),
    completed_at: "",
  };
  await appendRow("audits", AUDIT_COLS, audit as unknown as Record<string, unknown>);
  return audit;
}

/**
 * Get a single audit by id, or null if not found.
 */
export async function getAudit(id: string): Promise<Audit | null> {
  const { rows } = await fetchAllRows("audits", AUDIT_COLS);
  for (const r of rows) {
    if (r[0] === id) return rowToObject<Audit>(r, AUDIT_COLS, NUMERIC_AUDIT_COLS);
  }
  return null;
}

/**
 * Patch an audit row by id. Only provided fields are updated.
 * Throws if the audit does not exist.
 */
export async function updateAudit(
  id: string,
  patch: Partial<Audit>
): Promise<void> {
  const { rows } = await fetchAllRows("audits", AUDIT_COLS);
  let foundIdx = -1;
  let current: Audit | null = null;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === id) {
      foundIdx = i;
      current = rowToObject<Audit>(rows[i], AUDIT_COLS, NUMERIC_AUDIT_COLS);
      break;
    }
  }
  if (foundIdx === -1 || !current) {
    throw new Error(`[sheets-db] updateAudit: audit "${id}" not found`);
  }
  const merged: Audit = { ...current, ...patch, id: current.id };
  // Sheet row number = data offset + 2 (1 for header, 1 for 1-based index).
  const sheetRowNumber = foundIdx + 2;
  await writeRow("audits", AUDIT_COLS, sheetRowNumber, merged as unknown as Record<string, unknown>);
}

// ============================================================
// Recommendations
// ============================================================

/**
 * List all recommendations for a given audit id.
 */
export async function listRecommendations(
  auditId: string
): Promise<Recommendation[]> {
  const { rows } = await fetchAllRows("recommendations", RECO_COLS);
  return rows
    .map((r) => rowToObject<Recommendation>(r, RECO_COLS, NUMERIC_RECO_COLS))
    .filter((r) => r.audit_id === auditId);
}

/**
 * Bulk-create recommendations in a single Sheets API call.
 * Each recommendation receives a generated id.
 */
export async function createRecommendations(
  recs: Omit<Recommendation, "id">[]
): Promise<void> {
  if (recs.length === 0) return;
  const withIds: Recommendation[] = recs.map((r) => ({ ...r, id: newId() }));
  await appendRows(
    "recommendations",
    RECO_COLS,
    withIds as unknown as Record<string, unknown>[]
  );
}

// ============================================================
// Users
// ============================================================

/**
 * Insert or update a user by email. Updates last_login on each call;
 * sets created_at + role="owner" on first insert.
 */
export async function upsertUser(email: string, name: string): Promise<User> {
  const { rows } = await fetchAllRows("users", USER_COLS);
  const now = nowIso();

  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === email) {
      const existing = rowToObject<User>(rows[i], USER_COLS);
      const merged: User = {
        ...existing,
        name: name || existing.name,
        last_login: now,
      };
      const sheetRowNumber = i + 2;
      await writeRow("users", USER_COLS, sheetRowNumber, merged as unknown as Record<string, unknown>);
      return merged;
    }
  }

  const user: User = {
    email,
    name,
    role: "owner",
    created_at: now,
    last_login: now,
  };
  await appendRow("users", USER_COLS, user as unknown as Record<string, unknown>);
  return user;
}

const DEFAULT_ALLOWED_EMAILS = [
  "didigum@gmail.com",
  "driss.i@tantakcollectif.net",
];

/**
 * Whitelist check against ALLOWED_EMAILS env var (comma-separated).
 * Falls back to a built-in default whitelist if the env is missing.
 */
export function isUserAllowed(email: string): boolean {
  const raw = process.env.ALLOWED_EMAILS;
  const list = raw
    ? raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_ALLOWED_EMAILS.map((s) => s.toLowerCase());
  return list.includes(email.trim().toLowerCase());
}
