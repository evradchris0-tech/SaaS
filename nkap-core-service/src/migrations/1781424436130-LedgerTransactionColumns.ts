import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aligne `ledger_transactions` sur l'entité `LedgerTransaction` (Sprint 3) :
 * `InitialSchema` ne crée que tontineId/type/reference/description, alors que
 * l'entité ajoute amount, status (+ enum), idempotencyKey (unique), roundId,
 * membershipId. Sans ces colonnes, l'INSERT du Ledger échoue (42703) sur une
 * base fraîche (CI/prod). Migration idempotente : sûre sur base neuve comme sur
 * une base locale qui possède déjà ces colonnes.
 */
export class LedgerTransactionColumns1781424436130 implements MigrationInterface {
  name = 'LedgerTransactionColumns1781424436130';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "public"."ledger_transactions_status_enum" AS ENUM('PENDING','COMPLETED','FAILED','REVERSED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`);

    const table = await queryRunner.getTable('ledger_transactions');
    const missing = (name: string): boolean => !table?.findColumnByName(name);

    if (missing('amount')) {
      // Ajout en deux temps : DEFAULT transitoire pour des lignes éventuelles, puis on l'enlève (l'entité n'a pas de défaut).
      await queryRunner.query(
        `ALTER TABLE "ledger_transactions" ADD "amount" bigint NOT NULL DEFAULT '0'`,
      );
      await queryRunner.query(
        `ALTER TABLE "ledger_transactions" ALTER COLUMN "amount" DROP DEFAULT`,
      );
    }

    if (missing('status')) {
      await queryRunner.query(
        `ALTER TABLE "ledger_transactions" ADD "status" "public"."ledger_transactions_status_enum" NOT NULL DEFAULT 'PENDING'`,
      );
    }

    if (missing('idempotencyKey')) {
      await queryRunner.query(
        `ALTER TABLE "ledger_transactions" ADD "idempotencyKey" character varying(255) NOT NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "ledger_transactions" ADD CONSTRAINT "UQ_ledger_transactions_idempotencyKey" UNIQUE ("idempotencyKey")`,
      );
    }

    if (missing('roundId')) {
      await queryRunner.query(
        `ALTER TABLE "ledger_transactions" ADD "roundId" uuid`,
      );
    }

    if (missing('membershipId')) {
      await queryRunner.query(
        `ALTER TABLE "ledger_transactions" ADD "membershipId" uuid`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ledger_transactions" DROP CONSTRAINT IF EXISTS "UQ_ledger_transactions_idempotencyKey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_transactions" DROP COLUMN IF EXISTS "membershipId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_transactions" DROP COLUMN IF EXISTS "roundId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_transactions" DROP COLUMN IF EXISTS "idempotencyKey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_transactions" DROP COLUMN IF EXISTS "status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_transactions" DROP COLUMN IF EXISTS "amount"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."ledger_transactions_status_enum"`,
    );
  }
}
