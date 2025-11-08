# Webplace — LiveIDEConnect

Full Stack MVP for remote IDE control and communication.

## 🎯 Overview

LiveIDEConnect enables developers to mirror and control their IDE remotely through a mobile-friendly Angular app or browser. The system is architected to support future VS Code / Cursor IDE extension integration.

## 🏗️ Architecture

Monorepo structure with frontend and backend in `fullstack/` directory.

### Backend (`fullstack/BE`)
- **Node.js 18** + **Fastify** + **TypeScript**
- **Neon Postgres** database with Drizzle ORM
- REST API endpoints for auth, sessions, messages, and admin
- WebSocket server for real-time communication
- JWT authentication with role-based access control
- AI Guard service for system monitoring and alerts
- Shared TypeScript types for IDE extension compatibility

### Frontend (`fullstack/FE`)
- **Angular 20** with Signals API
- Standalone components with lazy loading
- PWA support with service worker
- BEM SCSS design system with theme switching
- Responsive mobile-first design
- Real-time WebSocket chat integration
- Admin panel with dashboard, user management, session monitoring, AI alerts, and system logs

## 📁 Project Structure

```
.
├── fullstack/
│   ├── BE/                    # Backend
│   │   ├── src/
│   │   │   ├── index.ts       # Fastify server entry
│   │   │   ├── routes/        # API routes (auth, sessions, messages, ws, admin)
│   │   │   ├── db/            # Database (connection, schema, migrations, repositories, seed)
│   │   │   ├── middleware/    # Auth and admin middleware
│   │   │   ├── services/      # AI Guard service
│   │   │   └── types/         # Shared TypeScript types
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── drizzle.config.ts  # Drizzle ORM configuration
│   │   └── Dockerfile         # For Railway deployment
│   │
│   └── FE/                    # Frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── core/      # Services, guards, interceptors, types
│       │   │   ├── shared/    # Reusable UI components
│       │   │   └── features/  # Feature modules (auth, sessions, chat, admin)
│       │   ├── styles/        # SCSS design system
│       │   └── environments/  # Environment configs
│       ├── package.json
│       └── angular.json
│
├── package.json               # Root monorepo package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Neon Postgres database (or any PostgreSQL database)

### One-Command Setup & Run

```bash
# Install all dependencies
npm run install:all

# Start both backend and frontend
npm run dev
```

This will start:
- **Backend** on `http://localhost:4000`
- **Frontend** on `http://localhost:4200`

### Individual Services

```bash
# Backend only
npm run dev:be

# Frontend only
npm run dev:fe
```

## 🔧 Environment Variables

### Backend (`fullstack/BE/.env`)

Create a `.env` file in the `fullstack/BE` directory:

```env
PORT=4000
HOST=0.0.0.0
JWT_SECRET=your-secret-key-change-in-production
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
NODE_ENV=development
```

### Getting Your Neon Database URL

1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Go to Connection Details
4. Copy the connection string (it looks like: `postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require`)
5. Paste it into your `.env` file as `DATABASE_URL`

### Frontend (`fullstack/FE/src/environments/`)

