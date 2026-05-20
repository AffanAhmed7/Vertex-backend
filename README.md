# Vertex E-Commerce Backend ⚡

**Frontend Repository:** [Vertex-frontend](https://github.com/AffanAhmed7/Vertex-frontend)

This repository contains the backend infrastructure for the Vertex E-Commerce Platform. It is a production-grade, highly scalable API built with Node.js, Express, and TypeScript, utilizing a PostgreSQL database managed by Prisma ORM.

## ✨ Key Features
- **Robust Authentication & MFA:** JWT-based authentication, Role-Based Access Control (RBAC), and Two-Factor Authentication (2FA).
- **Asynchronous Task Queues:** Redis-backed BullMQ queues to offload heavy operations like sending transactional emails and processing images.
- **Real-Time Communication:** Socket.io integration for instant push notifications (e.g., order status updates).
- **Comprehensive Admin Tools:** Full audit logging, daily sales snapshots, and dynamic store settings.
- **Enterprise-Grade Security:** Helmet, strict CORS policies, Express/Redis rate-limiting, and Zod runtime schema validation.
- **Image Optimization:** On-the-fly image processing using Multer and Sharp.
- **Structured Logging:** High-performance JSON logging via Pino and Pino-HTTP.

## 🛠️ Technical Stack
- **Core:** Node.js, Express.js, TypeScript
- **Database & ORM:** PostgreSQL, Prisma ORM (@prisma/adapter-pg)
- **Queues & Caching:** Redis (ioredis), BullMQ
- **Security:** bcrypt, jsonwebtoken, Helmet, Express Rate Limit
- **Validation:** Zod
- **Real-time:** Socket.io
- **Media Processing:** Multer, Sharp
- **Email:** Nodemailer, Handlebars, MJML
- **Logging:** Pino, Pino-HTTP

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v20+)
- PostgreSQL Database
- Redis Server (local or managed)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/AffanAhmed7/Vertex-backend.git
   ```
2. Navigate to the directory:
   ```bash
   cd Vertex-backend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Configuration
Create a `.env` file in the root directory and populate the necessary environment variables:
```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/ecommerce?schema=ecommerce"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your_jwt_secret"
# Add other necessary variables for Firebase, Email, etc.
```

### Database Setup
Run Prisma migrations to set up the database schema:
```bash
npx prisma generate
npx prisma db push
```

### Start the Server
Start the development server with Hot Module Reloading (HMR):
```bash
npm run dev
```

## 📜 Scripts
- `npm run dev` - Run the API in development mode
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript compiler checks

---
*Built as part of the Vertex Full-Stack E-Commerce Platform.*
