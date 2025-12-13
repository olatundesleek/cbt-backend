import fs from "fs";
import path from "path";
import crypto from "crypto";
import si from "systeminformation";

/* =========================
   CONFIG
========================= */

const STORE_DIR = "C:\\ProgramData\\.ftsvc";
const CACHE_FILE = path.join(STORE_DIR, ".cache.bin");
const TRIAL_FILE = path.join(STORE_DIR, ".trial.bin");
const PUBLIC_KEY_PATH = path.join(process.cwd(), "public.pem");

const TRIAL_DAYS = 3;

// Embedded secrets (i will obfuscate later)
const ENC_KEY = crypto
  .createHash("sha256")
  .update("FLORINTECH_INTERNAL_SECRET_2025")
  .digest();

const HMAC_KEY = "FT_HMAC_SECRET_DO_NOT_SHARE";

/* =========================
   CRYPTO HELPERS
========================= */

function encrypt(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([iv, enc]).toString("base64");
}

function decrypt(enc) {
  const raw = Buffer.from(enc, "base64");
  const iv = raw.subarray(0, 16);
  const data = raw.subarray(16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENC_KEY, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString();
}

function hmac(data) {
  return crypto.createHmac("sha256", HMAC_KEY).update(data).digest("base64");
}

/* =========================
   MACHINE FINGERPRINT
========================= */

async function getMachineFingerprint() {
  const bios = await si.bios();
  const disk = await si.diskLayout();

  const raw = JSON.stringify({
    biosSerial: bios.serial || "",
    biosVersion: bios.version || "",
    diskSerial: disk[0]?.serialNum || "",
    diskName: disk[0]?.name || "",
  });

  return crypto.createHash("sha256").update(raw).digest("hex");
}

/* =========================
   TIME TAMPER PROTECTION
========================= */

function saveLastRun(date, fingerprint) {
  const payload = `${date}|${fingerprint}`;
  const signature = hmac(payload);

  const encrypted = encrypt(JSON.stringify({ date, fingerprint, signature }));

  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, encrypted, "utf8");
}

function loadLastRun() {
  if (!fs.existsSync(CACHE_FILE)) return null;

  try {
    const decrypted = decrypt(fs.readFileSync(CACHE_FILE, "utf8"));
    const { date, fingerprint, signature } = JSON.parse(decrypted);

    if (hmac(`${date}|${fingerprint}`) !== signature) return "TAMPERED";
    return { date, fingerprint };
  } catch {
    return "TAMPERED";
  }
}

function checkSystemTime(fingerprint) {
  const today = new Date().toISOString().slice(0, 10);
  const stored = loadLastRun();

  if (stored === "TAMPERED") {
    return { ok: false, reason: "System integrity violation." };
  }

  if (stored) {
    if (stored.fingerprint !== fingerprint) {
      return { ok: false, reason: "System state mismatch." };
    }

    if (today < stored.date) {
      return { ok: false, reason: "System clock rollback detected." };
    }
  }

  saveLastRun(today, fingerprint);
  return { ok: true };
}

/* =========================
   TRIAL MODE
========================= */

function saveTrial(data) {
  const payload = JSON.stringify(data);
  const signature = hmac(payload);

  const encrypted = encrypt(JSON.stringify({ payload, signature }));

  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(TRIAL_FILE, encrypted, "utf8");
}

function loadTrial() {
  if (!fs.existsSync(TRIAL_FILE)) return null;

  try {
    const decrypted = decrypt(fs.readFileSync(TRIAL_FILE, "utf8"));
    const { payload, signature } = JSON.parse(decrypted);

    if (hmac(payload) !== signature) return "TAMPERED";
    return JSON.parse(payload);
  } catch {
    return "TAMPERED";
  }
}

async function verifyTrial() {
  const fingerprint = await getMachineFingerprint();
  const today = new Date().toISOString().slice(0, 10);

  const trial = loadTrial();

  if (trial === "TAMPERED") {
    return { ok: false, reason: "Trial integrity violation." };
  }

  if (!trial) {
    saveTrial({
      fingerprint,
      startDate: today,
      lastRun: today,
    });

    return {
      ok: true,
      mode: "TRIAL",
      daysLeft: TRIAL_DAYS,
    };
  }

  if (trial.fingerprint !== fingerprint) {
    return { ok: false, reason: "Trial not valid for this machine." };
  }

  if (today < trial.lastRun) {
    return { ok: false, reason: "System clock rollback detected." };
  }

  const used =
    Math.floor(
      (new Date(today) - new Date(trial.startDate)) / (1000 * 60 * 60 * 24)
    ) + 1;

  if (used > TRIAL_DAYS) {
    return { ok: false, reason: "Trial period expired." };
  }

  saveTrial({ ...trial, lastRun: today });

  return {
    ok: true,
    mode: "TRIAL",
    daysLeft: TRIAL_DAYS - used,
  };
}

/* =========================
   LICENSE VERIFICATION
========================= */

function verifySignature(payload, signature, publicKey) {
  return crypto.verify(
    "sha256",
    Buffer.from(JSON.stringify(payload)),
    publicKey,
    Buffer.from(signature, "base64")
  );
}

export async function verifyLicense() {
  const appDir = process.cwd();
  const files = fs.readdirSync(appDir);
  const licenseFile = files.find((f) => f.endsWith("_license.json"));

  //  LICENSED MODE (PRIORITY)
  if (licenseFile) {
    try {
      const license = JSON.parse(
        fs.readFileSync(path.join(appDir, licenseFile), "utf8")
      );

      const { payload, signature } = license;
      const { fingerprint, expires, customer } = payload;

      const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, "utf8");

      if (!verifySignature(payload, signature, publicKey)) {
        return { ok: false, reason: "Invalid license signature." };
      }

      const today = new Date().toISOString().slice(0, 10);
      if (today > expires) {
        return { ok: false, reason: "License expired." };
      }

      const currentFingerprint = await getMachineFingerprint();
      if (currentFingerprint !== fingerprint) {
        return { ok: false, reason: "License not valid for this machine." };
      }

      const timeCheck = checkSystemTime(currentFingerprint);
      if (!timeCheck.ok) {
        return { ok: false, reason: timeCheck.reason };
      }

      // Optional: remove trial file after successful license
      if (fs.existsSync(TRIAL_FILE)) fs.unlinkSync(TRIAL_FILE);

      return {
        ok: true,
        mode: "LICENSED",
        customer,
        expires,
      };
    } catch {
      return { ok: false, reason: "Invalid license file format." };
    }
  }

  //  TRIAL MODE FALLBACK
  return await verifyTrial();
}
