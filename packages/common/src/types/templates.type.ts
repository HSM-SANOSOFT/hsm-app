import type { TemplateParseTriggerEnum } from '../enums';

export interface ParseTemplateContext {
  userId?: string | null;
  triggeredBy?: TemplateParseTriggerEnum;
}

export interface ParseTemplateInput {
  identifier: string;
  data: Record<string, unknown>;
  context?: ParseTemplateContext;
}

export interface ParseTemplateResult {
  html: string;
  templateId: string;
}
