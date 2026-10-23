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

---

## 📡 Complete REST API Reference & Endpoints Guide

The Aflix CRM backend exposes a RESTful JSON API running on port `5000` (base URL: `http://localhost:5000/api`).

All endpoints (except `/api/health`, `/api/auth/register`, and `/api/auth/login`) require a valid JSON Web Token passed in the `Authorization` header:
```http
Authorization: Bearer <your_jwt_token>
```

### 📋 API Endpoints Summary Matrix

| Method | Endpoint | Auth Required | Allowed Roles | Description |
|:---:|---|:---:|:---:|---|
| `GET` | `/api/health` | No (Public) | All | System health check & database connection probe |
| `POST` | `/api/auth/register` | No (Public) | All | Register a new user (defaults to `user` role) |
| `POST` | `/api/auth/login` | No (Public) | All | Sign in with email & password, returns JWT token |
| `GET` | `/api/auth/me` | Yes | All | Get current authenticated user's profile |
| `GET` | `/api/auth/users` | Yes | `admin`, `manager` | List all active users across the organization |
| `GET` | `/api/leads` | Yes | All | Paginated list of leads with filtering, search & sorting |
| `POST` | `/api/leads` | Yes | All | Create a new lead with duplicate checking & tasks |
| `GET` | `/api/leads/check-duplicate` | Yes | All | Check email/phone duplicates before submitting |
| `GET` | `/api/leads/stats` | Yes | All | Aggregated CRM KPIs, win rate, stage & priority counts |
| `GET` | `/api/leads/pipeline` | Yes | All | Visual Kanban pipeline data with stage values & funnel |
| `PATCH` | `/api/leads/:id/stage` | Yes | All | Advance or move a lead between pipeline stages |
| `GET` | `/api/leads/follow-ups/overview` | Yes | All | Central task hub: overdue, today, and upcoming tasks |
| `GET` | `/api/leads/:id` | Yes | All | Get single lead by ID with full tasks and activity history |
| `PUT` | `/api/leads/:id` | Yes | All | Update lead details with automated field-change audit logs |
| `DELETE` | `/api/leads/:id` | Yes | `admin`, `manager` | Cascade delete a lead and all child tasks/audit logs |
| `POST` | `/api/leads/:id/tasks` | Yes | All | Schedule a follow-up task (`Call`, `Meeting`, `Email`, etc.) |
| `PATCH` | `/api/leads/:id/tasks/:taskId` | Yes | All | Toggle task completion or edit task details |
| `PATCH` | `/api/leads/tasks/:taskId` | Yes | All | Direct task update / completion toggle by task ID |
| `DELETE` | `/api/leads/:id/tasks/:taskId` | Yes | All | Delete a follow-up task from a lead |
| `GET` | `/api/leads/:id/follow-ups` | Yes | All | List all follow-up tasks for a specific lead |
| `POST` | `/api/leads/:id/activities` | Yes | All | Append a manual note or activity to lead timeline |
| `GET` | `/api/leads/:id/activity-logs` | Yes | All | Fetch full chronological audit history for a lead |
| `PATCH` | `/api/leads/:id/archive` | Yes | All | Soft-archive a lead (hides from active views) |
| `PATCH` | `/api/leads/:id/unarchive` | Yes | All | Restore an archived lead to active pipeline |
| `GET` | `/api/leads/team/users` | Yes | All | Get list of sales reps and assignees |
| `POST` | `/api/leads/import/preview` | Yes | All | Parse & preview CSV/PDF leads without writing to DB |
| `POST` | `/api/leads/import` | Yes | All | Atomic batch ingestion of leads with duplicate handling |

---

### 1. System & Health

