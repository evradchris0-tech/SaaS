import { E2eTestHelper } from './helpers/e2e-test.helper';
import request from 'supertest';
import { App } from 'supertest/types';
import { FundType, TontineType } from '../src/common/enums';
import { Fund } from '../src/modules/tontine/fund.entity';
import { LedgerTransaction } from '../src/modules/ledger/ledger-transaction.entity';

/**
 * Cycle de vie AUCTION complet (P2) : 3 membres, 3 rounds. Pour chaque round :
 * cotisations (le pot) → enchères scellées → résolution (le plus fort escompte
 * gagne) → décaissement (pot − escompte) → clôture. Les escomptes s'accumulent
 * dans la caisse DIVIDEND, redistribuée à parts égales au dernier round.
 *
 * Vérifie les invariants financiers de bout en bout :
 *  - décaissement = pot − escompte gagnant (et non « une seule part ») ;
 *  - l'escompte alimente bien la caisse DIVIDEND ;
 *  - en fin de tontine, le dividende est réparti et la caisse DIVIDEND tombe à 0
 *    (reliquat de division entière compris) ;
 *  - la caisse MAIN est soldée à 0.
 */
describe('Cycle de vie AUCTION complet (e2e)', () => {
  const helper = new E2eTestHelper();
  let server: App;

  const AMOUNT = 50000; // cotisation par part
  const MEMBERS = 3;
  const POT = AMOUNT * MEMBERS; // 150 000

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

  const fundBalance = async (tontineId: string, type: FundType) => {
    const fund = await helper.dataSource
      .getRepository(Fund)
      .findOne({ where: { tontineId, type } });
    return fund ? Number(fund.cachedBalance) : null;
  };

  it('déroule 3 enchères puis distribue les dividendes jusqu’à COMPLETED', async () => {
    const pres = await register('+237610000001');
    const m1 = await register('+237610000002');
    const m2 = await register('+237610000003');

    const org = await request(server)
      .post('/organizations')
      .set(...auth(pres.token))
      .send({ name: 'Org Enchères' })
      .expect(201);

    const ruleSet = {
      contribution: {
        amountPerShare: AMOUNT,
        frequency: { interval: 1, unit: 'MONTH' },
        allowAdvance: false,
      },
      // `order` est ignoré par la stratégie AUCTION mais requis par le DTO.
      beneficiary: { order: 'AUCTION', allowSwap: false },
      penalty: { type: 'FIXED', value: 0, graceDays: 0 },
    };
    const ton = await request(server)
      .post('/tontines')
      .set(...auth(pres.token))
      .send({
        organizationId: org.body.id,
        name: 'Njangi à enchères',
        type: TontineType.AUCTION,
        currency: 'XAF',
        ruleSet,
      })
      .expect(201);
    const tontineId = ton.body.id as string;

    // La caisse DIVIDEND doit exister dès la création d'une tontine AUCTION.
    expect(await fundBalance(tontineId, FundType.DIVIDEND)).toBe(0);

    await request(server)
      .post(`/tontines/${tontineId}/members`)
      .set(...auth(pres.token))
      .send({ userId: m1.userId })
      .expect(201);
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
    const m1M = membersRes.body.find((m: any) => m.userId === m1.userId);
    const m2M = membersRes.body.find((m: any) => m.userId === m2.userId);

    const roundsRes = await request(server)
      .get(`/tontines/${tontineId}/rounds`)
      .set(...auth(pres.token))
      .expect(200);
    const rounds = [...roundsRes.body].sort(
      (a: any, b: any) => a.index - b.index,
    );
    expect(rounds).toHaveLength(MEMBERS);

    const contribute = (token: string, membershipId: string, roundId: string) =>
      request(server)
        .post(`/tontines/${tontineId}/contribute`)
        .set(...auth(token))
        .send({ roundId, membershipId, amount: AMOUNT })
        .expect(201);

    const placeBid = (token: string, roundId: string, discountAmount: number) =>
      request(server)
        .post(`/tontines/${tontineId}/rounds/${roundId}/bids`)
        .set(...auth(token))
        .send({ discountAmount })
        .expect(201);

    const resolve = (roundId: string) =>
      request(server)
        .post(`/tontines/${tontineId}/rounds/${roundId}/resolve`)
        .set(...auth(pres.token))
        .expect(201);

    const payout = (roundId: string) =>
      request(server)
        .post(`/tontines/${tontineId}/payout`)
        .set(...auth(pres.token))
        .send({ roundId })
        .expect(201);

    const close = (roundId: string) =>
      request(server)
        .post(`/tontines/${tontineId}/rounds/${roundId}/close`)
        .set(...auth(pres.token))
        .expect(201);

    const contributeAll = async (roundId: string) => {
      await contribute(pres.token, presM.id, roundId);
      await contribute(m1.token, m1M.id, roundId);
      await contribute(m2.token, m2M.id, roundId);
    };

    // --- Round 1 : m2 propose le plus fort escompte (20 000) → gagne ---
    await contributeAll(rounds[0].id);
    expect(await fundBalance(tontineId, FundType.MAIN)).toBe(POT);

    await placeBid(m1.token, rounds[0].id, 10000);
    await placeBid(m2.token, rounds[0].id, 20000);
    await resolve(rounds[0].id);

    const r1 = await request(server)
      .get(`/tontines/${tontineId}/rounds/${rounds[0].id}`)
      .set(...auth(pres.token))
      .expect(200);
    expect(r1.body.beneficiaryMembershipId).toBe(m2M.id); // plus fort escompte

    const payoutRes = await payout(rounds[0].id);
    // Décaissement = pot − escompte = 150 000 − 20 000 = 130 000 (PAS 30 000).
    expect(Number(payoutRes.body.amount)).toBe(POT - 20000);
    expect(await fundBalance(tontineId, FundType.MAIN)).toBe(0);
    expect(await fundBalance(tontineId, FundType.DIVIDEND)).toBe(20000);
    await close(rounds[0].id);

    // --- Round 2 : m2 a déjà gagné ; m1 enchérit 11 000 et gagne ---
    await contributeAll(rounds[1].id);
    await placeBid(m1.token, rounds[1].id, 11000);
    await resolve(rounds[1].id);

    const payout2 = await payout(rounds[1].id);
    expect(Number(payout2.body.amount)).toBe(POT - 11000); // 139 000
    expect(await fundBalance(tontineId, FundType.MAIN)).toBe(0);
    expect(await fundBalance(tontineId, FundType.DIVIDEND)).toBe(31000);
    await close(rounds[1].id);

    // --- Round 3 (dernier) : seul le président est éligible, sans enchère ---
    await contributeAll(rounds[2].id);
    await resolve(rounds[2].id);

    const r3 = await request(server)
      .get(`/tontines/${tontineId}/rounds/${rounds[2].id}`)
      .set(...auth(pres.token))
      .expect(200);
    expect(r3.body.beneficiaryMembershipId).toBe(presM.id); // dernier éligible

    const payout3 = await payout(rounds[2].id);
    expect(Number(payout3.body.amount)).toBe(POT); // aucun escompte
    await close(rounds[2].id);

    // --- Vérifications de fin de tontine ---
    const tonFinal = await request(server)
      .get(`/tontines/${tontineId}`)
      .set(...auth(pres.token))
      .expect(200);
    expect(tonFinal.body.status).toBe('COMPLETED');

    // La caisse DIVIDEND est vidée à EXACTEMENT 0 (reliquat compris).
    expect(await fundBalance(tontineId, FundType.DIVIDEND)).toBe(0);
    // La caisse MAIN est soldée.
    expect(await fundBalance(tontineId, FundType.MAIN)).toBe(0);

    // 31 000 répartis entre 3 membres : 10 333 ×2 + 10 334 ×1 (somme = 31 000).
    const dividendTxs = await helper.dataSource
      .getRepository(LedgerTransaction)
      .find({ where: { tontineId, reference: 'Dividendes fin de cycle' } });
    expect(dividendTxs).toHaveLength(MEMBERS);
    const amounts = dividendTxs.map((t) => Number(t.amount));
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(31000);
    amounts.forEach((a) => expect([10333, 10334]).toContain(a));
  });
});
