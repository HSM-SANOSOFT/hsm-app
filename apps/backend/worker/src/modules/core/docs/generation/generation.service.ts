import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class GenerationService implements OnModuleInit, OnModuleDestroy {
  private browser!: puppeteer.Browser;

  async onModuleInit() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async onModuleDestroy() {
    await this.browser?.close();
  }

  async generatePDF(html: string) {
    const page = await this.browser.newPage();
    try {
      await page.setJavaScriptEnabled(false);
      await page.setContent(html, {
        timeout: 0,
        waitUntil: 'networkidle0',
      });
      const margin: puppeteer.PDFMargin = {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px',
      };
      const headerTemplate = '';
      const footerTemplate = '';
      await page.emulateMediaType('print');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        preferCSSPageSize: true,
        printBackground: true,
        margin,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
      });

      return pdfBuffer;
    } finally {
      await page.close();
    }
  }
}