#### `GET /api/health`
- **Purpose**: Checks backend server liveness, PostgreSQL database engine status, and Prisma ORM runtime.
- **Authentication**: None (Public)
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "database": "postgresql",
  "orm": "prisma",
  "time": "2026-10-23T10:55:00.000Z"
}
```

---

### 2. Authentication & Users (`/api/auth`)

#### `POST /api/auth/register`
- **Purpose**: Registers a new user account. Passwords must be at least 6 characters and are securely hashed using bcrypt. In self-registration, the user is always assigned the `user` role for safety.
- **Authentication**: None (Public)
- **Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password123",
  "phone": "9876543210"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "cm2l1...id",
    "_id": "cm2l1...id",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "user"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: Missing fields, invalid email format, password under 6 characters, or email already registered.

#### `POST /api/auth/login`
- **Purpose**: Authenticates credentials, verifies active status, and returns a signed 24-hour JWT token with user metadata.
- **Authentication**: None (Public)
- **Request Body**:
```json
{
  "email": "admin@aflix.com",
  "password": "password123"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Login Successfully",
  "msg": "Login Successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "cm2k...",
    "_id": "cm2k...",
    "name": "Aflix Admin",
    "email": "admin@aflix.com",
    "role": "admin"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: Email or password omitted.
  - `401 Unauthorized`: Incorrect password or user account disabled.

#### `GET /api/auth/me`
- **Purpose**: Returns the authenticated user profile from their verified JWT token.
- **Authentication**: Bearer Token (Any authenticated user)
- **Response `200 OK`**:
```json
{
  "success": true,
  "user": {
    "id": "cm2k...",
    "_id": "cm2k...",
    "name": "Aflix Admin",
    "email": "admin@aflix.com",
    "role": "admin",
    "phone": "+91 9876543210",
    "createdAt": "2026-10-01T08:00:00.000Z"
  }
}
```

#### `GET /api/auth/users`
- **Purpose**: Retrieves all active system users for team management and administration.
- **Authentication**: Bearer Token (`admin` and `manager` only)
- **Response `200 OK`**:
```json
{
  "success": true,
  "count": 3,
  "users": [
    {
      "id": "cm2...",
      "_id": "cm2...",
      "name": "Aflix Admin",
      "email": "admin@aflix.com",
      "role": "admin",
      "phone": "+91 9876543210",
      "createdAt": "2026-10-01T08:00:00.000Z"
    }
  ]
}
```
- **Error Response**:
  - `403 Forbidden`: If requested by standard `user` role.

---

### 3. Lead Management Core (`/api/leads`)

#### `GET /api/leads` (or `GET /api/lead`)
- **Purpose**: Fetches a paginated, filtered list of leads. Regular `user` accounts see only their assigned/owned leads; `admin` and `manager` accounts see organization-wide records.
- **Authentication**: Bearer Token
- **Query Parameters**:
  | Parameter | Type | Default | Description |
  |---|---|---|---|
  | `page` | integer | `1` | Page number |
  | `limit` | integer | `10` | Records per page (max: 100) |
  | `search` | string | `""` | Search query across name, company, email, service, notes |
  | `status` | string | `""` | Filter by stage (e.g. `New`, `Qualified`, or comma-separated `New,Proposal`) |
  | `priority` | string | `""` | Filter by priority (`Low`, `Medium`, `High`, `Urgent`) |
  | `source` | string | `""` | Filter by acquisition source (`Website`, `LinkedIn`, `Referral`, etc.) |
  | `owner` | string | `""` | Filter by sales owner name or email |
  | `archived` | string | `"false"` | `"false"` for active leads, `"true"` for archived leads |
  | `duplicate`| string | `""` | Filter by `"true"` or `"false"` duplicate flag |
  | `sortBy` | string | `"createdAt"` | Field: `createdAt`, `updatedAt`, `name`, `company`, `status`, `priority` |
  | `sortOrder`| string | `"desc"` | Sort direction: `asc` or `desc` |
- **Response `200 OK`**:
```json
{
  "success": true,
  "leads": [
    {
      "id": "cm2lead01...",
      "_id": "cm2lead01...",
      "name": "Aarav Sharma",
      "company": "Apex Dynamics",
      "email": "aarav@apexdynamics.in",
      "phone": "+91 98201 12345",
      "normalizedPhone": "919820112345",
      "source": "Website",
      "serviceInterested": "Full-Stack Web Application",
      "budget": "₹5,00,000 - ₹15,00,000",
      "status": "Qualified",
      "priority": "High",
      "owner": "Aflix User",
      "notes": "Custom CRM requirement.",
      "isArchived": false,
      "isDuplicate": false,
      "tasks": [
        {
          "id": "cm2task01...",
          "_id": "cm2task01...",
          "title": "Send Architecture Deck",
          "type": "Email",
          "dueDate": "2026-10-24T10:00:00.000Z",
          "isCompleted": false,
          "priority": "High"
        }
      ],
      "activities": [
        {
          "id": "cm2act01...",
          "_id": "cm2act01...",
          "type": "created",
          "description": "Lead created for Aarav Sharma from Apex Dynamics",
          "performedBy": "Aflix User",
          "timestamp": "2026-10-20T12:00:00.000Z"
        }
      ],
      "createdAt": "2026-10-20T12:00:00.000Z",
      "updatedAt": "2026-10-22T15:30:00.000Z"
    }
  ],
  "pagination": {
    "totalLeads": 12,
    "page": 1,
    "limit": 10,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### `POST /api/leads` (or `POST /api/lead`)
- **Purpose**: Creates a new lead inside a PostgreSQL ACID transaction. Automatically generates the initial audit activity log (`created`) and optional follow-up tasks. If `preventDuplicates: true` or `allowDuplicate: false` and a matching contact exists, the creation is rejected with `409 Conflict`.
- **Authentication**: Bearer Token
- **Request Body**:
```json
{
  "name": "Kavita Rao",
  "company": "Zenith Cloud",
  "email": "kavita@zenithcloud.com",
  "phone": "+91 98111 22334",
  "source": "LinkedIn",
  "serviceInterested": "Mobile App Development",
  "budget": "₹15,00,000 - ₹30,00,000",
  "status": "New",
  "priority": "Urgent",
  "owner": "Aflix User",
  "notes": "Requested urgent architecture call",
  "preventDuplicates": false,
  "tasks": [
    {
      "title": "Introductory Discovery Call",
      "type": "Call",
      "dueDate": "2026-10-25T11:00:00.000Z",
      "priority": "Urgent"
    }
  ]
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Lead created successfully",
  "lead": {
    "id": "cm2lead02...",
    "_id": "cm2lead02...",
    "name": "Kavita Rao",
    "company": "Zenith Cloud",
    "email": "kavita@zenithcloud.com",
    "phone": "+91 98111 22334",
    "status": "New",
    "priority": "Urgent",
    "tasks": [...],
    "activities": [...]
  }
}
```
- **Duplicate Prevention Response `409 Conflict`**:
```json
{
  "success": false,
  "isDuplicate": true,
  "message": "Likely duplicate lead found matching by email and phone.",
  "duplicateReasons": ["email", "phone"],
  "duplicateMatches": [
    {
      "id": "cm2lead01...",
      "name": "Kavita Rao",
      "company": "Zenith Cloud"
    }
  ]
}
```

#### `GET /api/leads/check-duplicate`
- **Purpose**: Performs real-time validation for frontend forms as the user types email or phone number. Identifies matches without saving data.
- **Authentication**: Bearer Token
- **Query Parameters**:
  - `email` (e.g. `john@acme.com`)
  - `phone` (e.g. `9876543210`)
  - `excludeId` (optional, skips current lead ID when editing)
- **Response `200 OK`**:
```json
{
  "success": true,
  "isDuplicate": true,
  "reasons": ["email"],
  "matches": [
    {
      "id": "cm2lead...",
      "name": "John Doe",
      "company": "Acme Corp",
      "email": "john@acme.com",
      "phone": "+91 9876543210"
    }
  ]
}
```

#### `GET /api/leads/:id`
- **Purpose**: Retrieves a single lead with complete relational `followUps` and `activityLogs`. Enforces ownership scoping (standard users receive `403 Forbidden` if the lead is not assigned to them).
- **Authentication**: Bearer Token
- **Response `200 OK`**:
```json
{
  "success": true,
  "lead": {
    "id": "cm2lead01...",
    "_id": "cm2lead01...",
    "name": "Aarav Sharma",
    "company": "Apex Dynamics",
    "email": "aarav@apexdynamics.in",
    "phone": "+91 98201 12345",
    "status": "Qualified",
    "priority": "High",
    "tasks": [...],
    "activities": [...]
  }
}
```
- **Error Responses**:
  - `404 Not Found`: Lead ID does not exist.
  - `403 Forbidden`: Attempting to access an unassigned lead without manager/admin role.

#### `PUT /api/leads/:id` (or `PUT /api/lead/:id`)
- **Purpose**: Modifies lead fields. Automatically creates audit activity log records for changed fields (`name`, `company`, `email`, `status`, `priority`, `owner`) inside an atomic transaction. Standard users are restricted from reassigning lead ownership.
- **Authentication**: Bearer Token
- **Request Body**:
```json
{
  "name": "Aarav Sharma",
  "company": "Apex Dynamics Technologies Pvt Ltd",
  "status": "Proposal",
  "priority": "Urgent",
  "budget": "₹15,00,000 - ₹30,00,000",
  "notes": "Sent formal statement of work."
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Lead updated successfully",
  "lead": { ... }
}
```

#### `DELETE /api/leads/:id` (or `DELETE /api/lead/:id`)
- **Purpose**: Permanently deletes a lead and cascades the deletion to all associated child tasks (`follow_ups`) and audit timeline entries (`activity_logs`).
- **Authentication**: Bearer Token (`admin` and `manager` only)
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Lead and associated records deleted successfully"
}
```
- **Error Response**:
  - `403 Forbidden`: Standard `user` role cannot permanently delete leads.

---

### 4. Pipeline, Analytics & KPIs

#### `GET /api/leads/stats`
- **Purpose**: Aggregates top-level KPI metrics, stage distribution, win rate, priority counts, acquisition channel breakdown, and overdue task counters. Scoped to the individual user for standard accounts; organization-wide for managers and admins.
- **Authentication**: Bearer Token
- **Response `200 OK`**:
```json
{
  "success": true,
  "stats": {
    "total": 12,
    "active": 10,
    "archived": 2,
    "duplicates": 1,
    "highPriority": 4,
    "overdueTasks": 2,
    "upcomingTasks": 5,
    "winRate": 75,
    "byStatus": {
      "New": 2,
      "Contacted": 2,
      "Qualified": 2,
      "Proposal": 2,
      "Won": 3,
      "Lost": 1
    },
    "byPriority": {
      "Low": 1,
      "Medium": 5,
      "High": 4,
      "Urgent": 2
    },
    "bySource": {
      "Website": 5,
      "Referral": 3,
      "LinkedIn": 4
    }
  }
}
```

#### `GET /api/leads/pipeline`
- **Purpose**: Powers the interactive Kanban Pipeline Board. Groups active leads into the 6 standard stages (`New`, `Contacted`, `Qualified`, `Proposal`, `Won`, `Lost`), calculates aggregate monetary pipeline deal values (in INR), computes the conversion funnel, and flags cards with overdue tasks.
- **Authentication**: Bearer Token
- **Response `200 OK`**:
```json
{
  "success": true,
  "stages": {
    "New": { "stage": "New", "leads": [...], "count": 2, "totalValue": 750000 },
    "Contacted": { "stage": "Contacted", "leads": [...], "count": 2, "totalValue": 1200000 },
    "Qualified": { "stage": "Qualified", "leads": [...], "count": 2, "totalValue": 2500000 },
    "Proposal": { "stage": "Proposal", "leads": [...], "count": 2, "totalValue": 1800000 },
    "Won": { "stage": "Won", "leads": [...], "count": 3, "totalValue": 4500000 },
    "Lost": { "stage": "Lost", "leads": [...], "count": 1, "totalValue": 500000 }
  },
  "stageList": ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"],
  "metrics": {
    "totalActiveLeads": 12,
    "highPriorityCount": 4,
    "overdueTasksCount": 2,
    "stageCounts": { "New": 2, "Contacted": 2, "Qualified": 2, "Proposal": 2, "Won": 3, "Lost": 1 },
    "conversionFunnel": [
      { "stage": "New", "count": 2, "percentage": 18 },
      { "stage": "Contacted", "count": 2, "percentage": 18 },
      { "stage": "Qualified", "count": 2, "percentage": 18 },
      { "stage": "Proposal", "count": 2, "percentage": 18 },
      { "stage": "Won", "count": 3, "percentage": 27 }
    ],
    "winRate": 75
  }
}
```

#### `PATCH /api/leads/:id/stage`
- **Purpose**: Moves a deal from one sales stage to another (e.g. dragging a Kanban card or clicking 1-click stage advancement). Updates lead status and writes a `status_change` audit log.
- **Authentication**: Bearer Token
- **Request Body**:
```json
{
  "stage": "Proposal",
  "updatedBy": "Aflix User"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Lead moved to Proposal",
  "lead": {
    "id": "cm2lead01...",
    "status": "Proposal",
    "updatedAt": "2026-10-23T11:00:00.000Z"
  }
}
```

---

### 5. Follow-ups & Task Reminders

#### `GET /api/leads/follow-ups/overview`
- **Purpose**: Central follow-up task hub. Groups all pending tasks by urgency: **overdue**, **due today**, and **upcoming**, complete with lead contact information for instant calling/emailing.
- **Authentication**: Bearer Token
- **Response `200 OK`**:
```json
{
  "success": true,
  "counts": {
    "totalFollowUps": 8,
    "completed": 3,
    "pending": 5,
    "overdue": 2,
    "today": 1,
    "upcoming": 2,
    "urgent": 2
  },
  "tasks": {
    "overdue": [
      {
        "id": "cm2task...",
        "title": "Send Architecture Deck",
        "type": "Email",
        "dueDate": "2026-10-20T10:00:00.000Z",
        "isCompleted": false,
        "priority": "High",
        "leadId": "cm2lead...",
        "leadName": "Aarav Sharma",
        "leadCompany": "Apex Dynamics"
      }
    ],
    "today": [...],
    "upcoming": [...]
  }
}
```

#### `POST /api/leads/:id/tasks`
- **Purpose**: Schedules a new task on a lead with a specific due date, task type (`Call`, `Meeting`, `Email`, `Follow Up`), and priority. Writes a `task_added` activity log.
- **Authentication**: Bearer Token
- **Request Body**:
```json
{
  "title": "Demo Presentation Call",
  "type": "Meeting",
  "dueDate": "2026-10-26T15:00:00.000Z",
  "priority": "High",
  "notes": "Demonstrate custom pipeline features",
  "assignedTo": "Aflix User"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Follow-up task scheduled",
  "task": {
    "id": "cm2task_new...",
    "_id": "cm2task_new...",
    "leadId": "cm2lead01...",
    "title": "Demo Presentation Call",
    "type": "Meeting",
    "dueDate": "2026-10-26T15:00:00.000Z",
    "isCompleted": false,
    "priority": "High",
    "assignedToName": "Aflix User"
  }
}
```

#### `PATCH /api/leads/:id/tasks/:taskId` & `PATCH /api/leads/tasks/:taskId`
- **Purpose**: Checks off a task as completed (`isCompleted: true`) or edits task attributes. Automatically updates `completedAt` timestamp and logs `task_completed` or `task_updated` activity event.
- **Authentication**: Bearer Token
- **Request Body**:
```json
{
  "isCompleted": true
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Task updated successfully",
  "task": {
    "id": "cm2task...",
    "isCompleted": true,
    "completedAt": "2026-10-23T11:15:00.000Z"
  }
}
```

#### `DELETE /api/leads/:id/tasks/:taskId`
- **Purpose**: Deletes a scheduled task from a lead and writes a `task_deleted` audit entry.
- **Authentication**: Bearer Token
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

#### `GET /api/leads/:id/follow-ups`
- **Purpose**: Returns the list of all tasks scheduled on a specific lead.
- **Authentication**: Bearer Token
- **Response `200 OK`**:
```json
{
  "success": true,
  "count": 2,
  "followUps": [
    {
      "id": "cm2task...",
      "title": "Send Architecture Deck",
      "dueDate": "2026-10-24T10:00:00.000Z",
      "isCompleted": false
    }
  ]
}
```

---

### 6. Timeline & Activity Logs

#### `POST /api/leads/:id/activities`
- **Purpose**: Adds a custom activity or manual note to a lead's chronological audit timeline.
- **Authentication**: Bearer Token
- **Request Body**:
```json
{
  "type": "note_added",
  "description": "Client requested proposal revision to include AWS hosting cost estimates.",
  "performedBy": "Aflix User"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Activity recorded",
  "activity": {
    "id": "cm2act...",
    "leadId": "cm2lead01...",
    "type": "note_added",
    "description": "Client requested proposal revision to include AWS hosting cost estimates.",
    "performedBy": "Aflix User",
    "timestamp": "2026-10-23T11:20:00.000Z"
  }
}
```

#### `GET /api/leads/:id/activity-logs`
- **Purpose**: Retrieves the complete audit trail and chronological activity history for a lead.
- **Authentication**: Bearer Token
- **Response `200 OK`**:
```json
{
  "success": true,
  "count": 4,
  "activities": [
    {
      "id": "cm2act...",
      "type": "status_change",
      "description": "Pipeline stage moved from 'Contacted' to 'Qualified'",
      "fieldName": "status",
      "oldValue": "Contacted",
      "newValue": "Qualified",
      "performedBy": "Aflix User",
      "timestamp": "2026-10-22T14:30:00.000Z"
    }
  ]
}
```

---

### 7. Lead Archiving & Restoration

#### `PATCH /api/leads/:id/archive`
- **Purpose**: Soft-archives a lead (`isArchived: true`), setting `archivedAt` timestamp and logging an `archived` activity. Keeps the lead in the database while removing it from default active pipeline views.
- **Authentication**: Bearer Token
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Lead archived successfully",
  "lead": {
    "id": "cm2lead01...",
    "isArchived": true,
    "archivedAt": "2026-10-23T11:25:00.000Z"
  }
}
```

#### `PATCH /api/leads/:id/unarchive`
- **Purpose**: Restores an archived lead back to active status (`isArchived: false`), clearing `archivedAt` and logging a `restored` activity.
- **Authentication**: Bearer Token
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Lead restored successfully",
  "lead": {
    "id": "cm2lead01...",
    "isArchived": false,
    "archivedAt": null
  }
}
```

