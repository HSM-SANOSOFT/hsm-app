import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GenerationService } from './../src/modules/core/docs/generation/generation.service';
import { WorkerModule } from './../src/worker.module';

// Oracle-free boot regression (pg-native foundation, U3).
//
// The worker has no HTTP server (main.ts uses createApplicationContext), so the
// assertion is that the WorkerModule DI graph compiles and initializes: the
// global DatabaseModule (Postgres only — no Oracle datasource), QueueModule
// (BullMQ/Redis), and the CoreModule processors all come up with NO DB_ORACLE_*
// and no Oracle host reachable. A re-introduced eager Oracle dependency would
// hang / ORA-12170 in init() here.
//
// GenerationService.onModuleInit() eagerly launches a headless Chromium via
// puppeteer (downloading the binary) — a heavy, network-bound boot step unrelated
// to the Oracle question that would hang CI. It is stubbed so the rest of the
// worker still boots for real (DB + Redis connections included).
describe('Worker bootstrap (e2e) — boots Oracle-free', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WorkerModule],
    })
      .overrideProvider(GenerationService)
      .useValue({
        onModuleInit: async () => undefined,
        onModuleDestroy: async () => undefined,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('initializes the worker DI graph', () => {
    expect(app).toBeDefined();
  });
});
