# CampaignAI 🚀 — Autonomous Meta Ads Platform

CampaignAI is an enterprise-grade SaaS application designed to build, manage, analyze, and optimize digital marketing campaign footprints. Using Google Gemini models and Meta Graph APIs, it provides autonomous budget management, copy-writing, target analysis, and bid scheduling under a premium Apple-Stripe-Vercel inspired dark layout.

---

## Technical Stack & Architecture

### Frontend
- **Framework**: Vite + React + TypeScript
- **Styling**: Vanilla CSS Modules (Glassmorphism layout, responsive bento grids, and animated SVG charts)
- **Icons**: Lucide React

### Backend
- **Framework**: NestJS (Node.js) + TypeScript
- **Database**: PostgreSQL (via Prisma ORM)
- **Cache / Job Queue**: Redis (via BullMQ)
- **OAuth / Integrations**: JWT session authentication, Meta Marketing API SDK, Razorpay payments, Resend mailer, Google Gemini API

---

## Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker](https://www.docker.com/) (for PostgreSQL and Redis containers)

### 1. Database Setup
Spin up PostgreSQL and Redis services using the pre-configured Docker Compose file:
```bash
npm run db:up
```

### 2. Install Dependencies
Run package installations in both workspaces:
```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 3. Configure Environment Variables
Verify `/backend/.env` is set up correctly:
```env
DATABASE_URL="postgresql://campaignai_user:campaignai_pass@localhost:5432/campaignai_db?schema=public"
JWT_SECRET="campaignai_secret_key_123"
MOCK_INTEGRATION="true"
PORT="3001"
```
*(Keep `MOCK_INTEGRATION="true"` to run and verify features locally without external credentials).*

### 4. Run Prisma Migrations and Seed
Perform database schema migrations and seed the database with mock records (past campaigns, analytics tracking, SWOT metrics, and a default admin user):
```bash
cd backend
npx prisma db push
npx prisma db seed
cd ..
```
*(`npx prisma db push` maps models directly for rapid setup. Default admin user created: `admin@campaignai.com` / password: `password123`)*

### 5. Launch the Platform
Start both the NestJS server and Vite dev client simultaneously:
```bash
npm run dev
```
- Frontend will boot on [http://localhost:3000](http://localhost:3000)
- Backend APIs will listen on [http://localhost:3001/api](http://localhost:3001/api)

---

## Architectural Highlights

### Onboarding Chatbot Wizard
Prompts 20 detailed marketing questions, stores entries, and triggers AI-powered SWOT profile reports and competitor blueprints.

### AI Campaign Wizard Builder
Generates headlines, ad copies, CTAs, and image guidelines. Compiles target parameters and publishes them as synced ad assets.

### Dynamic Optimization Log
Logs automated optimizations (budget reallocations, bid triggers) based on trailing ROAS performance indicators.
