import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1781424436123 implements MigrationInterface {
  name = 'InitialSchema1781424436123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "phone" character varying(50) NOT NULL, "email" character varying(255), "fullName" character varying(255) NOT NULL, "passwordHash" character varying(255) NOT NULL, "status" character varying(50) NOT NULL DEFAULT 'ACTIVE', CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."contributions_status_enum" AS ENUM('PENDING', 'PAID', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "contributions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "membershipId" uuid NOT NULL, "roundId" uuid NOT NULL, "expectedAmount" bigint NOT NULL, "paidAmount" bigint NOT NULL DEFAULT '0', "status" "public"."contributions_status_enum" NOT NULL DEFAULT 'PENDING', "idempotencyKey" character varying(255), CONSTRAINT "UQ_8c45b0380a2f459efe734e93e7b" UNIQUE ("idempotencyKey"), CONSTRAINT "PK_ca2b4f39eb9e32a61278c711f79" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ef16ecc9ed69af0808bffeae4c" ON "contributions" ("membershipId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7e288e4dc6848c456b1fe2806e" ON "contributions" ("roundId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."obligations_type_enum" AS ENUM('LOAN', 'PENALTY', 'FEE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."obligations_status_enum" AS ENUM('ACTIVE', 'PARTIALLY_SETTLED', 'SETTLED', 'DEFAULTED', 'WRITTEN_OFF')`,
    );
    await queryRunner.query(
      `CREATE TABLE "obligations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "membershipId" uuid NOT NULL, "type" "public"."obligations_type_enum" NOT NULL, "principalAmount" bigint NOT NULL, "interestAmount" bigint NOT NULL DEFAULT '0', "repaidAmount" bigint NOT NULL DEFAULT '0', "dueDate" TIMESTAMP WITH TIME ZONE, "status" "public"."obligations_status_enum" NOT NULL DEFAULT 'ACTIVE', CONSTRAINT "PK_6e661b1b461253d2bf5d57e518d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_990e218c0f357ee5a7e433e5a5" ON "obligations" ("membershipId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tontines_type_enum" AS ENUM('ROTATING', 'AUCTION', 'ACCUMULATING', 'SOLIDARITY_FUND')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tontines_status_enum" AS ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tontines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "organizationId" uuid NOT NULL, "name" character varying(255) NOT NULL, "type" "public"."tontines_type_enum" NOT NULL, "currency" character varying(3) NOT NULL, "ruleSet" jsonb NOT NULL, "status" "public"."tontines_status_enum" NOT NULL DEFAULT 'DRAFT', CONSTRAINT "PK_e2ba1a485e389feb1e552d44b06" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c6e9625e599ab59502e257d020" ON "tontines" ("organizationId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."memberships_role_enum" AS ENUM('PRESIDENT', 'TREASURER', 'SECRETARY', 'CENSOR', 'MEMBER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "memberships" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "userId" uuid NOT NULL, "tontineId" uuid NOT NULL, "role" "public"."memberships_role_enum" NOT NULL DEFAULT 'MEMBER', "status" character varying(50) NOT NULL DEFAULT 'INVITED', "shares" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_25d28bd932097a9e90495ede7b4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."rounds_status_enum" AS ENUM('SCHEDULED', 'COLLECTING', 'OVERDUE', 'READY', 'PAID', 'CLOSED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "rounds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "tontineId" uuid NOT NULL, "index" integer NOT NULL, "dueDate" TIMESTAMP WITH TIME ZONE NOT NULL, "expectedAmount" bigint NOT NULL, "beneficiaryMembershipId" uuid, "status" "public"."rounds_status_enum" NOT NULL DEFAULT 'SCHEDULED', CONSTRAINT "PK_9d254884a20817016e2f877c7e7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."funds_type_enum" AS ENUM('MAIN', 'SOCIAL', 'PENALTY', 'PLATFORM', 'SAVINGS')`,
    );
    await queryRunner.query(
      `CREATE TABLE "funds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "tontineId" uuid NOT NULL, "name" character varying(255) NOT NULL, "type" "public"."funds_type_enum" NOT NULL, "cachedBalance" bigint NOT NULL DEFAULT '0', CONSTRAINT "PK_d785f4bb8f680f3febd40718f68" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7e4e14a13b4b344f40f86d960c" ON "funds" ("tontineId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "name" character varying(255) NOT NULL, CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payouts_status_enum" AS ENUM('PENDING', 'PAID', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payouts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "membershipId" uuid NOT NULL, "roundId" uuid NOT NULL, "grossAmount" bigint NOT NULL, "deductions" bigint NOT NULL DEFAULT '0', "netDisbursed" bigint NOT NULL, "status" "public"."payouts_status_enum" NOT NULL DEFAULT 'PENDING', CONSTRAINT "PK_76855dc4f0a6c18c72eea302e87" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bfa20402732eac20735c2b6c0b" ON "payouts" ("membershipId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_12dce59864ade7594ecbdb19e4" ON "payouts" ("roundId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ledger_transactions_type_enum" AS ENUM('CONTRIBUTION', 'PAYOUT', 'PENALTY', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'SOLIDARITY_CLAIM', 'FEE', 'REVERSAL')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ledger_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "tontineId" uuid NOT NULL, "type" "public"."ledger_transactions_type_enum" NOT NULL, "reference" character varying(255), "description" character varying(255), CONSTRAINT "PK_633d103c9e415d615aacf9b1929" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_02054d7d35d13b70ea7ef82676" ON "ledger_transactions" ("tontineId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ledger_entries_type_enum" AS ENUM('DEBIT', 'CREDIT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ledger_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "transactionId" uuid NOT NULL, "fundId" uuid NOT NULL, "membershipId" uuid, "type" "public"."ledger_entries_type_enum" NOT NULL, "amount" bigint NOT NULL, "reversedEntryId" uuid, CONSTRAINT "PK_6efcb84411d3f08b08450ae75d5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ce01dd5f8bde23f503bf01ffac" ON "ledger_entries" ("transactionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_90b691af952c95c6a57d2a89de" ON "ledger_entries" ("fundId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_90b691af952c95c6a57d2a89de"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ce01dd5f8bde23f503bf01ffac"`,
    );
    await queryRunner.query(`DROP TABLE "ledger_entries"`);
    await queryRunner.query(`DROP TYPE "public"."ledger_entries_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_02054d7d35d13b70ea7ef82676"`,
    );
    await queryRunner.query(`DROP TABLE "ledger_transactions"`);
    await queryRunner.query(
      `DROP TYPE "public"."ledger_transactions_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_12dce59864ade7594ecbdb19e4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bfa20402732eac20735c2b6c0b"`,
    );
    await queryRunner.query(`DROP TABLE "payouts"`);
    await queryRunner.query(`DROP TYPE "public"."payouts_status_enum"`);
    await queryRunner.query(`DROP TABLE "organizations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7e4e14a13b4b344f40f86d960c"`,
    );
    await queryRunner.query(`DROP TABLE "funds"`);
    await queryRunner.query(`DROP TYPE "public"."funds_type_enum"`);
    await queryRunner.query(`DROP TABLE "rounds"`);
    await queryRunner.query(`DROP TYPE "public"."rounds_status_enum"`);
    await queryRunner.query(`DROP TABLE "memberships"`);
    await queryRunner.query(`DROP TYPE "public"."memberships_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c6e9625e599ab59502e257d020"`,
    );
    await queryRunner.query(`DROP TABLE "tontines"`);
    await queryRunner.query(`DROP TYPE "public"."tontines_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tontines_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_990e218c0f357ee5a7e433e5a5"`,
    );
    await queryRunner.query(`DROP TABLE "obligations"`);
    await queryRunner.query(`DROP TYPE "public"."obligations_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."obligations_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7e288e4dc6848c456b1fe2806e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ef16ecc9ed69af0808bffeae4c"`,
    );
    await queryRunner.query(`DROP TABLE "contributions"`);
    await queryRunner.query(`DROP TYPE "public"."contributions_status_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
