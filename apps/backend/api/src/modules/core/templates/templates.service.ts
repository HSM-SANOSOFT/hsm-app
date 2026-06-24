import {
  CreateTemplatePayloadDto,
  DocTemplateFieldsDto,
  DraftRenderPayloadDto,
  DraftRenderResponseDto,
  EmailTemplateFieldsDto,
  SmsTemplateFieldsDto,
  TemplateDetailDto,
  TemplateWithBaseResponseDto,
  UpdateTemplatePayloadDto,
} from '@hsm/common/dtos';
import { TemplateCategoriesEnum } from '@hsm/common/enums';
import {
  TemplateAlreadyExistsError,
  TemplateInUseError,
  TemplateInvalidHandlebarsError,
  TemplateInvalidShapeError,
  TemplateNotFoundError,
  type TemplateSchemaIssue,
} from '@hsm/common/errors';
import {
  composeTemplate,
  isWellFormedTemplateSchema,
  validateAgainstTemplateSchema,
} from '@hsm/common/utils';
import {
  TemplateComEmailEntity,
  TemplateComSmsEntity,
  TemplateDocEntity,
  TemplatesEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import Handlebars from 'handlebars';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ValidateTemplateResult {
  valid: boolean;
  templateId?: string;
  issues?: TemplateSchemaIssue[];
}

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(TemplatesEntity, DatabasesEnum.HsmDbPostgres)
    private readonly templates: Repository<TemplatesEntity>,
    @InjectDataSource(DatabasesEnum.HsmDbPostgres)
    private readonly dataSource: DataSource,
  ) {}

  async findByIdentifier(
    identifier: string,
    options: { withChildren?: boolean; withBase?: boolean } = {},
  ): Promise<TemplateWithBaseResponseDto> {
    const { withChildren = false, withBase = false } = options;
    const entity = await this.templates.findOne({
      where: this.identifierWhere(identifier),
      relations: {
        comEmail: withChildren,
        doc: withChildren,
        comSms: withChildren,
        baseTemplate: withBase,
      },
    });
    if (!entity) throw new TemplateNotFoundError(identifier);
    return this.toResponseDto(entity);
  }

  async findAll(
    options: { category?: TemplateCategoriesEnum } = {},
  ): Promise<TemplateDetailDto[]> {
    const entities = await this.templates.find({
      where: options.category ? { category: options.category } : {},
      relations: { comEmail: true, doc: true, comSms: true },
      order: { name: 'ASC' },
    });
    return entities.map(entity => this.toDetailDto(entity));
  }

  async create(
    dto: CreateTemplatePayloadDto,
  ): Promise<TemplateWithBaseResponseDto> {
    this.assertCategoryShape(dto);
    if (!isWellFormedTemplateSchema(dto.schema)) {
      throw new TemplateInvalidShapeError(
        'schema is malformed: leaves must be a known type tag, objects, or single-element arrays',
      );
    }
    this.assertHandlebarsCompiles(dto.content);

    if (dto.baseTemplateId) {
      const base = await this.templates.findOne({
        where: { id: dto.baseTemplateId },
      });
      if (!base) throw new TemplateNotFoundError(dto.baseTemplateId);
      if (base.category !== TemplateCategoriesEnum.BASE) {
        throw new TemplateInvalidShapeError(
          `baseTemplateId must reference a template with category=BASE`,
        );
      }
    }

    const existing = await this.templates.findOne({
      where: { name: dto.name },
    });
    if (existing) throw new TemplateAlreadyExistsError(dto.name);

    const created = await this.dataSource.transaction(async manager => {
      const parent = manager.create(TemplatesEntity, {
        category: dto.category,
        name: dto.name,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
        schema: dto.schema,
        content: dto.content,
        baseTemplate: dto.baseTemplateId
          ? ({ id: dto.baseTemplateId } as TemplatesEntity)
          : null,
      });
      const saved = await manager.save(TemplatesEntity, parent);
      await this.persistChild(manager, saved.id, dto);
      return saved;
    });

    return this.findByIdentifier(created.id, {
      withChildren: true,
      withBase: true,
    });
  }

  async update(
    id: string,
    dto: UpdateTemplatePayloadDto,
  ): Promise<TemplateWithBaseResponseDto> {
    const existing = await this.findByIdentifier(id, {
      withChildren: true,
      withBase: true,
    });

    if (
      dto.category !== undefined &&
      dto.category !== existing.template.category
    ) {
      throw new TemplateInvalidShapeError(
        'category is immutable; create a new template instead',
      );
    }

    if (dto.content !== undefined) this.assertHandlebarsCompiles(dto.content);

    if (dto.schema !== undefined && !isWellFormedTemplateSchema(dto.schema)) {
      throw new TemplateInvalidShapeError('schema is malformed');
    }

    if (dto.name && dto.name !== existing.template.name) {
      const clash = await this.templates.findOne({
        where: { name: dto.name, id: Not(existing.template.id) },
      });
      if (clash) throw new TemplateAlreadyExistsError(dto.name);
    }

    if (
      dto.baseTemplateId &&
      dto.baseTemplateId !== existing.baseTemplate?.id
    ) {
      const base = await this.templates.findOne({
        where: { id: dto.baseTemplateId },
      });
      if (!base) throw new TemplateNotFoundError(dto.baseTemplateId);
      if (base.category !== TemplateCategoriesEnum.BASE) {
        throw new TemplateInvalidShapeError(
          'baseTemplateId must reference a template with category=BASE',
        );
      }
    }

    await this.dataSource.transaction(async manager => {
      const patch: Partial<TemplatesEntity> = {};
      if (dto.name !== undefined) patch.name = dto.name;
      if (dto.description !== undefined) patch.description = dto.description;
      if (dto.isActive !== undefined) patch.isActive = dto.isActive;
      if (dto.schema !== undefined) patch.schema = dto.schema;
      if (dto.content !== undefined) patch.content = dto.content;
      if (dto.baseTemplateId !== undefined) {
        // null clears the relation; TypeORM accepts null for nullable ManyToOne columns
        patch.baseTemplate = dto.baseTemplateId
          ? ({ id: dto.baseTemplateId } as TemplatesEntity)
          : (null as unknown as TemplatesEntity);
      }
      if (Object.keys(patch).length > 0) {
        await manager.update(TemplatesEntity, existing.template.id, patch);
      }
      await this.upsertChildOnUpdate(
        manager,
        existing.template.id,
        existing.template.category,
        dto,
      );
    });

    return this.findByIdentifier(existing.template.id, {
      withChildren: true,
      withBase: true,
    });
  }

  async delete(id: string): Promise<void> {
    const target = await this.templates.findOne({ where: { id } });
    if (!target) throw new TemplateNotFoundError(id);

    const referenced = await this.templates.count({
      where: { baseTemplate: { id } },
    });
    if (referenced > 0) throw new TemplateInUseError(id);

    await this.dataSource.transaction(async manager => {
      if (
        target.category === TemplateCategoriesEnum.EMAIL_INTERNAL ||
        target.category === TemplateCategoriesEnum.EMAIL_EXTERNAL
      ) {
        await manager.delete(TemplateComEmailEntity, { id });
      } else if (target.category === TemplateCategoriesEnum.DOCS) {
        await manager.delete(TemplateDocEntity, { id });
      } else if (
        target.category === TemplateCategoriesEnum.SMS_INTERNAL ||
        target.category === TemplateCategoriesEnum.SMS_EXTERNAL
      ) {
        await manager.delete(TemplateComSmsEntity, { id });
      }
      await manager.delete(TemplatesEntity, { id });
    });
  }

  async validate(input: {
    identifier: string;
    data: Record<string, unknown>;
  }): Promise<ValidateTemplateResult> {
    const result = await this.findByIdentifier(input.identifier);

    const validation = validateAgainstTemplateSchema(
      result.template.schema,
      input.data,
    );
    if (!validation.valid) {
      return {
        valid: false,
        templateId: result.template.id,
        issues: validation.issues,
      };
    }

    try {
      Handlebars.precompile(result.template.content);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        valid: false,
        templateId: result.template.id,
        issues: [
          {
            path: 'content',
            expected: 'compilable Handlebars',
            received: message,
          },
        ],
      };
    }

    return { valid: true, templateId: result.template.id };
  }

  async draftRender(
    dto: DraftRenderPayloadDto,
  ): Promise<DraftRenderResponseDto> {
    let baseContent: string | null = null;

    if (dto.baseTemplateId) {
      const base = await this.templates.findOne({
        where: { id: dto.baseTemplateId },
      });
      if (!base) throw new TemplateNotFoundError(dto.baseTemplateId);
      if (base.category !== TemplateCategoriesEnum.BASE) {
        throw new TemplateInvalidShapeError(
          'baseTemplateId must reference a template with category=BASE',
        );
      }
      baseContent = base.content;
    }

    try {
      const html = composeTemplate({
        content: dto.content,
        baseContent,
        data: dto.sampleData ?? {},
      });
      return { html };
    } catch (err) {
      throw new TemplateInvalidHandlebarsError(err);
    }
  }

  private toDetailDto(entity: TemplatesEntity): TemplateDetailDto {
    let metadata: TemplateDetailDto['metadata'] = null;

    switch (entity.category) {
      case TemplateCategoriesEnum.EMAIL_INTERNAL:
      case TemplateCategoriesEnum.EMAIL_EXTERNAL:
        if (entity.comEmail) {
          const email = new EmailTemplateFieldsDto();
          email.subject = entity.comEmail.subject;
          email.fromEmail = entity.comEmail.fromEmail;
          email.fromName = entity.comEmail.fromName;
          email.cc = entity.comEmail.cc ?? undefined;
          email.bcc = entity.comEmail.bcc ?? undefined;
          email.hasAttachment = entity.comEmail.hasAttachment;
          metadata = email;
        }
        break;
      case TemplateCategoriesEnum.DOCS:
        if (entity.doc) {
          const doc = new DocTemplateFieldsDto();
          doc.documentCode = entity.doc.documentCode;
          doc.format = entity.doc.format;
          doc.size = entity.doc.size;
          doc.orientation = entity.doc.orientation;
          metadata = doc;
        }
        break;
      case TemplateCategoriesEnum.SMS_INTERNAL:
      case TemplateCategoriesEnum.SMS_EXTERNAL:
        if (entity.comSms) {
          const sms = new SmsTemplateFieldsDto();
          sms.provider = entity.comSms.provider;
          sms.templateName = entity.comSms.templateName;
          sms.from = entity.comSms.from;
          metadata = sms;
        }
        break;
      case TemplateCategoriesEnum.BASE:
        break;
      default: {
        const _exhaustive: never = entity.category;
        void _exhaustive;
      }
    }

    return {
      id: entity.id,
      category: entity.category,
      name: entity.name,
      isActive: entity.isActive,
      schema: entity.schema,
      content: entity.content,
      description: entity.description ?? null,
      metadata,
    };
  }

  private toResponseDto(entity: TemplatesEntity): TemplateWithBaseResponseDto {
    return {
      template: this.toDetailDto(entity),
      baseTemplate: entity.baseTemplate
        ? this.toDetailDto(entity.baseTemplate)
        : null,
    };
  }

  private identifierWhere(identifier: string) {
    return UUID_REGEX.test(identifier)
      ? [{ id: identifier }, { name: identifier }]
      : [{ name: identifier }];
  }

  private assertCategoryShape(
    dto: CreateTemplatePayloadDto | UpdateTemplatePayloadDto,
  ): void {
    if (!dto.category) return;
    const isBase = dto.category === TemplateCategoriesEnum.BASE;
    const isEmail =
      dto.category === TemplateCategoriesEnum.EMAIL_INTERNAL ||
      dto.category === TemplateCategoriesEnum.EMAIL_EXTERNAL;
    const isDoc = dto.category === TemplateCategoriesEnum.DOCS;
    const isSms =
      dto.category === TemplateCategoriesEnum.SMS_INTERNAL ||
      dto.category === TemplateCategoriesEnum.SMS_EXTERNAL;

    if (isBase) {
      if (dto.baseTemplateId) {
        throw new TemplateInvalidShapeError(
          'BASE templates must not have baseTemplateId',
        );
      }
      if (dto.email || dto.doc || dto.sms) {
        throw new TemplateInvalidShapeError(
          'BASE templates must not include email, doc, or sms fields',
        );
      }
      return;
    }

    if (!dto.baseTemplateId) {
      throw new TemplateInvalidShapeError(
        `${dto.category} templates require baseTemplateId`,
      );
    }

    if (isEmail) {
      if (!dto.email) {
        throw new TemplateInvalidShapeError(
          `${dto.category} templates require the email block`,
        );
      }
      if (dto.doc || dto.sms) {
        throw new TemplateInvalidShapeError(
          `${dto.category} templates must not include the doc or sms block`,
        );
      }
    }

    if (isDoc) {
      if (!dto.doc) {
        throw new TemplateInvalidShapeError(
          'DOCS templates require the doc block',
        );
      }
      if (dto.email || dto.sms) {
        throw new TemplateInvalidShapeError(
          'DOCS templates must not include the email or sms block',
        );
      }
    }

    if (isSms) {
      if (!dto.sms) {
        throw new TemplateInvalidShapeError(
          `${dto.category} templates require the sms block`,
        );
      }
      if (dto.email || dto.doc) {
        throw new TemplateInvalidShapeError(
          `${dto.category} templates must not include the email or doc block`,
        );
      }
    }
  }

  private assertHandlebarsCompiles(content: string): void {
    try {
      Handlebars.precompile(content);
    } catch (err) {
      throw new TemplateInvalidHandlebarsError(err);
    }
  }

  private async persistChild(
    manager: EntityManager,
    id: string,
    dto: CreateTemplatePayloadDto,
  ): Promise<void> {
    if (
      dto.category === TemplateCategoriesEnum.EMAIL_INTERNAL ||
      dto.category === TemplateCategoriesEnum.EMAIL_EXTERNAL
    ) {
      const child = manager.create(TemplateComEmailEntity, {
        id,
        ...dto.email!,
      });
      await manager.save(TemplateComEmailEntity, child);
      return;
    }
    if (dto.category === TemplateCategoriesEnum.DOCS) {
      const child = manager.create(TemplateDocEntity, {
        id,
        ...dto.doc!,
      });
      await manager.save(TemplateDocEntity, child);
      return;
    }
    if (
      dto.category === TemplateCategoriesEnum.SMS_INTERNAL ||
      dto.category === TemplateCategoriesEnum.SMS_EXTERNAL
    ) {
      const child = manager.create(TemplateComSmsEntity, {
        id,
        ...dto.sms!,
      });
      await manager.save(TemplateComSmsEntity, child);
    }
  }

  private async upsertChildOnUpdate(
    manager: EntityManager,
    id: string,
    category: TemplateCategoriesEnum,
    dto: UpdateTemplatePayloadDto,
  ): Promise<void> {
    if (
      category === TemplateCategoriesEnum.EMAIL_INTERNAL ||
      category === TemplateCategoriesEnum.EMAIL_EXTERNAL
    ) {
      if (!dto.email) return;
      await manager.save(TemplateComEmailEntity, {
        id,
        ...dto.email,
      });
      return;
    }
    if (category === TemplateCategoriesEnum.DOCS) {
      if (!dto.doc) return;
      await manager.save(TemplateDocEntity, {
        id,
        ...dto.doc,
      });
      return;
    }
    if (
      category === TemplateCategoriesEnum.SMS_INTERNAL ||
      category === TemplateCategoriesEnum.SMS_EXTERNAL
    ) {
      if (!dto.sms) return;
      // upsert avoids the SELECT+INSERT race when two concurrent updates arrive
      // with no pre-existing child row
      await manager.upsert(TemplateComSmsEntity, { id, ...dto.sms }, ['id']);
    }
  }
}
