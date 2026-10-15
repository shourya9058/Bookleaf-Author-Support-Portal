import { TicketCategory } from "@prisma/client";

export interface KnowledgePolicyItem {
  id: string;
  category: TicketCategory;
  title: string;
  rules: string[];
  sampleQueries: string[];
  expectedTone: string;
}

export const BOOKLEAF_KNOWLEDGE_BASE = {
  company: {
    name: "BookLeaf Publishing",
    description: "Self-publishing company operating in India and the US, processing 1,200+ monthly titles.",
    facilities: "In-house printing facility and warehouse located in Delhi. Primary print partners include Repro India and Epitome Books.",
    packages: "Standard Free (no upfront cost) and Bestseller Breakthrough (premium paid package with marketing & distribution).",
  },
  policies: [
    {
      id: "royalty-policy",
      category: TicketCategory.ROYALTY_AND_PAYMENTS,
      title: "Author Royalty Split & Payment Cycle",
      rules: [
        "Royalty Split: BookLeaf operates an 80/20 profit split (80% of net profit goes to author, 20% to BookLeaf).",
        "Net Profit Calculation: Net Profit = MRP minus printing cost, platform retail commission (Amazon/Flipkart), and shipping charges.",
        "Payout Schedule: Royalties are calculated quarterly and disbursed via bank transfer within 45 days after the quarter ends.",
        "Minimum Payout Threshold: ₹1,000. If accumulated royalties are below ₹1,000, they roll forward to the subsequent quarter.",
        "Bank Details: Payments are made strictly to the verified bank account linked in the author's dashboard.",
        "Transparency: Authors can request a detailed line-by-line sales and royalty breakdown per sales platform.",
      ],
      sampleQueries: [
        "I published 4 months ago and still haven't received royalties.",
        "I sold 200 copies but only received ₹3,000. Why is it so low?",
      ],
      expectedTone: "Acknowledge frustration warmly, explain the 80/20 net profit formula and quarterly 45-day window, verify if bank details are on file, and give a specific timeline.",
    },
    {
      id: "isbn-policy",
      category: TicketCategory.ISBN_AND_METADATA,
      title: "ISBN Registration, Assignment & Metadata Accuracy",
      rules: [
        "Assignment: Every book published through BookLeaf receives a unique ISBN registered under BookLeaf's publisher imprint.",
        "Custom Imprint: If an author requests an ISBN under their own imprint, they must obtain it independently.",
        "ISBN Errors & Mismatches: Any reported ISBN error (duplicate ISBN, incorrect book linked on Amazon/Flipkart) is treated as a CRITICAL/HIGH priority operational issue.",
        "Escalation: ISBN issues are escalated immediately to the production team with a strict 48-hour investigation timeline.",
        "Metadata Updates: Author bio, book synopsis, or title corrections submitted post-publishing reflect across platforms within 3–5 business days.",
      ],
      sampleQueries: [
        "My book is showing a different ISBN on Amazon than on the physical copy.",
        "Can I update the description of my book on Amazon after it is live?",
      ],
      expectedTone: "Treat with immediate urgency. Acknowledge this is a serious data discrepancy, apologize sincerely, confirm immediate escalation to production, and commit to 48-hour resolution.",
    },
    {
      id: "printing-quality-policy",
      category: TicketCategory.PRINTING_AND_QUALITY,
      title: "Printing Standards, Defect Claims & Reprint Guarantee",
      rules: [
        "Production: Orders are fulfilled by Delhi in-house facility or print partners (Repro India, Epitome Books).",
        "Turnaround: Standard printing turnaround is 5–7 business days from order confirmation.",
        "Quality Guarantee: If an author receives copies with verified defects (misprints, binding issues, cover color deviation, blurry illustrations), BookLeaf arranges a 100% free reprint.",
        "Verification: The author must share clear photographs of the defective copies to initiate reprint approval.",
        "Reprint Timeline: Verified free reprints are dispatched within 5–7 business days of photo approval.",
      ],
      sampleQueries: [
        "I received author copies and print quality is terrible. The images are blurry and binding is loose.",
        "Cover colors do not match the approved digital proof.",
      ],
      expectedTone: "Sincere apology without defensiveness. Reassure the author about BookLeaf's reprint guarantee, politely request clear photos of defects, and state the 5-7 business-day reprint turnaround.",
    },
    {
      id: "distribution-availability-policy",
      category: TicketCategory.DISTRIBUTION_AND_AVAILABILITY,
      title: "Retail Distribution & Marketplace Stock Sync",
      rules: [
        "Retail Channels: Distribution spans Amazon India, Flipkart, Amazon US, Amazon UK, and the direct BookLeaf Store.",
        "Initial Listing Timeline: Newly published books appear live on marketplaces within 7–10 business days after publication completes.",
        "Stock Availability: If a live title shows as 'Currently Unavailable' or 'Out of Stock' on Amazon/Flipkart, it is typically a marketplace catalog inventory sync issue.",
        "Resync Resolution: BookLeaf operations triggers an expedited inventory catalog re-sync with distributor feeds within 24–48 hours.",
      ],
      sampleQueries: [
        "My book is published but shows 'Currently Unavailable' on Amazon.",
        "Why is my book not showing on Flipkart yet?",
      ],
      expectedTone: "Clarify that 'Currently Unavailable' is typically a distributor sync lag rather than a stock outage. Confirm immediate trigger of platform re-sync with 24-48 hour resolution.",
    },
    {
      id: "production-status-policy",
      category: TicketCategory.BOOK_STATUS_AND_PRODUCTION,
      title: "Production Lifecycle & Publishing Milestones",
      rules: [
        "Lifecycle Stages: Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.",
        "Notification: Authors receive automated status updates upon passing each milestone.",
        "Common Delay Factors: Production bottlenecks most commonly occur at Cover Design (awaiting author approval of creative concepts) and Proofreading (author revision rounds).",
        "Collaborative Framing: Delays should be communicated transparently with current book status, without placing blame on the author.",
      ],
      sampleQueries: [
        "It has been 3 weeks and my book is still in typesetting. When will it be done?",
        "When will my cover design proof be ready?",
      ],
      expectedTone: "Check current production stage. Provide honest, specific progress updates, explain what stage is active, give an updated timeline, and frame remaining steps collaboratively.",
    },
    {
      id: "general-inquiry-policy",
      category: TicketCategory.GENERAL_INQUIRY,
      title: "General Author Inquiries & Account Services",
      rules: [
        "Author Partnership: Authors are partners, not customers to be managed.",
        "Account Updates: Authors can update bank information, mailing addresses, or contact information via support request or author dashboard.",
        "Escalations: Unresolved complex questions must receive a clear team callback or email timeline within 48 hours.",
      ],
      sampleQueries: [
        "How do I update my bank account details for royalty payout?",
        "Can I purchase additional author copies at a discounted author rate?",
      ],
      expectedTone: "Warm, professional, helpful, and concise with actionable next steps.",
    },
  ],
  communicationGuidelines: [
    "Always empathetic and professional. Authors are partners.",
    "Acknowledge the author's specific concern before jumping into policy or logistics.",
    "Be specific: Include actual book titles, ISBNs, royalty figures, and dates whenever provided in context.",
    "If something is BookLeaf's responsibility (e.g. printing defect, delayed payout, duplicate ISBN), own it directly without corporate deflection.",
    "Never invent an author's payment status, exact bank transaction ID, or fake investigation conclusion. If facts are missing, specify that the ops team is verifying and give a 24-48 hour timeline.",
    "Always conclude with a concrete, clear next step for both the author and the BookLeaf operations team.",
  ],
};

