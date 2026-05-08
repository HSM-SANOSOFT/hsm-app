import {
  CreateTemplatePayloadDto,
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
  isWellFormedTemplateSchema,
  validateAgainstTemplateSchema,
} from '@hsm/common/utils';
import {
  TemplateComEmailEntity,
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

  async create(dto: CreateTemplatePayloadDto): Promise<TemplatesEntity> {
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
  ): Promise<TemplatesEntity> {
    const existing = await this.findByIdentifier(id, {
      withChildren: true,
      withBase: true,
    });

    if (dto.category !== undefined && dto.category !== existing.category) {
      throw new TemplateInvalidShapeError(
        'category is immutable; create a new template instead',
      );
    }

    if (dto.content !== undefined) this.assertHandlebarsCompiles(dto.content);

    if (dto.schema !== undefined && !isWellFormedTemplateSchema(dto.schema)) {
      throw new TemplateInvalidShapeError('schema is malformed');
    }

    if (dto.name && dto.name !== existing.name) {
      const clash = await this.templates.findOne({
        where: { name: dto.name, id: Not(existing.id) },
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
        patch.baseTemplate = dto.baseTemplateId
          ? ({ id: dto.baseTemplateId } as TemplatesEntity)
          : null!;
      }
      if (Object.keys(patch).length > 0) {
        await manager.update(TemplatesEntity, existing.id, patch);
      }
      await this.upsertChildOnUpdate(manager, existing, dto);
    });

    return this.findByIdentifier(existing.id, {
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
      }
      await manager.delete(TemplatesEntity, { id });
    });
  }

  async validate(input: {
    identifier: string;
    data: Record<string, unknown>;
  }): Promise<ValidateTemplateResult> {
    const template = await this.findByIdentifier(input.identifier);

    const validation = validateAgainstTemplateSchema(
      template.schema,
      input.data,
    );
    if (!validation.valid) {
      return {
        valid: false,
        templateId: template.id,
        issues: validation.issues,
      };
    }

    try {
      Handlebars.precompile(template.content);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        valid: false,
        templateId: template.id,
        issues: [
          {
            path: 'content',
            expected: 'compilable Handlebars',
            received: message,
          },
        ],
      };
    }

    return { valid: true, templateId: template.id };
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

    if (isBase) {
      if (dto.baseTemplateId) {
        throw new TemplateInvalidShapeError(
          'BASE templates must not have baseTemplateId',
        );
      }
      if (dto.email || dto.doc) {
        throw new TemplateInvalidShapeError(
          'BASE templates must not include email or doc fields',
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
      if (dto.doc) {
        throw new TemplateInvalidShapeError(
          `${dto.category} templates must not include the doc block`,
        );
      }
    }

    if (isDoc) {
      if (!dto.doc) {
        throw new TemplateInvalidShapeError(
          'DOCS templates require the doc block',
        );
      }
      if (dto.email) {
        throw new TemplateInvalidShapeError(
          'DOCS templates must not include the email block',
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
    }
  }

  private async upsertChildOnUpdate(
    manager: EntityManager,
    existing: TemplatesEntity,
    dto: UpdateTemplatePayloadDto,
  ): Promise<void> {
    const cat = existing.category;
    if (
      cat === TemplateCategoriesEnum.EMAIL_INTERNAL ||
      cat === TemplateCategoriesEnum.EMAIL_EXTERNAL
    ) {
      if (!dto.email) return;
      await manager.save(TemplateComEmailEntity, {
        id: existing.id,
        ...dto.email,
      });
      return;
    }
    if (cat === TemplateCategoriesEnum.DOCS) {
      if (!dto.doc) return;
      await manager.save(TemplateDocEntity, {
        id: existing.id,
        ...dto.doc,
      });
    }
  }
}
