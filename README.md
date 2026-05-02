# ⚡ TaskFlow

> A full-stack, role-based team task management application built with Node.js, Express, Supabase PostgreSQL, and Vanilla JavaScript.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Projects](#projects)
  - [Team Members](#team-members)
  - [Tasks](#tasks)
- [Data Validation Rules](#data-validation-rules)
- [Deployment](#deployment)
- [Demo Walkthrough](#demo-walkthrough)
- [Project Structure](#project-structure)
- [License](#license)

---

## Overview

**TaskFlow** is a collaborative task management platform that enables teams to create projects, manage members, and track work through a visual Kanban board. It enforces strict role-based access control — admins manage the workspace while members focus on their assigned work.

---

## Features

- **Secure Authentication** — JWT-based signup and login with bcrypt password hashing
- **Role-Based Access Control** — Separate admin and member permissions enforced at the API level
- **Project Management** — Admins create, view, and delete projects
- **Team Management** — Admins add members to projects; members view their team
- **Kanban Board** — Visual task board with `Todo → In Progress → Done` workflow
- **Task Assignment** — Assign tasks to specific project members
- **Overdue Detection** — Automatically flags tasks past their due date
- **Dashboard Stats** — At-a-glance metrics: total, completed, and overdue tasks
- **Activity Logs** — Tracks actions performed within projects
- **Task Comments** — Members can leave comments on tasks

---

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Backend    | Node.js + Express 5                     |
| Database   | Supabase PostgreSQL (raw SQL via `pg`)  |
| Auth       | JSON Web Tokens + bcryptjs              |
| Frontend   | HTML5 + Vanilla JavaScript + Custom CSS |
| Deployment | Railway                                 |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A [Supabase](https://supabase.com) account (free tier works)
- npm

### Installation

```bash
git clone https://github.com/PrajulAhmad/TaskFlow.git
cd TaskFlow
npm install
```

### Database Setup
1. Create a new project at [supabase.com](https://supabase.com).
2. Navigate to **SQL Editor** and run the contents of `schema.sql`.
3. Copy your **connection string** from Project Settings → Database → Connection String (URI).

### Environment Variables

```bash
cp .env.example .env
```
Open `.env` and fill in the values:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
JWT_SECRET=your_super_secret_jwt_key
PORT=3000
```

### Running the App

```bash
npm start
```
Visit `http://localhost:3000` in your browser.

---

## API Reference
All protected routes require the `Authorization: Bearer <token>` header.

### Authentication
| Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/signup` | Register a new user (name, email, password, role) |
| `POST` | `/auth/login` | Login and receive a JWT |

### Projects
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/projects` | Admin only | Create a new project |
| `GET` | `/projects` | Member+ | List user's projects |
| `DELETE` | `/projects/:id` | Admin only | Delete a project |

### Team Members
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/projects/:id/members` | Admin only | Add a member to a project |
| `GET` | `/projects/:id/members` | Member+ | List members of a project |

### Tasks
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/tasks` | Member+ | Create a task within a project |
| `GET` | `/tasks` | Member+ | List tasks filtered to user's projects |
| `PATCH` | `/tasks/:id` | Owner only | Update a task (status, title, etc.) |
| `DELETE` | `/tasks/:id` | Owner only | Delete a task |

---

## Data Validation Rules
- **Name** — minimum 2 characters
- **Password** — minimum 6 characters
- **Email** — must match standard email format
- **Project name** — minimum 3 characters
- **Task title** — minimum 3 characters
- **Status** — must be one of: `todo`, `in-progress`, `done`
- **Membership** — no duplicate project memberships allowed
- **Task assignment** — assigned user must already be a member of the project

---

## Deployment
TaskFlow is configured for one-click deployment to **Railway**.

1. Push your repository to **GitHub**.
2. Connect the repo in [railway.app](https://railway.app).
3. Add environment variables: `DATABASE_URL`, `JWT_SECRET`, `PORT`.
4. Railway auto-detects `npm start` — deploy and you're live.

---

## Demo Walkthrough
1. Sign up as an **Admin** and create a project.
2. Sign up as a **Member** and note your user ID.
3. Admin adds the member to the project via the **Team** tab.
4. Create tasks and assign them to team members.
5. Drag tasks across the **Kanban** board to update their status.
6. View the **Dashboard** for overview stats and overdue task alerts.

---

## Project Structure
```text
TaskFlow/
├── public/              # Static frontend (HTML, CSS, JS)
├── src/
│   ├── db.js            # PostgreSQL connection pool
│   ├── middleware/      # Auth & role middleware
│   └── routes/          # Express route handlers
│       ├── auth.js
│       ├── projects.js
│       ├── tasks.js
│       └── users.js
├── schema.sql           # Full database schema
├── index.js             # App entry point
├── .env.example         # Environment variable template
└── package.json
```

---

## License
This project is licensed under the **MIT License**.

Developed as a Full-Stack Technical Assignment.
**Author:** [Prajul Ahmad](https://github.com/PrajulAhmad)
