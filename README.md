# BookLeaf Author Support & Communication Portal

An enterprise-grade, full-stack Author Support & Communication Portal for **BookLeaf Publishing**, processing author inquiries across royalties, ISBN registration, print quality, and retail distribution with AI-powered ticket classification, priority scoring, and Knowledge-Base-grounded reply drafts.

---

## 1. System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│               Frontend: React 19 + TypeScript          │
│            Vite • Ant Design 5 • Responsive UI         │
│  Author Dashboard • Support Ticket Studio • Admin Desk │
└───────────────────────────┬────────────────────────────┘
                            │ REST API (JSON / Bearer JWT)
                            ▼
┌────────────────────────────────────────────────────────┐
│            Backend: Node.js 24 + Express 5             │
│        TypeScript • Prisma ORM 7 • Zod Guards          │
│   Auth / RBAC • Ticket Lifecycle • Knowledge Base      │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
                ▼                        ▼
┌───────────────────────────┐  ┌─────────────────────────┐
│ MariaDB Relational Store  │  │   OpenAI GPT-4o-mini    │
│  Authors • Books • Tickets│  │  (or Rule-Based Mock)   │
│  Messages • Auditing      │  │  KB Policy Grounding    │
└───────────────────────────┘  └─────────────────────────┘
```

- **Frontend**: React 19, TypeScript, Vite, Ant Design 5 (`@ant-design/icons`).
- **Backend**: Node.js, Express 5, TypeScript (`tsx`), Prisma ORM 7, MariaDB client adapter.
- **Database**: MariaDB / MySQL.
- **AI / LLM Integration**: OpenAI `gpt-4o-mini` with structured JSON output, validated via Zod schemas, with an offline deterministic rule-based mock mode.
- **Security**: JWT authentication, Argon2/Bcrypt password hashing, Role-Based Access Control (RBAC), multi-tenant data isolation, and internal-note confidentiality.

---

## 2. Prerequisites

- **Node.js**: `v20.x` or later (tested on Node v24).
- **npm**: `v10.x` or later.
- **MariaDB** or **MySQL**: Running instance with a database created (`bookleaf_support_portal`).

---

## 3. Quickstart & Local Setup

### Step 1: Clone Repository & Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Configure Environment Variables

#### Backend Configuration (`backend/.env`):
Create `backend/.env` based on `backend/.env.example`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="mysql://localuser:localpassword@localhost:3306/bookleaf_support_portal"
JWT_SECRET="bookleaf_portal_secure_jwt_secret_change_in_production"
JWT_EXPIRES_IN="7d"

# OpenAI Configuration
# For local deterministic testing without API credits, leave OPENAI_API_KEY empty and set AI_MOCK_MODE="true"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
AI_MOCK_MODE="true"
AI_TIMEOUT_MS=10000

FRONTEND_URL="http://localhost:5173"
```

#### Frontend Configuration (`frontend/.env`):
Create `frontend/.env` based on `frontend/.env.example`:

```env
# Leave empty or set to /api in local development to use Vite's proxy
VITE_API_URL="/api"
```

### Step 3: Run Database Migrations & Seed Data

```bash
cd backend

# Run Prisma migrations
npx prisma migrate deploy

# Seed database with the 10 authors and 18 books from the BookLeaf dataset
npm run seed
```

### Step 4: Run the Development Servers

In terminal 1 (Backend API):
```bash
cd backend
npm run dev
# Server starts at http://localhost:5000
```

In terminal 2 (Frontend Client):
```bash
cd frontend
npm run dev
# Client starts at http://localhost:5173
```

Visit **`http://localhost:5173`** in your browser.

---

## 4. Demo & Test Credentials

> **Notice:** The following credentials are exclusively intended for local development, reviewer testing, and evaluation. They must never be used in a production deployment.

### Admin Operations Desk
- **Email:** `admin@bookleaf.com`
- **Password:** `Admin@BookLeaf2026!`
- **Role:** `ADMIN` (Access to ticket queue, AI suggestions, draft generation, ticket assignment, and internal notes).

### Sample Authors (Pre-seeded from `bookleaf_sample_data.json`)
All authors share the standard demo password: **`Author@BookLeaf2026!`**

| Author Code | Name | Email | Books & Context |
| :--- | :--- | :--- | :--- |
| **AUTH001** | Priya Sharma | `priya.sharma@email.com` | 2 published books (`BK001`, `BK002`), ₹3,570 pending royalty (Payout eligible). |
| **AUTH002** | Rajesh Verma | `rajesh.verma@email.com` | 2 published books (`BK003`, `BK004`), ₹0 pending royalty. |
| **AUTH003** | Ananya Sen | `ananya.sen@email.com` | 1 published book (`BK005`), ₹4,410 pending royalty. |
| **AUTH007** | Sneha Kulkarni | `sneha.kulkarni@email.com` | 3 books, including `BK013` currently in production (*In Production - Cover Design*). |
| **AUTH010** | Vikram Malhotra| `vikram.malhotra@email.com`| 2 books, including `BK018` (*In Production - Typesetting*). |

---

## 5. Automated Test Suites

The project features **176 automated integration tests** running against an ephemeral HTTP server and test database without external API dependencies:

```bash
cd backend

# Run Phase 2 Authentication & Data Isolation Tests (33 tests)
npm run test:auth

# Run Phase 3 Ticket Lifecycle & Real-time Update Tests (48 tests)
npm run test:tickets

# Run Phase 4 AI Ticket Intelligence & Grounded Drafting Tests (63 tests)
npm run test:ai

# Run Phase 5 End-to-End User Journey Tests (32 tests)
npm run test:e2e

# Run full test suite in sequence
npm run test:auth && npm run test:tickets && npm run test:ai && npm run test:e2e
```

