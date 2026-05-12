import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface WorkbookColumnDefinition {
  header: string;
  key: string;
  width?: number;
}

export interface WorkbookSheetDefinition {
  name: string;
  columns: WorkbookColumnDefinition[];
  rows: Record<string, unknown>[];
}

export interface WorkbookDefinition {
  sheets: WorkbookSheetDefinition[];
}

@Injectable()
export class ExcelGenerationService {
  async generate(definition: WorkbookDefinition): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    for (const sheet of definition.sheets) {
      const worksheet = workbook.addWorksheet(sheet.name);
      worksheet.columns = sheet.columns.map(col => ({
        header: col.header,
        key: col.key,
        width: col.width,
      }));
      for (const row of sheet.rows) {
        worksheet.addRow(row);
      }
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
