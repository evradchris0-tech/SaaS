import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class Sprint4and5UpdatesV31781424436126 implements MigrationInterface {
  name = 'Sprint4and5UpdatesV31781424436126';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix ledger_entries
    const entriesTable = await queryRunner.getTable('ledger_entries');
    if (entriesTable && !entriesTable.findColumnByName('balanceAfter')) {
      await queryRunner.addColumn(
        'ledger_entries',
        new TableColumn({
          name: 'balanceAfter',
          type: 'bigint',
          isNullable: true,
        }),
      );
      await queryRunner.query(
        `ALTER TABLE "ledger_entries" ALTER COLUMN "fundId" DROP NOT NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('ledger_entries', 'balanceAfter');
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" ALTER COLUMN "fundId" SET NOT NULL`,
    );
  }
}
