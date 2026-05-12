import { ForbiddenException } from '@nestjs/common';

export class InsufficientRolesException extends ForbiddenException {
  constructor() {
    super('Insufficient permissions');
  }
}
