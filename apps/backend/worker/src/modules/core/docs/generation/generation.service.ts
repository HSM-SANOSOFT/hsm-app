import chromium from '@sparticuz/chromium-min';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createPool, Pool } from 'generic-pool';
import * as puppeteer from 'puppeteer-core';

const POOL_MAX = 4;

@Injectable()
export class GenerationService implements OnModuleInit, OnModuleDestroy {
  private browser!: puppeteer.Browser;
  private pagePool!: Pool<puppeteer.Page>;

  async onModuleInit() {
    this.browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    this.pagePool = createPool<puppeteer.Page>(
      {
        create: async () => {
          const page = await this.browser.newPage();
          await page.setJavaScriptEnabled(false);
          return page;
        },
        destroy: async (page) => {
          await page.close();
        },
      },
      { min: 0, max: POOL_MAX },
    );
  }

  async onModuleDestroy() {
    await this.pagePool?.drain();
    await this.pagePool?.clear();
    await this.browser?.close();
  }

  async generatePDF(html: string): Promise<Buffer> {
    const page = await this.pagePool.acquire();
    try {
      await page.setContent(html, { timeout: 0, waitUntil: 'networkidle0' });
      await page.emulateMediaType('print');
      const margin: puppeteer.PDFMargin = {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px',
      };
      return Buffer.from(
        await page.pdf({
          format: 'A4',
          preferCSSPageSize: true,
          printBackground: true,
          margin,
          displayHeaderFooter: true,
          headerTemplate: '',
          footerTemplate: '',
        }),
      );
    } finally {
      this.pagePool.release(page);
    }
  }
}
