# 🏢 Aflix CRM — Lead Management Web App

> A fast, modern, and easy-to-use Lead Management & Sales CRM built for high-performing teams to track potential clients, organize deals across a visual pipeline, prevent duplicate entries, and never miss a scheduled follow-up.

---

## 📌 What is This Project? (In Simple Words)

When a business talks to potential clients (called **Leads**), it's easy to lose track of phone calls, proposal deadlines, client requirements, and deal values.

**Aflix CRM** solves this problem by giving your sales team one unified screen to:
1. **Save & Organize Leads**: Keep contact info, company details, required services, and project budgets (in Indian Rupees **₹ / INR**).
2. **Move Deals on a Pipeline Board**: Move leads visually from **New** ➡️ **Contacted** ➡️ **Qualified** ➡️ **Proposal** ➡️ **Won** (or **Lost**).
3. **Never Miss a Follow-up**: Get instant alerts for overdue tasks or meetings that need immediate action.
4. **Prevent Accidental Duplicates**: If someone tries to enter a lead that already exists with the same phone or email, the app warns you immediately.
5. **Import Leads from PDF**: Upload a document and let the system automatically read and create leads for you.
6. **Smooth Desktop Experience**: The sidebar stays pinned in place on your screen while the rest of the page scrolls smoothly.

---

## 🎯 Key Features

### 1. 📊 Interactive Dashboard
- **Instant KPIs**: See your total active leads, deals won, urgent high-priority items, and overdue follow-ups at a glance.
- **Visual Distribution Bar**: See what percentage of your deals are in each stage of your sales funnel.
- **Urgent Action Agenda**: Directly lists what calls or meetings you need to do today.

### 2. 👥 Comprehensive Lead Management
- **Search & Filter**: Search instantly by person name, company, email, or phone number. Filter by sales stage or priority.
- **Currency in INR (₹)**: All budgets and contract values are tracked in Indian Rupees with clean brackets (e.g., `₹5,00,000 - ₹15,00,000`, `₹50,00,000+`).
- **Lead Slide-Over Drawer**: Click on any lead to slide out all details, view past activity history, and schedule new tasks without leaving the page.
- **Archive & Restore**: Keep your workspace clean by archiving old leads with the option to restore them anytime.

### 3. 📋 Visual Sales Pipeline (Kanban Board)
- Visual columns representing all 6 sales stages:
  - 🆕 **New**: Fresh inbound inquiries from your website, ads, or referrals.
  - 📞 **Contacted**: Initial discovery call or email sent.
  - 🎯 **Qualified**: Client budget and technical requirements match your agency.
  - 📝 **Proposal**: Formal statement of work or quotation delivered.
  - 🏆 **Won**: Contract successfully closed and signed.
  - ❌ **Lost**: Client chose another option or project paused.
- **1-Click Stage Shift**: Advance or move back deals with simple buttons on each card.

### 4. ⏰ Follow-up & Task Reminder Hub
- Schedule **Calls**, **Meetings**, **Emails**, or general **Tasks** with specific due dates.
- Overdue tasks are highlighted with glowing red indicators so nothing slips through the cracks.
- Check off completed tasks with a single click.

### 5. 🛡️ Smart Duplicate Detection
- While you type an email or phone number in the "New Lead" form, the system checks in real time and warns you if a duplicate contact already exists.

### 6. 📥 CSV & PDF Lead Import Wizard (Phase 5)
- **Multi-Format Ingestion**: Upload `.csv` or text-based `.pdf` files up to 5MB and 500 rows.
- **Smart Column Mapping**: Automatically detects synonymous column headers (e.g. `lead name`, `mobile`, `employer`, `urgency`) with manual drop-down overrides.
- **Inline Record Editor & Validation**: Review candidate leads, edit names, emails, and phone numbers in-place before committing.
- **Privacy-Safe Duplicate Alerts**: Flags intra-file duplicate contacts and database duplicates with role-scoped privacy masking (`Confidential Lead` protection for non-managers).
- **Safe Batch Imports**: Executes imports in bounded ACID transactions (50 records per batch) with idempotency protection.
- **Exportable Import Summary**: Comprehensive summary showing imported, skipped, and duplicate leads with a downloadable CSV error report for any rejected rows.

