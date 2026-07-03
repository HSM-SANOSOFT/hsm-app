import { Test, TestingModule } from '@nestjs/testing';
import * as puppeteerCore from 'puppeteer-core';
import { GenerationService } from './generation.service';

const mockBrowserClose = jest.fn();
const mockNewPage = jest.fn();

function makeMockPage(
  pdfResult: Buffer | Error = Buffer.from('%PDF-1.4 fake'),
) {
  return {
    setJavaScriptEnabled: jest.fn().mockResolvedValue(undefined),
    setContent: jest.fn().mockResolvedValue(undefined),
    emulateMediaType: jest.fn().mockResolvedValue(undefined),
    pdf: jest
      .fn()
      .mockImplementation(() =>
        pdfResult instanceof Error
          ? Promise.reject(pdfResult)
          : Promise.resolve(pdfResult),
      ),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

jest.mock('@sparticuz/chromium-min', () => ({
  __esModule: true,
  default: {
    args: ['--no-sandbox'],
    defaultViewport: null,
    executablePath: jest.fn().mockResolvedValue('/fake/chromium'),
    headless: true,
  },
}));

jest.mock('puppeteer-core', () => ({
  launch: jest.fn(),
}));

describe('GenerationService', () => {
  let service: GenerationService;

  const puppeteer = puppeteerCore as unknown as { launch: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockNewPage.mockImplementation(async () => makeMockPage());
    mockBrowserClose.mockResolvedValue(undefined);

    puppeteer.launch.mockResolvedValue({
      newPage: mockNewPage,
      close: mockBrowserClose,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [GenerationService],
    }).compile();

    service = module.get<GenerationService>(GenerationService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePDF', () => {
    it('returns a non-empty Buffer for valid HTML', async () => {
      const result = await service.generatePDF(
        '<html><body>test</body></html>',
      );
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('second sequential call also succeeds — page returned to pool', async () => {
      const first = await service.generatePDF('<html>first</html>');
      const second = await service.generatePDF('<html>second</html>');
      expect(first).toBeInstanceOf(Buffer);
      expect(second).toBeInstanceOf(Buffer);
    });

    it('releases the page to the pool even when pdf() throws', async () => {
      // Override pdf() on next created page to reject — page creation itself succeeds
      mockNewPage.mockImplementationOnce(() => {
        const page = makeMockPage();
        page.pdf.mockRejectedValueOnce(new Error('render failed'));
        return page;
      });

      await expect(service.generatePDF('<html></html>')).rejects.toThrow(
        'render failed',
      );

      // Pool must still be usable after the error
      const result = await service.generatePDF('<html>recovery</html>');
      expect(result).toBeInstanceOf(Buffer);
    });

    it('handles two concurrent calls without error', async () => {
      const [a, b] = await Promise.all([
        service.generatePDF('<html>doc A</html>'),
        service.generatePDF('<html>doc B</html>'),
      ]);
      expect(a).toBeInstanceOf(Buffer);
      expect(b).toBeInstanceOf(Buffer);
    });
  });

  describe('onModuleDestroy', () => {
    it('closes the browser without throwing', async () => {
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
      expect(mockBrowserClose).toHaveBeenCalled();
    });
  });
});
