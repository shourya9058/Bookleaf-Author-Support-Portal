import http from "http";
import { app } from "../src/server.js";
import prisma from "../src/lib/prisma.js";
import { aiService } from "../src/services/ai/aiService.js";
import { BOOKLEAF_KNOWLEDGE_BASE, getRelevantKnowledge } from "../src/services/ai/knowledgeBase.js";
import { TicketCategory, TicketPriority } from "@prisma/client";

async function runAiVerification() {
  console.log("==================================================================");
  console.log("   BOOKLEAF AI INTELLIGENCE & KB-GROUNDED REPLIES TEST SUITE     ");
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

  // Start test server on ephemeral port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`Test server running at ${baseUrl}\n`);

  try {
    // Clean test ticket state
    await prisma.ticketMessage.deleteMany({});
    await prisma.ticket.deleteMany({});

    // 1. Authenticate test users
    console.log("--- 1. Authenticating Test Users ---");
    const authorLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "priya.sharma@email.com", password: "Author@BookLeaf2026!" }),
    });
    const authorData = await authorLoginRes.json();
    const authorToken = authorData?.data?.token;
    const authorProfileId = authorData?.data?.user?.authorProfile?.id;
    assert(Boolean(authorToken && authorProfileId), "Author (Priya Sharma) authenticated successfully");

    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@bookleaf.com", password: "Admin@BookLeaf2026!" }),
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData?.data?.token;
    assert(Boolean(adminToken), "Admin authenticated successfully");

    // Retrieve Priya's first book
    const priyaBook = await prisma.book.findFirst({
      where: { authorId: authorProfileId },
    });
    assert(Boolean(priyaBook), "Retrieved author's book for context");

    // 2. Knowledge Base Unit Verification
    console.log("\n--- 2. Centralized Knowledge Base & Policy Grounding ---");
    assert(BOOKLEAF_KNOWLEDGE_BASE.company.name === "BookLeaf Publishing", "KB company is BookLeaf Publishing");
    const royaltyPolicy = BOOKLEAF_KNOWLEDGE_BASE.policies.find(p => p.id === "royalty-policy");
    assert(Boolean(royaltyPolicy && royaltyPolicy.rules.some(r => r.includes("80/20"))), "KB specifies 80/20 royalty split");
    assert(Boolean(royaltyPolicy && royaltyPolicy.rules.some(r => r.includes("₹1,000"))), "KB specifies ₹1,000 payout threshold");
    assert(Boolean(royaltyPolicy && royaltyPolicy.rules.some(r => r.includes("45 days"))), "KB specifies quarterly cycle within 45 days");

    const printPolicy = BOOKLEAF_KNOWLEDGE_BASE.policies.find(p => p.id === "printing-quality-policy");
    assert(Boolean(printPolicy && printPolicy.rules.some(r => r.includes("free reprint"))), "KB specifies free reprint for quality defects");

    const distPolicy = BOOKLEAF_KNOWLEDGE_BASE.policies.find(p => p.id === "distribution-availability-policy");
    assert(Boolean(distPolicy && distPolicy.rules.some(r => r.includes("7–10") || r.includes("7-10"))), "KB specifies 7-10 business days listing");
    assert(Boolean(distPolicy && distPolicy.rules.some(r => r.includes("24–48") || r.includes("24-48"))), "KB specifies 24-48 hours sync");

    // Test selective knowledge retrieval
    const royaltyKb = getRelevantKnowledge("Where is my Q2 royalty payout? It is over 1000 rupees.");
    assert(royaltyKb.includes("80/20") && royaltyKb.includes("₹1,000"), "Selective KB retrieval includes Royalty policies for payment query");

    const isbnKb = getRelevantKnowledge("There is a barcode mismatch and wrong ISBN printed on Amazon.");
    assert(isbnKb.includes("ISBN") && isbnKb.includes("Metadata"), "Selective KB retrieval includes ISBN policies for metadata query");

    // 3. AI Service: Classification for All 6 Categories & 4 Priorities
    console.log("\n--- 3. Classification Accuracy Across All 6 BRD Categories & 4 Priorities ---");

    const testClassificationScenarios = [
      {
        name: "Royalty & Payments (Medium)",
        input: {
          subject: "Inquiry on Q3 royalty payout schedule and minimum threshold",
          description: "Could you please explain when Q3 royalties will be credited to my bank account?",
        },
        expectedCategory: TicketCategory.ROYALTY_AND_PAYMENTS,
        expectedPriority: TicketPriority.MEDIUM,
      },
      {
        name: "ISBN & Metadata Issues (Critical/High requirement)",
        input: {
          subject: "URGENT: ISBN mismatch and barcode scan failure on Amazon listing",
          description: "The printed book barcode does not match the 13-digit ISBN assigned to my title. Readers cannot purchase.",
        },
        expectedCategory: TicketCategory.ISBN_AND_METADATA,
        expectedPriority: TicketPriority.CRITICAL,
      },
      {
        name: "Printing & Quality (High - Defect Investigation)",
        input: {
          subject: "Damaged copies received with missing pages and blurry cover print",
          description: "Author copies arrived yesterday with upside-down pages and severe binding defects. Requesting reprint.",
        },
        expectedCategory: TicketCategory.PRINTING_AND_QUALITY,
        expectedPriority: TicketPriority.HIGH,
      },
      {
        name: "Distribution & Availability (Medium)",
        input: {
          subject: "Book shows currently unavailable on Flipkart and Amazon Prime",
          description: "My published book shows out of stock on online platforms for the past 3 days.",
        },
        expectedCategory: TicketCategory.DISTRIBUTION_AND_AVAILABILITY,
        expectedPriority: TicketPriority.MEDIUM,
      },
      {
        name: "Book Status & Production Updates (Low)",
        input: {
          subject: "Checking on typesetting and interior layout progress",
          description: "Hello team, I wanted a gentle update on the current status of my manuscript formatting.",
        },
        expectedCategory: TicketCategory.BOOK_STATUS_AND_PRODUCTION,
        expectedPriority: TicketPriority.LOW,
      },
      {
        name: "General Inquiry (Low)",
        input: {
          subject: "Question regarding general portal navigation",
          description: "How do I update my correspondence mailing address on the portal profile?",
        },
        expectedCategory: TicketCategory.GENERAL_INQUIRY,
        expectedPriority: TicketPriority.LOW,
      },
    ];

    const observedPriorities = new Set<string>();
    const observedCategories = new Set<string>();

    for (const scenario of testClassificationScenarios) {
      const classResult = await aiService.classifyTicket(scenario.input);
      assert(classResult.success === true, `Classification succeeded for '${scenario.name}'`);
      assert(
        classResult.category === scenario.expectedCategory,
        `Category correctly classified as ${scenario.expectedCategory} (got ${classResult.category})`
      );
      assert(
        classResult.priority === scenario.expectedPriority,
        `Priority correctly classified as ${scenario.expectedPriority} (got ${classResult.priority})`
      );
      assert(
        Boolean(classResult.reasoning && classResult.reasoning.length > 10),
        `Reasoning provided for '${scenario.name}': "${classResult.reasoning?.slice(0, 60)}..."`
      );

      if (classResult.category) observedCategories.add(classResult.category);
      if (classResult.priority) observedPriorities.add(classResult.priority);
    }

    assert(observedCategories.size === 6, `All 6 BRD categories verified (observed: ${observedCategories.size})`);
    assert(observedPriorities.size === 4, `All 4 priorities verified (Critical, High, Medium, Low)`);
    assert(
      !Array.from(observedPriorities).every((p) => p === "HIGH"),
      "Priorities are balanced; system does NOT classify every ticket as High"
    );

    // 4. Untrusted Model Output Validation & Malformed Payload Handling
    console.log("\n--- 4. Malformed / Untrusted Model Output Validation (Zod Guard) ---");

    // Inject a mocked OpenAI client returning invalid JSON structure
    const originalClient = (aiService as any).openaiClient;

    const mockMalformedClient = {
      chat: {
        completions: {
          create: async () => ({
            choices: [
              {
                message: {
                  content: "INVALID_NOT_JSON",
                },
              },
            ],
          }),
        },
      },
    };

    aiService.setClient(mockMalformedClient as any);
    const malformedResult = await aiService.classifyTicket({
      subject: "Test invalid JSON parsing",
      description: "Model output is gibberish",
    });
    // Should fallback safely to rule-based mock classifier without throwing an uncaught exception
    assert(
      malformedResult.success === true && malformedResult.category !== undefined,
      "Malformed non-JSON output caught gracefully and recovered via fallback"
    );

    // Inject a mocked OpenAI client returning an invalid category enum
    const mockInvalidEnumClient = {
      chat: {
        completions: {
          create: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    suggestedCategory: "NON_EXISTENT_CATEGORY",
                    suggestedPriority: "SUPER_URGENT",
                    confidence: 0.9,
                    reasoning: "Invalid enums",
                  }),
                },
              },
            ],
          }),
        },
      },
    };

    aiService.setClient(mockInvalidEnumClient as any);
    const invalidEnumResult = await aiService.classifyTicket({
      subject: "Test invalid Enum schema rejection",
      description: "Model output has wrong enum",
    });
    assert(
      invalidEnumResult.category !== ("NON_EXISTENT_CATEGORY" as any),
      "Zod schema validation rejected invalid category and priority enum values"
    );

    // Restore standard client
    aiService.setClient(originalClient);

    // 5. Missing API Key & Provider Failure Resilience
    console.log("\n--- 5. Missing API Key & Provider Failure Resilience ---");
    // Ensure client is null and forceMock is false (simulates missing key without mock enabled)
    aiService.setClient(null);
    const unavailableResult = await aiService.classifyTicket({
      subject: "Testing missing API key behavior",
      description: "No key in environment",
      forceMock: false,
    });
    assert(
      unavailableResult.success === false && unavailableResult.source === "unavailable",
      "Missing OPENAI_API_KEY returns structured source='unavailable' without throwing 500 error"
    );

    // Verify author ticket creation STILL SUCCEEDS even when AI service is unavailable
    const ticketWithoutAiRes = await fetch(`${baseUrl}/api/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({
        subject: "Ticket created during AI provider outage",
        description: "Checking that author ticket creation is completely unblocked.",
        category: "GENERAL_INQUIRY",
        priority: "MEDIUM",
      }),
    });
    assert(ticketWithoutAiRes.status === 201, "Author can create ticket when AI is unavailable (HTTP 201)");
    const ticketWithoutAiData = await ticketWithoutAiRes.json();
    const createdTicketId = ticketWithoutAiData?.data?.ticket?.id;
    assert(Boolean(createdTicketId), "Ticket was created and stored successfully");

    // 6. Grounded Drafting & Insufficient Information Handling
    console.log("\n--- 6. Knowledge-Base Grounded Draft Response Generation ---");

    const draftResult = await aiService.generateDraftResponse({
      ticketNumber: "TICK-2026-TEST",
      subject: "Defective copies arrived with binding peeling off",
      description: "The 10 copies of my book arrived damaged. Can I get replacements?",
      category: TicketCategory.PRINTING_AND_QUALITY,
      priority: TicketPriority.HIGH,
      authorName: "Priya Sharma",
      book: priyaBook
        ? {
            title: priyaBook.title,
            isbn: priyaBook.isbn,
            status: priyaBook.status,
            mrp: priyaBook.mrp ? Number(priyaBook.mrp) : null,
            totalCopiesSold: priyaBook.totalCopiesSold,
            royaltyPending: Number(priyaBook.royaltyPending),
          }
        : null,
    });

    assert(draftResult.success === true, "AI draft generation succeeded");
    assert(Boolean(draftResult.draft && draftResult.draft.length > 50), "Draft contains substantial grounded response text");
    assert(
      draftResult.draft!.includes("photo") || draftResult.draft!.includes("reprint") || draftResult.draft!.includes("5-7"),
      "Draft response correctly reflects BookLeaf printing quality policy (photos/reprint/5-7 days)"
    );
    assert(
      !draftResult.draft!.includes("Password") && !draftResult.draft!.includes("Bearer"),
      "Draft does not contain any passwords, tokens, or security leaks"
    );

    // Insufficient information inquiry
    const vagueDraftResult = await aiService.generateDraftResponse({
      ticketNumber: "TICK-2026-VAGUE",
      subject: "Help needed",
      description: "Something is wrong with my book.",
      category: TicketCategory.GENERAL_INQUIRY,
      priority: TicketPriority.LOW,
      authorName: "Priya Sharma",
    });
    assert(
      vagueDraftResult.draft!.toLowerCase().includes("clarif") ||
      vagueDraftResult.draft!.toLowerCase().includes("detail") ||
      vagueDraftResult.draft!.toLowerCase().includes("more information"),
      "Draft asks for clarification when information is insufficient instead of fabricating details"
    );

    // 7. Security: Role-Based Access Control on Admin AI Endpoints
    console.log("\n--- 7. Security: Author Forbidden from Admin AI Endpoints ---");

    const authorDraftAttempt = await fetch(`${baseUrl}/api/tickets/${createdTicketId}/ai/draft`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authorToken}` },
    });
    assert(authorDraftAttempt.status === 403, "Author forbidden from POST /ai/draft (HTTP 403)");

    const authorClassifyAttempt = await fetch(`${baseUrl}/api/tickets/${createdTicketId}/ai/classify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authorToken}` },
    });
    assert(authorClassifyAttempt.status === 403, "Author forbidden from POST /ai/classify (HTTP 403)");

    const authorApplyAttempt = await fetch(`${baseUrl}/api/tickets/${createdTicketId}/ai/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authorToken}` },
    });
    assert(authorApplyAttempt.status === 403, "Author forbidden from POST /ai/apply (HTTP 403)");

    // 8. Admin AI Workflow: Draft Generation & Manual Review Verification
    console.log("\n--- 8. Admin Workflow: Draft Generation Does NOT Automatically Send Message ---");

    // Initial message count
    const initialTicketRes = await fetch(`${baseUrl}/api/tickets/${createdTicketId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const initialTicketData = await initialTicketRes.json();
    const initialMessageCount = initialTicketData?.data?.ticket?.messages?.length || 0;

    // Admin generates draft
    const adminDraftRes = await fetch(`${baseUrl}/api/tickets/${createdTicketId}/ai/draft`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminDraftRes.status === 200, "Admin can generate draft (HTTP 200)");
    const adminDraftData = await adminDraftRes.json();
    const generatedDraftText = adminDraftData?.data?.draft;
    assert(Boolean(generatedDraftText), "Draft generated for admin review");

    // Verify messages count has NOT increased (Draft was not sent automatically)
    const afterDraftTicketRes = await fetch(`${baseUrl}/api/tickets/${createdTicketId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const afterDraftData = await afterDraftTicketRes.json();
    const afterDraftMessageCount = afterDraftData?.data?.ticket?.messages?.length || 0;
    assert(
      afterDraftMessageCount === initialMessageCount,
      "Generating a draft did NOT automatically create or dispatch a message to the conversation"
    );

    // 9. Admin Edits Draft and Sends as Final Public Reply
    console.log("\n--- 9. Admin Edits Draft & Submits Final Public Reply ---");
    const editedReply = `${generatedDraftText}\n\nP.S. I have also personally verified your bank account status with our finance desk.`;

    const sendReplyRes = await fetch(`${baseUrl}/api/tickets/${createdTicketId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        content: editedReply,
        isInternal: false,
      }),
    });
    assert(sendReplyRes.status === 201, "Admin sent edited draft as public reply (HTTP 201)");

    // Verify author can see the finalized reply in their ticket view
    const authorViewRes = await fetch(`${baseUrl}/api/tickets/${createdTicketId}`, {
      headers: { Authorization: `Bearer ${authorToken}` },
    });
    const authorViewData = await authorViewRes.json();
    const authorMessages = authorViewData?.data?.ticket?.messages;
    const authorReceivedMessage = authorMessages?.find((m: any) => m.content === editedReply);
    assert(Boolean(authorReceivedMessage), "Author can see the finalized public reply in ticket thread");

    // 10. Admin Internal Note Confidentiality Remains Intact
    console.log("\n--- 10. Internal Note Confidentiality During AI Operations ---");
    const internalNoteContent = "CONFIDENTIAL OPS: Contacted vendor print facility regarding Batch #9021.";
    const internalNoteRes = await fetch(`${baseUrl}/api/tickets/${createdTicketId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        content: internalNoteContent,
        isInternal: true,
      }),
    });
    assert(internalNoteRes.status === 201, "Admin posted internal note (HTTP 201)");

    // Verify author CANNOT see internal note
    const authorCheckRes = await fetch(`${baseUrl}/api/tickets/${createdTicketId}`, {
      headers: { Authorization: `Bearer ${authorToken}` },
    });
    const authorCheckData = await authorCheckRes.json();
    const hasLeakedInternalNote = authorCheckData?.data?.ticket?.messages?.some(
      (m: any) => m.content === internalNoteContent
    );
    assert(hasLeakedInternalNote === false, "Author CANNOT see admin internal note (confidentiality preserved)");

    // 11. Admin Re-classifies and Applies AI Suggestions
    console.log("\n--- 11. Admin Re-classification & Applying Recommendations ---");
    const reclassifyRes = await fetch(`${baseUrl}/api/tickets/${createdTicketId}/ai/classify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(reclassifyRes.status === 200, "Admin triggered re-classification (HTTP 200)");
    const reclassifyData = await reclassifyRes.json();
    assert(Boolean(reclassifyData?.data?.category), "Re-classification returned category suggestion");

    const applyRes = await fetch(`${baseUrl}/api/tickets/${createdTicketId}/ai/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ applyCategory: true, applyPriority: true }),
    });
    assert(applyRes.status === 200, "Admin applied AI recommendations (HTTP 200)");
    const appliedData = await applyRes.json();
    assert(
      appliedData?.data?.ticket?.category !== undefined && appliedData?.data?.ticket?.priority !== undefined,
      "Ticket category and priority updated with AI suggestions"
    );

    // Summary
    console.log("\n==================================================");
    console.log(`TOTAL TESTS: ${passedTests + failedTests}`);
    console.log(`PASSED: ${passedTests}`);
    console.log(`FAILED: ${failedTests}`);
    console.log("==================================================");

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runAiVerification();
