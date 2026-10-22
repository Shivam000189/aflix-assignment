# Aflix Infotech Mini CRM — Frontend

A responsive, uncluttered, and intuitive Mini CRM for **Aflix Infotech** to track incoming business leads, assign priorities, record follow-ups, and visualize the sales pipeline.

---

## 🚀 Getting Started

### 1. Install & Run Locally
```bash
cd frotend
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 2. Production Build & Type Check
```bash
npm run build
```

---

## 🔑 Demo Login Instructions

You can sign in with any of the following 1-click accounts directly on the login page:

| Role | Name | Email | Password |
|---|---|---|---|
| **Sales Manager** | Shivam Sharma | `shivam@aflix.com` | `password123` |
| **Sales Representative** | Alex Chen | `alex@aflix.com` | `password123` |
| **Account Representative** | Priya Patel | `priya@aflix.com` | `password123` |

*(You can also sign in with any custom email and password of 4+ characters).*

---

## ✨ Features Implemented

### A. Authentication & Access Control
- JWT-based authentication flow with token persistence in `localStorage`.
- Protected private routes: unauthenticated users are seamlessly redirected to `/login`.
- Easy user profile dropdown, active role chip, and 1-click Sign out.

### B. Lead Management
- **Fields tracked**: Contact name, company, email, phone, lead source, service interested in, budget range, pipeline status, priority, owner, and created/updated timestamps.
- **Duplicate Lead Prevention & Alerting**: Real-time checking on email and phone input with inline warning highlighting existing matching lead.
- **Search, Filtering, Sorting & Server-Side Pagination**:
  - Instant debounced multi-field search (name, company, email, phone).
  - Filter by Stage (`New`, `Contacted`, `Qualified`, `Proposal`, `Won`, `Lost`).
  - Filter by Priority (`Urgent`, `High`, `Medium`, `Low`).
  - Sort by Date Created, Contact Name, Company, or Priority with Asc/Desc toggle.
  - Pagination controls with configurable page navigation.
  - Archive and restore leads with a dedicated archive filter.

### C. Follow-up & Activity Tracking
- **Follow-up Tasks Hub**:
  - Overdue follow-up tasks clearly highlighted in red/amber with alert indicators.
  - Due Today and Upcoming scheduled tasks.
  - Complete / Incomplete toggle with auto-logging.
  - Task scheduling form with due date, activity type (Call, Meeting, Email, Task), and notes.
- **Lead Detail Drawer**:
  - Side-over drawer providing instant access to full lead info without leaving page.
  - **Details tab**: Contact info, budget, service, owner, and notes.
  - **Follow-ups tab**: Dedicated tasks list and fast scheduling form.
  - **Timeline tab**: Timestamped audit trail of all changes made to the lead.
- **Global Activity & Audit History**:
  - Real-time logging of status transitions, priority changes, follow-up additions, completions, and archives.

### D. Sales Pipeline Dashboard & Visualizations
- KPI Metric Cards: Active Leads, Overdue Follow-ups (critical alert badge), High Priority Leads, and Closed Won Deals.
- **Pipeline Stage Visual Funnel**: Interactive stage breakdown bar showing lead counts and percentage distribution across stages.
- Action Agenda: Highlighting follow-ups requiring immediate attention.
- View switch: Seamless toggle between structured **Table View** and Kanban **Pipeline Board**.

### E. Clean, Uncluttered Responsive UX
- Clean modern design adhering to the instruction: **"responsive and easy not use too much icons and texts"**.
- Built with Tailwind CSS v4 and Plus Jakarta Sans typography.
- Zero unnecessary icon clutter or wall-of-text blocks.
- Fully responsive across desktop, tablet, and mobile (collapsible mobile menu drawer).