- `API_BASE_URL` - Backend API URL (default: http://localhost:4000/api)
- `WS_URL` - WebSocket URL (default: ws://localhost:4000/ws)

## 🔑 Features

### MVP Features
- ✅ JWT authentication (login/signup)
- ✅ Sessions list with status indicators
- ✅ Real-time chat via WebSocket
- ✅ Responsive mobile layout
- ✅ Dark/light theme support with persistence (dark mode as default)
- ✅ PWA ready with offline caching
- ✅ Admin panel with comprehensive management tools
- ✅ Smart authentication flow with automatic role-based redirects
- ✅ Enhanced HTTP interceptors with token fallback mechanism
- ✅ Comprehensive error handling with automatic redirects

### Admin Panel Features
- ✅ Dashboard with real-time statistics (users, sessions, messages, active sessions, online users)
- ✅ User management (view, ban, delete users)
- ✅ Session monitoring (all sessions across all users)
- ✅ AI Guards & Alerts (real-time monitoring with critical, warning, and info alerts)
- ✅ System logs (chronological event history with pagination)
- ✅ Admin navigation to chat/sessions page for direct access to communication features
- ✅ Automatic redirect to admin dashboard after admin login
- ✅ Admin button in header (visible only to admin users)
- ✅ Role-based route guards (frontend and backend)

### IDE Extension Ready
- ✅ Shared TypeScript types
- ✅ WebSocket protocol defined
- ✅ API structure compatible with VS Code/Cursor extensions
- ✅ Authentication flow reusable in extensions
- ✅ JWT token authentication for all endpoints

## 🔌 API Endpoints

### Authentication (Public)
- `POST /api/auth/login` - Login with email/password (returns JWT token)
- `POST /api/auth/signup` - Sign up new user (returns JWT token)
- `GET /api/auth/verify` - Verify JWT token validity (requires authentication)

### Sessions (Protected - requires JWT token)
- `GET /api/sessions` - Get all IDE sessions for authenticated user
- `GET /api/sessions/:id` - Get session by ID (user must own session)
- `POST /api/sessions` - Create new IDE session

### Messages (Protected - requires JWT token)
- `GET /api/messages/:sessionId` - Get messages for a session (user must own session)

### WebSocket (Protected - requires JWT token)
- `WS /ws?sessionId=xxx&token=xxx` - WebSocket connection for real-time chat

### Admin (Protected - requires JWT token and admin role)
- `GET /api/admin/overview` - Dashboard statistics
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/ban` - Ban a user
- `DELETE /api/admin/users/:id` - Delete a user
- `GET /api/admin/sessions` - List all sessions
- `GET /api/admin/alerts` - Get AI Guard alerts
- `GET /api/admin/logs` - Get system logs (with pagination)
- `GET /api/admin/monitor` - Get AI Guard v2 system metrics and health status
- `GET /api/admin/monitor/history?hours=24` - Get metrics history for trend visualization

**All protected endpoints require:**
```
Authorization: Bearer <jwt_token>
```

## 🗄️ Database Schema

The following tables are created automatically via migrations:

- **users** - User accounts with hashed passwords and roles (user/admin)
- **sessions** - IDE sessions with status tracking (online/offline/busy)
- **messages** - Chat messages between IDE and client
- **monitor_metrics** - System metrics history for AI Guard v2 (CPU, memory, message volume)

### Database Commands

```bash
# Test database connection
npm run test:db

# Generate Drizzle migrations
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema directly (dev only)
npm run db:push

# Open Drizzle Studio (visual DB browser)
npm run db:studio

# Seed database with test data
npm run seed
```

## 🎨 Design System

The frontend uses a BEM-based SCSS design system with:

- **Tokens**: Colors, spacing, shadows, transitions
- **Mixins**: Typography, flexbox, grid, buttons, cards
- **Typography**: Inter (primary) and Quicksand (headings)
- **Themes**: Light and dark mode with CSS custom properties (dark mode as default)
- **Responsive**: Container queries for component-level responsiveness
- **Theme Persistence**: User preferences saved in localStorage
- **System Preference Detection**: Automatically detects OS theme preference if no saved preference exists

### Theme Variables

All components use CSS custom properties for theming:
- Backgrounds: `--color-bg-primary`, `--color-bg-secondary`, `--color-bg-tertiary`, `--color-bg-elevated`
- Text: `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`
- Borders: `--color-border-primary`, `--color-border-secondary`
- Surfaces: `--color-surface`, `--color-surface-hover`, `--color-surface-active`
- Messages: `--color-message-ide-bg`, `--color-message-client-bg`, etc.
- Inputs: `--color-input-bg`, `--color-input-border`, `--color-input-focus-border`

## 🤖 AI Guard Service

The AI Guard Service analyzes system activity and generates alerts:

### AI Guard v1 - Detection Rules

1. **Message Volume Spike**
   - Compares message count in last hour vs previous hour
   - Critical: >200% increase
   - Warning: >100% increase

2. **Excessive Sessions**
   - Detects users with >10 active sessions
   - Warning severity

3. **Inactive Connections**
   - Detects sessions marked "online" but inactive for >24 hours
   - Warning severity

4. **Idle Sessions**
   - Detects sessions inactive for >1 hour
   - Info severity

### AI Guard v2 - System Monitor

AI Guard v2 extends the monitoring capabilities with real-time system metrics and health status:

#### Metrics Collected

- **CPU Usage (%)** - Real-time CPU utilization
- **Memory Usage (%)** - System memory consumption
- **Database Latency (ms)** - Response time for database queries
- **Active WebSocket Connections** - Count of live WebSocket connections
- **Active Sessions** - Number of online sessions
- **Message Volume** - Messages in the last hour

#### Trend Analysis

- Compares current metrics vs previous hour/day
- Calculates percentage changes for CPU, memory, and message volume
- Displays trend indicators (↑/↓) with percentage deltas

#### System Status

- **OK** - All metrics within acceptable ranges
- **WARNING** - Elevated metrics or warning alerts detected
- **CRITICAL** - Critical thresholds exceeded or critical alerts present

#### Alert Generation

- **CPU Alerts**: Critical (>90%), Warning (>75%)
- **Memory Alerts**: Critical (>90%), Warning (>80%)
- **Database Latency Alerts**: Critical (>1000ms), Warning (>500ms)
- **Activity Spikes**: Merged with v1 message volume spike detection
- **Connection Anomalies**: Merged with v1 inactive connection detection

#### Optional AI Summary

If `OPENAI_API_KEY` environment variable is set, the service generates AI-powered summaries of system health using GPT-4o-mini, providing natural language insights into system status and alerts.

#### Performance Features

- **10-second caching** - Reduces database load and improves response times
- **Automatic cleanup** - Metrics history limited to last 24 hours
- **Lightweight storage** - Only essential metrics stored (CPU, memory, messages)

## 🧪 Test Data

The seed script creates test users:
- `test@example.com` / `password123` (user)
- `demo@example.com` / `demo123` (user)
- `admin@example.com` / `admin123` (admin)

## 📝 Development

### Monorepo Commands (from root)

```bash
# Install all dependencies
npm run install:all

# Run both services in development
npm run dev

# Build both services
npm run build

# Run tests
npm run test

# Lint both services
npm run lint

# Format code
npm run format
```

### Backend Commands (`fullstack/BE`)

```bash
cd fullstack/BE
npm run dev        # Development with watch
npm run build      # Production build
npm start          # Run production build
npm run test:db    # Test database connection
npm run seed       # Seed database with test data
npm run db:generate # Generate migrations
npm run db:migrate  # Apply migrations
npm run db:studio   # Open Drizzle Studio
```

### Frontend Commands (`fullstack/FE`)

```bash
cd fullstack/FE
npm run start      # Development server
npm run build      # Production build
npm run build:prod # Production build (optimized)
npm run test       # Run tests (CI mode)
npm run test:watch # Watch mode
npm run lint       # Lint check
npm run lint:fix   # Auto-fix linting
```

## 🔒 Security

- **JWT Authentication**: All protected endpoints use JWT tokens
- **Password Hashing**: bcrypt with salt rounds
- **Role-Based Access**: Admin routes protected by middleware (both frontend guards and backend middleware)
- **User Authorization**: Users can only access their own sessions
- **Secure WebSocket**: WebSocket connections require authentication
- **HTTPS Ready**: Backend supports SSL/TLS for production
- **Token Storage**: Frontend uses sessionStorage for tokens (cleared on tab close)
- **Error Handling**: Proper HTTP status codes and error messages with automatic redirects
- **Data Validation**: Input validation on all endpoints
- **HTTP Interceptors**: Automatic token injection with fallback to storage
- **Authentication Middleware**: Backend routes use authenticate middleware before role checks
- **401 Error Handling**: Automatic logout and redirect to login on authentication failures

## 🚢 Deployment

### Backend (Railway)

1. Connect your GitHub repository
2. Set environment variables:
   - `PORT` (default: 4000)
   - `JWT_SECRET` (use a strong secret)
   - `DATABASE_URL` (your Neon Postgres connection string)
   - `NODE_ENV=production`
3. Railway will automatically build and deploy using the Dockerfile

### Frontend (Vercel)

1. Connect your GitHub repository
2. Configure build settings:
   - Build command: `npm run build:prod`
   - Output directory: `dist/liveideconnect`
3. Set environment variables:
   - `API_BASE_URL` (your backend API URL)
   - `WS_URL` (your WebSocket URL)

## 🔮 IDE Extension Integration

The architecture supports VS Code / Cursor extension integration:

1. **Shared Types**: `LiveIdeMessage`, `LiveIdeRole`, `LiveIdeSession` are defined identically
2. **API Compatibility**: Backend routes can be called directly from extensions
3. **WebSocket Protocol**: Same protocol for IDE ↔ Backend ↔ Frontend
4. **Authentication**: JWT tokens work across all clients

### IDE Extension Example

```typescript
// Get stored token
async function getToken(): Promise<string | null> {
  const secrets = vscode.workspace.getConfiguration('liveideconnect');
  return await secrets.get('token') || null;
}

// Create session
async function createSession(token: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: `${vscode.workspace.name || 'Untitled'} - ${vscode.env.appName}`,
      status: 'online'
    })
  });
  const session = await response.json();
  return session.id;
}

