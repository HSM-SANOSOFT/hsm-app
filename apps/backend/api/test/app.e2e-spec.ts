import type { INestApplication } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { MainModule } from './../src/main.module';

// Oracle-free boot regression (pg-native foundation, U3).
//
// Compiling + initializing MainModule is the assertion: it wires the global
// DatabaseModule (Postgres only — no Oracle datasource), connects Redis (BullMQ)
// and RustFS (S3 ensureBuckets) at init, and seeds the default admin. If an eager
// Oracle boot dependency were re-introduced, `app.init()` would hang / ORA-12170
// here with no Oracle host reachable. The CI job (pr-validation integration-tests)
// runs this against postgres+redis+rustfs with NO DB_ORACLE_* and no Oracle host.
describe('App bootstrap (e2e) — boots Oracle-free', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MainModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mirror main.ts URI versioning so routes resolve at /v1/* as in production.
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('serves the pg-native health endpoint (proves the app booted)', () => {
    return request(app.getHttpServer()).get('/v1/health').expect(200);
  });
});
