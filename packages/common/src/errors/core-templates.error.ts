import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export interface TemplateSchemaIssue {
  path: string;
  expected: string;
  received: string;
}

export class TemplateNotFoundError extends NotFoundException {
  constructor(identifier: string) {
    super(`Template '${identifier}' not found`);
  }
}

export class TemplateAlreadyExistsError extends ConflictException {
  constructor(name: string) {
    super(`Template with name '${name}' already exists`);
  }
}

export class TemplateInUseError extends ConflictException {
  constructor(id: string) {
    super(
      `Template '${id}' is referenced as a base by other templates and cannot be deleted`,
    );
  }
}

export class TemplateInvalidShapeError extends BadRequestException {
  constructor(reason: string) {
    super(`Invalid template payload: ${reason}`);
  }
}

export class TemplateInvalidHandlebarsError extends BadRequestException {
  constructor(parseError: unknown) {
    const message =
      parseError instanceof Error ? parseError.message : String(parseError);
    super(`Invalid Handlebars template: ${message}`);
  }
}

export class TemplateSchemaValidationError extends BadRequestException {
  readonly issues: TemplateSchemaIssue[];

  constructor(issues: TemplateSchemaIssue[]) {
    const flattened = issues.map(
      i => `${i.path}: expected ${i.expected}, received ${i.received}`,
    );
    super({
      message: flattened,
      error: 'Template schema validation failed',
      field: issues.map(i => i.path),
    });
    this.issues = issues;
  }
}
