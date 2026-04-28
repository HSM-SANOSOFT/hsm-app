import { loadTemplate } from '@hsm/database/generator/utils';

export const indexTemplate = loadTemplate<{
  files: string[];
}>('index.template.hbs');
