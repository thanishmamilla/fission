# Restaurant Reservation Management System

A full-stack, responsive web application for managing restaurant table reservations. The system supports customer booking flows, interactive table layout grids, and administrative control panels to monitor, reschedule, and manage tables and guest reservations.

---

## Technical Stack
- **Frontend**: React (built with Vite, styled via custom CSS with dynamic design themes, and utilizing Lucide React icons)
- **Backend**: Node.js with Express
- **Database**: MongoDB (utilizing Mongoose schemas) with a **fail-safe fallback** that defaults to a local JSON file-based database if MongoDB is unreachable.
- **Authentication**: JWT (JSON Web Tokens)
- **State Management**: React Context API (`AuthContext`)

---

## Getting Started

### Prerequisites
- Node.js (version 16 or above recommended)
- MongoDB installed locally or a remote MongoDB Atlas URI (optional; the app falls back to a mock file database if MongoDB is unreachable)

### Installation
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd restaurant-reservation-management-system
   ```

2. **Install all dependencies**:
   A root script is provided to install node modules across the root, frontend, and backend components automatically:
   ```bash
   npm run install-all
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `backend/` directory (a template is provided at `backend/.env` with safe default configurations):
   ```env
   PORT=5000
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-secret-jwt-key
   NODE_ENV=development
   ```

### Running the Application (Development)
You can start both the client and the backend server concurrently from the root directory:
```bash
npm run dev
```
- **Frontend server** runs at: `http://localhost:5173`
- **Backend API server** runs at: `http://localhost:5000`

---

## Running Validation Unit Tests

The backend includes a unit test suite to assert the correctness of availability and capacity check logic. You can execute it via:
```bash
npm test --prefix backend
```

All test assertions cover capacity fits, double-booking preventions, status cancellations, and mock state configurations.

---

## Assumptions Made
1. **Time Slots**: Dining periods are fixed, pre-defined 90-minute blocks to ensure consistent seating rotations:
   - `12:00 - 13:30`
   - `13:30 - 15:00`
   - `18:00 - 19:30`
   - `19:30 - 21:00`
   - `21:00 - 22:30`
2. **Single Restaurant**: The system manages reservations for a single restaurant site with a set layout of tables.
3. **Mock Fallback**: In the absence of an active MongoDB connection, a file-based mock database at `backend/data/db.json` is initialized to ensure the application remains fully functional out-of-the-box.
4. **Table Seeding**: Default seating configurations (8 tables ranging from 2 to 8 seats) and demo credentials are automatically seeded on startup if the database is empty.

---

## Core Reservation & Availability Logic

Availability is validated both at the database level and visual frontend level to ensure data integrity:

### 1. Seating Capacity Validation (`validateCapacity`)
- Rejects reservation requests if the guest count is zero, negative, or exceeds the specific seating capacity of the requested table.
- In the frontend, tables that cannot accommodate the selected number of guests are labeled "Too Small" and outlined in red, preventing invalid bookings.

### 2. Double-Booking Overlap Check (`checkOverlap`)
- Confirms table availability for a specific date and time slot.
- A table is considered occupied if there exists another reservation for that table, date, and time slot with a status of `confirmed`.
- If an admin or customer updates a reservation, the overlap check ignores the updated reservation's own ID to allow successful rescheduling without self-collision.

---

## Role-Based Access Control (RBAC)

The app defines two roles with strict permission boundaries:

### Customer (User)
- **Permissions**: Create a reservation, view their own bookings list, and cancel their confirmed bookings.
- **Access control**: Authenticated users can only read or edit bookings linked to their specific User ID.

### Administrator (Admin)
- **Permissions**: View all guest reservations, filter bookings by specific dates, cancel/confirm any guest reservation, edit details (date, slot, guests, and table) of any reservation, and create/add new tables to the restaurant seating layout.
- **Access control**: Enforced using Express middleware checking `req.user.role === 'admin'`. The admin interface is visually distinct (highlighted by an admin panel navigation, red indicators, and administrative control tools).

---

## Demo Credentials
On first startup, the database is auto-seeded with the following credentials:
* **Administrator**: `admin@restaurant.com` / `admin123`
* **Customer**: `customer@restaurant.com` / `customer123`

---
