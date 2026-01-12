import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ReportingService {
  constructor(private dataSource: DataSource) {}

  // a. Find all users who are double-booked
  async findDoubleBookedUsers() {
    return this.dataSource.query(`
      WITH user_events AS (
        SELECT 
          u.id as user_id,
          u.name as user_name,
          u.email,
          e.id as event_id,
          e.title,
          e."startTime",
          e."endTime"
        FROM users u
        INNER JOIN attendees a ON a."userId" = u.id
        INNER JOIN events e ON e.id = a."eventId"
      )
      SELECT DISTINCT
        ue1.user_id,
        ue1.user_name,
        ue1.email,
        ue1.event_id as event1_id,
        ue1.title as event1_title,
        ue1."startTime" as event1_start,
        ue1."endTime" as event1_end,
        ue2.event_id as event2_id,
        ue2.title as event2_title,
        ue2."startTime" as event2_start,
        ue2."endTime" as event2_end
      FROM user_events ue1
      INNER JOIN user_events ue2 
        ON ue1.user_id = ue2.user_id
        AND ue1.event_id < ue2.event_id
        AND ue1."endTime" > ue2."startTime"
        AND ue1."startTime" < ue2."endTime"
      ORDER BY ue1.user_id;
    `);
  }

  // b. List all events that violate resource constraints
  async findViolatingEvents() {
    return this.dataSource.query(`
      WITH exclusive_violations AS (
        SELECT DISTINCT
          e1.id as event_id,
          e1.title,
          r.id as resource_id,
          r.name as resource_name,
          'exclusive_double_booked' as violation_type,
          NULL::int as concurrent_count,
          NULL::int as max_allowed,
          NULL::int as total_used,
          NULL::int as available
        FROM events e1
        INNER JOIN event_resources er1 ON er1."eventId" = e1.id
        INNER JOIN resources r ON r.id = er1."resourceId"
        INNER JOIN events e2 ON e2.id != e1.id
        INNER JOIN event_resources er2 ON er2."eventId" = e2.id AND er2."resourceId" = r.id
        WHERE r.type = 'exclusive'
          AND e1."endTime" > e2."startTime"
          AND e1."startTime" < e2."endTime"
      ),
      shareable_violations AS (
        SELECT
          e.id as event_id,
          e.title,
          r.id as resource_id,
          r.name as resource_name,
          'shareable_over_allocated' as violation_type,
          COUNT(*)::int as concurrent_count,
          r."maxConcurrent" as max_allowed,
          NULL::int as total_used,
          NULL::int as available
        FROM events e
        INNER JOIN event_resources er ON er."eventId" = e.id
        INNER JOIN resources r ON r.id = er."resourceId"
        INNER JOIN events e2 ON e2."endTime" > e."startTime" AND e2."startTime" < e."endTime"
        INNER JOIN event_resources er2 ON er2."eventId" = e2.id AND er2."resourceId" = r.id
        WHERE r.type = 'shareable'
        GROUP BY e.id, e.title, r.id, r.name, r."maxConcurrent"
        HAVING COUNT(*) > r."maxConcurrent"
      ),
      consumable_violations AS (
        SELECT
          e.id as event_id,
          e.title,
          r.id as resource_id,
          r.name as resource_name,
          'consumable_exceeded' as violation_type,
          NULL::int as concurrent_count,
          NULL::int as max_allowed,
          SUM(er.quantity)::int as total_used,
          r."totalQuantity"::int as available
        FROM events e
        INNER JOIN event_resources er ON er."eventId" = e.id
        INNER JOIN resources r ON r.id = er."resourceId"
        WHERE r.type = 'consumable'
        GROUP BY e.id, e.title, r.id, r.name, r."totalQuantity"
        HAVING SUM(er.quantity) > r."totalQuantity"
      )
      SELECT * FROM exclusive_violations
      UNION ALL
      SELECT * FROM shareable_violations
      UNION ALL
      SELECT * FROM consumable_violations
      ORDER BY violation_type, event_id;
    `);
  }

  // c. Compute resource utilization per organization
  async getResourceUtilization() {
    return this.dataSource.query(`
      WITH resource_usage AS (
        SELECT
          COALESCE(r."organizationId"::text, 'global'::text) as org_id,
          o.name as org_name,
          r.id as resource_id,
          r.name as resource_name,
          r.type,
          SUM(EXTRACT(EPOCH FROM (e."endTime" - e."startTime")) / 3600) as total_hours,
          COUNT(DISTINCT er."eventId") as event_count
        FROM resources r
        LEFT JOIN event_resources er ON er."resourceId" = r.id
        LEFT JOIN events e ON e.id = er."eventId"
        LEFT JOIN organizations o ON o.id = r."organizationId"
        GROUP BY COALESCE(r."organizationId"::text, 'global'::text), o.name, r.id, r.name, r.type
      ),
      peak_concurrent AS (
        SELECT
          COALESCE(r."organizationId"::text, 'global'::text) as org_id,
          r.id as resource_id,
          MAX(concurrent_count) as peak_concurrent
        FROM resources r
        CROSS JOIN LATERAL (
          SELECT COUNT(*) as concurrent_count
          FROM events e1
          INNER JOIN event_resources er1 ON er1."eventId" = e1.id AND er1."resourceId" = r.id
          WHERE EXISTS (
            SELECT 1
            FROM events e2
            INNER JOIN event_resources er2 ON er2."eventId" = e2.id AND er2."resourceId" = r.id
            WHERE e2."endTime" > e1."startTime" AND e2."startTime" < e1."endTime"
          )
          GROUP BY e1."startTime"
        ) pc
        GROUP BY COALESCE(r."organizationId"::text, 'global'::text), r.id
      ),
      utilization_with_rank AS (
        SELECT
          ru.org_id,
          ru.org_name,
          ru.resource_id,
          ru.resource_name,
          ru.type,
          COALESCE(ru.total_hours, 0) as total_hours,
          ru.event_count,
          COALESCE(pc.peak_concurrent, 0) as peak_concurrent_usage,
          ROW_NUMBER() OVER (PARTITION BY ru.org_id ORDER BY ru.total_hours DESC NULLS LAST) as utilization_rank
        FROM resource_usage ru
        LEFT JOIN peak_concurrent pc ON pc.org_id = ru.org_id AND pc.resource_id = ru.resource_id
      )
      SELECT
        org_id,
        org_name,
        resource_id,
        resource_name,
        type,
        total_hours,
        event_count,
        peak_concurrent_usage,
        CASE 
          WHEN total_hours = 0 THEN 'underutilized'
          WHEN utilization_rank > (SELECT COUNT(*) FROM utilization_with_rank u2 WHERE u2.org_id = utilization_with_rank.org_id) * 0.5 THEN 'underutilized'
          ELSE 'active'
        END as utilization_status
      FROM utilization_with_rank
      ORDER BY org_id, total_hours DESC NULLS LAST;
    `);
  }

  // d. Find parent events whose child sessions violate time boundaries
  async findParentEventsWithInvalidChildren() {
    return this.dataSource.query(`
      WITH RECURSIVE event_hierarchy AS (
        SELECT id, "parentEventId", "startTime", "endTime", 0 as level
        FROM events
        WHERE "parentEventId" IS NULL
        
        UNION ALL
        
        SELECT e.id, e."parentEventId", e."startTime", e."endTime", eh.level + 1
        FROM events e
        INNER JOIN event_hierarchy eh ON e."parentEventId" = eh.id
      )
      SELECT DISTINCT
        pe.id as parent_id,
        pe.title as parent_title,
        pe."startTime" as parent_start,
        pe."endTime" as parent_end,
        ce.id as child_id,
        ce.title as child_title,
        ce."startTime" as child_start,
        ce."endTime" as child_end
      FROM events pe
      INNER JOIN events ce ON ce."parentEventId" = pe.id
      WHERE ce."startTime" < pe."startTime" OR ce."endTime" > pe."endTime"
      ORDER BY pe.id;
    `);
  }

  // e. List events with external attendees exceeding a threshold
  async findEventsWithExternalAttendees(threshold: number = 10) {
    return this.dataSource.query(
      `
      SELECT
        e.id,
        e.title,
        e."startTime",
        e."endTime",
        COUNT(*) as external_attendee_count
      FROM events e
      INNER JOIN attendees a ON a."eventId" = e.id
      WHERE a."userId" IS NULL
      GROUP BY e.id, e.title, e."startTime", e."endTime"
      HAVING COUNT(*) >= $1
      ORDER BY external_attendee_count DESC;
    `,
      [threshold],
    );
  }

  // Additional: Find underutilized resources
  async findUnderutilizedResources(minUsageHours: number = 10) {
    return this.dataSource.query(
      `
      WITH resource_usage AS (
        SELECT
          COALESCE(r."organizationId"::text, 'global'::text) as org_id,
          o.name as org_name,
          r.id as resource_id,
          r.name as resource_name,
          r.type,
          COALESCE(SUM(EXTRACT(EPOCH FROM (e."endTime" - e."startTime")) / 3600), 0) as total_hours,
          COUNT(DISTINCT er."eventId") as event_count
        FROM resources r
        LEFT JOIN event_resources er ON er."resourceId" = r.id
        LEFT JOIN events e ON e.id = er."eventId"
        LEFT JOIN organizations o ON o.id = r."organizationId"
        GROUP BY COALESCE(r."organizationId"::text, 'global'::text), o.name, r.id, r.name, r.type
      )
      SELECT
        org_id,
        org_name,
        resource_id,
        resource_name,
        type,
        total_hours,
        event_count,
        CASE 
          WHEN total_hours = 0 THEN 'unused'
          WHEN total_hours < $1 THEN 'underutilized'
          ELSE 'active'
        END as status
      FROM resource_usage
      WHERE total_hours < $1 OR total_hours = 0
      ORDER BY total_hours ASC, org_id;
    `,
      [minUsageHours],
    );
  }
}
