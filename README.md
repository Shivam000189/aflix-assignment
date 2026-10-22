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

### 6. 📄 PDF Lead Extraction
- Upload a lead sheet or document in PDF format to automatically extract contact information and add it to your pipeline.

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

3. Configure your `.env` file (create `backend/.env` if not present):
   ```env
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/aflix_crm?schema=public"
   PORT=5000
   JWT_SECRET=mySuperSecretKey123
   JWT_EXPIRES_IN=24h
   ```
   *(Replace `your_password` with your local PostgreSQL password).*

4. Push the schema to your database:
   ```bash
   npx prisma db push
   ```

5. Seed demo leads and test accounts:
   ```bash
   npm run seed
   ```

6. Start the backend server:
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

4. Open the link shown in your terminal (usually `http://localhost:5173` or `http://localhost:5174`).

---

## 🔑 Demo Login Accounts

On the login page, you can sign in instantly using any of these pre-seeded accounts:

| Name | Role | Email | Password |
|---|---|---|---|
| **Shivam Sharma** | Sales Manager | `shivam@aflix.com` | `password123` |
| **Alex Chen** | Sales Representative | `alex@aflix.com` | `password123` |
| **Priya Patel** | Account Executive | `priya@aflix.com` | `password123` |

*(You can also click **Register** to create a brand new account).*

---

## 🧪 Testing

The backend includes comprehensive test suites testing authentication, duplicate detection, cascading deletes, and pipeline analytics.

To run the unit tests:
```bash
cd backend
npm run test:unit
```

To run the full API integration tests:
```bash
cd backend
npm test
```

To build and check frontend types:
```bash
cd frotend
npm run build
```

---

## 💡 Helpful Commands Summary

| Action | Command | Folder |
|---|---|---|
| **Start Backend** | `npm run dev` | `backend/` |
| **Start Frontend** | `npm run dev` | `frotend/` |
| **Build Frontend** | `npm run build` | `frotend/` |
| **Reseed Demo Leads** | `node seed-demo.js` | `backend/` |
| **Run API Tests** | `node test-api.js` | `backend/` |
| **Run Unit Tests** | `node test-leads.js` | `backend/` |
| **Update DB Schema** | `npx prisma db push` | `backend/` |

---

## 📄 License
This project is proprietary and maintained for **Aflix Infotech**.
