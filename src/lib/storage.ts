import { Readable } from "node:stream";
import { google } from "googleapis";
import type { drive_v3 } from "googleapis";

const FOLDER_NAME = "Marketing Scanner Audits";

function getOAuth2() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const missing: string[] = [];
  if (!clientId) missing.push("GOOGLE_CLIENT_ID");
  if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
  if (!refreshToken) missing.push("GOOGLE_REFRESH_TOKEN");
  if (missing.length > 0) {
    throw new Error(`[storage] Missing env vars: ${missing.join(", ")}`);
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

let _drive: drive_v3.Drive | null = null;

function getDrive(): drive_v3.Drive {
  if (_drive) return _drive;
  _drive = google.drive({ version: "v3", auth: getOAuth2() });
  return _drive;
}

let _folderIdCache: string | null = null;

/**
 * Get (or lazily create) the "Marketing Scanner Audits" folder in My Drive.
 */
async function getOrCreateFolder(): Promise<string> {
  if (_folderIdCache) return _folderIdCache;
  const drive = getDrive();

  const search = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
    pageSize: 1,
  });

  const found = search.data.files?.[0];
  if (found?.id) {
    _folderIdCache = found.id;
    return found.id;
  }

  const created = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  if (!created.data.id) {
    throw new Error("[storage] failed to create folder (no id returned)");
  }
  _folderIdCache = created.data.id;
  return created.data.id;
}

/**
 * Upload a PDF buffer to the audits folder on Google Drive,
 * make it publicly readable, and return its shareable link + id.
 */
export async function uploadPdfToDrive(
  pdfBuffer: Buffer,
  fileName: string
): Promise<{ fileUrl: string; fileId: string }> {
  const drive = getDrive();
  const folderId = await getOrCreateFolder();

  const created = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType: "application/pdf",
    },
    media: {
      mimeType: "application/pdf",
      body: Readable.from(pdfBuffer),
    },
    fields: "id, webViewLink",
  });

  const fileId = created.data.id;
  if (!fileId) {
    throw new Error("[storage] Drive upload returned no file id");
  }

  // Make the file readable by anyone with the link.
  try {
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });
  } catch (err) {
    console.warn(
      `[storage] failed to set anyone-reader permission: ${(err as Error).message}`
    );
  }

  let webViewLink = created.data.webViewLink ?? "";
  if (!webViewLink) {
    const meta = await drive.files.get({ fileId, fields: "webViewLink" });
    webViewLink = meta.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`;
  }

  return { fileUrl: webViewLink, fileId };
}
