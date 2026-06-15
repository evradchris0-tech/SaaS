import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { E2eTestHelper } from './helpers/e2e-test.helper';
import { FundType, RoundStatus } from '../src/common/enums';
import { Connection } from 'typeorm';

describe('Auction Tontine Flow (e2e)', () => {
  let app: INestApplication;
  let helper: E2eTestHelper;
  let connection: Connection;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [E2eTestHelper],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    helper = moduleFixture.get<E2eTestHelper>(E2eTestHelper);
    connection = moduleFixture.get<Connection>(Connection);
    await helper.initApp(app);
    await helper.clearDatabase();
  });

  afterAll(async () => {
    await helper.clearDatabase();
    await app.close();
  });

  it('should run a complete auction cycle with bidding and dividend distribution', async () => {
    // 1. Setup users and organization
    const creator = await helper.createUser('president@auction.com');
    const member1 = await helper.createUser('member1@auction.com');
    const member2 = await helper.createUser('member2@auction.com');

    const orgRes = await request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ name: 'Test Org' });
    const org = orgRes.body;

    await request(app.getHttpServer())
      .post(`/organizations/${org.id}/members`)
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ userId: member1.user?.id, role: 'MEMBER' });

    await request(app.getHttpServer())
      .post(`/organizations/${org.id}/members`)
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ userId: member2.user?.id, role: 'MEMBER' });

    // 2. Create AUCTION Tontine
    const createRes = await request(app.getHttpServer())
      .post('/tontines')
      .set('Authorization', `Bearer ${creator.token}`)
      .send({
        organizationId: org.id,
        name: 'Auction Njangi',
        type: 'AUCTION',
        currency: 'XAF',
        ruleSet: {
          contribution: {
            amountPerShare: 50000,
            frequency: { unit: 'MONTH', interval: 1 },
          },
          beneficiary: { order: 'FIXED' }, // order is ignored for auction, but required by DTO
        },
      })
      .expect(201);
    const tontineId = createRes.body.id;

    // 3. Add members
    await request(app.getHttpServer())
      .post(`/tontines/${tontineId}/members`)
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ userId: member1.user.id, role: 'MEMBER' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/tontines/${tontineId}/members`)
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ userId: member2.user.id, role: 'MEMBER' })
      .expect(201);

    // 4. Activate
    await request(app.getHttpServer())
      .post(`/tontines/${tontineId}/activate`)
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ startDate: new Date().toISOString() })
      .expect(201);

    // Fetch rounds
    const roundsRes = await request(app.getHttpServer())
      .get(`/tontines/${tontineId}/rounds`)
      .set('Authorization', `Bearer ${creator.token}`)
      .expect(200);
    const round1 = roundsRes.body[0];

    // 5. Pay Contributions
    const membersRes = await request(app.getHttpServer())
      .get(`/tontines/${tontineId}/members`)
      .set('Authorization', `Bearer ${creator.token}`)
      .expect(200);
    const presidentMembership = membersRes.body.find(
      (m) => m.userId === creator.user.id,
    );
    const m1Membership = membersRes.body.find(
      (m) => m.userId === member1.user.id,
    );
    const m2Membership = membersRes.body.find(
      (m) => m.userId === member2.user.id,
    );

    await request(app.getHttpServer())
      .post(`/tontines/${tontineId}/contribute`)
      .set('Authorization', `Bearer ${creator.token}`)
      .send({
        roundId: round1.id,
        membershipId: presidentMembership.id,
        amount: 50000,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/tontines/${tontineId}/contribute`)
      .set('Authorization', `Bearer ${member1.token}`)
      .send({
        roundId: round1.id,
        membershipId: m1Membership.id,
        amount: 50000,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/tontines/${tontineId}/contribute`)
      .set('Authorization', `Bearer ${member2.token}`)
      .send({
        roundId: round1.id,
        membershipId: m2Membership.id,
        amount: 50000,
      })
      .expect(201);

    // 6. Bidding
    // Member 1 bids 10000
    await request(app.getHttpServer())
      .post(`/tontines/${tontineId}/rounds/${round1.id}/bids`)
      .set('Authorization', `Bearer ${member1.token}`)
      .send({ discountAmount: 10000 })
      .expect(201);

    // Member 2 bids 20000
    await request(app.getHttpServer())
      .post(`/tontines/${tontineId}/rounds/${round1.id}/bids`)
      .set('Authorization', `Bearer ${member2.token}`)
      .send({ discountAmount: 20000 })
      .expect(201);

    // 7. Resolve Round (COLLECTING -> READY)
    await request(app.getHttpServer())
      .post(`/tontines/${tontineId}/rounds/${round1.id}/resolve`)
      .set('Authorization', `Bearer ${creator.token}`)
      .expect(200);

    // 8. Payout
    // Member 2 should be the winner, payout should be 3 * 50000 - 20000 = 130000
    await request(app.getHttpServer())
      .post(`/tontines/${tontineId}/payout`)
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ roundId: round1.id })
      .expect(201);

    // Verify dividend fund balance
    const [dbFund] = await connection.query(
      `SELECT * FROM funds WHERE tontineId = ? AND type = ?`,
      [tontineId, FundType.DIVIDEND],
    );
    expect(Number(dbFund.cachedBalance)).toBe(20000);
    expect(Number(dividendFund[0].cached_balance)).toBe(20000); // Wait, Postgres query? Actually we are using TypeORM with MySQL!

    // The test DB might be mysql.
    // Close cycle (distribute dividends if last round, but this is only round 1 of 3)
  });
});