---

### 8. Team Directory & Assignees

#### `GET /api/leads/team/users`
- **Purpose**: Fetches active team members for assignment dropdowns in lead modals and task forms.
- **Authentication**: Bearer Token
- **Response `200 OK`**:
```json
{
  "success": true,
  "users": [
    {
      "id": "cm2usr1...",
      "_id": "cm2usr1...",
      "name": "Aflix Admin",
      "email": "admin@aflix.com",
      "role": "admin",
      "phone": "+91 9876543210"
    },
    {
      "id": "cm2usr2...",
      "_id": "cm2usr2...",
      "name": "Aflix User",
      "email": "user@aflix.com",
      "role": "user",
      "phone": "+91 98123 45678"
    }
  ]
}
```

---

### 9. CSV & PDF Lead Import Engine (`/api/leads/import`)

#### `POST /api/leads/import/preview`
- **Purpose**: Parses an uploaded `.csv` or text-based `.pdf` file in memory (up to 5MB, 500 rows) without modifying the database. Automatically resolves column headers, extracts rows, validates email and phone formatting, and checks for intra-file and database duplicates (masking unauthorized lead names to `Confidential Lead`).
- **Authentication**: Bearer Token
- **Content-Type**: `multipart/form-data`
  - Field: `file` (Binary file content)
  - Field: `mapping` (Optional JSON string with custom column mappings)
