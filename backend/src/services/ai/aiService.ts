import OpenAI from "openai";
import { z } from "zod";
import { TicketCategory, TicketPriority } from "@prisma/client";
import { config } from "../../config/env.js";
import { getRelevantKnowledge } from "./knowledgeBase.js";
import { buildClassificationPrompt, buildDraftResponsePrompt } from "./prompts.js";

// Zod schemas for untrusted AI output validation
export const classificationOutputSchema = z.object({
  category: z.nativeEnum(TicketCategory),
  priority: z.nativeEnum(TicketPriority),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(5),
});

export const draftOutputSchema = z.object({
  draft: z.string().min(10),
  relevantPolicies: z.array(z.string()).optional(),
});

export interface ClassificationResult {
  success: boolean;
  category?: TicketCategory;
  priority?: TicketPriority;
  confidence?: number;
  reasoning?: string;
  source: "live" | "mock" | "unavailable";
  error?: string;
}

export interface DraftResponseResult {
  success: boolean;
  draft?: string;
  relevantPolicies?: string[];
  source: "live" | "mock" | "unavailable";
  error?: string;
}

export class AiService {
  private openaiClient: OpenAI | null = null;

  constructor() {
    if (config.openaiApiKey && config.openaiApiKey.trim() !== "") {
      this.openaiClient = new OpenAI({
        apiKey: config.openaiApiKey,
      });
    }
  }

  private clientExplicitlySet: boolean = false;

  /**
   * Allows tests or dependency injection to provide a custom or mocked OpenAI instance.
   */
  public setClient(client: OpenAI | null) {
    this.openaiClient = client;
    this.clientExplicitlySet = true;
  }

  public isLiveAvailable(): boolean {
    if (this.clientExplicitlySet) {
      return Boolean(this.openaiClient);
    }
    return Boolean(this.openaiClient || (config.openaiApiKey && config.openaiApiKey.trim() !== ""));
  }

  private getClient(): OpenAI {
    if (this.openaiClient) {
      return this.openaiClient;
    }
    if (!this.clientExplicitlySet && config.openaiApiKey && config.openaiApiKey.trim() !== "") {
      this.openaiClient = new OpenAI({ apiKey: config.openaiApiKey });
      return this.openaiClient;
    }
    throw new Error("OpenAI API key is missing. Set OPENAI_API_KEY environment variable.");
  }

