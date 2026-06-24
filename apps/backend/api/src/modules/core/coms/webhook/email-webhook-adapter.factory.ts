import { Injectable } from '@nestjs/common';

import { IEmailWebhookAdapter } from '@hsm/common/interfaces';

import { MandrillWebhookAdapter } from './adapters/mandrill-webhook.adapter';

@Injectable()
export class EmailWebhookAdapterFactory {
  private readonly adapters: Map<string, IEmailWebhookAdapter>;

  constructor() {
    this.adapters = new Map([['mandrill', new MandrillWebhookAdapter()]]);
  }

  getAdapter(provider: string): IEmailWebhookAdapter | undefined {
    return this.adapters.get(provider.toLowerCase());
  }

  getSupportedProviders(): string[] {
    return Array.from(this.adapters.keys());
  }
}
