import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DocsController } from './docs.controller';
import { DocsService } from './docs.service';

describe('docsController', () => {
  let controller: DocsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocsController],
      providers: [
        {
          provide: DocsService,
          useValue: {
            generateDocument: jest.fn(),
            getDocument: jest.fn(),
            getDocumentUrl: jest.fn(),
            deleteDocument: jest.fn(),
            getDocumentsUrl: jest.fn(),
            uploadDocuments: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DocsController>(DocsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
