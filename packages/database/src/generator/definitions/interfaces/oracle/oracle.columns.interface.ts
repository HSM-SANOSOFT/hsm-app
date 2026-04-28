export interface OracleColumnsQuery {
  OWNER: string;
  TABLE_NAME: string;
  COLUMN_NAME: string;
  DATA_TYPE: string | null;
  DATA_TYPE_MOD: string | null;
  DATA_TYPE_OWNER: string | null;
  DATA_LENGTH: number;
  DATA_PRECISION: number | null;
  DATA_SCALE: number | null;
  NULLABLE: string | null;
  COLUMN_ID: number | null;
  DEFAULT_LENGTH: number | null;
  DATA_DEFAULT: string | null;
  NUM_DISTINCT: number | null;
  LOW_VALUE: Buffer | null;
  HIGH_VALUE: Buffer | null;
  DENSITY: number | null;
  NUM_NULLS: number | null;
  NUM_BUCKETS: number | null;
  LAST_ANALYZED: Date | null;
  SAMPLE_SIZE: number | null;
  CHARACTER_SET_NAME: string | null;
  CHAR_COL_DECL_LENGTH: number | null;
  GLOBAL_STATS: string | null;
  USER_STATS: string | null;
  AVG_COL_LEN: number | null;
  CHAR_LENGTH: number | null;
  CHAR_USED: string | null;
  V80_FMT_IMAGE: string | null;
  DATA_UPGRADED: string | null;
  HISTOGRAM: string | null;
  DEFAULT_ON_NULL: string | null;
  IDENTITY_COLUMN: string | null;
  EVALUATION_EDITION: string | null;
  UNUSABLE_BEFORE: string | null;
  UNUSABLE_BEGINNING: string | null;
  COLLATION: string | null;

  OWNER_1: string;
  TABLE_NAME_1: string;
  COLUMN_NAME_1: string;
  COMMENTS: string | null;
  ORIGIN_CON_ID: number | null;
}

export interface OracleColumns
  extends Pick<
    OracleColumnsQuery,
    | 'OWNER'
    | 'TABLE_NAME'
    | 'COLUMN_NAME'
    | 'DATA_TYPE'
    | 'DATA_TYPE_MOD'
    | 'DATA_TYPE_OWNER'
    | 'DATA_LENGTH'
    | 'DATA_PRECISION'
    | 'DATA_SCALE'
    | 'DATA_DEFAULT'
    | 'COLUMN_ID'
    | 'NULLABLE'
    | 'COMMENTS'
  > {}
