const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-ci';
process.env.PORT = process.env.PORT || '3000';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.CI === 'true'
      ? 'postgres://gympatico_test_user:SecretPassword2026@localhost:5432/gympatico_test_db'
      : 'postgres://gymadmin:mysecretpassword@localhost:5433/gympatico_dev';
}

const app = require('../index');
const {
  resetDatabase,
  seedExercises,
  getExerciseIdByName,
  closePool,
} = require('./helpers');

const uniqueEmail = () => `test_${Date.now()}_${Math.random().toString(36).slice(2)}@gympatico.test`;

async function registerAndLogin(agent, { email, password = 'TestPass2026!', nick = 'Tester' } = {}) {
  const userEmail = email || uniqueEmail();

  await agent
    .post('/api/auth/register')
    .send({ email: userEmail, password, nick })
    .expect(201);

  const loginRes = await agent
    .post('/api/auth/login')
    .send({ email: userEmail, password })
    .expect(200);

  return { email: userEmail, token: loginRes.body.token };
}

describe('GymPatico API', () => {
  before(async () => {
    await resetDatabase();
    await seedExercises();
  });

  beforeEach(async () => {
    await resetDatabase();
    await seedExercises();
  });

  after(async () => {
    await closePool();
  });

  describe('GET /api/health', () => {
    it('returns ok', async () => {
      const res = await request(app).get('/api/health').expect(200);
      assert.equal(res.body.ok, true);
    });
  });

  describe('POST /api/auth/register', () => {
    it('creates a user with valid payload', async () => {
      const email = uniqueEmail();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'ValidPass99!', nick: 'ApiBot' })
        .expect(201);

      assert.match(res.body.message, /zarejestrowany/i);
      assert.equal(res.body.user.email, email);
    });

    it('rejects missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: uniqueEmail(), password: 'ValidPass99!' })
        .expect(400);

      assert.ok(res.body.error);
    });

    it('rejects duplicate email', async () => {
      const email = uniqueEmail();
      await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'ValidPass99!', nick: 'First' })
        .expect(201);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'ValidPass99!', nick: 'Second' })
        .expect(400);

      assert.match(res.body.error, /zajęty/i);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns JWT for valid credentials', async () => {
      const email = uniqueEmail();
      const password = 'ValidPass99!';

      await request(app)
        .post('/api/auth/register')
        .send({ email, password, nick: 'LoginBot' })
        .expect(201);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

      assert.ok(res.body.token);
      assert.equal(res.body.user.email, email);
    });

    it('returns 401 for wrong password', async () => {
      const email = uniqueEmail();
      await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'ValidPass99!', nick: 'WrongPass' })
        .expect(201);

      await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'WrongPassword!' })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('requires authentication', async () => {
      await request(app).get('/api/auth/me').expect(401);
    });

    it('returns profile for authenticated user', async () => {
      const agent = request.agent(app);
      const { token } = await registerAndLogin(agent);

      const res = await agent
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assert.equal(res.body.nick, 'Tester');
      assert.ok(res.body.email);
    });
  });

  describe('GET /api/exercises', () => {
    it('requires authentication', async () => {
      await request(app).get('/api/exercises').expect(401);
    });

    it('returns seeded atlas exercises', async () => {
      const agent = request.agent(app);
      const { token } = await registerAndLogin(agent);

      const res = await agent
        .get('/api/exercises')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length >= 2);
    });
  });

  describe('POST /api/workouts', () => {
    it('saves a workout with series', async () => {
      const agent = request.agent(app);
      const { token } = await registerAndLogin(agent);
      const exerciseId = await getExerciseIdByName('Wyciskanie sztangi%');
      assert.ok(exerciseId, 'seed exercise missing');

      const res = await agent
        .post('/api/workouts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test push day',
          comment: 'API test',
          series: [{ exerciseId, weight: 60, reps: 10, order: 1 }],
        })
        .expect(201);

      assert.ok(res.body.sessionId);
      assert.match(res.body.message, /zapisany/i);
    });

    it('rejects empty series', async () => {
      const agent = request.agent(app);
      const { token } = await registerAndLogin(agent);

      await agent
        .post('/api/workouts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Empty workout', series: [] })
        .expect(400);
    });
  });

  describe('GET /api/workouts', () => {
    it('lists saved workouts for the user', async () => {
      const agent = request.agent(app);
      const { token } = await registerAndLogin(agent);
      const exerciseId = await getExerciseIdByName('Wyciskanie sztangi%');

      await agent
        .post('/api/workouts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Listed workout',
          series: [{ exerciseId, weight: 50, reps: 8, order: 1 }],
        })
        .expect(201);

      const res = await agent
        .get('/api/workouts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assert.ok(Array.isArray(res.body.workouts));
      assert.equal(res.body.workouts.length, 1);
      assert.equal(res.body.workouts[0].name, 'Listed workout');
    });
  });
});
