import { E2eTestHelper } from './helpers/e2e-test.helper';
import request from 'supertest';
import { App } from 'supertest/types';
import { TontineType, TransactionType } from '../src/common/enums';
import { DataSource } from 'typeorm';

describe('Tontine Lifecycle (e2e)', () => {
  const helper = new E2eTestHelper();
  let server: App;
  let presidentToken: string;
  let presidentUserId: string;
  let member2Token: string;
  let member2UserId: string;
  let organizationId: string;
  let tontineId: string;
  let presidentMembershipId: string;
  let member2MembershipId: string;
  let round1Id: string;

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

  it('should successfully complete a full tontine cycle', async () => {
    // 1. Register & Login President
    await request(server)
      .post('/auth/register')
      .send({
        email: 'president@test.com',
        password: 'Password123!',
        fullName: 'President',
        phone: '+33600000001',
      })
      .expect(201);

    const loginPres = await request(server)
      .post('/auth/login')
      .send({ phone: '+33600000001', password: 'Password123!' })
      .expect(200);
    presidentToken = loginPres.body.accessToken;
    presidentUserId = loginPres.body.user.id;

    // 2. Register & Login Member 2
    await request(server)
      .post('/auth/register')
      .send({
        email: 'member2@test.com',
        password: 'Password123!',
        fullName: 'Member 2',
        phone: '+33600000002',
      })
      .expect(201);

    const loginMem2 = await request(server)
      .post('/auth/login')
      .send({ phone: '+33600000002', password: 'Password123!' })
      .expect(200);
    member2Token = loginMem2.body.accessToken;
    member2UserId = loginMem2.body.user.id;

    // 3. Create Organization
    const orgRes = await request(server)
      .post('/organizations')
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({ name: 'My Tontine Org' })
      .expect(201);
    organizationId = orgRes.body.id;

    // 4. Create Tontine
    const tontineRes = await request(server)
      .post('/tontines')
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({
        organizationId,
        name: 'Tontine E2E',
        type: TontineType.ROTATING,
        currency: 'XAF',
        ruleSet: {
          contribution: {
            amountPerShare: 10000,
            frequency: { interval: 1, unit: 'MONTH' },
            allowAdvance: false,
          },
          beneficiary: { order: 'FIXED', allowSwap: false },
          penalty: { type: 'FIXED', value: 1000, graceDays: 2 },
        },
      })
      .expect(201);
    tontineId = tontineRes.body.id;
    // The president is auto-added as member

    // Fetch members to get President's membershipId
    const memRes1 = await request(server)
      .get(`/tontines/${tontineId}`)
      .set('Authorization', `Bearer ${presidentToken}`);
    // Wait, we don't have GET /tontines/:id/members yet? Let's check DB directly if needed.
    // Or we can add member 2 and get response.

    // 5. Add Member 2
    const addMemRes = await request(server)
      .post(`/tontines/${tontineId}/members`)
      .set('Authorization', `Bearer ${presidentToken}`) // Only President can add before active? Wait, addMember is public or JWT?
      .send({ userId: member2UserId })
      .expect(201);
    member2MembershipId = addMemRes.body.id;

    // We need President's membershipId. We can query it.
    const memberships = await helper.dataSource.query(
      `SELECT id, "userId" FROM memberships WHERE "tontineId" = '${tontineId}'`,
    );
    presidentMembershipId = memberships.find(
      (m) => m.userId === presidentUserId,
    ).id;

    // 6. Activate Tontine
    await request(server)
      .post(`/tontines/${tontineId}/activate`)
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({ startDate: new Date().toISOString() })
      .expect(201);

    // 7. Get Rounds
    const rounds = await helper.dataSource.query(
      `SELECT id, index, "expectedAmount" FROM rounds WHERE "tontineId" = '${tontineId}' ORDER BY index ASC`,
    );
    expect(rounds.length).toBe(2); // 2 members
    round1Id = rounds[0].id;

    // 8. Contribute as President
    await request(server)
      .post(`/tontines/${tontineId}/contribute`)
      .set('Authorization', `Bearer ${presidentToken}`)
      .set('Idempotency-Key', 'contrib-pres-round1')
      .send({
        roundId: round1Id,
        membershipId: presidentMembershipId,
        amount: 10000,
        reference: 'PRES_PAY',
      })
      .expect((res) => {
        if (res.status !== 201) console.error('Contribute Error:', res.body);
      })
      .expect(201);

    // 9. Contribute as Member 2
    await request(server)
      .post(`/tontines/${tontineId}/contribute`)
      .set('Authorization', `Bearer ${member2Token}`)
      .set('Idempotency-Key', 'contrib-mem2-round1')
      .send({
        roundId: round1Id,
        membershipId: member2MembershipId,
        amount: 10000,
        reference: 'MEM2_PAY',
      })
      .expect((res) => {
        if (res.status !== 201)
          console.error('Contribute Mem2 Error:', res.body);
      })
      .expect(201);

    // 10. Payout Round 1 (President calls this)
    const payoutRes = await request(server)
      .post(`/tontines/${tontineId}/payout`)
      .set('Authorization', `Bearer ${presidentToken}`)
      .set('Idempotency-Key', 'payout-round1')
      .send({ roundId: round1Id })
      .expect((res) => {
        if (res.status !== 201) console.error('Payout Error:', res.body);
      })
      .expect(201);

    expect(payoutRes.body.type).toBe(TransactionType.PAYOUT);
    expect(Number(payoutRes.body.amount)).toBe(20000); // Expected pot: 2 * 10000

    // 11. Verify Round Status is PAID
    const round1 = await helper.dataSource.query(
      `SELECT status FROM rounds WHERE id = '${round1Id}'`,
    );
    expect(round1[0].status).toBe('PAID');
  });
});
