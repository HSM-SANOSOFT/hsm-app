import { Test, TestingModule } from '@nestjs/testing';
import * as ExcelJS from 'exceljs';
import {
  ExcelGenerationService,
  WorkbookDefinition,
} from './excel-generation.service';

describe('ExcelGenerationService', () => {
  let service: ExcelGenerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExcelGenerationService],
    }).compile();

    service = module.get<ExcelGenerationService>(ExcelGenerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generate', () => {
    const singleSheetDefinition: WorkbookDefinition = {
      sheets: [
        {
          name: 'Pacientes',
          columns: [
            { header: 'Nombre', key: 'name', width: 30 },
            { header: 'Fecha', key: 'date', width: 15 },
          ],
          rows: [
            { name: 'Ada Lovelace', date: '2026-01-01' },
            { name: 'Grace Hopper', date: '2026-02-15' },
            { name: 'Alan Turing', date: '2026-03-10' },
          ],
        },
      ],
    };

    it('returns a non-empty Buffer for a single sheet', async () => {
      const result = await service.generate(singleSheetDefinition);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('produced XLSX contains the correct row count', async () => {
      const result = await service.generate(singleSheetDefinition);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(result);
      const sheet = workbook.getWorksheet('Pacientes');
      expect(sheet).toBeDefined();
      // Row 1 is headers; rows 2-4 are data
      expect(sheet!.rowCount).toBe(4);
    });

    it('produces a workbook with the correct number of worksheets for multiple sheets', async () => {
      const multiSheet: WorkbookDefinition = {
        sheets: [
          {
            name: 'Hoja1',
            columns: [{ header: 'Col', key: 'col' }],
            rows: [{ col: 'val' }],
          },
          {
            name: 'Hoja2',
            columns: [{ header: 'Otro', key: 'otro' }],
            rows: [{ otro: 'x' }],
          },
        ],
      };
      const result = await service.generate(multiSheet);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(result);
      expect(workbook.worksheets.length).toBe(2);
    });

    it('produces a valid XLSX with 0 data rows (headers only)', async () => {
      const emptyRows: WorkbookDefinition = {
        sheets: [
          {
            name: 'Vacio',
            columns: [
              { header: 'Col A', key: 'a' },
              { header: 'Col B', key: 'b' },
            ],
            rows: [],
          },
        ],
      };
      const result = await service.generate(emptyRows);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(result);
      const sheet = workbook.getWorksheet('Vacio');
      expect(sheet).toBeDefined();
      // Only header row
      expect(sheet!.rowCount).toBe(1);
    });

    it('creates worksheet without error when column width is undefined', async () => {
      const noWidth: WorkbookDefinition = {
        sheets: [
          {
            name: 'SinAncho',
            columns: [{ header: 'Nombre', key: 'name' }],
            rows: [{ name: 'Test' }],
          },
        ],
      };
      await expect(service.generate(noWidth)).resolves.toBeInstanceOf(Buffer);
    });
  });
});
