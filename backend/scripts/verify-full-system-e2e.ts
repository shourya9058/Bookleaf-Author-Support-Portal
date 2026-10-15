import http from "http";
import { app } from "../src/server.js";
import prisma from "../src/lib/prisma.js";

async function runEndToEndVerification() {
  console.log("==================================================================");
  console.log("   BOOKLEAF PORTAL END-TO-END WORKFLOW VERIFICATION SUITE       ");
  console.log("==================================================================\n");

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

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`Test server running at ${baseUrl}\n`);

  try {
    // Reset test ticket state
    await prisma.ticketMessage.deleteMany({});
    await prisma.ticket.deleteMany({});

    // -------------------------------------------------------------
    // WORKFLOW 1: Author Journey
    // -------------------------------------------------------------
    console.log("--- WORKFLOW 1: Author Journey (Login -> Dashboard -> Create -> View -> Reply) ---");

    // 1.1 Author Login
    const authorLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "priya.sharma@email.com", password: "Author@BookLeaf2026!" }),
    });
    assert(authorLogin.status === 200, "1.1 Author Priya Sharma logs in successfully (200 OK)");
    const authorData = await authorLogin.json();
    const authorToken = authorData?.data?.token;
    const authorProfile = authorData?.data?.user?.authorProfile;
    assert(Boolean(authorToken && authorProfile?.id), "Author token and profile received");

    // 1.2 View Author Dashboard (Books & Royalties)
    const authorBooksRes = await fetch(`${baseUrl}/api/author/books`, {
      headers: { Authorization: `Bearer ${authorToken}` },
    });
    assert(authorBooksRes.status === 200, "1.2 Author retrieves published books & royalty summary (200 OK)");
    const booksData = await authorBooksRes.json();
    const books = booksData?.data?.books;
    const summary = booksData?.data?.summary;
    assert(Array.isArray(books) && books.length === 2, "Author sees exactly their 2 books");
    assert(summary?.payoutEligible === true, "Author royalty threshold evaluation accurate (>= ₹1,000)");

    // 1.3 Author Submits a Book-Linked Support Query
    const bookToInquire = books[0];
    const ticketCreateRes = await fetch(`${baseUrl}/api/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({
        bookId: bookToInquire.id,
        subject: "Defective author copies received with blurry cover print",
        description: "Received batch of 10 copies for 'The Saffron Diaries'. The cover title is blurry and 3 copies have loose binding. Please arrange reprint.",
        category: "PRINTING_AND_QUALITY",
        priority: "HIGH",
      }),
    });
    assert(ticketCreateRes.status === 201, "1.3 Author raises book-specific support query (201 Created)");
    const createdTicketData = await ticketCreateRes.json();
    const ticketId = createdTicketData?.data?.ticket?.id;
    const ticketNumber = createdTicketData?.data?.ticket?.ticketNumber;
    assert(Boolean(ticketId && ticketNumber), `Ticket assigned human-readable number: ${ticketNumber}`);

    // 1.4 Author Views Their Tickets Queue
    const authorTicketsRes = await fetch(`${baseUrl}/api/tickets`, {
      headers: { Authorization: `Bearer ${authorToken}` },
    });
    assert(authorTicketsRes.status === 200, "1.4 Author views ticket queue (200 OK)");
    const authorTicketsData = await authorTicketsRes.json();
    assert(authorTicketsData?.data?.tickets?.length === 1, "Author sees exactly their submitted ticket");

    // 1.5 Author Follows Up in Conversation Thread
    const authorReplyRes = await fetch(`${baseUrl}/api/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({
        content: "Attaching confirmation that 3 of the 10 books have spine misalignment.",
        isInternal: false,
      }),
    });
    assert(authorReplyRes.status === 201, "1.5 Author posts follow-up message to ticket (201 Created)");

    // -------------------------------------------------------------
    // WORKFLOW 2: Admin Journey
    // -------------------------------------------------------------
    console.log("\n--- WORKFLOW 2: Admin Operations & AI-Assisted Resolution ---");

    // 2.1 Admin Login
    const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@bookleaf.com", password: "Admin@BookLeaf2026!" }),
    });
    assert(adminLogin.status === 200, "2.1 Admin logs in successfully (200 OK)");
    const adminData = await adminLogin.json();
    const adminToken = adminData?.data?.token;
    const adminUserId = adminData?.data?.user?.id;
    assert(Boolean(adminToken && adminUserId), "Admin JWT and ID received");

    // 2.2 Admin Filters Ticket Queue by Status, Category, Priority, and Sort Order
    const adminFilteredRes = await fetch(
      `${baseUrl}/api/tickets?status=OPEN&category=PRINTING_AND_QUALITY&priority=HIGH&sortBy=urgent`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(adminFilteredRes.status === 200, "2.2 Admin filters queue by status, category, priority, and urgent sorting (200 OK)");
    const filteredData = await adminFilteredRes.json();
    assert(filteredData?.data?.tickets?.length >= 1, "Filtered queue returns matching ticket");

    // 2.3 Admin Inspects Ticket Context (Author + Book + Thread)
    const adminTicketDetailRes = await fetch(`${baseUrl}/api/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminTicketDetailRes.status === 200, "2.3 Admin inspects ticket details (200 OK)");
    const adminTicketData = await adminTicketDetailRes.json();
    const inspectedTicket = adminTicketData?.data?.ticket;
    assert(inspectedTicket?.author?.name === "Priya Sharma", "Admin sees author identity & code");
    assert(inspectedTicket?.book?.title === "The Saffron Diaries", "Admin sees associated book details");

    // 2.4 Admin Assigns Ticket to Themselves
    const assignRes = await fetch(`${baseUrl}/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ assignedAdminId: adminUserId }),
    });
    assert(assignRes.status === 200, "2.4 Admin assigns ticket to themselves (200 OK)");
    const assignedTicketData = await assignRes.json();
    assert(assignedTicketData?.data?.ticket?.assignedAdmin?.email === "admin@bookleaf.com", "Ticket owner is now admin@bookleaf.com");

    // 2.5 Admin Reviews AI Recommendations & Explainable Reasoning
    assert(Boolean(inspectedTicket?.aiClassification), "2.5 AI suggested category present on ticket");
    assert(Boolean(inspectedTicket?.aiPriority), "AI suggested priority present on ticket");
    assert(Boolean(inspectedTicket?.aiReasoning), "AI reasoning explanation narrative present on ticket");

    // 2.6 Admin Generates Knowledge-Base-Grounded Draft
    const draftGenRes = await fetch(`${baseUrl}/api/tickets/${ticketId}/ai/draft`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(draftGenRes.status === 200, "2.6 Admin triggers AI KB draft response generation (200 OK)");
    const draftData = await draftGenRes.json();
    const draftContent = draftData?.data?.draft;
    assert(Boolean(draftContent && draftContent.length > 50), "Draft generated with substantial policy content");

    // Verify draft was NOT sent automatically (thread still only has the 1 author follow-up message)
    const checkMessagesRes = await fetch(`${baseUrl}/api/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const checkMessagesData = await checkMessagesRes.json();
    const currentMessagesCount = checkMessagesData?.data?.ticket?.messages?.length || 0;
    assert(currentMessagesCount === 1, "Draft generation did NOT automatically send a message to thread (count remains 1)");

    // 2.7 Admin Edits Draft and Sends as Public Reply
    const finalizedReply = `${draftContent}\n\nP.S. I have flagged this directly with our print partner supervisor.`;
    const sendPublicReplyRes = await fetch(`${baseUrl}/api/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        content: finalizedReply,
        isInternal: false,
      }),
    });
    assert(sendPublicReplyRes.status === 201, "2.7 Admin edits draft and posts as public reply (201 Created)");

    // 2.8 Admin Adds Confidential Internal Note
    const internalNoteText = "OPS NOTE: Contacted Delhi printing unit regarding Batch #DL-4481. Replacement authorized.";
    const internalNoteRes = await fetch(`${baseUrl}/api/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        content: internalNoteText,
        isInternal: true,
      }),
    });
    assert(internalNoteRes.status === 201, "2.8 Admin posts confidential internal note (201 Created)");

    // 2.9 Admin Updates Status to IN_PROGRESS and then RESOLVED
    const statusUpdateRes = await fetch(`${baseUrl}/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    assert(statusUpdateRes.status === 200, "2.9 Admin updates ticket status to RESOLVED (200 OK)");

    // -------------------------------------------------------------
    // WORKFLOW 3: Cross-Author Security & Confidentiality Verification
    // -------------------------------------------------------------
    console.log("\n--- WORKFLOW 3: Cross-Author Security & Internal Note Privacy ---");

    // 3.1 Author 1 views their ticket: Sees public reply, DOES NOT see internal note
    const authorViewTicketRes = await fetch(`${baseUrl}/api/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${authorToken}` },
    });
    const authorViewData = await authorViewTicketRes.json();
    const authorReceivedMessages = authorViewData?.data?.ticket?.messages || [];
    const seesPublicReply = authorReceivedMessages.some((m: any) => m.content === finalizedReply);
    const seesInternalNote = authorReceivedMessages.some((m: any) => m.content === internalNoteText);
    assert(seesPublicReply === true, "3.1 Author sees finalized admin response in conversation thread");
    assert(seesInternalNote === false, "Author DOES NOT see ops internal note (privacy strictly enforced)");

    // 3.2 Author 2 (Sneha Kulkarni) attempts to view Author 1's ticket -> 403 Forbidden
    const author2Login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "sneha.kulkarni@email.com", password: "Author@BookLeaf2026!" }),
    });
    const author2Data = await author2Login.json();
    const author2Token = author2Data?.data?.token;

    const crossAuthorAccessRes = await fetch(`${baseUrl}/api/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${author2Token}` },
    });
    assert(crossAuthorAccessRes.status === 403, "3.2 Author 2 blocked from viewing Author 1's ticket (403 Forbidden)");

    // 3.3 Author 2 attempts to view Author 1's books -> Author 2 only sees Author 2's books
    const author2BooksRes = await fetch(`${baseUrl}/api/author/books`, {
      headers: { Authorization: `Bearer ${author2Token}` },
    });
    const author2BooksData = await author2BooksRes.json();
    const author2BookCodes = author2BooksData?.data?.books?.map((b: any) => b.bookCode);
    assert(
      !author2BookCodes.includes("BK001") && !author2BookCodes.includes("BK002"),
      "3.3 Author 2 cannot access Author 1's book catalog (multi-tenant isolation)"
    );

    // Summary
    console.log("\n==================================================");
    console.log(`TOTAL E2E TESTS: ${passedTests + failedTests}`);
    console.log(`PASSED: ${passedTests}`);
    console.log(`FAILED: ${failedTests}`);
    console.log("==================================================");

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("End-to-end verification encountered error:", err);
    process.exit(1);
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runEndToEndVerification();
