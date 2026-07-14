# 🚍 Safe School Bus Kashmir

> Real-time school transport safety platform for Jammu & Kashmir — built for the hackathon pilot.

A full-stack web application that gives **parents**, **drivers**, **schools**, and **RTO (transport) authorities** a shared, live view of school-bus safety. The system tracks buses in real time, flags overspeeding, route deviations, long stops, and delays, and lets parents report concerns privately to the school.

---

## 📌 Problem Statement

In Jammu & Kashmir, thousands of children travel to school by bus every day over hilly, narrow, and often poorly-lit roads. Parents have **no visibility** into where the bus is, whether the driver is speeding, or if the bus is delayed. Schools and transport authorities lack a **centralized, data-driven** way to monitor their fleet and intervene before small issues become incidents.

**Safe School Bus Kashmir** closes this gap with a single platform that:

- Shows parents exactly where their child's assigned bus is — and only their bus.
- Alerts schools and parents the moment a bus overspeeds, leaves its route, stops too long, or falls behind schedule.
- Gives RTO authorities a risk-ranked, compliance-focused overview of the entire pilot fleet.
- Lets parents raise safety concerns directly and privately to the school transport team.

---

## 🏔️ Why It Matters in J&K

- **Difficult terrain & weather** — Hilly roads, snowfall, and fog make overspeeding and route deviations especially dangerous. Live monitoring helps prevent accidents.
- **Long commutes** — Many children travel 30–60+ minutes each way; delays and breakdowns are common and stressful for families.
- **Trust gap** — Parents in remote valleys (Srinagar, Baramulla, Anantnag, etc.) currently rely on word-of-mouth. This app replaces uncertainty with verified, live information.
- **Regulatory need** — The Motor Vehicles Act and Supreme Court guidelines require school buses to meet safety norms. RTOs need a practical tool to verify compliance at scale.
- **Privacy-first culture** — The design deliberately shows parents **only their own child's bus**, respecting Kashmiri families' privacy expectations while still enabling oversight.

---

## ✨ Features

### 👨‍👩‍👧 Parent
- Live map of the **assigned bus** during active trips only (no tracking when idle).
- Real-time speed, GPS status, route status, and attendant name.
- Instant **safety alerts** (overspeed, route deviation, delay, SOS).
- Private **"Report a Concern"** form sent straight to the school.

### 🚌 Driver
- **Trip console** to start/end trips after a safety checklist.
- One-tap **SOS / emergency** button.
- Automatic GPS location streaming to the school and assigned parents.

### 🏫 School Admin
- Fleet dashboard with active trips, active alerts, and unresolved complaints.
- Per-vehicle safety **checklist** status.
- Resolve complaints and review/acknowledge alerts.

### 🚦 RTO Admin
- Risk-ranked **high-risk vehicle queue** for inspection prioritization.
- Fleet-wide **compliance scores** and document status.
- Weekly complaint trends and a full compliance table.

### 🔔 Cross-cutting
- **Real-time updates** via Socket.IO (location pings, new alerts, trip start/end).
- **Role-based access control** — every user sees only what they're allowed to.
- **Email verification** flow for new registrations (SendGrid-ready).
- **Web Push notifications** (VAPID-ready) for alerts.
- **Privacy by design** — parents never see other children's buses or child-level data.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express 5, Socket.IO |
| **Auth & Security** | JSON Web Tokens (JWT), bcryptjs, security headers |
| **Database** | JSON file store (`data/db.json`) — zero-config, ideal for a pilot |
| **Frontend** | React 19 + TypeScript, Vite 8 |
| **Styling** | Tailwind CSS v4 |
| **Maps** | Leaflet (interactive live map) |
| **Email** | SendGrid (`@sendgrid/mail`) — optional |
| **Push** | `web-push` (VAPID) — optional |
| **Routing** | React Router v7 |

---

## 🏗️ Project Architecture