/**
 * Retrieves focused, relevant Knowledge Base sections for a given category and query.
 * Conserves tokens by sending only relevant policy sections instead of the whole documentation.
 */
export function getRelevantKnowledge(categoryOrQuery?: TicketCategory | string | null, query?: string): string {
  let category: TicketCategory | null = null;
  let queryText = "";

  if (categoryOrQuery) {
    if (Object.values(TicketCategory).includes(categoryOrQuery as TicketCategory)) {
      category = categoryOrQuery as TicketCategory;
      queryText = query || "";
    } else {
      queryText = categoryOrQuery as string;
    }
  }

  let selectedPolicies = category
    ? BOOKLEAF_KNOWLEDGE_BASE.policies.filter((p) => p.category === category)
    : [];

  if (selectedPolicies.length === 0 && queryText) {
    const lower = queryText.toLowerCase();
    selectedPolicies = BOOKLEAF_KNOWLEDGE_BASE.policies.filter((p) => {
      if (lower.includes("isbn") || lower.includes("metadata") || lower.includes("barcode")) {
        return p.category === TicketCategory.ISBN_AND_METADATA;
      }
      if (lower.includes("royalt") || lower.includes("payment") || lower.includes("payout")) {
        return p.category === TicketCategory.ROYALTY_AND_PAYMENTS;
      }
      if (lower.includes("print") || lower.includes("defect") || lower.includes("damage") || lower.includes("reprint")) {
        return p.category === TicketCategory.PRINTING_AND_QUALITY;
      }
      if (lower.includes("distribut") || lower.includes("stock") || lower.includes("amazon") || lower.includes("flipkart") || lower.includes("unavailable")) {
        return p.category === TicketCategory.DISTRIBUTION_AND_AVAILABILITY;
      }
      if (lower.includes("status") || lower.includes("typeset") || lower.includes("cover") || lower.includes("proof")) {
        return p.category === TicketCategory.BOOK_STATUS_AND_PRODUCTION;
      }
      return false;
    });
  }

  const policiesToInclude = selectedPolicies.length > 0 ? selectedPolicies : BOOKLEAF_KNOWLEDGE_BASE.policies;

  const policySections = policiesToInclude
    .map(
      (p) => `### Policy: ${p.title} (${p.category})
Rules:
${p.rules.map((r) => `- ${r}`).join("\n")}
Tone & Expectations: ${p.expectedTone}`
    )
    .join("\n\n");

  return `COMPANY CONTEXT:
${BOOKLEAF_KNOWLEDGE_BASE.company.name} - ${BOOKLEAF_KNOWLEDGE_BASE.company.description}
Facilities: ${BOOKLEAF_KNOWLEDGE_BASE.company.facilities}

APPLICABLE POLICIES:
${policySections}

COMMUNICATION GUIDELINES:
${BOOKLEAF_KNOWLEDGE_BASE.communicationGuidelines.map((g) => `- ${g}`).join("\n")}`;
}