### 7. 🔒 Secure Authentication
- JWT (JSON Web Token) based login with encrypted passwords (bcrypt).
- Quick 1-click demo accounts for easy testing.

---

## 🛠️ Tech Stack (Under the Hood)

| Part | Technologies Used | Description |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite | Ultra-fast user interface with strong type safety |
| **Styling** | Tailwind CSS v4 | Clean, modern, responsive styling with smooth custom scrollbars |
| **Icons & Router** | Lucide React, React Router 7 | Minimalist iconography and seamless page navigation |
| **Backend API** | Node.js, Express 5 | RESTful API with structured routes and controllers |
| **Database** | PostgreSQL | Industry-standard relational SQL database |
| **ORM** | Prisma ORM 6 | Type-safe database queries, schema migrations, and relational integrity |
| **PDF & Stream** | `pdf-parse 2.4.5`, `multer` | Safe in-memory stream decoding and RFC 4180 CSV parsing |
| **Security** | JWT, bcryptjs, CORS | Password hashing, protected endpoints, and rate limiting |

---

## 📂 Project Structure

```text
new-aflix/
├── backend/                  # Node.js + Express + Prisma API
│   ├── config/               # Database connection setup
│   ├── middleware/           # Authentication protection middleware
│   ├── prisma/
│   │   └── schema.prisma     # PostgreSQL database models (User, Lead, FollowUp, ActivityLog)
│   ├── routes/
│   │   ├── authRoutes.js     # User registration, login, and profile
│   │   └── LeadRoutes.js     # Leads CRUD, pipeline stats, tasks, and PDF upload
│   ├── scripts/
│   │   └── migrate-budget-to-inr.js # Script to migrate older data to INR
│   ├── utils/                # PDF parsing and transaction helpers
│   ├── seed-demo.js          # Demo dataset seeder (12 rich leads with ₹ budgets)
│   ├── test-api.js           # Full automated API test suite
│   ├── test-leads.js         # Unit test suite for database operations
│   └── server.js             # API entrypoint (Port 5000)
│
├── frotend/                  # React + TypeScript + Vite Frontend
│   ├── src/
│   │   ├── components/       # UI Components (Sidebar, Navbar, Modals, Kanban, Drawers)
│   │   ├── context/          # React Context (AuthContext, ToastContext)
│   │   ├── pages/            # App Pages (Dashboard, Leads, Pipeline, Followups, Activities, Login)
│   │   ├── services/         # API connection and data helpers
│   │   └── types/            # TypeScript data models (crm.ts)
│   └── index.html            # Main HTML document
│
└── README.md                 # Complete project documentation
```

---

## 🚀 Quick Setup Guide (Get Running in 2 Minutes)

