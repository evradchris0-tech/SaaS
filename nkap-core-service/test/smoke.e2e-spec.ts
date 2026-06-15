import { E2eTestHelper } from './helpers/e2e-test.helper';
import request from 'supertest';
import { App } from 'supertest/types';

/**
 * Smoke test (e2e) : vérifie que les fonctions vitales répondent après un
 * déploiement — health check + parcours d'authentification minimal.
 * Rapide et sans dépendance métier complexe.
 */
describe('Smoke (e2e)', () => {
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

  it('GET /health → 200 (service + DB up)', async () => {
    const res = await request(server).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('up');
  });

  it('parcours vital : register → login → route protégée', async () => {
    const phone = '+237659999999';
    await request(server)
      .post('/auth/register')
      .send({ phone, fullName: 'Smoke', password: 'StrongPass123!' })
      .expect(201);

    const login = await request(server)
      .post('/auth/login')
      .send({ phone, password: 'StrongPass123!' })
      .expect(200);

    expect(login.body.accessToken).toBeDefined();

    await request(server)
      .get('/organizations')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
  });
});
