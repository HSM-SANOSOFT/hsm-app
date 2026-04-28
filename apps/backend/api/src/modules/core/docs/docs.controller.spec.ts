import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DocsController } from './docs.controller';

describe('docsController', () => {
  let controller: DocsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocsController],
    }).compile();

    controller = module.get<DocsController>(DocsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