### Prerequisites
Make sure you have installed on your computer:
- [Node.js](https://nodejs.org/) (Version 18 or newer)
- [PostgreSQL](https://www.postgresql.org/) (Running locally or in cloud)

---

### Step 1: Clone or Open the Project
Open your terminal in the `new-aflix` folder.

```bash
cd new-aflix
```

---

### Step 2: Configure the Backend

1. Go into the `backend` folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Configure connection strings:
   ```env
   # Pooled connection string for application runtime
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/aflix_crm?schema=public"

   # Direct unpooled connection string for Prisma migrations & CLI operations
   DIRECT_URL="postgresql://postgres:your_password@localhost:5432/aflix_crm?schema=public"

   PORT=5000
   JWT_SECRET="your_strong_jwt_secret"
   JWT_EXPIRES_IN="24h"
   ```
   *(For Neon/cloud PostgreSQL, `DATABASE_URL` uses the pooler endpoint and `DIRECT_URL` uses the direct unpooled connection).*

4. Apply database migrations:
   - **For a fresh database**:
     ```bash
     npx prisma migrate deploy
     ```
   - **For an existing database without migration history (Baselining)**:
     ```bash
     # 1. Mark baseline migration as applied without re-running DDL
     npx prisma migrate resolve --applied 0_init

     # 2. Apply role normalization and constraint migration
     npx prisma migrate deploy
     ```
   - **Optional - Migrate legacy accounts via standalone script**:
     ```bash
     npm run migrate:roles:dry   # Preview accounts to be migrated
     npm run migrate:roles       # Apply migration to normalize roles to 'user'
     ```

5. Seed standardized demo accounts and sample leads:
   ```bash
   npm run seed
   ```

6. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend will be running at:* `http://localhost:5000`

---

### Step 3: Run the Frontend

1. Open a **second terminal window** and navigate to `frotend`:
   ```bash
   cd frotend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```

4. Open the link shown in your terminal (usually `http://localhost:5173`).

---

## 🔑 Demo Login Accounts

You can sign in using any of the standardized demo accounts:

| Name | Role | Email | Password | Access Scope |
|---|---|---|---|---|
| **Aflix Admin** | `admin` | `admin@aflix.com` | `password123` | Global organization access & user management |
| **Aflix Manager** | `manager` | `manager@aflix.com` | `password123` | Global pipeline access, reassignment & stats |
| **Aflix User** | `user` | `user@aflix.com` | `password123` | Strictly user-scoped (sees only assigned leads) |

> **⚠️ Security Notice**: These credentials are strictly for development and demonstration. They must be changed or disabled before deploying to production.

---

## 📥 Phase 5: Production CSV & PDF Lead Import

### Overview & Architecture
The Phase 5 Lead Import engine enables authorized CRM users to ingest batch lead data from CSV spreadsheets and text-based PDF documents without compromising database integrity, role boundaries, or system performance.

```text
Uploaded File (.csv / .pdf)
         │
         ▼
[ In-Memory Multer Stream (Max 5MB) ]
         │
         ▼
[ Safe Parser Engine (leadParserService.js) ]
  ├── RFC 4180 CSV Parser (Quotes, UTF-8 BOM, Multiline cells)
  ├── PDF Stream Decoder (pdf-parse 2.4.5)
  ├── Alphanumeric OCR Scanned PDF Detector
  ├── Smart Column Alias Resolver
  └── CSV Formula Injection Sanitizer
         │
         ▼
[ Validation & Duplicate Scoping ]
  ├── Required Field Validation (name, email/phone format)
  ├── Intra-File Duplicate Detection
  └── DB Duplicate Detection with Privacy Masking (Confidential Lead)
         │
         ▼
[ Preview & Manual Mapping / Inline Editing (LeadImportModal.tsx) ]
         │
         ▼
[ Bounded ACID Batch Transaction (Max 50/chunk) ]
  ├── Role Assignment Enforcement (user forced to self)
  ├── Idempotent Duplicate Skipping
  └── ActivityLog Audit Trail ('imported')
```

### Supported Formats & Capabilities

#### 1. CSV Support (RFC 4180 Compliant)
- **Delimiters & Quotes**: Fully supports commas inside quotes (e.g., `"Acme, Inc."`), escaped quotes (`""`), and multiline cell content.
- **Encoding**: UTF-8 and UTF-8 with Byte Order Mark (`\uFEFF`) are automatically normalized and stripped.
- **Whitespace & Blank Rows**: Tolerates leading/trailing whitespace, trailing empty lines, and carriage returns (`\r\n`).
- **Formula Injection Defense**: All values prefixed with spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) are sanitized with a leading apostrophe before storage or export.

#### 2. Text-Based PDF Support
- **Extraction Mechanism**: Uses `pdf-parse` (v2.4.5) running entirely in Node.js memory. No data is ever sent to external AI APIs or third-party cloud services.
- **Layouts Supported**:
  - Tab-separated or tokenized contact tables.
  - Label-value pairs (e.g., `Name: John Doe`, `Email: john@acme.com`, `Phone: 9876543210`).
  - Section-based contact cards.
- **Scanned / Image-Only Detection**: Scanned or rasterized PDFs lacking a text layer (< 30 alphanumeric characters) are detected immediately and return a descriptive `400 Bad Request` informing the user that OCR preprocessing or a text-based PDF is required.

### Column Mapping & Field Aliases
The import engine automatically resolves header synonyms to standard CRM Lead fields:

| CRM Lead Field | Recognized Aliases | Required |
|---|---|:---:|
| `name` | `name`, `full_name`, `lead name`, `client name`, `contact name`, `customer name`, `lead_name` | Yes |
| `email` | `email`, `email address`, `email_address`, `mail`, `contact email` | No* |
| `phone` | `phone`, `phone number`, `mobile`, `cell`, `contact number`, `tel` | No* |
| `company` | `company`, `company name`, `organization`, `business`, `employer` | No |
| `status` | `status`, `stage`, `pipeline stage`, `sales stage` | No (Defaults to `New`) |
| `priority` | `priority`, `urgency`, `importance` | No (Defaults to `Medium`) |
| `source` | `source`, `lead source`, `channel`, `origin` | No (Defaults to `Website`) |
| `budget` | `budget`, `deal value`, `amount`, `contract value` | No |
| `serviceInterested`| `service`, `services`, `service interested`, `requirement` | No |
| `notes` | `notes`, `note`, `description`, `comments`, `remarks` | No |

*\* Note: Valid leads require either a valid email or phone number.*

### Security, Privacy & Authorization Guardrails

1. **Fail-Closed Role-Based Ownership**:
   - Standard `user` role cannot assign leads to other team members or tamper with `createdById`. Any `assignedToId` or `owner` provided in the payload is ignored and forced to `req.user.userId` and `req.user.name`.
   - `manager` and `admin` roles can assign imported leads to arbitrary active CRM users.
2. **Privacy-Preserving Duplicate Detection**:
   - When a candidate lead matches an existing record in the database that the authenticated user does not have permission to view, the match is reported as a duplicate warning, but the existing lead's name and company are redacted to `Confidential Lead` to prevent tenant reconnaissance.
3. **Bounded Batch Transactions & Safe Memory Usage**:
   - Maximum upload size: **5 MB**.
   - Maximum record limit: **500 rows** per file.
   - Batching: Processed in isolated ACID transactions of **50 records per chunk** using Prisma `$transaction` (`withTransaction` helper), preventing memory exhaustion or long-held database locks.
4. **Audit Trail**:
   - Creates canonical `ActivityLog` records with `type: 'imported'` and detailed metadata for every ingested lead.

### API Endpoints

#### 1. Preview Import File
- **Endpoint**: `POST /api/leads/import/preview`
- **Auth**: Bearer JWT (`admin`, `manager`, `user`)
- **Content-Type**: `multipart/form-data` (Field: `file`)
- **Query Params**: `type=csv|pdf` (optional)

#### 2. Confirm Batch Import
- **Endpoint**: `POST /api/leads/import`
- **Auth**: Bearer JWT (`admin`, `manager`, `user`)
- **Content-Type**: `application/json`
- **Payload**: `{ leads: [...], skipDuplicates: boolean }`

---

## 🧪 Testing Suites & Verification

The project includes five comprehensive automated test suites verifying every layer of the application:

```bash
cd backend

# 1. Full API integration & security regression tests (Tasks 1-8: Auth, RBAC, IDOR, Cascades)
npm test

# 2. Unit & database model tests (Phone normalization, duplicate detection, pagination)
npm run test:unit

# 3. Phase 3 verification (Timezone-safe dates, canonical activity mapping, Express 5 static serving)
npm run test:phase3

# 4. Phase 4 comprehensive end-to-end criteria (All 15 assessment criteria with isolated records)
npm run test:phase4

# 5. Phase 5 Lead Import verification (All 14 CSV/PDF parsing, RBAC, duplicate & audit criteria)
npm run test:phase5

# 6. Run all test suites sequentially
npm run test:all
```

To build and check frontend types and production bundling:
```bash
cd frotend
npm run build
```

---

## 🎬 3–5 Minute Evaluation Demonstration Script

Follow this step-by-step walkthrough to verify all core assessment criteria:

### Step 1: Sign in as Standard User (1 min)
1. Open the login page (`http://localhost:5173/login`).
2. Notice the **Demo Quick Fill** panel (available in dev mode). Click **User** to populate `user@aflix.com` and `password123`.
3. Click **Sign In**.
4. Observe the **Dashboard**: KPIs (Total Active, High Priority, Overdue Follow-ups) and the **Urgent Action Agenda** are strictly filtered to this user's assigned leads.

### Step 2: Create a Lead & Verify Duplicate Detection (1 min)
1. Navigate to **Leads** and click **+ Add Lead**.
2. Type an existing contact's email or phone (e.g., `sophia.laurent@aurafintech.com`).
3. Notice the **Duplicate Lead Alert** banner instantly appear displaying the matching contact and reason.
4. Fill in unique lead details (e.g., `Quantum Robotics`, Budget: `₹5,00,000 - ₹15,00,000`) and submit.
5. The lead appears in the table with formatted INR budget and status badge.

### Step 3: Phase 5 Lead Import Wizard (1.5 min)
1. On the **Leads** page, click the **Import Leads** button in the header.
2. **Step 1 (Upload)**: Drag and drop or browse to select a `.csv` or text-based `.pdf` file. Notice the file type, file size, and upload progress bar.
3. **Step 2 (Preview & Mapping)**:
   - For CSVs with custom headers, review the **Column Mapping** panel and re-map fields if necessary.
   - Inspect the **Preview Table**: observe row-level validation badges (`Valid`, `Duplicate`, `Invalid`).
   - Check the inline editor: click any field to tweak contact details before importing.
   - Use the row checkboxes or table header checkbox to select which rows to import.
4. **Step 3 (Import & Confirmation)**:
   - Click **Import X Selected Leads**.
   - Notice the animated progress bar as records are sent to the backend.
   - View the final **Summary Card**: counts for Imported, Skipped, Duplicates, and Failed.
   - Click **Download Error Report** to export a clean CSV of skipped or failed records.
   - Click **Done**: the Leads table immediately refreshes with the newly imported records.

### Step 4: Follow-Up Scheduling & Activity History (1 min)
1. Click on any imported lead to open the **Slide-Over Drawer**.
2. Switch to the **Audit Trail & History** tab: verify the canonical `imported` activity log entry exists with timestamp and creator details.
3. Switch to the **Follow-ups** tab and click **Schedule Task**.
4. Select **Call**, set the due date to yesterday (to test overdue indicator) or today, and save.
5. Toggle the task as **Completed**.
6. Observe the chronological timeline updated with `task_added` and `task_completed` events.

### Step 5: Pipeline Kanban & Stage Progression (30 sec)
1. Navigate to **Pipeline Board**.
2. Locate the lead in the **New** column and advance it to **Qualified**.
3. Re-open the lead drawer: verify the `status_change` audit log records the stage transition.

### Step 6: Authorization Security & Organization-Wide Views (1 min)
1. Attempt to reassign lead ownership or access an unauthorized lead ID: observe that standard users cannot alter ownership.
2. Sign out and click **Manager** (`manager@aflix.com`).
3. Observe that the Manager dashboard and pipeline display **organization-wide deals**, allowing global reassignment and performance tracking.
4. Sign in as **Admin** (`admin@aflix.com`) to manage team users and perform administrative cascade deletions.

---

## 💡 Helpful Commands Summary

| Action | Command | Folder |
|---|---|---|
| **Start Backend** | `npm run dev` | `backend/` |
| **Start Frontend** | `npm run dev` | `frotend/` |
| **Build Frontend** | `npm run build` | `frotend/` |
| **Run All Tests** | `npm run test:all` | `backend/` |
| **Run Phase 5 Import Tests** | `npm run test:phase5` | `backend/` |
| **Run API & Security Suite** | `npm test` | `backend/` |
| **Run Unit Tests** | `npm run test:unit` | `backend/` |
| **Run Phase 3 Tests** | `npm run test:phase3` | `backend/` |
| **Run Phase 4 E2E Suite** | `npm run test:phase4` | `backend/` |
| **Prisma Schema Validate** | `npm run prisma:validate` | `backend/` |
| **Check Migration Status** | `npm run prisma:status` | `backend/` |
| **Apply Migrations** | `npm run prisma:migrate` | `backend/` |
| **Seed Demo Accounts** | `npm run seed` | `backend/` |

---

## 📄 License
This project is proprietary and maintained for **Aflix Infotech**.

