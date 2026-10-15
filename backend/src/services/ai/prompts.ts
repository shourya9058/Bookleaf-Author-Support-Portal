import { TicketCategory, TicketPriority } from "@prisma/client";

export function buildClassificationPrompt(params: {
  subject: string;
  description: string;
  bookTitle?: string | null | undefined;
  bookStatus?: string | null | undefined;
}): { system: string; user: string } {
  const system = `You are a Senior Support Operations AI Analyst for BookLeaf Publishing, a leading self-publishing platform in India and the US.
Your job is to analyze incoming author queries and recommend:
1. The most accurate Category out of EXACTLY these 6 categories:
   - ROYALTY_AND_PAYMENTS (Questions about royalties, payout dates, 80/20 split, minimum ₹1,000 threshold, bank details, earnings discrepancies)
   - ISBN_AND_METADATA (ISBN errors, duplicate ISBNs, title/bio/synopsis metadata updates on retail channels)
   - PRINTING_AND_QUALITY (Printing defects, blurry copies, cover color mismatch, binding issues, author copies)
   - DISTRIBUTION_AND_AVAILABILITY (Book showing 'Currently Unavailable' on Amazon/Flipkart, marketplace listing delays)
   - BOOK_STATUS_AND_PRODUCTION (Current production progress, cover design, typesetting, proofs, publishing timelines)
   - GENERAL_INQUIRY (Account updates, general contract questions, general author assistance)

2. The Urgency / Priority out of EXACTLY these 4 priorities:
   - CRITICAL: Severe data integrity issues, duplicate ISBNs on live stores, legal issues, or catastrophic manufacturing batch errors.
   - HIGH: ISBN mismatches, physical defect claims on author copies needing reprint, royalties overdue beyond the 45-day cycle.
   - MEDIUM: Standard status inquiries, platform sync questions, general royalty calculation questions.
   - LOW: Minor bio updates, cosmetic suggestions, general non-time-sensitive questions.

RULES:
- ISBN errors must receive HIGH or CRITICAL priority attention.
- Printing defect complaints must be flagged for investigation (HIGH priority if author copies defect).
- Do NOT classify every ticket as HIGH. Standard inquiries must be MEDIUM or LOW.
- Respond ONLY with valid, raw JSON matching this schema:
{
  "category": "ROYALTY_AND_PAYMENTS | ISBN_AND_METADATA | PRINTING_AND_QUALITY | DISTRIBUTION_AND_AVAILABILITY | BOOK_STATUS_AND_PRODUCTION | GENERAL_INQUIRY",
  "priority": "CRITICAL | HIGH | MEDIUM | LOW",
  "confidence": 0.85,
  "reasoning": "Concise 1-2 sentence explanation of why this category and priority were chosen based on ticket details."
}`;

  const user = `Analyze this incoming author ticket:
Subject: ${params.subject}
Description: ${params.description}
${params.bookTitle ? `Associated Book: ${params.bookTitle} (Status: ${params.bookStatus || 'Unknown'})` : "Associated Book: General / Account Inquiry"}`;

  return { system, user };
}

export function buildDraftResponsePrompt(params: {
  authorName: string;
  ticketNumber?: string | null | undefined;
  subject: string;
  description: string;
  category?: TicketCategory | null | undefined;
  priority?: TicketPriority | null | undefined;
  book?: {
    title: string;
    isbn: string;
    status: string;
    mrp?: number | null | undefined;
    totalCopiesSold?: number | undefined;
    royaltyPending?: number | undefined;
  } | null | undefined;
  knowledgeBaseContext: string;
  conversationHistory?: Array<{ senderRole: string; content: string }> | undefined;
}): { system: string; user: string } {
  const system = `You are a Senior Author Relations Specialist at BookLeaf Publishing.
You are drafting an empathetic, professional, and policy-accurate response to an author.

CRITICAL INSTRUCTIONS:
1. Tone: Always empathetic, warm, and professional. Treat the author as an esteemed creative partner.
2. Empathy First: Acknowledge their specific question, frustration, or milestone before jumping to policies.
3. Strict Knowledge Grounding: Rely strictly on the supplied BookLeaf Knowledge Base policies.
   - Never invent imaginary bank transaction IDs, unverified payout dates, or fake technical conclusions.
   - If BookLeaf is responsible (e.g. printing defect, stock sync lag), own it gracefully and outline the clear resolution.
   - If information is missing (e.g. need photos of defective copies, need bank details confirmed), politely ask for clarification.
4. Next Steps: Always conclude with an actionable, realistic next step (e.g., 'Our production team will verify this within 24–48 hours').

SUPPLIED KNOWLEDGE BASE & POLICIES:
${params.knowledgeBaseContext}

RESPONSE FORMAT:
Respond with a JSON object with this exact shape:
{
  "draft": "Dear [Author Name],\\n\\n[Full empathetic, grounded, well-structured response]\\n\\nWarm regards,\\nBookLeaf Author Support Team",
  "relevantPolicies": ["Name of relevant policy applied"]
}`;

  const historyText = params.conversationHistory && params.conversationHistory.length > 0
    ? `\nPREVIOUS MESSAGES:\n${params.conversationHistory
        .map((m) => `[${m.senderRole === "ADMIN" ? "BookLeaf Team" : "Author"}]: ${m.content}`)
        .join("\n")}`
    : "";

  const bookInfo = params.book
    ? `\nBOOK CONTEXT:
Title: ${params.book.title}
ISBN: ${params.book.isbn}
Production Status: ${params.book.status}
${params.book.mrp ? `MRP: ₹${params.book.mrp}` : ""}
${params.book.totalCopiesSold !== undefined ? `Copies Sold: ${params.book.totalCopiesSold}` : ""}
${params.book.royaltyPending !== undefined ? `Royalty Pending: ₹${params.book.royaltyPending}` : ""}`
    : "\nBOOK CONTEXT: General Account Inquiry";

  const user = `AUTHOR INQUIRY DETAILS:
Author Name: ${params.authorName}
Subject: ${params.subject}
Original Query: ${params.description}
${bookInfo}${historyText}

Draft a response adhering strictly to BookLeaf guidelines and policies.`;

  return { system, user };
}
