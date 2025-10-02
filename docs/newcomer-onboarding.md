# Newcomer Onboarding Guide

Welcome to WorkPro CMMS! This guide gives you the high-level context you need to navigate the codebase and points you toward the most important modules to explore first.

## Project layout at a glance
- [`backend/`](../backend) – Node.js/Express API server. Start with [`backend/src/index.ts`](../backend/src/index.ts) to see how routes, middleware, and services are registered, then inspect [`backend/src/routes`](../backend/src/routes) for domain-specific endpoints.
- [`src/`](../src) – Vite-powered React application. [`src/App.tsx`](../src/App.tsx) provides the top-level route layout, while [`src/main.tsx`](../src/main.tsx) bootstraps global providers such as theming and TanStack Query.
- [`shared/types`](../shared/types) – Cross-cutting TypeScript contracts (e.g., work orders, assets) shared between the API and UI to keep both layers in sync.

## Core technologies and how they fit together
### Backend
- **Express + TypeScript** power the request pipeline defined in [`backend/src/server.ts`](../backend/src/server.ts) and wired up in [`backend/src/index.ts`](../backend/src/index.ts).
- **Prisma (MongoDB connector)** models the persistence layer in [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma) and is initialized via [`backend/src/db.ts`](../backend/src/db.ts) and helper utilities under [`backend/src/lib`](../backend/src/lib).
- **Authentication & Authorization** logic lives in middleware like [`backend/src/middleware/auth.ts`](../backend/src/middleware/auth.ts) and tenant scoping in [`backend/src/middleware/tenant.ts`](../backend/src/middleware/tenant.ts).
- **Validation & DTOs** rely on Zod schemas in [`backend/src/validators`](../backend/src/validators) to guarantee that incoming payloads align with the shared types.

### Frontend
- **React + Vite** compose the UI via feature-driven pages in [`src/pages`](../src/pages) and shared building blocks in [`src/components`](../src/components).
- **TanStack Query** centralizes server state with the configured client in [`src/lib/queryClient.ts`](../src/lib/queryClient.ts) and API helpers in [`src/lib/api.ts`](../src/lib/api.ts).
- **Tailwind CSS & shadcn/ui** provide styling primitives configured through [`tailwind.config.ts`](../tailwind.config.ts) and components under [`src/components`](../src/components).

### Shared Contracts
- **Domain types** such as [`shared/types/workOrder.ts`](../shared/types/workOrder.ts) or [`shared/types/asset.ts`](../shared/types/asset.ts) are consumed by both the backend services and frontend queries to avoid drift.

## Middleware, services, and utilities worth knowing
- **Global middleware**: request logging ([`backend/src/middleware/requestLogger.ts`](../backend/src/middleware/requestLogger.ts)), audit trails ([`backend/src/middleware/audit.ts`](../backend/src/middleware/audit.ts)), and centralized error handling ([`backend/src/middleware/errorHandler.ts`](../backend/src/middleware/errorHandler.ts)).
- **Service layer**: business logic is organized under [`backend/src/controllers`](../backend/src/controllers) and [`backend/src/models`](../backend/src/models) to separate HTTP handling from persistence concerns.
- **Background work**: job definitions and workers reside in [`backend/src/scripts`](../backend/src/scripts) for tasks like notifications and maintenance scheduling.
- **Frontend data access**: React Query hooks and caching strategies are defined next to each domain under [`src/hooks`](../src/hooks) and leverage the shared API client.

## Suggested next steps for deeper exploration
1. **Run the app locally** using `pnpm dev:all` to understand how the backend and frontend interact in real time.
2. **Trace a request end-to-end**: pick a route (e.g., work orders) and follow it from the frontend call in [`src/pages`](../src/pages) through the TanStack Query hook, API client, Express route, and Prisma model.
3. **Review the shared schemas** in [`shared/types`](../shared/types) and the matching Zod validators to see how data integrity is enforced across layers.
4. **Inspect tests** under [`backend/src/index.test.ts`](../backend/src/index.test.ts) and [`src/lib/api.test.ts`](../src/lib/api.test.ts) to learn the established testing patterns.
5. **Experiment with feature toggles** by editing environment configuration in [`backend/src/config`](../backend/src/config) and checking how values flow into runtime behavior.

Feel free to iterate on this document as you uncover more tips that would help the next newcomer ramp up even faster!
