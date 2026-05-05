import { google, sheets_v4 } from "googleapis";

/**
 * Spreadsheet ID for the Marketing Scanner Google Sheets backend.
 */
export const SPREADSHEET_ID = "1FSw6ISZJfu1pt9luHAF37ga5AeV8amMAY0mZ3KovCzE";

let _sheets: sheets_v4.Sheets | null = null;

/**
 * Returns a singleton authenticated Google Sheets v4 client.
 * Authentication uses an OAuth2 refresh token (no service account).
 *
 * Required env vars:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REFRESH_TOKEN
 *
 * @throws if any of the required environment variables is missing.
 */
export function getSheets(): sheets_v4.Sheets {
  if (_sheets) return _sheets;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const missing: string[] = [];
  if (!clientId) missing.push("GOOGLE_CLIENT_ID");
  if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
  if (!refreshToken) missing.push("GOOGLE_REFRESH_TOKEN");
  if (missing.length > 0) {
    throw new Error(
      `[sheets-client] Missing required env vars: ${missing.join(", ")}`
    );
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });

  _sheets = google.sheets({ version: "v4", auth: oauth2 });
  return _sheets;
}
