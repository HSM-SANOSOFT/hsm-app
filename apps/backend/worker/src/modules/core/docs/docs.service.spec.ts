import { S3Service } from '@hsm/storage/s3/s3.service';
import { Test, TestingModule } from '@nestjs/testing';
import { DocsService } from './docs.service';

describe('DocsService', () => {
  let service: DocsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocsService,
        { provide: S3Service, useValue: { getFilesStreams: jest.fn() } },
      ],
    }).compile();

    service = module.get<DocsService>(DocsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
