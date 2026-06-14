import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Charge l'environnement de test (DB) avant tout.
dotenv.config({ path: resolve(__dirname, '../../.env.test') });

import { Client } from 'pg';

/**
 * Test de concurrence du Ledger — à lancer "à la demande" contre un serveur
 * NKAP démarré (`npm run start`), via `npm run test:load`.
 *
 * Valide deux invariants money-app sous charge concurrente (cf. SYNC, Antigravity) :
 *   1. Idempotence : N requêtes identiques (même `Idempotency-Key`) => 1×201 et (N-1)×409.
 *   2. Pas de lost update : N contributions distinctes de montant X => le solde de la
 *      caisse MAIN augmente d'exactement N×X (aucune écriture perdue).
 *
 * Env : BASE_URL (def http://localhost:3000), CONCURRENCY (def 100), AMOUNT (def 1000),
 *       DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME (def via .env.test).
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const N = Number(process.env.CONCURRENCY ?? '100');
const X = Number(process.env.AMOUNT ?? '1000');

interface PostResult {
  status: number;
  body: any;
}

function rand(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function post(
  path: string,
  body: unknown,
  token?: string,
  idemKey?: string,
): Promise<PostResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (idemKey) headers['Idempotency-Key'] = idemKey;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, body: json };
}

function tally(results: PostResult[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const r of results) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return counts;
}

async function fundBalance(db: Client, fundId: string): Promise<number> {
  const r = await db.query<{ cachedBalance: string }>(
    `SELECT "cachedBalance" FROM funds WHERE id = $1`,
    [fundId],
  );
  const row = r.rows[0];
  if (!row) throw new Error('Caisse MAIN introuvable');
  return Number(row.cachedBalance);
}

async function main(): Promise<void> {
  console.log(`[load] cible=${BASE_URL} concurrence=${N} montant=${X}`);

  // --- 1. Setup complet via l'API (parcours réel) ---
  const phone = `+2376${Math.floor(10000000 + Math.random() * 89999999)}`;
  const reg = await post('/auth/register', {
    phone,
    fullName: 'Load Tester',
    password: 'StrongPass123!',
  });
  const token: string = reg.body?.accessToken;
  if (!token) throw new Error(`register a échoué: ${JSON.stringify(reg)}`);

  const org = await post('/organizations', { name: 'Load Org' }, token);
  const organizationId: string = org.body?.id;

  const ruleSet = {
    contribution: {
      amountPerShare: X,
      frequency: { interval: 1, unit: 'MONTH' },
      allowAdvance: false,
    },
    beneficiary: { order: 'FIXED', allowSwap: false },
    penalty: { type: 'FIXED', value: 0, graceDays: 0 },
  };
  const ton = await post(
    '/tontines',
    {
      organizationId,
      name: 'Load Tontine',
      type: 'ROTATING',
      currency: 'XAF',
      ruleSet,
    },
    token,
  );
  const tontineId: string = ton.body?.id;
  if (!tontineId)
    throw new Error(`create tontine a échoué: ${JSON.stringify(ton)}`);

  const act = await post(`/tontines/${tontineId}/activate`, {}, token);
  if (act.status !== 201)
    throw new Error(`activate a échoué: ${JSON.stringify(act)}`);

  // --- 2. Introspection DB (récupère les IDs nécessaires) ---
  const db = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? '5432'),
    user: process.env.DB_USER ?? 'nkap',
    password: process.env.DB_PASSWORD ?? 'nkap',
    database: process.env.DB_NAME ?? 'nkap_test',
  });
  await db.connect();

  const mem = await db.query<{ id: string }>(
    `SELECT id FROM memberships WHERE "tontineId" = $1 AND role = 'PRESIDENT' LIMIT 1`,
    [tontineId],
  );
  const round = await db.query<{ id: string }>(
    `SELECT id FROM rounds WHERE "tontineId" = $1 ORDER BY index ASC LIMIT 1`,
    [tontineId],
  );
  const fund = await db.query<{ id: string }>(
    `SELECT id FROM funds WHERE "tontineId" = $1 AND type = 'MAIN' LIMIT 1`,
    [tontineId],
  );
  const membershipId = mem.rows[0]?.id;
  const roundId = round.rows[0]?.id;
  const fundId = fund.rows[0]?.id;
  if (!membershipId || !roundId || !fundId) {
    await db.end();
    throw new Error(
      'Introspection DB incomplète (membership/round/fund manquant)',
    );
  }

  let failures = 0;

  // --- 3. Invariant 1 : idempotence (même clé) ---
  const idemKey = `LOAD-IDEM-${rand()}`;
  const idemResults = await Promise.all(
    Array.from({ length: N }, () =>
      post(
        `/tontines/${tontineId}/contribute`,
        { roundId, membershipId, amount: X },
        token,
        idemKey,
      ),
    ),
  );
  const idemCounts = tally(idemResults);
  const tx = await db.query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM ledger_transactions WHERE "idempotencyKey" = $1`,
    [idemKey],
  );
  const dbTx = tx.rows[0]?.c ?? -1;
  const idemPass =
    (idemCounts[201] ?? 0) === 1 &&
    (idemCounts[409] ?? 0) === N - 1 &&
    dbTx === 1;
  console.log(
    `\n[Invariant 1 — Idempotence] ${idemPass ? '✓ PASS' : '✗ FAIL'}`,
  );
  console.log(
    `  réponses: ${JSON.stringify(idemCounts)} (attendu 201=1, 409=${N - 1})`,
  );
  console.log(`  transactions en DB pour la clé: ${dbTx} (attendu 1)`);
  if (!idemPass) failures++;

  // --- 4. Invariant 2 : pas de lost update (clés distinctes) ---
  const before = await fundBalance(db, fundId);
  const distinct = await Promise.all(
    Array.from({ length: N }, () =>
      post(
        `/tontines/${tontineId}/contribute`,
        { roundId, membershipId, amount: X },
        token,
        `LOAD-UNIQ-${rand()}`,
      ),
    ),
  );
  const distinctCounts = tally(distinct);
  const after = await fundBalance(db, fundId);
  const delta = after - before;
  const balancePass = (distinctCounts[201] ?? 0) === N && delta === N * X;
  console.log(
    `\n[Invariant 2 — Pas de lost update] ${balancePass ? '✓ PASS' : '✗ FAIL'}`,
  );
  console.log(
    `  réponses: ${JSON.stringify(distinctCounts)} (attendu 201=${N})`,
  );
  console.log(
    `  solde MAIN: ${before} -> ${after} (delta=${delta}, attendu=${N * X})`,
  );
  if (!balancePass) failures++;

  await db.end();

  console.log(
    `\n=== ${failures === 0 ? 'TOUS LES INVARIANTS OK ✓' : `${failures} INVARIANT(S) EN ÉCHEC ✗`} ===`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('[load] erreur fatale:', err);
  process.exit(1);
});
