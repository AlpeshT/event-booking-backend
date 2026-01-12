# Event Booking Backend

Multi-tenant event booking system backend built with NestJS and PostgreSQL.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a PostgreSQL database:
```bash
createdb event_booking
```

3. Copy `.env.example` to `.env` and update with your database credentials:
```bash
cp .env.example .env
```

4. Run the application:
```bash
npm run start:dev
```

## API Endpoints

### Organizations
- `GET /organizations` - List all organizations
- `GET /organizations/:id` - Get organization by ID
- `POST /organizations` - Create organization
- `PUT /organizations/:id` - Update organization
- `DELETE /organizations/:id` - Delete organization

### Users
- `GET /users?organizationId=xxx` - List users (optionally filtered by organization)
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Events
- `GET /events?organizationId=xxx` - List events
- `GET /events/:id` - Get event by ID
- `POST /events` - Create event
- `PUT /events/:id` - Update event
- `DELETE /events/:id` - Delete event
- `POST /events/:id/resources/:resourceId` - Allocate resource to event
- `DELETE /events/:id/resources/:resourceId` - Remove resource from event

### Resources
- `GET /resources?organizationId=xxx` - List resources (includes global resources)
- `GET /resources/:id` - Get resource by ID
- `POST /resources` - Create resource
- `PUT /resources/:id` - Update resource
- `DELETE /resources/:id` - Delete resource

### Attendance
- `POST /attendance/register` - Register for event (body: eventId, userId?, email?, name?)
- `POST /attendance/:attendeeId/checkin` - Check in attendee
- `GET /attendance/event/:eventId` - Get event attendees
- `GET /attendance/user/:userId` - Get user attendances

### Reporting
- `GET /reporting/double-booked-users` - Find users with overlapping events
- `GET /reporting/violating-events` - Find events violating resource constraints
- `GET /reporting/resource-utilization` - Resource utilization per organization
- `GET /reporting/invalid-parent-events` - Parent events with invalid child time boundaries
- `GET /reporting/external-attendees?threshold=10` - Events with external attendees exceeding threshold

## Database Schema

The system uses TypeORM with PostgreSQL. Key entities:
- Organizations (multi-tenant root)
- Users (belong to organizations)
- Events (with parent-child relationships)
- Resources (exclusive/shareable/consumable, org-scoped or global)
- EventResources (allocation tracking)
- Attendees (users or external)
- Attendance (check-in tracking)

## Create an organization directly in the database first

   curl -X POST http://localhost:3000/organizations \
     -H "Content-Type: application/json" \
     -d '{"name": "Test Organization"}'

