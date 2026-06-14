import { E2eTestHelper } from './helpers/e2e-test.helper';
import request from 'supertest';
import { App } from 'supertest/types';

describe('OrganizationsModule (e2e)', () => {
  const helper = new E2eTestHelper();
  let server: App;
  let jwtToken: string;

  beforeAll(async () => {
    const app = await helper.initApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await helper.closeApp();
  });

  beforeEach(async () => {
    await helper.clearDatabase();

    // Setup: Register and login a user to get a JWT
    await request(server).post('/auth/register').send({
      email: 'org-admin@example.com',
      password: 'Password123!',
      fullName: 'Admin Org',
      phone: '+33611111111',
    });

    const loginRes = await request(server).post('/auth/login').send({
      phone: '+33611111111',
      password: 'Password123!',
    });

    jwtToken = loginRes.body.accessToken;
  });

  it('/organizations (POST) - should create an organization with valid JWT', async () => {
    const response = await request(server)
      .post('/organizations')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'My New Organization',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('My New Organization');
  });

  it('/organizations (POST) - should fail without JWT', async () => {
    await request(server)
      .post('/organizations')
      .send({
        name: 'Hacked Org',
      })
      .expect(401);
  });
});
