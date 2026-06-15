import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBidEntity1781559904244 implements MigrationInterface {
  name = 'AddBidEntity1781559904244';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."bids_status_enum" AS ENUM('PENDING', 'WINNING', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "bids" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "roundId" uuid NOT NULL, "membershipId" uuid NOT NULL, "discountAmount" bigint NOT NULL, "status" "public"."bids_status_enum" NOT NULL DEFAULT 'PENDING', CONSTRAINT "UQ_51d695f5f788ae6378f04b31e2f" UNIQUE ("roundId", "membershipId"), CONSTRAINT "PK_7950d066d322aab3a488ac39fe5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6312b87a99ea0bf8c627b2f932" ON "bids" ("roundId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8387ada29a27db60c1828ffec6" ON "bids" ("membershipId") `,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."funds_type_enum" RENAME TO "funds_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."funds_type_enum" AS ENUM('MAIN', 'SOCIAL', 'PENALTY', 'PLATFORM', 'SAVINGS', 'DIVIDEND')`,
    );
    await queryRunner.query(
      `ALTER TABLE "funds" ALTER COLUMN "type" TYPE "public"."funds_type_enum" USING "type"::"text"::"public"."funds_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."funds_type_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "bids" ADD CONSTRAINT "FK_6312b87a99ea0bf8c627b2f9325" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bids" ADD CONSTRAINT "FK_8387ada29a27db60c1828ffec67" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bids" DROP CONSTRAINT "FK_8387ada29a27db60c1828ffec67"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bids" DROP CONSTRAINT "FK_6312b87a99ea0bf8c627b2f9325"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."funds_type_enum_old" AS ENUM('MAIN', 'SOCIAL', 'PENALTY', 'PLATFORM', 'SAVINGS')`,
    );
    await queryRunner.query(
      `ALTER TABLE "funds" ALTER COLUMN "type" TYPE "public"."funds_type_enum_old" USING "type"::"text"::"public"."funds_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."funds_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."funds_type_enum_old" RENAME TO "funds_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8387ada29a27db60c1828ffec6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6312b87a99ea0bf8c627b2f932"`,
    );
    await queryRunner.query(`DROP TABLE "bids"`);
    await queryRunner.query(`DROP TYPE "public"."bids_status_enum"`);
  }
}
