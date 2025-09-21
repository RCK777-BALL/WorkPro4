# WorkPro CMMS - Production-Grade Multi-Tenant Maintenance Management System

A comprehensive, production-ready CMMS (Computerized Maintenance Management System) built with modern technologies and designed for multi-tenancy, scalability, and extensibility.

## 🚀 Features

### Core Modules
- **Multi-tenant Authentication & RBAC** - Complete user management with role-based permissions
- **Work Order Management** - Full lifecycle management with checklists, parts tracking, and signatures
- **Preventive Maintenance** - Calendar and meter-based scheduling with automated generation
- **Asset & Location Hierarchy** - Site → Area → Line → Station → Asset tree structure
- **Inventory Management** - Parts catalog with barcode support and automatic reordering
- **Purchase Order System** - Complete procurement workflow with vendor management
- **Real-time Dashboard** - KPIs, sparkline charts, and activity monitoring
- **Extensible Modules** - Well-structured service layer for introducing new domain features

### Advanced Features
- **QR Code Integration** - Asset tagging and quick work order access
- **Audit Trail** - Complete activity logging for compliance
- **File Management** - Document attachments with version control
- **Real-time Updates** - Socket.IO for live notifications
- **Command Palette** - Global search and quick actions (Cmd+K)
- **Mobile Responsive** - Optimized for all device sizes

## 🏗️ Architecture

### Tech Stack
- **Backend**: Node.js, Express, TypeScript, Prisma, MongoDB, Redis (in `/backend`)
- **Frontend**: React, TypeScript, TanStack Query, Tailwind CSS, shadcn/ui (root `src/`)
- **Real-time**: Socket.IO for live updates
- **Queue System**: BullMQ for background jobs
- **File Storage**: Local development + S3 adapter ready
- **Authentication**: JWT with refresh tokens

### Project Structure
```
workpro-cmms/
├── backend/          # Express API server
├── src/              # React web application source
├── frontend/         # Legacy workspace (use root `src/` instead)
└── docker-compose.yml # Development services
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm 8+
- Docker & Docker Compose

### Development Setup

1. **Clone and install dependencies:**
```bash
git clone <repository>
cd workpro-cmms
pnpm install
```

2. **Start the database and services:**
```bash
docker compose up -d
```

3. **Set up the database:**
```bash
# Copy environment file
cp backend/.env.example backend/.env

# Push the Prisma schema to MongoDB
pnpm --filter backend db:push


# Seed with demo data
pnpm --filter backend db:seed
```

The backend reads its MongoDB connection string from the `DATABASE_URL` value in `backend/.env`. Copying the example file seeds it with a local development URL (`mongodb://localhost:27017/workpro_dev`); update this value if you need to target a different MongoDB deployment or credentials.

4. **Start development servers:**
```bash
pnpm dev:all
```

This starts both the backend server (localhost:5010) and frontend app (localhost:5173). To run only the frontend, use `pnpm dev`.

The API exposes a lightweight readiness probe at `http://localhost:5010/api/health` and a database-specific check at `http://localhost:5010/health/db`.

> ℹ️ Configure the frontend API base URL by setting `VITE_API_URL=http://localhost:5010/api` in the root `.env` file. After changing environment variables, restart your `pnpm dev`/`pnpm dev:all` process so Vite picks up the updates.

### Production Build
```bash
pnpm build
pnpm --filter backend build
```

## 📊 Database Schema

The system uses MongoDB with Prisma's MongoDB connector. The schema lives in `backend/prisma/schema.prisma` and maps directly to the document structures stored in your database. Key collections include:

- **Tenants** - Multi-tenant isolation with per-tenant relationships across the data model
- **Users** - Authentication, role management, and audit authorship tracking
- **Assets** - Equipment hierarchy and maintenance history
- **WorkOrders** - Maintenance requests and execution tracking with creator references
- **PMTasks** - Preventive maintenance scheduling rules and generated tasks
- **Parts** - Inventory levels with vendor relationships
- **PurchaseOrders** - Procurement workflow and approvals
- **AuditLogs** - Complete activity trail for compliance

## 🔐 Security & Compliance

- **Multi-tenant data isolation** - Complete tenant separation
- **Role-based access control** - Granular permissions system
- **Audit logging** - Full activity trail for compliance
- **JWT authentication** - Secure token-based auth with refresh
- **Input validation** - Zod schema validation on all endpoints
- **XSS protection** - Helmet.js security headers

## 📱 Mobile & Accessibility

- **Responsive design** - Works on all screen sizes
- **Touch-friendly** - Optimized for mobile interaction
- **Keyboard navigation** - Full keyboard accessibility
- **Screen reader support** - ARIA labels and semantic HTML

## 🧪 Testing

The project includes comprehensive testing setup:

```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm e2e

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## 🚢 Deployment

### Docker Deployment
```bash
# Build images (ensure Dockerfiles exist in these directories)
docker build -t workpro-backend ./backend
docker build -t workpro-frontend .

# Run with docker compose
docker compose -f docker-compose.yml up -d
```

### Environment Variables
Key environment variables for production:

```bash
# Database
DATABASE_URL="mongodb://user:pass@localhost:27017/workpro"

# Auth
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"

# Redis
REDIS_URL="redis://localhost:6379"

# File Storage
S3_BUCKET="workpro-files"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
```

## 📈 Performance

- **Database indexing** - Optimized queries for large datasets
- **Caching strategy** - Redis for session and API caching
- **Background jobs** - BullMQ for heavy operations
- **API rate limiting** - Protection against abuse
- **CDN ready** - Static asset optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation in `/docs`
- Open an issue on GitHub
- Join our Discord community

---

Built with ❤️ for maintenance professionals worldwide.
