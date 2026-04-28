//import { EmailTemplateDataPipe } from '@hsm-app/server/pipes';
import { SendEmailPayloadDto } from '@hsm/common/dtos';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiDocumentation, Public } from '../../../decorator';
import { Roles } from '../../security/roles/roles.decorator';
import { ComsService } from '../coms/coms.service';

@Controller('coms')
export class ComsController {
  constructor(private readonly comsService: ComsService) {}
  //TODO: Add endpoint implementations

  @ApiDocumentation()
  @Public()
  @Post('send/email')
  async sendEmail(
    @Body(/*EmailTemplateDataPipe*/) payload: SendEmailPayloadDto,
  ) {
    await this.comsService.sendEmail(payload);
  }

  @ApiDocumentation()
  @Roles()
  @Post('resend/email')
  async resendEmail() {
    await this.comsService.resendEmail();
  }

  @ApiDocumentation()
  @Roles()
  @Post('send/sms')
  async sendSms() {
    await this.comsService.sendSms();
  }
}
