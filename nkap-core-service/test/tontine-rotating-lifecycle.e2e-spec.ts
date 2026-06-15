import { E2eTestHelper } from './helpers/e2e-test.helper';
import request from 'supertest';
import { App } from 'supertest/types';
import { TontineType } from '../src/common/enums';

/**
 * Cycle de vie ROTATING complet (P1) : 2 membres, 2 rounds. Pour chaque round :
 * contributions des 2 membres → payout → closeCycle (PAID→CLOSED + ouverture du
 * suivant). Après le dernier round, la tontine passe COMPLETED.
 * Couvre les transitions et `closeCycle` que le lifecycle e2e existant ne testait pas.
 */
describe('Cycle de vie ROTATING complet (e2e)', () => {
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

  const register = async (phone: string) => {
    const res = await request(server)
      .post('/auth/register')
      .send({ phone, fullName: `User ${phone}`, password: 'StrongPass123!' })
      .expect(201);
    return {
      token: res.body.accessToken as string,
      userId: res.body.user.id as string,
    };
  };
  const auth = (t: string) => ['Authorization', `Bearer ${t}`] as const;

  it('déroule 2 cycles complets jusqu’à COMPLETED', async () => {
    const pres = await register('+237600000001');
    const m2 = await register('+237600000002');

    const org = await request(server)
      .post('/organizations')
      .set(...auth(pres.token))
      .send({ name: 'Org Rotative' })
      .expect(201);

    const ruleSet = {
      contribution: {
        amountPerShare: 1000,
        frequency: { interval: 1, unit: 'MONTH' },
        allowAdvance: false,
      },
      beneficiary: { order: 'FIXED', allowSwap: false },
      penalty: { type: 'FIXED', value: 0, graceDays: 0 },
    };
    const ton = await request(server)
      .post('/tontines')
      .set(...auth(pres.token))
      .send({
        organizationId: org.body.id,
        name: 'Rotative',
        type: TontineType.ROTATING,
        currency: 'XAF',
        ruleSet,
      })
      .expect(201);
    const tontineId = ton.body.id as string;

    await request(server)
      .post(`/tontines/${tontineId}/members`)
      .set(...auth(pres.token))
      .send({ userId: m2.userId })
      .expect(201);

    await request(server)
      .post(`/tontines/${tontineId}/activate`)
      .set(...auth(pres.token))
      .send({})
      .expect(201);

    const membersRes = await request(server)
      .get(`/tontines/${tontineId}/members`)
      .set(...auth(pres.token))
      .expect(200);
    const presM = membersRes.body.find((m: any) => m.userId === pres.userId);
    const m2M = membersRes.body.find((m: any) => m.userId === m2.userId);

    const roundsRes = await request(server)
      .get(`/tontines/${tontineId}/rounds`)
      .set(...auth(pres.token))
      .expect(200);
    const rounds = [...roundsRes.body].sort(
      (a: any, b: any) => a.index - b.index,
    );
    expect(rounds).toHaveLength(2);
    expect(rounds[0].status).toBe('COLLECTING');

    const contribute = (token: string, membershipId: string, roundId: string) =>
      request(server)
        .post(`/tontines/${tontineId}/contribute`)
        .set(...auth(token))
        .send({ roundId, membershipId, amount: 1000 })
        .expect(201);

    const runCycle = async (roundId: string) => {
      await contribute(pres.token, presM.id, roundId);
      await contribute(m2.token, m2M.id, roundId);
      await request(server)
        .post(`/tontines/${tontineId}/payout`)
        .set(...auth(pres.token))
        .send({ roundId })
        .expect(201);
      await request(server)
        .post(`/tontines/${tontineId}/rounds/${roundId}/close`)
        .set(...auth(pres.token))
        .expect(201);
    };

    // --- Cycle 1 ---
    await runCycle(rounds[0].id);
    const r2 = await request(server)
      .get(`/tontines/${tontineId}/rounds/${rounds[1].id}`)
      .set(...auth(pres.token))
      .expect(200);
    expect(r2.body.status).toBe('COLLECTING'); // le suivant s'est ouvert

    // --- Cycle 2 (dernier) ---
    await runCycle(rounds[1].id);

    const tonFinal = await request(server)
      .get(`/tontines/${tontineId}`)
      .set(...auth(pres.token))
      .expect(200);
    expect(tonFinal.body.status).toBe('COMPLETED');
  });
});
