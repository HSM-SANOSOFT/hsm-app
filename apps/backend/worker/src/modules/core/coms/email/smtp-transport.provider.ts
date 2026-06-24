import { SettingsCategoryEnum } from '@hsm/common/enums';
import { SettingsAccessorService } from '@hsm/database/settings';
import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';

/** SMTP setting keys whose change must rebuild the transport. */
const SMTP_KEYS = [
  'SMTP_ADDRESS',
  'SMTP_PORT',
  'SMTP_USERNAME',
  'SMTP_PASSWORD',
  'SMTP_SECURE',
];

/**
 * Live-config SMTP transport (U4). Replaces the boot-time `SMTP_CLIENT`
 * singleton: the Nodemailer transporter is built lazily and rebuilt whenever the
 * effective SMTP settings change. Change detection is a version hash of the SMTP
 * keys read through the short-TTL {@link SettingsAccessorService}, so an SMTP
 * setting edited via the API takes effect on the worker's next send within the
 * cache TTL window — no process restart.
 */
@Injectable()
export class SmtpTransportProvider {
  private readonly logger = new Logger(SmtpTransportProvider.name);

  private transporter: nodemailer.Transporter | null = null;
  private builtHash: string | null = null;
  /** Single-flight guard: concurrent callers await one in-progress rebuild. */
  private rebuilding: Promise<nodemailer.Transporter> | null = null;

  constructor(private readonly settingsAccessor: SettingsAccessorService) {}

  /**
   * Returns a transporter built from the current effective SMTP settings,
   * rebuilding it only when those settings have changed since the last build.
   *
   * A single-flight guard collapses concurrent rebuilds (during a settings
   * change) onto one `createTransport` call so concurrent sends don't each build
   * a transporter and leak connections; the superseded transporter is closed.
   */
  async getTransporter(): Promise<nodemailer.Transporter> {
    const hash = await this.settingsAccessor.getVersionHash(SMTP_KEYS);
    if (this.transporter && this.builtHash === hash) {
      return this.transporter;
    }

    // A rebuild is already in flight — await it rather than starting another.
    if (this.rebuilding) {
      const rebuilt = await this.rebuilding;
      if (this.builtHash === hash) {
        return rebuilt;
      }
    }

    this.rebuilding = this.rebuild(hash).finally(() => {
      this.rebuilding = null;
    });
    return this.rebuilding;
  }

  /** Builds a fresh transporter for `hash`, closing the superseded one. */
  private async rebuild(hash: string): Promise<nodemailer.Transporter> {
    const values = await this.settingsAccessor.getCategoryValues(
      SettingsCategoryEnum.EMAIL,
    );

    const port =
      values.SMTP_PORT != null ? Number(values.SMTP_PORT) : undefined;
    const secure = values.SMTP_SECURE === 'true' || values.SMTP_SECURE === '1';

    const transporter = nodemailer.createTransport({
      host: values.SMTP_ADDRESS ?? undefined,
      port,
      auth: {
        user: values.SMTP_USERNAME ?? undefined,
        pass: values.SMTP_PASSWORD ?? undefined,
      },
      secure,
    });

    // Close the old transport before replacing it so its pooled connections
    // are released rather than leaked.
    const previous = this.transporter;
    if (previous && typeof previous.close === 'function') {
      previous.close();
    }

    this.transporter = transporter;
    this.builtHash = hash;
    this.logger.log('SMTP transport (re)built from current settings');
    return transporter;
  }
}
