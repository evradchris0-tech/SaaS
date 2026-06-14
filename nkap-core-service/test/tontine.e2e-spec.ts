import { E2eTestHelper } from './helpers/e2e-test.helper';
import request from 'supertest';
import { App } from 'supertest/types';
import { TontineType } from '../src/common/enums';
import { DataSource } from 'typeorm';
import { Fund } from '../src/modules/tontine/fund.entity';

describe('TontinesModule (e2e)', () => {
  const helper = new E2eTestHelper();
  let server: App;
  let jwtToken: string;
  let organizationId: string;
  let dataSource: DataSource;

  beforeAll(async () => {
    const app = await helper.initApp();
    server = app.getHttpServer();
    dataSource = helper.dataSource;
  });

  afterAll(async () => {
    await helper.closeApp();
  });

  beforeEach(async () => {
    await helper.clearDatabase();

    // Setup: Register and login
    await request(server)
      .post('/auth/register')
      .send({
        email: 'tontine-admin@example.com',
        password: 'Password123!',
        fullName: 'Admin Tontine',
        phone: '+33622222222',
      })
      .expect(201);

    const loginRes = await request(server)
      .post('/auth/login')
      .send({
        phone: '+33622222222',
        password: 'Password123!',
      })
      .expect(200);

    jwtToken = loginRes.body.accessToken;

    // Setup: Create Organization
    const orgRes = await request(server)
      .post('/organizations')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ name: 'Tontine Org' })
      .expect(201);

    organizationId = orgRes.body.id;
  });

  it('/tontines (POST) - should create a Tontine with 4 Funds atomically', async () => {
    const payload = {
      organizationId,
      name: 'Family Tontine',
      type: TontineType.ROTATING,
      currency: 'XAF',
      ruleSet: {
        contribution: {
          amountPerShare: 50000,
          frequency: { interval: 1, unit: 'MONTH' },
          allowAdvance: false,
        },
        beneficiary: { order: 'FIXED', allowSwap: false },
        penalty: { type: 'FIXED', value: 1000, graceDays: 2 },
      },
    };

    const response = await request(server)
      .post('/tontines')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send(payload)
      .expect((res) => {
        if (res.status !== 201) {
          console.error('Validation error:', res.body);
        }
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Family Tontine');
    expect(response.body.status).toBe('DRAFT');

    // Verify side-effects in DB (Funds generation)
    const tontineId = response.body.id;
    const fundsRepo = dataSource.getRepository(Fund);
    const funds = await fundsRepo.find({ where: { tontineId } });

    expect(funds.length).toBe(4);

    const fundTypes = funds.map((f) => f.type);
    expect(fundTypes).toContain('MAIN');
    expect(fundTypes).toContain('SOCIAL');
    expect(fundTypes).toContain('PENALTY');
    expect(fundTypes).toContain('PLATFORM');
  });

  // Sprint 2 Endpoint tests (Activation / Rounds generation) will be added here once Sprint 2 activation endpoint is ready
});
