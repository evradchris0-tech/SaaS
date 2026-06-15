import { E2eTestHelper } from './helpers/e2e-test.helper';
import request from 'supertest';
import { App } from 'supertest/types';

/**
 * Tests de sécurité (e2e) : authentification requise, rejet des JWT invalides,
 * validation des entrées, et isolation multi-tenant (un utilisateur ne peut
 * pas agir sur l'organisation d'un autre).
 */
describe('Sécurité (e2e)', () => {
  const helper = new E2eTestHelper();
  let server: App;

  beforeAll(async () => {
    const app = await helper.initApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await helper.closeApp();
  });

  beforeEach(async () => {
    await helper.clearDatabase();
  });

  const registerAndLogin = async (suffix: string): Promise<string> => {
    const phone = `+23765${suffix.padStart(6, '0')}`;
    await request(server)
      .post('/auth/register')
      .send({ phone, fullName: `User ${suffix}`, password: 'StrongPass123!' })
      .expect(201);
    const res = await request(server)
      .post('/auth/login')
      .send({ phone, password: 'StrongPass123!' })
      .expect(200);
    return res.body.accessToken as string;
  };

  const validRuleSet = {
    contribution: {
      amountPerShare: 1000,
      frequency: { interval: 1, unit: 'MONTH' },
      allowAdvance: false,
    },
    beneficiary: { order: 'FIXED', allowSwap: false },
    penalty: { type: 'FIXED', value: 0, graceDays: 0 },
  };

  describe('Authentification requise', () => {
    it('GET /organizations sans token → 401', async () => {
      await request(server).get('/organizations').expect(401);
    });

    it('POST /tontines sans token → 401', async () => {
      await request(server).post('/tontines').send({}).expect(401);
    });

    it('JWT invalide → 401', async () => {
      await request(server)
        .get('/organizations')
        .set('Authorization', 'Bearer not.a.valid.token')
        .expect(401);
    });
  });

  describe('Validation des entrées', () => {
    it('register avec mot de passe trop court → 400', async () => {
      await request(server)
        .post('/auth/register')
        .send({ phone: '+237650000009', fullName: 'X', password: 'short' })
        .expect(400);
    });

    it('création de tontine avec ruleSet incomplet → 400', async () => {
      const token = await registerAndLogin('1');
      const org = await request(server)
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Org A' })
        .expect(201);
      await request(server)
        .post('/tontines')
        .set('Authorization', `Bearer ${token}`)
        .send({
          organizationId: org.body.id,
          name: 'T',
          type: 'ROTATING',
          currency: 'XAF',
          ruleSet: { contribution: { amountPerShare: 1000 } }, // incomplet
        })
        .expect(400);
    });
  });

  describe('Isolation multi-tenant', () => {
    it('un user ne peut pas créer de tontine dans l’org d’un autre → 403', async () => {
      const tokenA = await registerAndLogin('1');
      const orgA = await request(server)
        .post('/organizations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Org A' })
        .expect(201);

      const tokenB = await registerAndLogin('2');
      await request(server)
        .post('/tontines')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          organizationId: orgA.body.id,
          name: 'Intrus',
          type: 'ROTATING',
          currency: 'XAF',
          ruleSet: validRuleSet,
        })
        .expect(403);
    });

    it('un user ne peut pas lire l’org d’un autre → 403', async () => {
      const tokenA = await registerAndLogin('1');
      const orgA = await request(server)
        .post('/organizations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Org A' })
        .expect(201);

      const tokenB = await registerAndLogin('2');
      await request(server)
        .get(`/organizations/${orgA.body.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);
    });
  });
});
