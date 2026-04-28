//import type { DtoClass } from '@hsm/common/types';

import { Injectable /*Logger */ } from '@nestjs/common';
//import { plainToInstance } from 'class-transformer';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  /*validateSync,*/
} from 'class-validator';

//type EmailTemplateKey = keyof typeof EmailTemplateDtoMap;

@ValidatorConstraint({ name: 'EmailTemplateData', async: false })
@Injectable()
export class EmailTemplateDataValidator
  implements ValidatorConstraintInterface
{
  /*private readonly logger = new Logger(EmailTemplateDataValidator.name);

  // per-validation-call storage
  private lastMessages: string[] = [];*/

  validate(value: unknown, args: ValidationArguments): boolean {
    /*this.lastMessages = [];

    const obj = args.object as { emailTemplate?: unknown };
    const template = obj.emailTemplate as EmailTemplateKey | undefined;

    // Let other validators handle these
    if (template == null || typeof template !== 'string') {
      return true;
    }

    if (!Object.hasOwn(EmailTemplateDtoMap, template)) {
      return true;
    }

    const Dto = EmailTemplateDtoMap[template] as unknown as DtoClass;

    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      this.lastMessages.push('data must be an object');
      return false;
    }

    this.logger.debug(
      `Validating data for template "${template}" and DTO ${Dto.name}`,
    );

    const instance = plainToInstance(Dto, value);

    const errors = validateSync(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: false,
    });

    if (errors.length) {
      for (const err of errors) {
        if (err.constraints) {
          this.lastMessages.push(...Object.values(err.constraints));
        }
      }

      this.logger.error(`Field Issues: ${this.lastMessages.join('; ')}`);
      return false;
    }*/

    return true;
  }

  defaultMessage(_args: ValidationArguments) {
    /*// ValidationPipe will pick this up
    return this.lastMessages.length
      ? this.lastMessages.join('; ')
      : 'data is invalid for email template';*/
    return 'data is invalid for email template';
  }
}

export function ValidateEmailTemplateData(options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'ValidateEmailTemplateData',
      target: target.constructor,
      propertyName,
      options,
      validator: EmailTemplateDataValidator,
    });
  };
}
