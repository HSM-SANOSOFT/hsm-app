import { ApiDocumentation, Public } from '../../../../decorator';
import {
  Controller,
  Headers,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ComsWebhookService } from './coms-webhook.service';

@Controller('coms/webhooks')
export class ComsWebhookController {
  constructor(private readonly webhookService: ComsWebhookService) {}

  @Public()
  @Post(':provider')
  @ApiDocumentation()
  async receiveWebhook(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ) {
    const raw = (req as RawBodyRequest<Request>).rawBody;
    return await this.webhookService.receiveWebhook(
      provider,
      headers,
      raw ?? Buffer.alloc(0),
    );
  }
}
