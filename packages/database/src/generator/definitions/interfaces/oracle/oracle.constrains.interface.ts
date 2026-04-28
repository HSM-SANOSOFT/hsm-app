import { TypeormRelationshipTypeEnum } from '@hsm/database/generator/definitions';

export interface OracleConstrainsQuery {
  OWNER: string | null;
  CONSTRAINT_NAME: string | null;
  CONSTRAINT_TYPE: string | null;
  TABLE_NAME: string | null;
  SEARCH_CONDITION: string | null;
  SEARCH_CONDITION_VC: string | null;
  R_OWNER: string | null;
  R_CONSTRAINT_NAME: string | null;
  DELETE_RULE: string | null;
  STATUS: string | null;
  DEFERRABLE: string | null;
  DEFERRED: string | null;
  VALIDATED: string | null;
  GENERATED: string | null;
  BAD: string | null;
  RELY: string | null;
  LAST_CHANGE: Date | null;
  INDEX_OWNER: string | null;
  INDEX_NAME: string | null;
  INVALID: string | null;
  VIEW_RELATED: string | null;
  ORIGIN_CON_ID: string | null;

  OWNER_1: string;
  CONSTRAINT_NAME_1: string;
  TABLE_NAME_1: string;
  COLUMN_NAME: string | null;
  POSITION: number | null;

  OWNER_2: string | null;
  CONSTRAINT_NAME_2: string | null;
  CONSTRAINT_TYPE_1: string | null;
  TABLE_NAME_2: string | null;
  SEARCH_CONDITION_1: string | null;
  SEARCH_CONDITION_VC_1: string | null;
  R_OWNER_1: string | null;
  R_CONSTRAINT_NAME_1: string | null;
  DELETE_RULE_1: string | null;
  STATUS_1: string | null;
  DEFERRABLE_1: string | null;
  DEFERRED_1: string | null;
  VALIDATED_1: string | null;
  GENERATED_1: string | null;
  BAD_1: string | null;
  RELY_1: string | null;
  LAST_CHANGE_1: Date | null;
  INDEX_OWNER_1: string | null;
  INDEX_NAME_1: string | null;
  INVALID_1: string | null;
  VIEW_RELATED_1: string | null;
  ORIGIN_CON_ID_1: string | null;

  OWNER_3: string;
  CONSTRAINT_NAME_3: string;
  TABLE_NAME_3: string;
  COLUMN_NAME_1: string | null;
  POSITION_1: number | null;
}

export interface OracleConstrains
  extends Pick<
    OracleConstrainsQuery,
    | 'OWNER'
    | 'CONSTRAINT_NAME'
    | 'CONSTRAINT_TYPE'
    | 'TABLE_NAME'
    | 'COLUMN_NAME'
    | 'POSITION'
    | 'SEARCH_CONDITION'
    | 'STATUS'
    | 'R_OWNER'
    | 'R_CONSTRAINT_NAME'
    | 'TABLE_NAME_2'
    | 'COLUMN_NAME_1'
  > {}

export type OraclePkConstrain = Map<string, string[]>;
export type OracleFkConstraint = Map<
  string,
  {
    columns: string[];
    referencedOwner: string | null;
    referencedConstraintName: string | null;
    referencedTable: string | null;
    relationshipType: TypeormRelationshipTypeEnum[] | null;
  }
>;
export type OracleUkConstrain = Map<string, string[]>;
