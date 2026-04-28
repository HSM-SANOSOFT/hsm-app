import {
  /*BadRequestException,*/ Injectable,
  PipeTransform,
} from '@nestjs/common';
/*import { plainToInstance } from 'class-transformer';
import { ValidationError, validateSync } from 'class-validator';*/

@Injectable()
export class EmailTemplateDataPipe implements PipeTransform {
  // biome-ignore lint/suspicious/noExplicitAny: nestjs pipe default
  transform(value: any) {
    /*const { emailTemplate, data } = value ?? {};

    // Let DTO validation handle missing template
    if (typeof emailTemplate !== 'string') {
      return value;
    }

    const Dto = {} ; // EmailTemplateDtoMap[emailTemplate];
    if (!Dto) {
      return value;
    }

    if (data == null || typeof data !== 'object' || Array.isArray(data)) {
      // emulate ValidationPipe-style error
      const err = new ValidationError();
      err.property = 'data';
      err.constraints = {
        isObject: 'data must be an object',
      };
      throw new BadRequestException([err]);
    }

    const instance = plainToInstance(Dto, data);

    const errors = validateSync(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: false,
    });

    if (errors.length) {
      // IMPORTANT: throw ValidationError[]
      throw new BadRequestException(errors);
    }*/

    return value;
  }
}
