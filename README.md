# Campus Cafeteria Preorder and Pickup System

A full-stack campus cafeteria preorder and pickup management system built for an academic DBMS project. The system supports students placing food orders for scheduled pickup, staff processing pickup queues, and administrators managing menus, stock, pickup windows, users, staff accounts, and reports.

## Features

### Student
- Register and log in
- Browse published menus by date
- Search and filter menu items
- View price, description, ingredients, availability, and stock
- Add items to a cart with stock-aware quantity limits
- Select a pickup window
- Place orders and receive a pickup code
- Track active order status
- Cancel eligible orders
- View order history

### Staff
- Log in using an individual staff account
- View pickup queues by pickup window
- Process orders through PLACED → PREPARING → READY → COLLECTED
- View order and pickup information

### Admin
- Manage menu dates and menu items
- Manage ingredients and item-ingredient assignments
- Manage stock
- Manage pickup windows and capacity
- View order and stock reports
- View and search users
- Filter users by role and active status
- Create multiple individual staff accounts
- Activate/deactivate accounts
- Change STUDENT/STAFF roles
- Reset passwords
- Prevent modification of the currently logged-in administrator account

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- CSS

### Backend
- Node.js
- Express
- TypeScript
- node-postgres (`pg`)
- JWT authentication
- bcrypt password hashing

### Database
- PostgreSQL 17+
- SQL
- PL/SQL

### Development Tools
- Git
- GitHub
- VS Code
- PowerShell

## Architecture

```text
React Frontend
      |
      | HTTP/REST
      v
Node.js + Express API
      |
      | node-postgres (`pg`)
      v
PostgreSQL
      |
      +-- SQL Schema
      +-- PL/SQL Procedures
      +-- Trigger
      +-- Cursor
      +-- Reports/Views
```

## Project Structure

```text
CampusCafeteria/
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── scripts/
│   │   ├── db.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
│
├── database/
│   ├── schema/
│   ├── plsql/
│   ├── queries/
│   └── seed/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   ├── common/
│   │   │   ├── staff/
│   │   │   └── student/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── types/
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

## Database Design

Core entities include:

- `users`
- `roles`
- `menu_dates`
- `menu_items`
- `ingredients`
- `item_ingredients`
- `stock`
- `pickup_windows`
- `orders`
- Order line/item data
- Order status history

The database uses primary keys, foreign keys, unique constraints, check constraints, and indexes for data integrity.

## PL/SQL and Database Logic

The project demonstrates database-side business logic, including:

- Order placement procedure
- Order cancellation procedure
- Order status update procedure
- Pickup queue cursor
- Order status history trigger
- Stock validation
- Pickup-window capacity handling
- Transaction and locking logic to prevent overselling
- Reporting queries/views
- Database access controls

## Authentication and Authorization

Supported roles:

```text
STUDENT
STAFF
ADMIN
```

Authentication uses JWT tokens. Passwords are stored as bcrypt hashes and are never returned through user-management API responses.

Administrative operations are protected by backend role checks. Inactive users cannot authenticate or continue using protected application endpoints.

## Local Development

### Prerequisites

Install:

- Node.js
- npm
- PostgreSQL 17+
- Git

### Database

The application uses PostgreSQL. Set `DATABASE_URL` to your local PostgreSQL connection string and the backend will initialize the schema and demo data automatically on first startup.

### Backend

```powershell
cd backend
npm install
```

Create a local `.env` file containing the required database and JWT settings.

Example:

```env
DB_USER=
DB_PASSWORD=
DB_CONNECT_STRING=
JWT_SECRET=
```

Start the backend using the configured npm script.

### Frontend

```powershell
cd frontend
npm install
```

Start the Vite development server using the configured npm script.

## Security Notes

Do not commit:

```text
.env
database passwords
JWT secrets
private keys
database credentials
other credentials
```

Use `.env.example` to document required environment variables without exposing their values.

## Demonstration Workflow

1. Administrator logs in.
2. Administrator configures menu, stock, and pickup windows.
3. Administrator creates a staff account.
4. Staff member logs in independently.
5. Student registers/logs in.
6. Student browses the menu.
7. Student adds items to the cart.
8. Student selects a pickup window.
9. Student places an order.
10. Staff sees the order in the pickup queue.
11. Staff moves the order through its status lifecycle.
12. Student sees the updated order status.
13. Order is collected.
14. Administrator reviews reports.

## Validation Scenarios

The system can demonstrate:

- Successful order placement
- Quantity exceeding available stock
- Unavailable menu item
- Pickup-window capacity
- Order cancellation
- Staff status transitions
- Order status history
- User activation/deactivation
- Student/Staff role changes
- Protection against an administrator modifying their own account

## Project Status

**Final academic project scope**

The core student, staff, and administrator workflows are implemented. Further work should focus on testing, documentation, deployment, and maintenance rather than expanding the feature scope.

## Open Source

This project is intended to be published as an open-source academic project. Add an appropriate open-source license to the repository before public distribution.

## Author

**Freejo**

GitHub: https://github.com/freejo2003/CampusCafeteria


## Render Deployment (PostgreSQL)

This version is configured for Render using PostgreSQL instead of Oracle.

### Architecture

```text
React/Vite Static Site
        |
        | HTTPS REST API
        v
Node/Express Web Service
        |
        | DATABASE_URL
        v
Render PostgreSQL
```

### Deploy with Render Blueprint

1. Push this repository to GitHub.
2. In Render, create a new Blueprint and select the repository.
3. Render will read `render.yaml` and create:
   - `campus-cafeteria-api`
   - `campus-cafeteria-frontend`
   - `campus-cafeteria-db`
4. When prompted for `JWT_SECRET`, use a long random value.
5. When prompted for `FRONTEND_URL`, enter the deployed frontend URL, for example:
   `https://campus-cafeteria-frontend.onrender.com`
6. The backend automatically creates the PostgreSQL schema and loads the synthetic demo data on the first startup.
7. The frontend receives the backend hostname through `VITE_API_HOST`.

The backend does not require Oracle, SQL Developer, an Oracle wallet, or a local database server.

### Demo Accounts

The synthetic seed contains:

```text
Student:
student1@cafeteria.demo
Password: student123

Staff:
staff1@cafeteria.demo
Password: staff123

Admin:
admin@cafeteria.demo
Password: admin123
```

There are 45 student accounts, 4 staff accounts, 1 administrator, 14 menu dates, 70 menu items, 42 pickup windows, and 180 synthetic orders.

### Local PostgreSQL

Create a PostgreSQL database and set:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/campus_cafeteria
JWT_SECRET=change-me
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

Then:

```powershell
cd backend
npm install
npm run build
npm start
```

The backend initializes the schema and demo data automatically if the database has not been initialized.
