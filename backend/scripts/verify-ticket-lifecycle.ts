import http from "http";
import { app } from "../src/server.js";
import prisma from "../src/lib/prisma.js";

async function runTicketVerification() {
  console.log("==================================================");
  console.log("   BOOKLEAF AUTHOR & TICKET LIFECYCLE TEST SUITE  ");
  console.log("==================================================\n");

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

  // Start test server on ephemeral port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`Test server running at ${baseUrl}\n`);

  try {
    // 0. Ensure clean slate for test tickets
    await prisma.ticketMessage.deleteMany({});
    await prisma.ticket.deleteMany({});
    // 1. Log in users
    console.log("--- 1. Authenticating Test Users ---");
    // Author 1: Priya Sharma (AUTH001)
    const priyaLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "priya.sharma@email.com", password: "Author@BookLeaf2026!" }),
    });
    const priyaData = await priyaLoginRes.json();
    const priyaToken = priyaData?.data?.token;
    const priyaAuthorId = priyaData?.data?.user?.authorProfile?.id;
    assert(Boolean(priyaToken && priyaAuthorId), "Author 1 (Priya Sharma) logged in");

    // Author 2: Sneha Kulkarni (AUTH007)
    const snehaLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "sneha.kulkarni@email.com", password: "Author@BookLeaf2026!" }),
    });
    const snehaData = await snehaLoginRes.json();
    const snehaToken = snehaData?.data?.token;
    const snehaAuthorId = snehaData?.data?.user?.authorProfile?.id;
    assert(Boolean(snehaToken && snehaAuthorId), "Author 2 (Sneha Kulkarni) logged in");

    // Admin
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@bookleaf.com", password: "Admin@BookLeaf2026!" }),
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData?.data?.token;
    assert(Boolean(adminToken), "Admin logged in");

    // 2. Author Books & Royalty Verification
    console.log("\n--- 2. Author Dashboard: Books & Royalty Calculation ---");
    const priyaBooksRes = await fetch(`${baseUrl}/api/author/books`, {
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    assert(priyaBooksRes.status === 200, "GET /api/author/books returns 200 OK for Priya");
    const priyaBooksData = await priyaBooksRes.json();
    const priyaBooks = priyaBooksData?.data?.books;
    const priyaSummary = priyaBooksData?.data?.summary;

    assert(Array.isArray(priyaBooks) && priyaBooks.length === 2, "Priya has 2 books (BK001, BK002)");
    assert(priyaSummary?.totalBooks === 2, "Priya totalBooks count is 2");
    assert(priyaSummary?.publishedBooks === 2, "Priya publishedBooks count is 2");
    assert(priyaSummary?.inProductionBooks === 0, "Priya inProductionBooks count is 0");
    assert(priyaSummary?.totalCopiesSold === 531, "Priya totalCopiesSold is 531 (342 + 189)");
    assert(priyaSummary?.totalRoyaltyEarned === 19908, "Priya totalRoyaltyEarned is ₹19,908 (11970 + 7938)");
    assert(priyaSummary?.royaltyPaid === 16338, "Priya royaltyPaid is ₹16,338 (8400 + 7938)");
    assert(priyaSummary?.royaltyPending === 3570, "Priya royaltyPending is ₹3,570 (3570 + 0)");
    assert(priyaSummary?.payoutEligible === true, "Priya is eligible for payout (>= ₹1,000 threshold)");

    // Test Sneha's books (includes book in production with nullable fields)
    const snehaBooksRes = await fetch(`${baseUrl}/api/author/books`, {
      headers: { Authorization: `Bearer ${snehaToken}` },
    });
    const snehaBooksData = await snehaBooksRes.json();
    const snehaBooks = snehaBooksData?.data?.books;
    const snehaSummary = snehaBooksData?.data?.summary;

    assert(Array.isArray(snehaBooks) && snehaBooks.length === 3, "Sneha has 3 books (BK011, BK012, BK013)");
    assert(snehaSummary?.inProductionBooks === 1, "Sneha has 1 book in production");
    const prodBook = snehaBooks.find((b: any) => b.bookCode === "BK013");
    assert(prodBook?.status === "In Production - Cover Design", "BK013 status is 'In Production - Cover Design'");
    assert(prodBook?.publicationDate === null, "BK013 publicationDate is null");
    assert(prodBook?.mrp === null, "BK013 mrp is null");
    assert(prodBook?.authorRoyaltyPerCopy === null, "BK013 authorRoyaltyPerCopy is null");
    assert(Array.isArray(prodBook?.availableOn) && prodBook?.availableOn.length === 0, "BK013 availableOn is empty array []");

    // Book Isolation: Priya cannot see Sneha's books in her books list
    const hasSnehaBookInPriya = priyaBooks.some((b: any) => b.bookCode === "BK013");
    assert(!hasSnehaBookInPriya, "Priya cannot see Sneha's books (Book isolation maintained)");

    // 3. Ticket Creation & Validation
    console.log("\n--- 3. Ticket Creation & Validation ---");
    // Validation: short subject
    const shortSubRes = await fetch(`${baseUrl}/api/tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${priyaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "No",
        description: "This description is definitely long enough",
      }),
    });
    assert(shortSubRes.status === 400, "Ticket creation with subject < 3 chars fails (400)");

    // Validation: short description
    const shortDescRes = await fetch(`${baseUrl}/api/tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${priyaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "Valid Subject",
        description: "Short",
      }),
    });
    assert(shortDescRes.status === 400, "Ticket creation with description < 10 chars fails (400)");

    // Validation: Invalid non-existent bookId
    const badBookRes = await fetch(`${baseUrl}/api/tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${priyaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "Query on phantom book",
        description: "This is a detailed description of my issue",
        bookId: "00000000-0000-0000-0000-000000000000",
      }),
    });
    assert(badBookRes.status === 400, "Ticket creation with non-existent bookId fails (400)");

    // Validation: Invalid Book Ownership (Priya trying to select Sneha's book BK011)
    const snehaBookId = snehaBooks[0].id;
    const stolenBookRes = await fetch(`${baseUrl}/api/tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${priyaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "Query on someone else's book",
        description: "Trying to raise ticket on Sneha's book",
        bookId: snehaBookId,
      }),
    });
    assert(stolenBookRes.status === 403, "Ticket creation with another author's book fails (403 Forbidden)");

    // Valid: Create General / Account-level Ticket
    const priyaGeneralTicketRes = await fetch(`${baseUrl}/api/tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${priyaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "Royalty Payout Status for Q3",
        description: "I haven't received my pending royalty payout for Q3 2025. Please check.",
        category: "ROYALTY_AND_PAYMENTS",
      }),
    });
    assert(priyaGeneralTicketRes.status === 201, "Author creates general ticket (201 Created)");
    const priyaGeneralTicketData = await priyaGeneralTicketRes.json();
    const priyaGeneralTicket = priyaGeneralTicketData?.data?.ticket;
    assert(Boolean(priyaGeneralTicket?.ticketNumber?.startsWith("TKT-")), `Ticket assigned ticket number: ${priyaGeneralTicket?.ticketNumber}`);
    assert(priyaGeneralTicket?.bookId === null, "General ticket has null bookId");
    assert(priyaGeneralTicket?.status === "OPEN", "New ticket status defaults to OPEN");

    // Valid: Create Book-specific Ticket (BK001)
    const priyaBookId = priyaBooks[0].id;
    const priyaBookTicketRes = await fetch(`${baseUrl}/api/tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${priyaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "Cover print color variation on Whispers of the Ganges",
        description: "Author copies show color variation compared to original approved proof.",
        bookId: priyaBookId,
        category: "PRINTING_AND_QUALITY",
        priority: "HIGH",
      }),
    });
    assert(priyaBookTicketRes.status === 201, "Author creates book-specific ticket (201 Created)");
    const priyaBookTicketData = await priyaBookTicketRes.json();
    const priyaBookTicket = priyaBookTicketData?.data?.ticket;
    assert(priyaBookTicket?.book?.title === priyaBooks[0].title, `Ticket associated with correct book title: ${priyaBooks[0].title}`);

    // 4. Ticket Listing & Isolation
    console.log("\n--- 4. Ticket Listing & Isolation ---");
    // Priya lists tickets
    const priyaListRes = await fetch(`${baseUrl}/api/tickets`, {
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    const priyaListData = await priyaListRes.json();
    const priyaTickets = priyaListData?.data?.tickets;
    assert(priyaTickets?.length === 2, `Priya sees her 2 created tickets (Found: ${priyaTickets?.length})`);

    // Sneha lists tickets (has not created any)
    const snehaListRes = await fetch(`${baseUrl}/api/tickets`, {
      headers: { Authorization: `Bearer ${snehaToken}` },
    });
    const snehaListData = await snehaListRes.json();
    const snehaTickets = snehaListData?.data?.tickets;
    assert(snehaTickets?.length === 0, `Sneha sees 0 tickets (Author ticket isolation maintained)`);

    // Admin lists tickets
    const adminListRes = await fetch(`${baseUrl}/api/tickets`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminListData = await adminListRes.json();
    const adminTickets = adminListData?.data?.tickets;
    assert(adminTickets?.length >= 2, `Admin sees all tickets in system (Found: ${adminTickets?.length})`);

    // 5. Ticket Conversation & Access Control
    console.log("\n--- 5. Ticket Conversation & Cross-Author Access Control ---");
    // Priya views her own ticket
    const priyaViewRes = await fetch(`${baseUrl}/api/tickets/${priyaGeneralTicket.id}`, {
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    assert(priyaViewRes.status === 200, "Priya can view her own ticket details (200 OK)");

    // Sneha attempts to view Priya's ticket
    const snehaViewRes = await fetch(`${baseUrl}/api/tickets/${priyaGeneralTicket.id}`, {
      headers: { Authorization: `Bearer ${snehaToken}` },
    });
    assert(snehaViewRes.status === 403, "Sneha viewing Priya's ticket is blocked (403 Forbidden)");

    // 6. Messaging, Internal Notes, and Confidentiality
    console.log("\n--- 6. Messaging & Internal Note Confidentiality ---");
    // Author sends a reply
    const priyaReplyRes = await fetch(`${baseUrl}/api/tickets/${priyaGeneralTicket.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${priyaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: "Adding bank statement reference for the missing payout.",
        isInternal: true, // Author tries to set isInternal: true
      }),
    });
    assert(priyaReplyRes.status === 201, "Author can reply to ticket (201 Created)");
    const priyaReplyData = await priyaReplyRes.json();
    assert(priyaReplyData?.data?.message?.isInternal === false, "Author cannot create internal note (forced to false)");

    // Admin adds internal note (Confidential to BookLeaf ops team)
    const adminInternalNoteRes = await fetch(`${baseUrl}/api/tickets/${priyaGeneralTicket.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: "INTERNAL NOTE: Escalate to Accounts Dept. Check HDFC bank batch payout ref #9981.",
        isInternal: true,
      }),
    });
    assert(adminInternalNoteRes.status === 201, "Admin posts internal note (201 Created)");

    // Admin posts public author-visible response
    const adminPublicReplyRes = await fetch(`${baseUrl}/api/tickets/${priyaGeneralTicket.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: "Hello Priya, we have verified your account and your Q3 payout has been batched for processing within 48 hours.",
        isInternal: false,
      }),
    });
    assert(adminPublicReplyRes.status === 201, "Admin posts public reply (201 Created)");

    // Verify Author DOES NOT see the internal note
    const priyaInspectRes = await fetch(`${baseUrl}/api/tickets/${priyaGeneralTicket.id}`, {
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    const priyaInspectData = await priyaInspectRes.json();
    const priyaMessages = priyaInspectData?.data?.ticket?.messages;

    const internalNoteExposed = priyaMessages.some((m: any) => m.content.includes("INTERNAL NOTE"));
    assert(!internalNoteExposed, "Internal note is STRICTLY HIDDEN from author");
    assert(priyaMessages.length === 2, `Author sees exactly 2 messages (own reply + admin public response, not internal note)`);
    assert(priyaInspectData?.data?.ticket?.status === "IN_PROGRESS", "Ticket status auto-transitioned to IN_PROGRESS on admin reply");

    // Verify Admin DOES see the internal note
    const adminInspectRes = await fetch(`${baseUrl}/api/tickets/${priyaGeneralTicket.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminInspectData = await adminInspectRes.json();
    const adminMessages = adminInspectData?.data?.ticket?.messages;
    const internalNotePresentForAdmin = adminMessages.some((m: any) => m.isInternal === true);
    assert(internalNotePresentForAdmin, "Admin sees internal notes marked with isInternal: true");
    assert(adminMessages.length === 3, "Admin sees all 3 messages (author reply + internal note + public reply)");

    // 7. Admin Status Change & RBAC
    console.log("\n--- 7. Admin Status Lifecycle & Updates ---");
    // Author attempts to update ticket status
    const authorPatchRes = await fetch(`${baseUrl}/api/tickets/${priyaGeneralTicket.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${priyaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "CLOSED" }),
    });
    assert(authorPatchRes.status === 403, "Author forbidden from updating ticket status directly (403)");

    // Admin updates status to RESOLVED
    const adminPatchRes = await fetch(`${baseUrl}/api/tickets/${priyaGeneralTicket.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    assert(adminPatchRes.status === 200, "Admin can update ticket status to RESOLVED (200 OK)");
    const adminPatchData = await adminPatchRes.json();
    assert(adminPatchData?.data?.ticket?.status === "RESOLVED", "Ticket status is now RESOLVED");
  } finally {
    server.close();
    await prisma.$disconnect();
  }

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTicketVerification().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