// Connect WebSocket
const wsUrl = `ws://localhost:4000/ws?sessionId=${sessionId}&token=${token}`;
const ws = new WebSocket(wsUrl);
```

## 💾 Database Backups

Neon provides free nightly automated backups:
- **Free Plan**: 7 days of backup history
- **Pro Plan**: 30 days of backup history

### Creating Manual Restore Points

Before major migrations:
1. Go to [Neon Console](https://console.neon.tech)
2. Navigate to **Settings** → **Backup & Restore**
3. Click **"Create restore point"** or **"Create branch"**
4. Give it a descriptive name (e.g., `pre-migration-2025-11-08`)

## 📊 Implementation Status

### ✅ Completed Features

1. **Backend Connection**: Verified and tested with SSL for Neon Postgres
2. **Drizzle ORM**: Installed, configured, and ready for schema management
3. **WebSocket Persistence**: Messages are saved to database and fetched correctly
4. **Authentication**: JWT-based auth with role-based access control
5. **Admin Panel**: Complete admin interface with dashboard, user management, session monitoring, AI alerts, and logs
6. **Theme System**: Light/dark theme with persistence (dark mode as default)
7. **PWA Support**: Service worker with offline caching
8. **Responsive Design**: Mobile-first with container queries
9. **Error Handling**: Comprehensive error handling with snackbar notifications
10. **Loading States**: Loading indicators throughout the app
11. **Admin Authentication Flow**: Automatic redirect to admin dashboard after admin login
12. **Admin Header Button**: Admin users see an "Admin" button in the header for quick access
13. **Admin Navigation**: Admin sidebar includes link to chat/sessions page
14. **HTTP Interceptors**: Enhanced auth interceptor with token fallback mechanism
15. **Backend Middleware**: Proper authentication middleware chain for admin routes
16. **Role-Based Redirects**: Smart routing based on user role (admin → /admin, user → /sessions)
17. **AI Guard v2**: Real-time system monitoring with metrics collection, trend analysis, and health status
18. **System Monitor Dashboard**: Admin panel with live metrics, alerts, and trend visualization

## 🎯 What We've Built

- Full-stack monorepo with Angular 20 frontend and Fastify backend
- Neon Postgres database integration with Drizzle ORM
- JWT authentication system with role-based access control
- Real-time WebSocket communication with message persistence
- Admin panel with comprehensive management tools
- AI Guard service for system monitoring and alerts
- Theme switching (light/dark) with CSS custom properties (dark mode default)
- PWA support with offline caching
- Responsive mobile-first design with container queries
- Complete error handling and loading states
- Database migrations and seeding system
- IDE extension-ready architecture with shared types
- Smart authentication flow with automatic role-based redirects
- Admin header button for quick admin access
- Admin navigation to chat/sessions for direct communication access
- Enhanced HTTP interceptors with token fallback
- Comprehensive backend middleware chain for secure admin routes
- AI Guard v2 with real-time system metrics and health monitoring
- System Monitor dashboard with trend visualization and alerts

## 🎨 User Experience Features

### Authentication & Navigation
- **Smart Login Redirects**: 
  - Admin users automatically redirected to `/admin` dashboard after login
  - Regular users redirected to `/sessions` page after login
- **Admin Header Button**: 
  - Admin users see a prominent "Admin" button with star icon in the header
  - Button only visible to users with admin role
  - Quick access to admin dashboard from any page
- **Admin Sidebar Navigation**:
  - Dedicated admin navigation sidebar with icons
  - Separated external navigation section for chat/sessions access
  - Visual distinction between admin routes and external routes

### Theme System
- **Dark Mode Default**: Application defaults to dark mode for better user experience
- **Theme Persistence**: User theme preference saved in localStorage
- **System Preference Detection**: Automatically detects OS theme preference if no saved preference
- **Smooth Transitions**: Theme switching with smooth color transitions
- **Theme Toggle**: Easy access to theme toggle in header

### Error Handling
- **Automatic Redirects**: 401 errors automatically redirect to login page
- **Error Interceptor**: Centralized error handling with user-friendly messages
- **Snackbar Notifications**: Non-intrusive error and success notifications
- **Loading States**: Comprehensive loading indicators throughout the application

## 🔐 Authentication & Authorization Details

### Frontend Authentication Flow
1. **Login Process**:
   - User enters credentials
   - JWT token received and stored in sessionStorage
   - User data stored in localStorage
   - Token signal updated in AuthService
   - Automatic redirect based on user role:
     - Admin → `/admin` dashboard
     - User → `/sessions` page

2. **HTTP Interceptor**:
   - Automatically adds `Authorization: Bearer <token>` header to all requests
   - Falls back to reading token from storage if signal is empty
   - Ensures token is always available for authenticated requests

3. **Route Guards**:
   - `authGuard`: Protects routes requiring authentication
   - `adminGuard`: Protects admin routes, checks both authentication and admin role
   - Automatic redirects to login if not authenticated
   - Admin users redirected to sessions if accessing non-admin protected routes

### Backend Authentication Flow
1. **Authentication Middleware** (`authenticate`):
   - Extracts JWT token from `Authorization: Bearer <token>` header
   - Verifies token signature and expiration
   - Decodes user information (userId, email, role)
   - Attaches user data to request object
   - Returns 401 if token is missing or invalid

2. **Admin Guard Middleware** (`adminGuard`):
   - Must run after `authenticate` middleware
   - Checks if user has admin role
   - Returns 401 if not authenticated
   - Returns 403 if authenticated but not admin

3. **Route Protection**:
   - All admin routes use `preHandler: [authenticate, adminGuard]`
   - Ensures proper authentication chain
   - Prevents unauthorized access to admin endpoints

## 🎛️ Admin Panel Features

### Dashboard
- Real-time statistics overview
- Auto-refreshing data every 30 seconds
- Key metrics: total users, sessions, messages, active sessions, online users
- Visual cards with icons and numbers

### User Management
- View all registered users
- Ban users (soft delete)
- Delete users (hard delete)
- Prevent self-ban/delete
- User details: email, name, role, creation date

### Session Monitoring
- View all sessions across all users
- Session details: name, status, last active, user information
- Real-time status tracking

### AI Guards & Alerts
- Real-time system monitoring
- Alert types: Critical, Warning, Info
- Detection rules:
  - Message volume spikes
  - Excessive sessions per user
  - Inactive connections
  - Idle sessions

### System Monitor (AI Guard v2)
- Real-time system metrics dashboard
- Live monitoring of CPU, memory, database latency
- WebSocket and session connection tracking
- Trend visualization with percentage changes
- System health status (OK/WARNING/CRITICAL)
- Auto-refreshing metrics every 30 seconds
- Pause/Resume controls for manual refresh
- Comprehensive alerts table with severity badges
- Optional AI-generated health summaries (requires OPENAI_API_KEY)

### System Logs
- Chronological event history
- Message and session activity logs
- Pagination support (default 50 per page)
- Detailed event information

### Navigation
- Sidebar navigation with icons
- Active route highlighting
- External navigation section for chat/sessions access
- Responsive design (sidebar hidden on mobile)

## 📄 License

MIT
