# BookLeaf Author Support Portal — Technical Submission Write-Up

## 1. Architecture & Technology Stack

The BookLeaf Support & Communication Portal is built as a modular, decoupled full-stack application designed to scale across thousands of authors and 22,000+ titles:

- **Frontend**: React 19, TypeScript, and Vite styled with Ant Design 5. The interface provides two distinct experiences: an **Author Portal** (bookshelf, royalty transparency, and conversational query tracker with 5-second live polling) and an **Admin Operations Desk** (multi-criteria queue filtering, ticket assignment, and AI intelligence assistant).
- **Backend**: Node.js and Express 5 written in TypeScript. Routing is organized into clear domain controllers (`auth`, `author`, `ticket`), backed by isolated service layers (`authorService`, `ticketService`, `aiService`).
- **Database & Persistence**: MariaDB accessed through Prisma ORM 7 with schema migrations. All monetary figures are stored using high-precision `Decimal(10, 2)` to avoid floating-point rounding errors in royalty distributions.
- **AI Integration**: OpenAI `gpt-4o-mini` with structured JSON output, guarded at runtime by Zod schemas, with an offline deterministic rule-based mock mode for local development.

---

## 2. Key Design Decisions & Security Controls

1. **Non-Blocking AI Pipeline**:
   - Ticket creation is never coupled synchronously to third-party AI availability. When an author submits a query, the ticket is immediately recorded in the database and the AI classification triggers asynchronously in a non-blocking try/catch block. If OpenAI is unreachable, rate-limited, or unconfigured, the author's submission succeeds with 100% reliability.

2. **Strict Multi-Tenant Isolation & Ownership Controls**:
   - Authors can only access their own books, royalty figures, and tickets. Every author query is scoped at the database query level (`where: { authorId: user.authorProfile.id }`), preventing IDOR (Insecure Direct Object Reference) vulnerabilities even if an attacker alters URL identifiers.

3. **Confidential Internal Notes**:
   - Internal notes created by operations admins are tagged with `isInternal: true`. The backend serializer strips these messages before returning ticket threads to authors (`ticket.messages.filter(m => !m.isInternal)`), ensuring internal discussions and partner escalations remain strictly confidential.

4. **Human-in-the-Loop Review**:
   - Generating an AI draft does *not* send it to the author. The draft is staged in an editable textarea for admin inspection and refinement. The response is only dispatched when an admin reviews the draft and clicks "Send Reply".

---

## 3. AI Classification & Knowledge-Base Grounding

1. **Category & Priority Classification**:
   - Queries are mapped into the exact 6 BRD categories: `ROYALTY_AND_PAYMENTS`, `ISBN_AND_METADATA`, `PRINTING_AND_QUALITY`, `DISTRIBUTION_AND_AVAILABILITY`, `BOOK_STATUS_AND_PRODUCTION`, and `GENERAL_INQUIRY`.
   - Priorities are assigned across `CRITICAL`, `HIGH`, `MEDIUM`, and `LOW`. ISBN errors and barcode mismatches are elevated to Critical/High priority with a 48-hour escalation timeline, while printing defect claims are flagged for reprint investigation. Inquiries with routine status requests receive Low/Medium priority, ensuring the queue remains balanced.

2. **Knowledge Base Policy Grounding**:
   - A centralized Knowledge Base (`backend/src/services/ai/knowledgeBase.ts`) codifies BookLeaf's operational policies: the 80/20 net profit split, quarterly payout cycle (within 45 days of quarter-end), ₹1,000 threshold with rollover, 100% free reprint guarantee (with photos; 5–7 days dispatch), and marketplace sync resolution (24–48 hours).
   - Prompts strictly forbid fabricating fake bank transaction numbers, unverified payout dates, or synthetic outcomes. If information is incomplete (e.g. author mentions damage without details), the model is instructed to ask for clarification.

3. **Token & Cost Efficiency**:
   - Rather than dumping the entire Knowledge Base on every call, the `getRelevantKnowledge` selector performs focused retrieval based on the detected ticket category and query keywords, minimizing prompt token consumption.

---

## 4. Testing Performed & Known Limitations

### Testing Performed:
- **176 automated integration tests** executed across 4 dedicated suites:
  - `npm run test:auth` (33 tests): JWT signing, password hashing, role-based route guards, and author resource ownership.
  - `npm run test:tickets` (48 tests): Ticket validation, book association, live conversation updates, internal note masking, and status lifecycles.
  - `npm run test:ai` (63 tests): All 6 categories and 4 priorities, ISBN/quality defect escalation, Zod malformed JSON rejection, missing API key resilience, KB grounding, and admin review workflows.
  - `npm run test:e2e` (32 tests): Real author and admin end-to-end user journeys from login to final resolution.
- Both TypeScript build (`tsc`) and Vite frontend bundling (`vite build`) pass with 0 errors.

### Known Limitations & Future Enhancements:
- **File Uploads**: The ticket submission UI includes an optional file attachment input for photo defect submissions; the backend currently processes file metadata, but full cloud storage integration (e.g., S3/GCS bucket) can be plugged in for permanent binary storage.
- **WebSockets vs Polling**: Live conversation updates currently utilize a lightweight 5-second polling interval with change detection. In an enterprise deployment with tens of thousands of concurrent connections, upgrading to WebSocket or Server-Sent Events (SSE) connections would reduce HTTP overhead.
- **Live AI Testing**: Automated test suites use mocked completions to guarantee repeatable, cost-free CI/CD execution; live OpenAI verification requires setting `OPENAI_API_KEY` in `backend/.env`.