### Build & Type Verification:
```bash
# Backend typecheck & production build
cd backend && npm run typecheck && npm run build

# Frontend lint & production build
cd frontend && npm run lint && npm run build
```

---

## 6. AI Intelligence & Knowledge Base Architecture

### Supported Categories (Exact 6 BRD Categories):
1. `ROYALTY_AND_PAYMENTS`
2. `ISBN_AND_METADATA`
3. `PRINTING_AND_QUALITY`
4. `DISTRIBUTION_AND_AVAILABILITY`
5. `BOOK_STATUS_AND_PRODUCTION`
6. `GENERAL_INQUIRY`

### Priorities:
- `CRITICAL` (ISBN errors, barcode mismatches, duplicate catalog entries)
- `HIGH` (Physical print defects requiring reprint investigation, overdue payments)
- `MEDIUM` (Distribution sync lag, royalty threshold questions)
- `LOW` (General inquiries, routine progress updates)

### Knowledge Base Policy Grounding:
The centralized Knowledge Base (`backend/src/services/ai/knowledgeBase.ts`) codifies:
- **80/20 Net Profit Split**: Author receives 80% of net profit (MRP minus printing cost, retail commission, shipping).
- **Quarterly Payouts**: Calculated quarterly and disbursed within 45 days after quarter-end via bank transfer.
- **₹1,000 Threshold**: Minimum payout threshold is ₹1,000; smaller balances roll forward.
- **ISBN High-Priority Escalation**: 48-hour investigation timeline for data discrepancies.
- **Print Quality Guarantee**: 100% free reprint on verified printing defects; requires clear author photos; 5–7 business-day dispatch.
- **Distribution Availability**: New listings take 7–10 business days; unavailable listings resolve within 24–48 hours via catalog resync.
- **Anti-Hallucination Guardrails**: Prompts explicitly forbid fabricating unverified bank reference numbers, payout dates, or completed actions.

### AI Failure Resilience & Graceful Degradation:
- **Missing API Key**: Returns `{ success: false, source: "unavailable" }` without crashing; author ticket creation is never blocked.
- **Malformed Provider Output**: Model output is treated as untrusted and validated against strict Zod schemas (`classificationOutputSchema`, `draftOutputSchema`).
- **Human-in-the-Loop Review**: Generating a draft *never* automatically sends it. Admins inspect the draft, review policy citations, edit the text, and confirm delivery.

---

## 7. REST API Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Email/password login; returns JWT & user profile | Public |
| `GET` | `/api/auth/me` | Validates session token; returns current user context | Authenticated |

### Author Portal (`/api/author`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/author/books` | Returns author's published books and royalty calculation summary | Author Only |

### Ticket Management (`/api/tickets`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/tickets` | Raises a support ticket with non-blocking AI auto-classification | Author Only |
| `GET` | `/api/tickets` | Lists tickets with filtering (`status`, `category`, `priority`, `search`, `sortBy`) | Authenticated |
| `GET` | `/api/tickets/:id` | Returns ticket details and thread (filters internal notes for authors) | Authenticated (Owner or Admin) |
| `PATCH`| `/api/tickets/:id` | Updates ticket status, category, priority, or assigned admin | Admin Only |
| `POST` | `/api/tickets/:id/messages` | Adds a message (supports `isInternal: true` for admin notes) | Authenticated |

### AI Operations (`/api/tickets/:id/ai`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/tickets/:id/ai/draft` | Generates a policy-grounded draft reply | Admin Only |
| `POST` | `/api/tickets/:id/ai/classify`| Re-classifies category, priority, and explanation | Admin Only |
| `POST` | `/api/tickets/:id/ai/apply` | Applies AI recommendations to live ticket | Admin Only |

---

## 8. Production Deployment Checklist

1. **Database Provisioning**: Deploy MariaDB/MySQL (e.g. AWS RDS, DigitalOcean, PlanetScale) with SSL enabled.
2. **Migrations**: Run `npx prisma migrate deploy` in the production CI/CD pipeline.
3. **Environment Secrets**:
   - Set a strong, randomly generated `JWT_SECRET` (e.g. `openssl rand -hex 64`).
   - Set `NODE_ENV="production"`.
   - Provide a live `OPENAI_API_KEY` with credit limits configured and set `AI_MOCK_MODE="false"`.
4. **CORS & Networking**:
   - Set `FRONTEND_URL` in backend `.env` to the production domain.
   - Set `VITE_API_URL` in frontend `.env` to the production API origin.
5. **Seed Safety**: `npm run seed` should be executed only once during initial database provisioning.
6. **Rate Limiting & Security Headers**: Helmet and rate limiting (`express-rate-limit`) are enabled by default in `src/server.ts`.

---

## 9. Troubleshooting

- **Database Connection Error (`ECONNREFUSED 3306`)**: Ensure MariaDB/MySQL service is running locally (`sudo systemctl status mariadb`). Check credentials in `backend/.env`.
- **Port In Use (`EADDRINUSE: 5000`)**: Another process is using port 5000. Specify an alternative port using `PORT=5001` in `backend/.env`.
- **Prisma Client Desynchronized**: Run `npx prisma generate` in `backend/` to regenerate the client after schema updates.
- **AI Mode**: To test without an OpenAI API key, ensure `AI_MOCK_MODE="true"` is set in `backend/.env`. The application will provide realistic, policy-grounded responses locally.
