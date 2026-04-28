export type OracleIndexQuery = {
  OWNER: string;
  INDEX_NAME: string;
  INDEX_TYPE: string | null;
  TABLE_OWNER: string;
  TABLE_NAME: string;
  TABLE_TYPE: string | null;
  UNIQUENESS: string | null;
  COMPRESSION: string | null;
  PREFIX_LENGTH: number | null;
  TABLESPACE_NAME: string | null;
  INI_TRANS: number | null;
  MAX_TRANS: number | null;
  INITIAL_EXTENT: number | null;
  NEXT_EXTENT: number | null;
  MIN_EXTENTS: number | null;
  MAX_EXTENTS: number | null;
  PCT_INCREASE: number | null;
  PCT_THRESHOLD: number | null;
  INCLUDE_COLUMN: number | null;
  FREELISTS: number | null;
  FREELIST_GROUPS: number | null;
  PCT_FREE: number | null;
  LOGGING: string | null;
  BLEVEL: number | null;
  LEAF_BLOCKS: number | null;
  DISTINCT_KEYS: number | null;
  AVG_LEAF_BLOCKS_PER_KEY: number | null;
  AVG_DATA_BLOCKS_PER_KEY: number | null;
  CLUSTERING_FACTOR: number | null;
  STATUS: string | null;
  NUM_ROWS: number | null;
  SAMPLE_SIZE: number | null;
  LAST_ANALYZED: Date | null;
  DEGREE: string | null;
  INSTANCES: string | null;
  PARTITIONED: string | null;
  TEMPORARY: string | null;
  GENERATED: string | null;
  SECONDARY: string | null;
  BUFFER_POOL: string | null;
  FLASH_CACHE: string | null;
  CELL_FLASH_CACHE: string | null;
  USER_STATS: string | null;
  DURATION: string | null;
  PCT_DIRECT_ACCESS: number | null;
  ITYP_OWNER: string | null;
  ITYP_NAME: string | null;
  PARAMETERS: string | null;
  GLOBAL_STATS: string | null;
  DOMIDX_STATUS: string | null;
  DOMIDX_OPSTATUS: string | null;
  FUNCIDX_STATUS: string | null;
  JOIN_INDEX: string | null;
  IOT_REDUNDANT_PKEY_ELIM: string | null;
  DROPPED: string | null;
  VISIBILITY: string | null;
  DOMIDX_MANAGEMENT: string | null;
  SEGMENT_CREATED: string | null;
  ORPHANED_ENTRIES: string | null;
  INDEXING: string | null;
  AUTO: string | null;
  CONSTRAINT_INDEX: string | null;

  INDEX_OWNER: string;
  INDEX_NAME_1: string;
  TABLE_OWNER_1: string;
  TABLE_NAME_1: string;
  COLUMN_NAME: string | null;
  COLUMN_POSITION: number;
  COLUMN_LENGTH: number;
  CHAR_LENGTH: number | null;
  DESCEND: string | null;
  COLLATED_COLUMN_ID: number | null;
};

export interface OracleIndex
  extends Pick<
    OracleIndexQuery,
    | 'OWNER'
    | 'TABLE_NAME'
    | 'INDEX_NAME'
    | 'UNIQUENESS'
    | 'COLUMN_NAME'
    | 'COLUMN_POSITION'
  > {}
