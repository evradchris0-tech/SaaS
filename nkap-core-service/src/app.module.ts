import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organization/organizations.module';
import { TontinesModule } from './modules/tontine/tontines.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { FinanceModule } from './modules/finance/finance.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/user/users.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Anti-abus : plafond global par IP (60 s). Les routes sensibles
    // (cf. /auth) resserrent cette limite via @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
        username: config.get<string>('DB_USER', 'nkap'),
        password: config.get<string>('DB_PASSWORD', 'nkap'),
        database: config.get<string>('DB_NAME', 'nkap_dev'),
        // Charge toutes les entités par convention de nom.
        entities: [__dirname + '/**/*.entity.{ts,js}'],
        migrations: [__dirname + '/migrations/*.{ts,js}'],
        // JAMAIS true en prod — on versionne le schéma via migrations.
        synchronize: false,
        logging: config.get<string>('DB_LOGGING') === 'true',
      }),
    }),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    TontinesModule,
    LedgerModule,
    FinanceModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
