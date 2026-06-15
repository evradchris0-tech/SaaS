import { E2eTestHelper } from './helpers/e2e-test.helper';
import request from 'supertest';
import { App } from 'supertest/types';

/**
 * Garantit qu'aucun champ sensible (ex. passwordHash) ne fuite dans les
 * réponses — protégé globalement par @Exclude + ClassSerializerInterceptor.
 */
describe('Sérialisation des réponses (e2e)', () => {
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

  it('GET /users/me ne contient jamais passwordHash', async () => {
    const phone = '+237697777777';
    const reg = await request(server)
      .post('/auth/register')
      .send({ phone, fullName: 'Serial User', password: 'StrongPass123!' })
      .expect(201);

    const me = await request(server)
      .get('/users/me')
      .set('Authorization', `Bearer ${reg.body.accessToken}`)
      .expect(200);

    expect(me.body.passwordHash).toBeUndefined();
    expect(me.body.id).toBeDefined();
    expect(me.body.phone).toBe(phone);
  });
});
