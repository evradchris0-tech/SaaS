import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Force load test environment before any Nest/TypeORM initialization
dotenv.config({ path: resolve(__dirname, '../../.env.test') });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

export class E2eTestHelper {
  public app: INestApplication;
  public moduleFixture: TestingModule;
  public dataSource: DataSource;

  async initApp(): Promise<INestApplication> {
    this.moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = this.moduleFixture.createNestApplication();

    // Appliquer exactement les mêmes Pipes qu'en prod (main.ts)
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await this.app.init();

    // Récupérer le DataSource TypeORM pour les opérations DB directes
    this.dataSource = this.app.get<DataSource>(DataSource);

    return this.app;
  }

  async closeApp() {
    if (this.app) {
      await this.app.close();
    }
  }

  async clearDatabase() {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      throw new Error('DataSource is not initialized. Call initApp first.');
    }

    const entities = this.dataSource.entityMetadatas;

    const tableNames = entities
      .map((entity) => `"${entity.tableName}"`)
      .join(', ');

    if (tableNames.length > 0) {
      await this.dataSource.query(`TRUNCATE TABLE ${tableNames} CASCADE;`);
    }
  }
}
