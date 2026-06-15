import { E2eTestHelper } from './helpers/e2e-test.helper';
import request from 'supertest';
import { App } from 'supertest/types';

/**
 * E2E du flux refresh token : émission à l'inscription, rotation au refresh
 * (l'ancien token devient invalide), et révocation au logout.
 */
describe('Auth refresh (e2e)', () => {
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

  it('émet un refresh token, le fait tourner, et le révoque', async () => {
    const phone = '+237698888888';

    // 1. Register → access + refresh
    const reg = await request(server)
      .post('/auth/register')
      .send({ phone, fullName: 'Refresh User', password: 'StrongPass123!' })
      .expect(201);
    const r1: string = reg.body.refreshToken;
    expect(reg.body.accessToken).toBeDefined();
    expect(r1).toBeDefined();

    // 2. Refresh → nouveau couple, refresh token différent (rotation)
    const refreshed = await request(server)
      .post('/auth/refresh')
      .send({ refreshToken: r1 })
      .expect(200);
    const r2: string = refreshed.body.refreshToken;
    expect(refreshed.body.accessToken).toBeDefined();
    expect(r2).toBeDefined();
    expect(r2).not.toBe(r1);

    // 3. L'ancien refresh token (r1) est révoqué par la rotation → 401
    await request(server)
      .post('/auth/refresh')
      .send({ refreshToken: r1 })
      .expect(401);

    // 4. Logout du token courant (r2) → 204
    await request(server)
      .post('/auth/logout')
      .send({ refreshToken: r2 })
      .expect(204);

    // 5. r2 révoqué → 401
    await request(server)
      .post('/auth/refresh')
      .send({ refreshToken: r2 })
      .expect(401);
  });
});
