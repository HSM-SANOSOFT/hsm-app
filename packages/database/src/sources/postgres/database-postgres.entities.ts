import { isEntity } from '@hsm/common/utils';
import * as comsEntities from '../../entities/modules/core/coms';
import * as docsEntities from '../../entities/modules/core/docs';
import * as settingsEntities from '../../entities/modules/core/settings';
import * as templateEntities from '../../entities/modules/core/template';
import * as userEntities from '../../entities/modules/core/users';
import * as authEntities from '../../entities/modules/security/auth';
import { DatabaseAllEntities } from '../all/database-all.entities';

export const databasePostgresEntities = [
  ...DatabaseAllEntities,
  ...Object.values(authEntities),
  ...Object.values(userEntities),
  ...Object.values(comsEntities),
  ...Object.values(docsEntities),
  ...Object.values(settingsEntities),
  ...Object.values(templateEntities),
].filter(isEntity);
