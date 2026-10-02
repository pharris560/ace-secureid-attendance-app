const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

initializeApp();
const db = getFirestore();

// ---- Settings ----
const APP_ID = "default-app-id";
const DRY_RUN = true; // true = only log what would happen. Set to false to go live.
const LOOKBACK_DAYS = 2;
const DEFAULT_TZ = "America/New_York";

const col = (name) => db.collection(`artifacts/${APP_ID}/public/data/${name}`);

const safeTz = (tz) => {
  const z = tz || DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: z });
    return z;
  } catch (e) {
    return DEFAULT_TZ;
  }
};

const fmtDate = (ms, tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(ms));

const tzOffsetMs = (ms, tz) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ms));
  const p = {};
  parts.forEach((x) => { p[x.type] = x.value; });
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
};

const zonedToUtcMs = (y, mo, d, h, mi, tz) => {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const first = guess - tzOffsetMs(guess, tz);
  return guess - tzOffsetMs(first, tz);
};

exports.autoCheckOut = onSchedule(
  { schedule: "every 10 minutes", timeZone: DEFAULT_TZ, timeoutSeconds: 120, memory: "256MiB", maxInstances: 1 },
  async () => {
    const nowMs = Date.now();
    const cutoffIso = new Date(nowMs - LOOKBACK_DAYS * 86400000).toISOString();

    const [classSnap, attSnap] = await Promise.all([
      col("classes").get(),
      col("attendance").where("timestamp", ">=", cutoffIso).get(),
    ]);

    const classByName = {};
    classSnap.forEach((d) => {
      const c = d.data();
      if (c.name && c.endTime) classByName[c.name] = c;
    });

    // Group check-in/check-out events per person, per class, per class-local date
    const groups = {};
    attSnap.forEach((d) => {
      const r = { id: d.id, ...d.data() };
      if (typeof r.timestamp !== "string" || !r.userId || !r.className) return;
      const t = new Date(r.timestamp).getTime();
      if (isNaN(t)) return;
      const cls = classByName[r.className];
      if (!cls) return;
      const st = String(r.status || "");
      const isIn = st.includes("PRESENT") || st.includes("TARDY");
      const isOut = st.includes("CHECKED OUT");
      if (!isIn && !isOut) return;
      const date = fmtDate(t, safeTz(cls.timezone));
      const key = `${r.userId}|${r.className}|${date}`;
      if (!groups[key]) groups[key] = { date, evs: [] };
      groups[key].evs.push({ ...r, t, isIn });
    });

    let wouldClose = 0;
    let closed = 0;
    let skipped = 0;

    for (const key of Object.keys(groups)) {
      const g = groups[key];
      g.evs.sort((a, b) => a.t - b.t);
      const last = g.evs[g.evs.length - 1];
      if (!last.isIn) continue; // already checked out

      const cls = classByName[last.className];
      const tz = safeTz(cls.timezone);
      const [y, mo, d] = g.date.split("-").map(Number);
      const [eh, em] = String(cls.endTime).split(":").map(Number);
      if (isNaN(eh) || isNaN(em)) { skipped++; continue; }

      const endMs = zonedToUtcMs(y, mo, d, eh, em, tz);
      const stampMs = Math.max(endMs, last.t + 60000);
      if (stampMs > nowMs) continue; // class not over yet

      const record = {
        userId: last.userId,
        userName: String(last.userName || ""),
        className: String(last.className),
        timestamp: new Date(stampMs).toISOString(),
        status: "CHECKED OUT (AUTO-END)",
      };

      if (DRY_RUN) {
        wouldClose++;
        logger.info("DRY RUN - would check out", {
          user: record.userName,
          class: record.className,
          classDate: g.date,
          checkedInAt: new Date(last.t).toISOString(),
          wouldStamp: record.timestamp,
        });
        continue;
      }

      try {
        // create() fails if the record already exists, so the browser timer and this function never duplicate
        await col("attendance").doc("autoend_" + last.id).create(record);
        closed++;
      } catch (err) {
        if (err.code === 6 || /ALREADY_EXISTS/.test(String(err.message))) {
          skipped++;
        } else {
          logger.error("Check-out failed", { user: record.userName, error: String(err.message) });
        }
      }
    }

    logger.info("autoCheckOut finished", {
      dryRun: DRY_RUN,
      recordsChecked: attSnap.size,
      wouldClose,
      closed,
      skipped,
    });
  }
);

// Gives each verified person a "badge" (their profile id, plus admin status) that the security rules check.
exports.claimProfile = onCall({ maxInstances: 5 }, async (request) => {
  const a = request.auth;
  if (!a) throw new HttpsError("unauthenticated", "Please sign in.");
  const tok = a.token || {};
  const provider = (tok.firebase && tok.firebase.sign_in_provider) || "";
  if (provider === "anonymous") throw new HttpsError("permission-denied", "Not allowed.");
  if (provider === "password" && tok.email_verified !== true) throw new HttpsError("failed-precondition", "Verify your email first.");

  const uid = a.uid;
  const emailRaw = String(tok.email || "").trim();
  const emailLower = emailRaw.toLowerCase();
  const users = col("users");

  let snap = await users.where("authUid", "==", uid).limit(1).get();
  if (snap.empty && emailLower) snap = await users.where("emailLower", "==", emailLower).limit(1).get();
  if (snap.empty && emailRaw) snap = await users.where("email", "==", emailRaw).limit(1).get();
  if (snap.empty) return { status: "none" };

  const docSnap = snap.docs[0];
  const profile = docSnap.data();
  if (profile.archived === true) return { status: "archived" };
  if (!profile.authUid) await docSnap.ref.update({ authUid: uid });

  const adminSnap = await db.collection("admins").doc(uid).get();
  const roles = Array.isArray(profile.roles) ? profile.roles : (profile.role ? [profile.role] : []);
  const isAdmin = adminSnap.exists || roles.includes("ADMIN") || roles.includes("ADMINISTRATOR");
  await getAuth().setCustomUserClaims(uid, { pid: docSnap.id, admin: isAdmin });
  return { status: "ok", pid: docSnap.id, admin: isAdmin };
});
