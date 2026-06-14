import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * DataSource utilisé par le CLI TypeORM (migrations).
 * L'application utilise `TypeOrmModule.forRootAsync` (cf. app.module.ts) ;
 * ce fichier ne sert qu'aux commandes `migration:generate / run / revert`.
 * `synchronize: false` TOUJOURS — le schéma est versionné par migrations.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'nkap',
  password: process.env.DB_PASSWORD ?? 'nkap',
  database: process.env.DB_NAME ?? 'nkap_dev',
  entities: [__dirname + '/**/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
});
