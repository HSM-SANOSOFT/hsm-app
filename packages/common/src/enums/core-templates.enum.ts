export enum TemplateCategoriesEnum {
  BASE = 'BASE',
  EMAIL_INTERNAL = 'EMAIL_INTERNAL',
  EMAIL_EXTERNAL = 'EMAIL_EXTERNAL',
  DOCS = 'DOCS',
}

export enum TemplateParseTriggerEnum {
  Http = 'HTTP',
  Internal = 'INTERNAL',
}

export enum TemplateParseErrorCodeEnum {
  Schema = 'SCHEMA',
  HbsCompile = 'HBS_COMPILE',
  HbsRuntime = 'HBS_RUNTIME',
  NotFound = 'NOT_FOUND',
  Unknown = 'UNKNOWN',
}