- **Response `200 OK`**:
```json
{
  "success": true,
  "fileName": "q4_leads.csv",
  "fileType": "CSV",
  "fileSize": 14200,
  "headers": ["Lead Name", "Work Email", "Mobile", "Company", "Deal Value"],
  "mapping": {
    "name": "Lead Name",
    "email": "Work Email",
    "phone": "Mobile",
    "company": "Company",
    "budget": "Deal Value"
  },
  "summary": {
    "total": 5,
    "valid": 4,
    "duplicate": 1,
    "invalid": 0
  },
  "rows": [
    {
      "rowNumber": 1,
      "data": {
        "name": "Rajesh Gupta",
        "email": "rajesh@techcorp.in",
        "phone": "+91 98200 11223",
        "company": "TechCorp India",
        "budget": "₹10,00,000",
        "status": "New",
        "priority": "Medium"
      },
      "status": "valid",
      "validationErrors": [],
      "duplicateReasons": [],
      "duplicateMatches": []
    }
  ],
  "warning": null
}
```

#### `POST /api/leads/import`
- **Purpose**: Commits approved candidate leads into the PostgreSQL database using bounded ACID transactions (50 records per chunk). Enforces role ownership (standard users forced to self-assignment), skips duplicates idempotently, and logs canonical `imported` activity entries.
- **Authentication**: Bearer Token
- **Content-Type**: `application/json`
- **Request Body**:
```json
{
  "leads": [
    {
      "rowNumber": 1,
      "data": {
        "name": "Rajesh Gupta",
        "email": "rajesh@techcorp.in",
        "phone": "+91 98200 11223",
        "company": "TechCorp India",
        "budget": "₹10,00,000",
        "status": "New",
        "priority": "High"
      }
    }
  ],
  "options": {
    "skipDuplicates": true,
    "defaultStatus": "New",
    "defaultPriority": "Medium",
    "defaultSource": "Import"
  }
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Import complete: 1 imported, 0 skipped duplicates, 0 failed.",
  "summary": {
    "totalProcessed": 1,
    "importedCount": 1,
    "skippedCount": 0,
    "duplicateCount": 0,
    "failedCount": 0
  },
  "importedLeads": [
    {
      "id": "cm2lead_new...",
      "name": "Rajesh Gupta",
      "email": "rajesh@techcorp.in",
      "status": "New"
    }
  ],
  "errors": []
}
```

---

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

