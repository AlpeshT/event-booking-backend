import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResourceUtilizationView1700000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS resource_utilization_summary AS
      SELECT
        COALESCE(r."organizationId"::text, 'global'::text) as org_id,
        o.name as org_name,
        r.id as resource_id,
        r.name as resource_name,
        r.type,
        COUNT(DISTINCT er."eventId") as total_events,
        SUM(EXTRACT(EPOCH FROM (e."endTime" - e."startTime")) / 3600) as total_hours
      FROM resources r
      LEFT JOIN event_resources er ON er."resourceId" = r.id
      LEFT JOIN events e ON e.id = er."eventId"
      LEFT JOIN organizations o ON o.id = r."organizationId"
      GROUP BY COALESCE(r."organizationId"::text, 'global'::text), o.name, r.id, r.name, r.type;
      
      CREATE INDEX IF NOT EXISTS idx_resource_utilization_org_resource 
        ON resource_utilization_summary (org_id, resource_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP MATERIALIZED VIEW IF EXISTS resource_utilization_summary;`,
    );
  }
}
