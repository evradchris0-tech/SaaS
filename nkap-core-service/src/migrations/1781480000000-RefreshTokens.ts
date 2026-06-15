import { MigrationInterface, QueryRunner } from 'typeorm';

/** Crée la table `refresh_tokens` (jetons de rafraîchissement révocables). Idempotente. */
export class RefreshTokens1781480000000 implements MigrationInterface {
  name = 'RefreshTokens1781480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('refresh_tokens');
    if (!exists) {
      await queryRunner.query(`CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "version" integer NOT NULL,
        "userId" uuid NOT NULL,
        "tokenHash" character varying(64) NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revokedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refresh_tokens_tokenHash" UNIQUE ("tokenHash")
      )`);
      await queryRunner.query(
        `CREATE INDEX "IDX_refresh_tokens_userId" ON "refresh_tokens" ("userId")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
  }
}
