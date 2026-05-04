import {
  TemplateCategoriesEnum,
  TemplateParseErrorCodeEnum,
  TemplateParseTriggerEnum,
} from '@hsm/common/enums';
import {
  TemplateInvalidHandlebarsError,
  TemplateNotFoundError,
  TemplateSchemaValidationError,
} from '@hsm/common/errors';
import type {
  ParseTemplateInput,
  ParseTemplateResult,
} from '@hsm/common/types';
import { validateAgainstTemplateSchema } from '@hsm/common/utils';
import {
  TemplateParseLogEntity,
  TemplatesEntity,
} from '@hsm/database/entities/modules/core/template';
import { DatabasesEnum } from '@hsm/database/sources';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Handlebars from 'handlebars';
import { Repository } from 'typeorm';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectRepository(TemplatesEntity, DatabasesEnum.HsmDbPostgres)
    private readonly templates: Repository<TemplatesEntity>,
    @InjectRepository(TemplateParseLogEntity, DatabasesEnum.HsmDbPostgres)
    private readonly parseLogs: Repository<TemplateParseLogEntity>,
  ) {}

  async findByIdentifier(
    identifier: string,
    options: { withChildren?: boolean; withBase?: boolean } = {},
  ): Promise<TemplatesEntity> {
    const { withChildren = false, withBase = false } = options;
    const template = await this.templates.findOne({
      where: this.identifierWhere(identifier),
      relations: {
        comEmail: withChildren,
        doc: withChildren,
        baseTemplate: withBase,
      },
    });
    if (!template) throw new TemplateNotFoundError(identifier);
    return template;
  }

  async parse(input: ParseTemplateInput): Promise<ParseTemplateResult> {
    const triggeredBy =
      input.context?.triggeredBy ?? TemplateParseTriggerEnum.Internal;
    const userId = input.context?.userId ?? null;

    let template: TemplatesEntity;
    try {
      template = await this.findByIdentifier(input.identifier, {
        withBase: true,
      });
    } catch (err) {
      if (err instanceof TemplateNotFoundError) {
        throw err;
      }
      throw err;
    }

    const validation = validateAgainstTemplateSchema(
      template.schema,
      input.data,
    );
    if (!validation.valid) {
      const error = new TemplateSchemaValidationError(validation.issues);
      await this.writeLog({
        template,
        input: input.data,
        success: false,
        outputLength: null,
        errorCode: TemplateParseErrorCodeEnum.Schema,
        errorMessage: validation.issues
          .map(i => `${i.path}: expected ${i.expected}, got ${i.received}`)
          .join('; '),
        userId,
        triggeredBy,
      });
      throw error;
    }

    let html: string;
    try {
      const childCompiled = this.compile(template);
      const childHtml = childCompiled(input.data);

      if (
        template.category !== TemplateCategoriesEnum.BASE &&
        template.baseTemplate
      ) {
        const baseCompiled = this.compile(template.baseTemplate);
        html = baseCompiled({ ...input.data, body: childHtml });
      } else {
        html = childHtml;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.writeLog({
        template,
        input: input.data,
        success: false,
        outputLength: null,
        errorCode: TemplateParseErrorCodeEnum.HbsRuntime,
        errorMessage: message,
        userId,
        triggeredBy,
      });
      throw new TemplateInvalidHandlebarsError(err);
    }

    await this.writeLog({
      template,
      input: input.data,
      success: true,
      outputLength: html.length,
      errorCode: null,
      errorMessage: null,
      userId,
      triggeredBy,
    });

    return { html, templateId: template.id };
  }

  private identifierWhere(identifier: string) {
    return UUID_REGEX.test(identifier)
      ? [{ id: identifier }, { name: identifier }]
      : [{ name: identifier }];
  }

  private compile(template: TemplatesEntity): HandlebarsTemplateDelegate {
    return Handlebars.compile(template.content, { noEscape: false });
  }

  private async writeLog(args: {
    template: TemplatesEntity;
    input: object;
    success: boolean;
    outputLength: number | null;
    errorCode: TemplateParseErrorCodeEnum | null;
    errorMessage: string | null;
    userId: string | null;
    triggeredBy: TemplateParseTriggerEnum;
  }): Promise<void> {
    try {
      await this.parseLogs.save({
        templateId: args.template.id,
        templateName: args.template.name,
        category: args.template.category,
        input: args.input,
        outputLength: args.outputLength,
        success: args.success,
        errorCode: args.errorCode,
        errorMessage: args.errorMessage,
        userId: args.userId,
        triggeredBy: args.triggeredBy,
      });
    } catch (err) {
      this.logger.error(
        `Failed to write template parse log for template ${args.template.id}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
