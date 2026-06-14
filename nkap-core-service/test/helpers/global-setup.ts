import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { resolve } from 'path';
import { Client } from 'pg';

export default async () => {
  // 1. Charger explicitement .env.test
  dotenv.config({ path: resolve(__dirname, '../../.env.test') });

  console.log(
    `\n[E2E Global Setup] Checking if test database ${process.env.DB_NAME} exists...`,
  );

  // 1.5 Créer la DB si elle n'existe pas
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'nkap',
    password: process.env.DB_PASSWORD || 'nkap',
    database: 'postgres',
  });

  try {
    await client.connect();
    const res = await client.query(
      `SELECT datname FROM pg_catalog.pg_database WHERE datname = '${process.env.DB_NAME}'`,
    );
    if (res.rowCount === 0) {
      console.log(
        `[E2E Global Setup] Creating database ${process.env.DB_NAME}...`,
      );
      await client.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
    }
  } catch (err) {
    console.warn(
      `[E2E Global Setup] Warning during DB creation: ${err.message}. Maybe it already exists or 'postgres' db is unreachable.`,
    );
  } finally {
    await client.end();
  }

  console.log(
    `\n[E2E Global Setup] Initializing test database: ${process.env.DB_NAME}`,
  );

  // 2. Créer une instance isolée de DataSource pour exécuter les migrations
  const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'nkap',
    password: process.env.DB_PASSWORD || 'nkap',
    database: process.env.DB_NAME || 'nkap_test',
    entities: [resolve(__dirname, '../../src/**/*.entity.{ts,js}')],
    migrations: [resolve(__dirname, '../../src/migrations/*.{ts,js}')],
    synchronize: false,
    logging: false,
  });

  await AppDataSource.initialize();

  console.log('[E2E Global Setup] Running migrations...');
  await AppDataSource.runMigrations();

  await AppDataSource.destroy();
  console.log('[E2E Global Setup] Setup complete.');
};
