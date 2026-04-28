import { isEntity } from '../../common/utils';
import * as docsEntities from '../../entities/modules/core/docs';
import * as templateEntities from '../../entities/modules/core/template';
import * as userEntities from '../../entities/modules/core/users';
import * as authEntities from '../../entities/modules/security/auth';
import { DatabaseAllEntities } from '../all/database-all.entities';

export const databasePostgresEntities = [
  ...DatabaseAllEntities,
  ...Object.values(authEntities),
  ...Object.values(userEntities),
  ...Object.values(docsEntities),
  ...Object.values(templateEntities),
].filter(isEntity);
