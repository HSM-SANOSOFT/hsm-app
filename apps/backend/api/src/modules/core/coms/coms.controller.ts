import {
  ListEmailBatchesQueryDto,
  ListEmailRecipientsQueryDto,
  SendEmailPayloadDto,
} from '@hsm/common/dtos';
import type { ISignedUser } from '@hsm/common/interfaces';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiDocumentation } from '../../../decorator';
import { Roles } from '../../security/roles/roles.decorator';
import { ComsService } from './coms.service';

@Controller('coms')
export class ComsController {
  constructor(private readonly comsService: ComsService) {}

  @ApiDocumentation()
  @Roles()
  @Post('send/email')
  async sendEmail(@Body() payload: SendEmailPayloadDto, @Req() req: Request) {
    return await this.comsService.sendEmail(
      payload,
      (req.user as ISignedUser)?.id,
    );
  }

  @ApiDocumentation()
  @Roles()
  @Get('emails/batches')
  async listBatches(@Query() query: ListEmailBatchesQueryDto) {
    return await this.comsService.listBatches(query);
  }

  @ApiDocumentation(undefined, { additionalErrors: [HttpStatus.NOT_FOUND] })
  @Roles()
  @Get('emails/batches/:id')
  async getBatch(@Param('id') id: string) {
    return await this.comsService.getBatch(id);
  }

  @ApiDocumentation(undefined, { additionalErrors: [HttpStatus.NOT_FOUND] })
  @Roles()
  @Post('emails/batches/:id/resend')
  async resendBatch(@Param('id') id: string) {
    return await this.comsService.resendBatch(id);
  }

  @ApiDocumentation()
  @Roles()
  @Get('emails/recipients')
  async listRecipients(@Query() query: ListEmailRecipientsQueryDto) {
    return await this.comsService.listRecipients(query);
  }

  @ApiDocumentation(undefined, { additionalErrors: [HttpStatus.NOT_FOUND] })
  @Roles()
  @Get('emails/recipients/:id')
  async getRecipient(@Param('id') id: string) {
    return await this.comsService.getRecipient(id);
  }

  @ApiDocumentation(undefined, { additionalErrors: [HttpStatus.NOT_FOUND] })
  @Roles()
  @Post('emails/recipients/:id/resend')
  async resendRecipient(@Param('id') id: string) {
    return await this.comsService.resendRecipient(id);
  }

  @ApiDocumentation()
  @Roles()
  @Post('send/sms')
  async sendSms() {
    return await this.comsService.sendSms();
  }
}
