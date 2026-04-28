import { Test, TestingModule } from '@nestjs/testing';
import { ComsService } from './coms.service';

describe('ComsService', () => {
  let service: ComsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComsService],
    }).compile();

    service = module.get<ComsService>(ComsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
