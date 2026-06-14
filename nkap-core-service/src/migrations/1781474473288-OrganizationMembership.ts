import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrganizationMembership1781474473288 implements MigrationInterface {
  name = 'OrganizationMembership1781474473288';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."organization_memberships_role_enum" AS ENUM('OWNER', 'ADMIN', 'MEMBER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "organization_memberships" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "organizationId" uuid NOT NULL, "userId" uuid NOT NULL, "role" "public"."organization_memberships_role_enum" NOT NULL DEFAULT 'MEMBER', CONSTRAINT "PK_cd7be805730a4c778a5f45364af" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1813e7f46b5a18529482f51964" ON "organization_memberships" ("organizationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_03b536604ff6c6676b51b74b1c" ON "organization_memberships" ("userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2dfb6f4b36cdc195e118502ecd" ON "organization_memberships" ("organizationId", "userId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2dfb6f4b36cdc195e118502ecd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_03b536604ff6c6676b51b74b1c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1813e7f46b5a18529482f51964"`,
    );
    await queryRunner.query(`DROP TABLE "organization_memberships"`);
    await queryRunner.query(
      `DROP TYPE "public"."organization_memberships_role_enum"`,
    );
  }
}