```
Bus Tracker/
├── server.js                 # Express + Socket.IO API server (single, well-structured file)
├── data/
│   └── db.json               # JSON "database" (users, schools, vehicles, routes, trips, alerts...)
├── public/                   # Static assets served by the server
├── frontend/                 # React + TypeScript + Vite app
│   ├── src/
│   │   ├── App.tsx           # Router + layout shell
│   │   ├── main.tsx          # App entry point
│   │   ├── pages/
│   │   │   ├── Login.tsx          # Login + registration + demo accounts
│   │   │   ├── ParentDashboard.tsx
│   │   │   ├── DriverApp.tsx
│   │   │   ├── SchoolDashboard.tsx
│   │   │   └── RtoDashboard.tsx
│   │   ├── components/
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── InteractiveMap.tsx
│   │   └── services/
│   │       ├── api.ts        # Axios client (auto-attaches JWT)
│   │       └── socketService.ts  # Socket.IO client
│   └── dist/                 # Production build (served by server.js)
├── .env                      # Configuration (secrets, keys, port)
└── package.json              # Root scripts (start / dev / check)
```

### Data flow
1. **Driver app** streams GPS locations to `POST /api/trips/:id/locations`.
2. Server runs **safety rules** (overspeed, route deviation, long stop, delay, GPS-inactive) and creates alerts.
3. Alerts are pushed over **Socket.IO** to the school room, the RTO room, and the relevant parent.
4. **Parent/School/RTO dashboards** update live via the socket connection.

---

## 🚀 How to Run Locally

### Prerequisites
- **Node.js** >= 18
- npm (ships with Node)

### 1. Clone the repository
```bash
git clone https://github.com/MohammadOmmar/safe-school-bus.git
cd "Bus Tracker"
```

### 2. Install dependencies
```bash
# Root (backend) dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Configure environment
Copy the example env file and adjust if needed:
```bash
cp .env.example .env
```
The defaults work out-of-the-box for local use. (SendGrid and VAPID keys are optional — the app degrades gracefully without them.)

### 4. Build the frontend
```bash
cd frontend
npm run build
cd ..
```
This produces `frontend/dist/`, which `server.js` serves automatically.

### 5. Start the server
```bash
npm start
```
The app will be available at **http://localhost:3000**.

> 💡 For development with hot-reload you can run `npm run dev` (backend watch) and, in a second terminal, `cd frontend && npm run dev` (Vite dev server on port 5173).

---

## 🔐 Demo Accounts (for jury / quick testing)

All demo accounts use the password **`demo123`**. On the login page, click any colored **Demo** button to log in instantly.

| Role | Email | What you'll see |
|------|-------|----------------|
| **Parent** | `parent@demo.com` | Your child's bus live on a map + safety alerts |
| **School** | `school@demo.com` | Fleet dashboard, alerts, complaints |
| **Driver** | `driver@demo.com` | Trip console, start/end trip, SOS |
| **RTO** | `rto@demo.com` | Risk-ranked fleet compliance overview |

> The demo database seeds a school, a driver, a vehicle (JK01-DEMO-1234), a Bemina→School route, and an active trip so every dashboard has live data immediately.

---

## 📸 Screenshots

> _Add screenshots of each dashboard here before submission._

| View | Suggested capture |
|------|-------------------|
| Login page (with demo buttons) | `docs/login.png` |
| Parent dashboard (live map) | `docs/parent.png` |
| Driver trip console | `docs/driver.png` |
| School fleet dashboard | `docs/school.png` |
| RTO compliance overview | `docs/rto.png` |

To capture: run the app, log in with each demo account, and paste screenshots into a `docs/` folder, then reference them:

```md
![Parent Dashboard](docs/parent.png)
```

---

## 🔮 Future Improvements

- **Persistent database** — Migrate from JSON file store to PostgreSQL / MongoDB for production scale.
- **Real GPS hardware integration** — Connect actual vehicle trackers / driver mobile GPS instead of manual location posts.
- **Multi-language support** — Kashmiri, Urdu, and Hindi UI for broader accessibility.
- **Offline-first mobile apps** — Native Android/iOS apps (most rural J&K areas have intermittent connectivity).
- **AI anomaly detection** — Predictive alerts for unusual patterns (e.g., sudden stops, repeated deviations).
- **Government RTO API integration** — Sync with official vehicle/document registries for automatic compliance checks.
- **Geofencing for stops** — Auto-notify parents when the bus is 2 minutes from their stop.
- **Audit logs & reporting** — Exportable safety/incident reports for schools and RTOs.
- **Payment & subscription module** — For schools to onboard and manage their fleet subscriptions.

---

## 📄 License

This project is developed for the hackathon pilot. Contact the maintainers for reuse or contribution.

---

<p align="center">Made with ❤️ for safer school commutes in Jammu & Kashmir 🏔️</p>