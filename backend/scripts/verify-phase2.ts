import http from "http";
import { app } from "../src/server.js";
import prisma from "../src/lib/prisma.js";

async function runTests() {
  console.log("==========================================");
  console.log("   BOOKLEAF PHASE 2 VERIFICATION SUITE   ");
  console.log("==========================================\n");

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`FAIL: ${testName} - ${details || "Assertion failed"}`);
      failedTests++;
    }
  }

  // 1. Database Isolation & Count Verification
  console.log("--- 1. Database Counts & Isolation Verification ---");
  const dbUrl = new URL(process.env.DATABASE_URL || "");
  const currentDb = dbUrl.pathname.replace(/^\//, "");
  assert(currentDb === "bookleaf_support_portal", "Connected strictly to bookleaf_support_portal", `Found ${currentDb}`);

  const authorCount = await prisma.authorProfile.count();
  assert(authorCount === 10, `Author count is 10 (Found: ${authorCount})`);

  const bookCount = await prisma.book.count();
  assert(bookCount === 18, `Book count is 18 (Found: ${bookCount})`);

  const userCount = await prisma.user.count();
  assert(userCount === 11, `User count is 11 (Found: ${userCount})`);

  // Start test server on ephemeral port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`\nTest server running at ${baseUrl}\n`);

  try {
    // 2. Health Endpoint
    console.log("--- 2. Health Check ---");
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert(healthRes.status === 200, "GET /api/health returns 200 OK");

    // 3. Authentication Tests
    console.log("\n--- 3. Authentication & Input Validation ---");
    // Invalid email input format
    const badInputRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid-email-format", password: "somepassword" }),
    });
    assert(badInputRes.status === 400, "POST /api/auth/login with malformed email returns 400 Bad Request");

    // Incorrect password
    const wrongPassRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@bookleaf.com", password: "WrongPassword999!" }),
    });
    assert(wrongPassRes.status === 401, "POST /api/auth/login with wrong password returns 401 Unauthorized");

    // Non-existent email
    const nonExistentRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@nowhere.com", password: "password123" }),
    });
    assert(nonExistentRes.status === 401, "POST /api/auth/login with non-existent user returns 401 Unauthorized");

    // Successful Admin Login
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@bookleaf.com", password: "Admin@BookLeaf2026!" }),
    });
    assert(adminLoginRes.status === 200, "POST /api/auth/login succeeds for Admin (200 OK)");
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData?.data?.token;
    assert(Boolean(adminToken), "Admin login returns signed JWT");
    assert(adminLoginData?.data?.user?.role === "ADMIN", "Admin user role is ADMIN");
    assert(adminLoginData?.data?.user?.passwordHash === undefined, "Admin password hash is not exposed in login response");

    // Successful Author Login (Priya Sharma - AUTH001)
    const authorLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "priya.sharma@email.com", password: "Author@BookLeaf2026!" }),
    });
    assert(authorLoginRes.status === 200, "POST /api/auth/login succeeds for Author (200 OK)");
    const authorLoginData = await authorLoginRes.json();
    const authorToken = authorLoginData?.data?.token;
    assert(Boolean(authorToken), "Author login returns signed JWT");
    assert(authorLoginData?.data?.user?.role === "AUTHOR", "Author user role is AUTHOR");
    assert(authorLoginData?.data?.user?.authorProfile?.authorCode === "AUTH001", "Author profile contains AUTH001 authorCode");
    assert(authorLoginData?.data?.user?.passwordHash === undefined, "Author password hash is not exposed in response");

    // Successful Author 2 Login (Rohit Kapoor - AUTH002)
    const author2LoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "rohit.kapoor@email.com", password: "Author@BookLeaf2026!" }),
    });
    const author2LoginData = await author2LoginRes.json();
    const author2Token = author2LoginData?.data?.token;
    const author1ProfileId = authorLoginData?.data?.user?.authorProfile?.id;
    const author2ProfileId = author2LoginData?.data?.user?.authorProfile?.id;

    // 4. Token & Current User (/api/auth/me) Tests
    console.log("\n--- 4. Token Validation & Current User (/api/auth/me) ---");
    // Missing token
    const missingTokenRes = await fetch(`${baseUrl}/api/auth/me`);
    assert(missingTokenRes.status === 401, "GET /api/auth/me without token returns 401 Unauthorized");

    // Invalid/malformed token
    const invalidTokenRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: "Bearer this-is-not-a-valid-token" },
    });
    assert(invalidTokenRes.status === 401, "GET /api/auth/me with invalid token returns 401 Unauthorized");

    // Admin current user retrieval
    const adminMeRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminMeRes.status === 200, "GET /api/auth/me with admin token returns 200 OK");
    const adminMeData = await adminMeRes.json();
    assert(adminMeData?.data?.user?.email === "admin@bookleaf.com", "Admin profile email matches admin@bookleaf.com");
    assert(adminMeData?.data?.user?.passwordHash === undefined, "Admin password hash is not exposed in /api/auth/me");

    // Author current user retrieval
    const authorMeRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authorToken}` },
    });
    assert(authorMeRes.status === 200, "GET /api/auth/me with author token returns 200 OK");
    const authorMeData = await authorMeRes.json();
    assert(authorMeData?.data?.user?.email === "priya.sharma@email.com", "Author profile email matches");
    assert(authorMeData?.data?.user?.authorProfile?.name === "Priya Sharma", "Author profile name matches 'Priya Sharma'");
    assert(authorMeData?.data?.user?.passwordHash === undefined, "Author password hash is not exposed in /api/auth/me");

    // 5. Role-Based Access Control Tests
    console.log("\n--- 5. Role-Based Access Control (RBAC) ---");
    // Author attempting to access admin-only endpoint
    const authorOnAdminRoute = await fetch(`${baseUrl}/api/test/admin-only`, {
      headers: { Authorization: `Bearer ${authorToken}` },
    });
    assert(authorOnAdminRoute.status === 403, "Author accessing admin-only endpoint is rejected with 403 Forbidden");

    // Admin accessing admin-only endpoint
    const adminOnAdminRoute = await fetch(`${baseUrl}/api/test/admin-only`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminOnAdminRoute.status === 200, "Admin accessing admin-only endpoint is granted access (200 OK)");

    // Admin attempting to access author-only endpoint
    const adminOnAuthorRoute = await fetch(`${baseUrl}/api/test/author-only`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminOnAuthorRoute.status === 403, "Admin accessing author-only endpoint is rejected with 403 Forbidden");

    // Author accessing author-only endpoint
    const authorOnAuthorRoute = await fetch(`${baseUrl}/api/test/author-only`, {
      headers: { Authorization: `Bearer ${authorToken}` },
    });
    assert(authorOnAuthorRoute.status === 200, "Author accessing author-only endpoint is granted access (200 OK)");

    // 6. Author Ownership Enforcement Tests
    console.log("\n--- 6. Author Resource Ownership Enforcement ---");
    // Author 1 accessing Author 1's resource
    const author1OwnResource = await fetch(`${baseUrl}/api/test/authors/${author1ProfileId}/books`, {
      headers: { Authorization: `Bearer ${authorToken}` },
    });
    assert(author1OwnResource.status === 200, "Author 1 accessing Author 1's resource is allowed (200 OK)");

    // Author 2 attempting to access Author 1's resource
    const author2Unauthorized = await fetch(`${baseUrl}/api/test/authors/${author1ProfileId}/books`, {
      headers: { Authorization: `Bearer ${author2Token}` },
    });
    assert(author2Unauthorized.status === 403, "Author 2 accessing Author 1's resource is blocked with 403 Forbidden");

    // Admin accessing Author 1's resource (admin bypass permitted)
    const adminAccessingAuthorResource = await fetch(`${baseUrl}/api/test/authors/${author1ProfileId}/books`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminAccessingAuthorResource.status === 200, "Admin accessing Author resource is permitted (200 OK)");
  } finally {
    server.close();
    await prisma.$disconnect();
  }

  console.log("\n==========================================");
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("==========================================");

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
