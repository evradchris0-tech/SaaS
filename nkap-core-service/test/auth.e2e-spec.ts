import { E2eTestHelper } from './helpers/e2e-test.helper';
import request from 'supertest';
import { App } from 'supertest/types';

describe('AuthModule (e2e)', () => {
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

  it('/auth/register (POST) - should register a new user', async () => {
    const response = await request(server)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        fullName: 'John Doe',
        phone: '+33612345678',
      })
      .expect(201);

    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user.password).toBeUndefined(); // Password should not be returned
  });

  it('/auth/login (POST) - should login and return JWT', async () => {
    // 1. Register
    await request(server)
      .post('/auth/register')
      .send({
        email: 'login@example.com',
        password: 'Password123!',
        fullName: 'Jane Doe',
        phone: '+33612345679',
      })
      .expect(201);

    // 2. Login
    const response = await request(server)
      .post('/auth/login')
      .send({
        phone: '+33612345679',
        password: 'Password123!',
      })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(typeof response.body.accessToken).toBe('string');
  });

  it('/auth/login (POST) - should fail with wrong password', async () => {
    // 1. Register
    await request(server)
      .post('/auth/register')
      .send({
        email: 'wrong@example.com',
        password: 'Password123!',
        fullName: 'Bob Sponge',
        phone: '+33600000000',
      })
      .expect(201);

    // 2. Login fail
    await request(server)
      .post('/auth/login')
      .send({
        phone: '+33600000000',
        password: 'WrongPassword!',
      })
      .expect(401);
  });
});
