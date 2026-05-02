# ⚡ TaskFlow — Full-Stack Team Task Manager

A role-based team task management app built with **Node.js + Express**, **Supabase PostgreSQL**, and **Vanilla JS**.

## ✨ Features
- JWT-based signup/login (bcrypt hashed passwords)
- Admin can create projects & manage team members
- Kanban board: Todo → In Progress → Done
- Overdue task detection
- Dashboard stats: total, completed, overdue tasks
- Role-based API enforcement (admin vs member)

## 🛠 Tech Stack
| Layer | Tech |
|-------|------|
| Backend | Node.js + Express |
| Database | Supabase PostgreSQL (raw SQL via `pg`) |
| Auth | JWT + bcryptjs |
| Frontend | HTML + Vanilla JS + Custom CSS |
| Deploy | Railway |

## 🚀 Setup

### 1. Clone & install
```bash
git clone <your-repo-url>
cd taskflow
npm install
```

### 2. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** and run `schema.sql`
3. Copy your **connection string** from Project Settings → Database

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env and fill in your DATABASE_URL and JWT_SECRET
```

### 4. Run locally
```bash
npm start
# Visit http://localhost:3000
```

## 🌐 API Endpoints

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/signup` | Register (name, email, password, role) |
| POST | `/auth/login` | Login → returns JWT |

### Projects
| Method | Route | Access |
|--------|-------|--------|
| POST | `/projects` | Admin only |
| GET | `/projects` | Members only see their projects |
| DELETE | `/projects/:id` | Admin only |

### Team
| Method | Route | Access |
|--------|-------|--------|
| POST | `/projects/:id/members` | Admin only |
| GET | `/projects/:id/members` | Any member |

### Tasks
| Method | Route | Notes |
|--------|-------|-------|
| POST | `/tasks` | Any member of the project |
| GET | `/tasks` | Filtered to user's projects |
| PATCH | `/tasks/:id` | Members only update their own |
| DELETE | `/tasks/:id` | Members only delete their own |

## 🔒 Validation Rules
- Name ≥ 2 chars, Password ≥ 6 chars, Email must be valid format
- Project name ≥ 3 chars, Task title ≥ 3 chars
- No duplicate project membership
- Assigned user must be a project member
- Status must be: `todo` | `in-progress` | `done`

## 🚂 Deploy to Railway
1. Push to GitHub
2. Connect repo in [railway.app](https://railway.app)
3. Add env vars: `DATABASE_URL`, `JWT_SECRET`
4. Railway auto-detects `npm start`

## 🎥 Demo Flow
1. Sign up as **Admin** → create a project
2. Sign up as **Member** → share your user ID
3. Admin adds member to project via Team tab
4. Create and assign tasks
5. Update task status on the Kanban board
6. View overview stats and overdue tasks
