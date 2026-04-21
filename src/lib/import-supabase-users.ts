import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

dotenv.config({ path: path.resolve(process.cwd(), ".env.import") });

const LEGACY_FILE_PATH = path.resolve(
  process.cwd(),
  "src",
  "lib",
  "GRINDERS GUILD (59).xlsx",
);
const TEMP_PASSWORD = "DibbiTemp@2026";
const ERROR_FILE_PATH = path.resolve(process.cwd(), "import-errors.json");
const DRY_RUN = false;
const ROW_LIMIT: number | null = 1;
const START_ROW_INDEX = 4612;

type LegacyRow = {
  "ID#"?: unknown;
  REGISTERED?: unknown;
  NAME?: unknown;
  USERNAME?: unknown;
  PASSWORD?: unknown;
  ENDING_BALANCE?: unknown;
  SPONSORED?: unknown;
};

type ImportErrorRecord = {
  rowNumber: number;
  usernameRaw: string;
  usernameNormalized: string;
  internalEmail: string;
  rowStatus:
    | "create_failed"
    | "repair_failed"
    | "profile_upsert_failed"
    | "skipped_duplicate"
    | "skipped_missing_username";
  reason: string;
  details?: unknown;
};

type Counters = {
  processedRows: number;
  createdUsers: number;
  repairedProfiles: number;
  updatedProfiles: number;
  tempPasswordsAssigned: number;
  skippedDuplicates: number;
  skippedMissingUsername: number;
  errors: number;
};

function normalizeUsername(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "");
}

function valueToString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeRegisteredAt(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const dt = new Date(
        Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S),
      );
      if (!Number.isNaN(dt.getTime())) return dt.toISOString();
    }
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;

    const shortDateTimeMatch = text.match(
      /^(\d{2})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/,
    );
    if (shortDateTimeMatch) {
      const yy = Number(shortDateTimeMatch[1]);
      const mm = Number(shortDateTimeMatch[2]);
      const dd = Number(shortDateTimeMatch[3]);
      const hh = Number(shortDateTimeMatch[4] ?? "0");
      const min = Number(shortDateTimeMatch[5] ?? "0");
      const ss = Number(shortDateTimeMatch[6] ?? "0");
      const yyyy = 2000 + yy;
      const dt = new Date(Date.UTC(yyyy, mm - 1, dd, hh, min, ss));
      const isValid =
        dt.getUTCFullYear() === yyyy &&
        dt.getUTCMonth() === mm - 1 &&
        dt.getUTCDate() === dd &&
        dt.getUTCHours() === hh &&
        dt.getUTCMinutes() === min &&
        dt.getUTCSeconds() === ss;
      return isValid ? dt.toISOString() : null;
    }

    const asDate = new Date(text);
    if (!Number.isNaN(asDate.getTime())) return asDate.toISOString();
    return null;
  }

  return null;
}

function isPlaceholderProfile(profile: {
  username: string | null;
  full_name: string | null;
}): boolean {
  const username = valueToString(profile.username)?.toLowerCase() ?? "";
  const fullName = valueToString(profile.full_name);
  return username.startsWith("user_") || fullName === null;
}

function printProgress(counters: Counters) {
  console.log("----- Import Progress -----");
  console.log(`Processed rows: ${counters.processedRows}`);
  console.log(`Created auth users: ${counters.createdUsers}`);
  console.log(`Repaired profiles: ${counters.repairedProfiles}`);
  console.log(`Updated profiles: ${counters.updatedProfiles}`);
  console.log(`Temporary passwords assigned: ${counters.tempPasswordsAssigned}`);
  console.log(`Skipped duplicates: ${counters.skippedDuplicates}`);
  console.log(`Skipped missing username: ${counters.skippedMissingUsername}`);
  console.log(`Errors: ${counters.errors}`);
  console.log("---------------------------");
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.import",
    );
  }

  if (!fs.existsSync(LEGACY_FILE_PATH)) {
    throw new Error(`Legacy file not found: ${LEGACY_FILE_PATH}`);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const fileBuffer = fs.readFileSync(LEGACY_FILE_PATH);
const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });

const firstSheetName = workbook.SheetNames[0];
if (!firstSheetName) throw new Error("No worksheet found in the Excel file.");

const worksheet = workbook.Sheets[firstSheetName];
const rows = XLSX.utils.sheet_to_json(worksheet, {
  defval: null,
  raw: false,
}) as LegacyRow[];
  const startIndex = Math.max(0, START_ROW_INDEX);
  const endIndex =
    ROW_LIMIT === null ? rows.length : Math.min(rows.length, startIndex + ROW_LIMIT);

  const counters: Counters = {
    processedRows: 0,
    createdUsers: 0,
    repairedProfiles: 0,
    updatedProfiles: 0,
    tempPasswordsAssigned: 0,
    skippedDuplicates: 0,
    skippedMissingUsername: 0,
    errors: 0,
  };
  const errors: ImportErrorRecord[] = [];

  for (let index = startIndex; index < endIndex; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;
    counters.processedRows += 1;

    const usernameRaw = valueToString(row.USERNAME) ?? "";
    const usernameNormalized = normalizeUsername(usernameRaw);
    const internalEmail = usernameNormalized
      ? `${usernameNormalized}@dibbi.local`
      : "";

    if (!usernameNormalized) {
      counters.skippedMissingUsername += 1;
      errors.push({
        rowNumber,
        usernameRaw,
        usernameNormalized,
        internalEmail,
        rowStatus: "skipped_missing_username",
        reason: "Missing or invalid username after normalization.",
      });
      if (counters.processedRows % 100 === 0) printProgress(counters);
      continue;
    }

    const { data: existingByUsername, error: duplicateByUsernameError } = await supabase
      .from("profiles")
      .select("id, username, full_name, internal_email")
      .eq("username", usernameNormalized)
      .maybeSingle();

    if (duplicateByUsernameError) {
      counters.errors += 1;
      errors.push({
        rowNumber,
        usernameRaw,
        usernameNormalized,
        internalEmail,
        rowStatus: "profile_upsert_failed",
        reason: "Failed to check existing profile username.",
        details: duplicateByUsernameError.message,
      });
      if (counters.processedRows % 100 === 0) printProgress(counters);
      continue;
    }

    const { data: existingByInternalEmail, error: duplicateByEmailError } = await supabase
      .from("profiles")
      .select("id, username, full_name, internal_email")
      .eq("internal_email", internalEmail)
      .maybeSingle();

    if (duplicateByEmailError) {
      counters.errors += 1;
      errors.push({
        rowNumber,
        usernameRaw,
        usernameNormalized,
        internalEmail,
        rowStatus: "profile_upsert_failed",
        reason: "Failed to check existing profile internal_email.",
        details: duplicateByEmailError.message,
      });
      if (counters.processedRows % 100 === 0) printProgress(counters);
      continue;
    }

    if (
      existingByUsername &&
      existingByInternalEmail &&
      existingByUsername.id !== existingByInternalEmail.id
    ) {
      counters.skippedDuplicates += 1;
      errors.push({
        rowNumber,
        usernameRaw,
        usernameNormalized,
        internalEmail,
        rowStatus: "skipped_duplicate",
        reason:
          "Duplicate conflict: username exists on a different user than internal_email.",
      });
      if (counters.processedRows % 100 === 0) printProgress(counters);
      continue;
    }

    if (
      existingByUsername &&
      !existingByInternalEmail &&
      valueToString(existingByUsername.internal_email)?.toLowerCase() !== "" &&
      valueToString(existingByUsername.internal_email)?.toLowerCase() !== internalEmail
    ) {
      counters.skippedDuplicates += 1;
      errors.push({
        rowNumber,
        usernameRaw,
        usernameNormalized,
        internalEmail,
        rowStatus: "skipped_duplicate",
        reason:
          "Duplicate conflict: username belongs to a different internal_email.",
        details: { existingInternalEmail: existingByUsername.internal_email },
      });
      if (counters.processedRows % 100 === 0) printProgress(counters);
      continue;
    }

    const passwordSource = valueToString(row.PASSWORD);
    const password = passwordSource ?? TEMP_PASSWORD;
    const needsPasswordReset = !passwordSource;
    if (needsPasswordReset) counters.tempPasswordsAssigned += 1;

    const existingTargetProfile = existingByInternalEmail ?? existingByUsername ?? null;
    let authUserId = existingTargetProfile?.id ?? null;
    const shouldRepair = existingTargetProfile
      ? isPlaceholderProfile(existingTargetProfile)
      : false;
    let createdAuthThisRow = false;

    if (DRY_RUN) {
      if (!authUserId) counters.createdUsers += 1;
      if (existingTargetProfile && shouldRepair) counters.repairedProfiles += 1;
      if (existingTargetProfile && !shouldRepair) counters.updatedProfiles += 1;
      console.log(
        `[DRY_RUN] row ${rowNumber}: would create auth user + upsert profile for ${internalEmail}`,
      );
      if (counters.processedRows % 100 === 0) printProgress(counters);
      continue;
    }

    if (!authUserId) {
      const { data: authData, error: createAuthError } =
        await supabase.auth.admin.createUser({
          email: internalEmail,
          password,
          email_confirm: true,
        });

      if (createAuthError || !authData.user) {
        counters.errors += 1;
        errors.push({
          rowNumber,
          usernameRaw,
          usernameNormalized,
          internalEmail,
          rowStatus: "create_failed",
          reason: "Failed to create auth user.",
          details: createAuthError?.message ?? "No user returned from createUser",
        });
        if (counters.processedRows % 100 === 0) printProgress(counters);
        continue;
      }

      authUserId = authData.user.id;
      counters.createdUsers += 1;
      createdAuthThisRow = true;
    }

    const profilePayload = {
      id: authUserId,
      legacy_id: valueToString(row["ID#"]),
      username: usernameNormalized,
      full_name: valueToString(row.NAME),
      registered_at: normalizeRegisteredAt(row.REGISTERED),
      sponsored: valueToString(row.SPONSORED),
      internal_email: internalEmail,
      needs_password_reset: needsPasswordReset,
    };

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });

    if (upsertError) {
      counters.errors += 1;
      errors.push({
        rowNumber,
        usernameRaw,
        usernameNormalized,
        internalEmail,
        rowStatus: shouldRepair ? "repair_failed" : "profile_upsert_failed",
        reason: createdAuthThisRow
          ? "orphan auth user possible: Auth user created but profile upsert failed."
          : "Profile upsert failed.",
        details: upsertError.message,
      });
      if (createdAuthThisRow) {
        console.warn(
          `[WARNING] orphan auth user possible for row ${rowNumber} (${internalEmail})`,
        );
      }
      if (counters.processedRows % 100 === 0) printProgress(counters);
      continue;
    }

    if (existingTargetProfile && shouldRepair) counters.repairedProfiles += 1;
    if (existingTargetProfile && !shouldRepair) counters.updatedProfiles += 1;
    if (counters.processedRows % 100 === 0) printProgress(counters);
  }

  fs.writeFileSync(ERROR_FILE_PATH, JSON.stringify(errors, null, 2), "utf8");

  console.log("\nImport finished.");
  printProgress(counters);
  console.log("----- Final Summary -----");
  console.log(`New auth users created: ${counters.createdUsers}`);
  console.log(`Placeholder profiles repaired: ${counters.repairedProfiles}`);
  console.log(`Profiles updated: ${counters.updatedProfiles}`);
  console.log(
    `Rows skipped: ${counters.skippedDuplicates + counters.skippedMissingUsername}`,
  );
  console.log(`Rows failed: ${counters.errors}`);
  console.log("-------------------------");
  console.log(`Error log written to: ${ERROR_FILE_PATH}`);
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exitCode = 1;
});
