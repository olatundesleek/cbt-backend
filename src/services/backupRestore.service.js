import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { invalidateSystemSettingsCache } from "./systemSettings.service.js";

const execFileAsync = promisify(execFile);
const unlinkAsync = promisify(fs.unlink);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupDir = path.join(process.cwd(), "backups");

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

/**
 * Get the path to pg_dump executable
 * Checks environment variable first, then common Windows paths, then assumes it's in PATH
 * @returns {string} Path to pg_dump executable
 */
const getPgDumpPath = () => {
  // Priority 1: Environment variable
  if (process.env.PG_DUMP_PATH) {
    return process.env.PG_DUMP_PATH;
  }

  // Priority 2: Common PostgreSQL installation paths on Windows
  const commonPaths = [
    "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe",
  ];

  for (const pgPath of commonPaths) {
    if (fs.existsSync(pgPath)) {
      return pgPath;
    }
  }

  // Priority 3: Assume it's in system PATH
  return "pg_dump";
};

/**
 * Get the path to pg_restore executable
 * Checks environment variable first, then common Windows paths, then assumes it's in PATH
 * @returns {string} Path to pg_restore executable
 */
const getPgRestorePath = () => {
  // Priority 1: Environment variable
  if (process.env.PG_RESTORE_PATH) {
    return process.env.PG_RESTORE_PATH;
  }

  // Priority 2: Common PostgreSQL installation paths on Windows
  const commonPaths = [
    "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_restore.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_restore.exe",
    "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_restore.exe",
  ];

  for (const pgPath of commonPaths) {
    if (fs.existsSync(pgPath)) {
      return pgPath;
    }
  }

  // Priority 3: Assume it's in system PATH
  return "pg_restore";
};

/**
 * Parse DATABASE_URL to extract credentials
 * @returns {Object} Credentials object with user, password, host, port, database
 */
const parseDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not configured");
  }

  const urlObj = new URL(databaseUrl);
  return {
    user: decodeURIComponent(urlObj.username),
    password: decodeURIComponent(urlObj.password),
    host: urlObj.hostname,
    port: urlObj.port || "5432",
    database: decodeURIComponent(urlObj.pathname.slice(1)),
  };
};

/**
 * Create a database backup
 * @returns {Object} Backup info with filename and path
 */
export const createBackup = async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFilename = `backup_${timestamp}.sql`;
    const backupPath = path.join(backupDir, backupFilename);

    const credentials = parseDatabaseUrl();
    const pgDumpPath = getPgDumpPath();

    const env = { ...process.env, PGPASSWORD: credentials.password };
    const { stderr } = await execFileAsync(pgDumpPath, [
      "-U", credentials.user,
      "-h", credentials.host,
      "-p", credentials.port,
      "-d", credentials.database,
      "-F", "c",
      "-b",
      "-v",
      "-f", backupPath,
    ], {
      maxBuffer: 10 * 1024 * 1024,
      env,
    });

    if (stderr && !stderr.includes("pg_dump")) {
      console.log("Backup process output:", stderr);
    }

    return {
      filename: backupFilename,
      path: backupPath,
    };
  } catch (error) {
    throw new Error(`Failed to create backup: ${error.message}`);
  }
};

/**
 * List all available backups
 * @returns {Array} Array of backup objects with filename, size, and createdAt
 */
export const listBackups = async () => {
  try {
    const files = await readdirAsync(backupDir);

    const backups = await Promise.all(
      files
        .filter((file) => file.startsWith("backup_") && file.endsWith(".sql"))
        .map(async (file) => {
          const filePath = path.join(backupDir, file);
          const stats = await statAsync(filePath);
          return {
            filename: file,
            size: stats.size,
            createdAt: stats.birthtime,
          };
        })
    );

    return backups.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    throw new Error(`Failed to list backups: ${error.message}`);
  }
};

/**
 * Get backup file path and validate it exists
 * @param {string} filename - The backup filename
 * @returns {string} The full path to the backup file
 */
export const getBackupFilePath = async (filename) => {
  try {
    // Security: Prevent directory traversal
    if (filename.includes("..") || filename.includes("/")) {
      throw new Error("Invalid filename");
    }

    const backupPath = path.join(backupDir, filename);

    // Check if file exists
    if (!fs.existsSync(backupPath)) {
      throw new Error("Backup file not found");
    }

    return backupPath;
  } catch (error) {
    throw error;
  }
};

/**
 * Restore database from uploaded backup file
 * @param {string} filePath - Path to the uploaded backup file
 */
export const restoreFromUploadedFile = async (filePath) => {
  try {
    if (!filePath) {
      throw new Error("No backup file provided");
    }

    const credentials = parseDatabaseUrl();
    const pgRestorePath = getPgRestorePath();

    const env = { ...process.env, PGPASSWORD: credentials.password };
    const { stderr } = await execFileAsync(pgRestorePath, [
      "-U", credentials.user,
      "-h", credentials.host,
      "-p", credentials.port,
      "-d", credentials.database,
      "-c",
      "-v",
      filePath,
    ], {
      maxBuffer: 10 * 1024 * 1024,
      env,
    });

    console.log("Restore process output:", stderr);
    await invalidateSystemSettingsCache();

    // Clean up uploaded file after restore
    try {
      await unlinkAsync(filePath);
    } catch (cleanupError) {
      console.error("Failed to delete temporary file:", cleanupError);
    }
  } catch (error) {
    // Clean up uploaded file on error
    try {
      await unlinkAsync(filePath);
    } catch (cleanupError) {
      console.error("Failed to delete temporary file:", cleanupError);
    }

    throw new Error(`Failed to restore backup: ${error.message}`);
  }
};

/**
 * Restore database from existing backup file in backups directory
 * @param {string} filename - The backup filename
 */
export const restoreFromBackupFile = async (filename) => {
  try {
    // Security: Prevent directory traversal
    if (filename.includes("..") || filename.includes("/")) {
      throw new Error("Invalid filename");
    }

    const backupPath = path.join(backupDir, filename);

    // Check if file exists
    if (!fs.existsSync(backupPath)) {
      throw new Error("Backup file not found");
    }

    const credentials = parseDatabaseUrl();
    const pgRestorePath = getPgRestorePath();

    const env = { ...process.env, PGPASSWORD: credentials.password };
    const { stderr } = await execFileAsync(pgRestorePath, [
      "-U", credentials.user,
      "-h", credentials.host,
      "-p", credentials.port,
      "-d", credentials.database,
      "-c",
      "-v",
      backupPath,
    ], {
      maxBuffer: 10 * 1024 * 1024,
      env,
    });

    console.log("Restore process output:", stderr);
    await invalidateSystemSettingsCache();

    return { filename };
  } catch (error) {
    throw new Error(`Failed to restore backup: ${error.message}`);
  }
};

/**
 * Delete a specific backup file
 * @param {string} filename - The backup filename
 */
export const deleteBackup = async (filename) => {
  try {
    // Security: Prevent directory traversal
    if (filename.includes("..") || filename.includes("/")) {
      throw new Error("Invalid filename");
    }

    const backupPath = path.join(backupDir, filename);

    // Check if file exists
    if (!fs.existsSync(backupPath)) {
      throw new Error("Backup file not found");
    }

    await unlinkAsync(backupPath);
  } catch (error) {
    throw new Error(`Failed to delete backup: ${error.message}`);
  }
};