  /**
   * Classifies a ticket into one of the 6 BRD categories and assigns an urgency priority.
   */
  public async classifyTicket(params: {
    subject: string;
    description: string;
    bookTitle?: string | null | undefined;
    bookStatus?: string | null | undefined;
    forceMock?: boolean | undefined;
  }): Promise<ClassificationResult> {
    const isMock = params.forceMock !== undefined ? params.forceMock : (config.aiMockMode || !this.isLiveAvailable());

    if (!this.isLiveAvailable() && !isMock) {
      return {
        success: false,
        source: "unavailable",
        error: "AI service unavailable: OPENAI_API_KEY is not configured.",
      };
    }

    if (isMock) {
      return this.mockClassify(params);
    }

    try {
      const client = this.getClient();
      const prompt = buildClassificationPrompt(params);

      const completion = await client.chat.completions.create(
        {
          model: config.openaiModel,
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        },
        {
          signal: AbortSignal.timeout(config.aiTimeoutMs),
        }
      );

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error("Empty response received from AI model");
      }

      const parsedJson = JSON.parse(rawContent);
      const validated = classificationOutputSchema.parse(parsedJson);

      return {
        success: true,
        source: "live",
        category: validated.category,
        priority: validated.priority,
        confidence: validated.confidence,
        reasoning: validated.reasoning,
      };
    } catch (err: any) {
      if (config.aiMockMode) {
        return this.mockClassify(params);
      }
      return {
        success: false,
        source: "live",
        error: `AI classification failed: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Generates a policy-grounded draft response for an author ticket.
   */
  public async generateDraftResponse(params: {
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
    conversationHistory?: Array<{ senderRole: string; content: string }> | undefined;
    forceMock?: boolean | undefined;
  }): Promise<DraftResponseResult> {
    const isMock = params.forceMock !== undefined ? params.forceMock : (config.aiMockMode || !this.isLiveAvailable());

    if (!this.isLiveAvailable() && !isMock) {
      return {
        success: false,
        source: "unavailable",
        error: "AI service unavailable: OPENAI_API_KEY is not configured.",
      };
    }

    if (isMock) {
      return this.mockDraftResponse(params);
    }

    try {
      const client = this.getClient();
      const knowledgeContext = getRelevantKnowledge(params.category, params.description);
      const prompt = buildDraftResponsePrompt({
        ...params,
        knowledgeBaseContext: knowledgeContext,
      });

      const completion = await client.chat.completions.create(
        {
          model: config.openaiModel,
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        },
        {
          signal: AbortSignal.timeout(config.aiTimeoutMs),
        }
      );

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error("Empty response received from AI model");
      }

      const parsedJson = JSON.parse(rawContent);
      const validated = draftOutputSchema.parse(parsedJson);

      return {
        success: true,
        source: "live",
        draft: validated.draft,
        relevantPolicies: validated.relevantPolicies || [],
      };
    } catch (err: any) {
      if (config.aiMockMode) {
        return this.mockDraftResponse(params);
      }
      return {
        success: false,
        source: "live",
        error: `AI draft generation failed: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Local deterministic mock classifier strictly adhering to BRD policies.
   */
  public mockClassify(params: {
    subject: string;
    description: string;
    bookTitle?: string | null | undefined;
    bookStatus?: string | null | undefined;
  }): ClassificationResult {
    const text = `${params.subject} ${params.description}`.toLowerCase();

    // 1. ISBN & Metadata
    if (text.includes("isbn") || text.includes("metadata") || text.includes("author bio") || text.includes("book description") || text.includes("barcode")) {
      const isUrgent = text.includes("urgent") || text.includes("critical") || text.includes("cannot purchase");
      const isMismatch = isUrgent || text.includes("mismatch") || text.includes("different") || text.includes("wrong") || text.includes("error") || text.includes("duplicate");
      const priority = isUrgent ? TicketPriority.CRITICAL : isMismatch ? TicketPriority.HIGH : TicketPriority.LOW;
      return {
        success: true,
        source: "mock",
        category: TicketCategory.ISBN_AND_METADATA,
        priority,
        confidence: 0.94,
        reasoning: isMismatch
          ? "Author reported an ISBN discrepancy or catalog error requiring immediate production team escalation."
          : "Author requested standard metadata or description update on retail platforms.",
      };
    }

    // 2. Printing & Quality
    if (text.includes("print") || text.includes("blurry") || text.includes("defect") || text.includes("binding") || text.includes("pages")) {
      return {
        success: true,
        source: "mock",
        category: TicketCategory.PRINTING_AND_QUALITY,
        priority: TicketPriority.HIGH,
        confidence: 0.92,
        reasoning: "Defective author copies or printing quality complaints qualify for BookLeaf free reprint verification.",
      };
    }

    // 3. Royalty & Payments
    if (text.includes("royalty") || text.includes("payment") || text.includes("payout") || text.includes("money") || text.includes("bank") || text.includes("threshold")) {
      const isUrgent = text.includes("months") || text.includes("haven't received") || text.includes("missing") || text.includes("overdue");
      return {
        success: true,
        source: "mock",
        category: TicketCategory.ROYALTY_AND_PAYMENTS,
        priority: isUrgent ? TicketPriority.HIGH : TicketPriority.MEDIUM,
        confidence: 0.96,
        reasoning: isUrgent
          ? "Query involves overdue or missing royalty payments beyond the quarterly 45-day window."
          : "General inquiry regarding royalty calculations, profit split, or threshold status.",
      };
    }

    // 4. Distribution & Availability
    if (text.includes("unavailable") || text.includes("amazon") || text.includes("flipkart") || text.includes("stock") || text.includes("store")) {
      return {
        success: true,
        source: "mock",
        category: TicketCategory.DISTRIBUTION_AND_AVAILABILITY,
        priority: TicketPriority.MEDIUM,
        confidence: 0.89,
        reasoning: "Marketplace listing availability or inventory stock sync delay identified on external platforms.",
      };
    }

    // 5. Book Status & Production
    if (text.includes("production") || text.includes("typesetting") || text.includes("cover design") || text.includes("proof") || text.includes("manuscript")) {
      const isDelayed = text.includes("delayed") || text.includes("weeks") || text.includes("overdue") || text.includes("stuck");
      return {
        success: true,
        source: "mock",
        category: TicketCategory.BOOK_STATUS_AND_PRODUCTION,
        priority: isDelayed ? TicketPriority.MEDIUM : TicketPriority.LOW,
        confidence: 0.91,
        reasoning: "Inquiry regarding ongoing publishing milestone progress and production turnaround timelines.",
      };
    }

    // 6. General Inquiry
    return {
      success: true,
      source: "mock",
      category: TicketCategory.GENERAL_INQUIRY,
      priority: TicketPriority.LOW,
      confidence: 0.82,
      reasoning: "General account inquiry not directly matching specific operational category.",
    };
  }

  /**
   * Local deterministic mock draft generator grounded in BookLeaf BRD knowledge.
   */
  public mockDraftResponse(params: {
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
  }): DraftResponseResult {
    const category = params.category || TicketCategory.GENERAL_INQUIRY;
    let draft = "";
    let policyName = "";

    switch (category) {
      case TicketCategory.ROYALTY_AND_PAYMENTS:
        policyName = "Author Royalty Split & Payment Cycle";
        draft = `Dear ${params.authorName},

Thank you for reaching out to BookLeaf Publishing. I completely understand your concern regarding your royalty disbursements.

As per BookLeaf's Royalty Policy, royalties are calculated on an 80/20 net profit split (80% of net profit after printing, marketplace commission, and shipping goes directly to you). Payouts are processed on a quarterly cycle within 45 days after the quarter closes, with a minimum payout threshold of ₹1,000 (accumulated balances below this roll forward).

${params.book ? `For your title "${params.book.title}", our records indicate current pending royalties of ₹${params.book.royaltyPending || 0}.` : "I am checking our accounts ledger for your linked author account."}

Next Step:
Our finance team is currently auditing the payout batch. We will confirm the status of your bank transfer reference within 48 hours. Please ensure your current IFSC and account number are updated in your dashboard.

Warm regards,
BookLeaf Author Relations Team`;
        break;

      case TicketCategory.ISBN_AND_METADATA:
        policyName = "ISBN Registration, Assignment & Metadata Accuracy";
        draft = `Dear ${params.authorName},

Thank you for bringing this to our attention. We treat any potential ISBN or catalog metadata discrepancy with the highest priority.

Every book published with BookLeaf receives a unique ISBN assigned under our publisher imprint. Because accurate retail listing metadata on platforms like Amazon and Flipkart is critical, our production team has opened an escalated investigation.

Next Step:
Our senior metadata specialist will audit the digital feeds and resolve any catalog linking discrepancy within 48 hours. We will notify you the moment the corrected listing is validated.

Warm regards,
BookLeaf Production & Operations Team`;
        break;

      case TicketCategory.PRINTING_AND_QUALITY:
        policyName = "Printing Standards, Defect Claims & Reprint Guarantee";
        draft = `Dear ${params.authorName},

I am genuinely sorry to hear that your author copies did not meet our standard printing quality. We take immense pride in our craftsmanship and sincerely apologize for this frustration.

Under the BookLeaf Quality Guarantee, any verified printing or binding defect qualifies for a 100% free reprint. 

Next Step:
To initiate your complimentary reprint, please reply directly to this ticket with 2–3 clear photographs showing the specific defects (such as binding, misprints, or cover colors). Once our quality assurance team verifies the photos, your replacement copies will be expedited for printing and dispatched within 5–7 business days.

Warm regards,
BookLeaf Quality Assurance Team`;
        break;

      case TicketCategory.DISTRIBUTION_AND_AVAILABILITY:
        policyName = "Retail Distribution & Marketplace Stock Sync";
        draft = `Dear ${params.authorName},

Thank you for contacting BookLeaf support regarding marketplace availability.

When a published book temporarily shows as 'Currently Unavailable' on retail channels like Amazon or Flipkart, it is typically due to a marketplace inventory catalog synchronization lag rather than a physical stock outage.

Next Step:
Our distribution team has initiated an automated inventory feed re-sync with our retail partners. Catalog updates generally reflect on live marketplace listings within 24 to 48 hours.

Warm regards,
BookLeaf Distribution Team`;
        break;

      case TicketCategory.BOOK_STATUS_AND_PRODUCTION:
        policyName = "Production Lifecycle & Publishing Milestones";
        draft = `Dear ${params.authorName},

Thank you for checking in on the progress of your book${params.book ? ` "${params.book.title}"` : ""}.

${params.book ? `Your book is currently in the following stage: ${params.book.status}.` : "Your title is progressing through our publishing workflow."} 

Our typical production lifecycle moves from Manuscript Review → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing Setup. Delays commonly occur when fine-tuning creative elements to ensure your book meets commercial standards.

Next Step:
Our production coordinator is reviewing your milestone schedule today and will provide an updated completion timeline within 24 hours.

Warm regards,
BookLeaf Publishing Team`;
        break;

      default:
        policyName = "General Author Inquiries & Account Services";
        draft = `Dear ${params.authorName},

Thank you for reaching out to BookLeaf Author Support.

We have received your query regarding "${params.subject}" and our operations team is currently reviewing your account details.

Next Step:
A team member will follow up with complete details within 24–48 hours. If you have any further documents or reference numbers to add, please feel free to reply directly to this thread.

Warm regards,
BookLeaf Author Support Team`;
        break;
    }

    return {
      success: true,
      source: "mock",
      draft,
      relevantPolicies: [policyName],
    };
  }
}

export const aiService = new AiService();
export default aiService;
