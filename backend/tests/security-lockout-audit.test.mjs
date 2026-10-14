// Security regression test:
// 1. Account Lockout: 5 failed login attempts -> 15-minute lock (HTTP 423)
// 2. Audit Logging: track notices create/update/delete & users create/update/delete
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (p) => pathToFileURL(path.join(here, "..", "src", p)).href;

let mongo = null;
let uri = process.env.TEST_MONGODB_URI;
if (!uri) {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  mongo = await MongoMemoryServer.create();
  uri = mongo.getUri();
}

const PORT = 5900 + Math.floor(Math.random() * 300);
Object.assign(process.env, {
  NODE_ENV: "test",
  PORT: String(PORT),
  MONGODB_URI: uri,
  JWT_SECRET: "security-audit-test-secret-at-least-32-chars",
  ALLOWED_ORIGINS: "http://localhost:5173",
  ALLOW_ADMIN_BOOTSTRAP: "true",
  ADMIN_BOOTSTRAP_EMAIL: "admin@lockout-test.com",
  EMAIL_PROVIDER: "mock",
  CLOUDINARY_CLOUD_NAME: "",
  CLOUDINARY_API_KEY: "",
  CLOUDINARY_API_SECRET: "",
});

await import(src("server.js"));
const B = `http://127.0.0.1:${PORT}`;
const User = (await import(src("models/User.js"))).default;
const Notice = (await import(src("models/Notice.js"))).default;
const ActivityLog = (await import(src("models/ActivityLog.js"))).default;

let passed = 0;
let failed = 0;
const check = (name, ok, extra = "") => {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + extra}`);
};

const call = async (method, p, body, token) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(B + p, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let d = null;
  try {
    d = await r.json();
  } catch {}
  return { s: r.status, d };
};

// 1. Bootstrap Admin
let r = await call("POST", "/api/auth/register", {
  name: "Master Admin",
  email: "admin@lockout-test.com",
  password: "CorrectPassword#1",
});
check("Admin bootstrapped successfully", r.s === 201 && r.d.token);
const adminToken = r.d.token;

// 2. Create a test user for lockout testing
r = await call(
  "POST",
  "/api/users",
  {
    name: "Teacher User",
    email: "teacher@lockout-test.com",
    password: "CorrectPass#123",
    role: "editor",
  },
  adminToken
);
check("User created for lockout test", r.s === 201);
const teacherId = r.d.data.id;

// 3. Failed login attempts 1 through 4 should return 401
for (let i = 1; i <= 4; i++) {
  r = await call("POST", "/api/auth/login", {
    email: "teacher@lockout-test.com",
    password: "WrongPassword!",
  });
  check(`Failed login attempt #${i} returns 401`, r.s === 401 && r.d.message.includes(`${5 - i} attempt(s) remaining`));
}

// 4. 5th failed attempt must trigger Account Lockout (HTTP 423)
r = await call("POST", "/api/auth/login", {
  email: "teacher@lockout-test.com",
  password: "WrongPassword!",
});
check("5th failed login attempt triggers 423 Locked", r.s === 423 && r.d.locked === true);

// 5. 6th attempt (even with CORRECT password) is rejected with 423 while locked
r = await call("POST", "/api/auth/login", {
  email: "teacher@lockout-test.com",
  password: "CorrectPass#123",
});
check("Login with correct password while locked is rejected with 423", r.s === 423 && r.d.locked === true);

// 6. Admin unlocks user via PUT /api/users/:id
r = await call("PUT", `/api/users/${teacherId}`, { unlock: true }, adminToken);
check("Admin unlocks account via PUT /api/users/:id", r.s === 200 && r.d.data.isLocked === false);

// 7. Login with correct password now succeeds
r = await call("POST", "/api/auth/login", {
  email: "teacher@lockout-test.com",
  password: "CorrectPass#123",
});
check("Login succeeds after unlock", r.s === 200 && r.d.token);
const teacherToken = r.d.token;

// 8. Notice Audit Trail: Create, Update, Delete
r = await call(
  "POST",
  "/api/notices",
  {
    title: "Exam Schedule Notice",
    description: "Final exam schedule for class 10.",
    category: "Examination",
  },
  teacherToken
);
check("Notice created by teacher", r.s === 201);
const noticeId = r.d.data._id;

r = await call(
  "PUT",
  `/api/notices/${noticeId}`,
  {
    title: "Updated Exam Schedule Notice",
    description: "Updated final exam schedule.",
  },
  adminToken
);
check("Notice updated by admin", r.s === 200);

r = await call("DELETE", `/api/notices/${noticeId}`, null, adminToken);
check("Notice deleted by admin", r.s === 200);

// 9. Verify Audit Logs exist for Notices
const noticeLogs = await ActivityLog.find({ resource: "notices", resourceId: noticeId }).sort({ createdAt: 1 });
check("Notice audit log records 3 events (create, update, delete)", noticeLogs.length >= 3);
check("Notice create logged with teacher name", noticeLogs.some((l) => l.action === "create" && l.userName === "Teacher User"));
check("Notice update logged with admin name", noticeLogs.some((l) => l.action === "update" && l.userName === "Master Admin"));
check("Notice delete logged with admin name", noticeLogs.some((l) => l.action === "delete" && l.userName === "Master Admin"));

// 10. Verify Audit Logs exist for Users
const userLogs = await ActivityLog.find({ resource: "users", resourceId: teacherId });
check("User create and update logged in ActivityLog", userLogs.some((l) => l.action === "user_create") && userLogs.some((l) => l.action === "user_update"));

// 11. Verify Security Audit Logs exist for Auth
const authLogs = await ActivityLog.find({ resource: "auth", resourceId: teacherId });
check("Auth activity log records failed attempts and lockout", authLogs.some((l) => l.action === "login_failed") && authLogs.some((l) => l.action === "account_locked"));

console.log(`\nSecurity Suite: PASS ${passed}  FAIL ${failed}`);
if (mongo) await mongo.stop();
process.exit(failed ? 1 : 0);
