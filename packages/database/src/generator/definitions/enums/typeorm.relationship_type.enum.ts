export enum TypeormRelationshipTypeEnum {
  MM = 'MANY_TO_MANY', // n:n relationship
  OM = 'ONE_TO_MANY', // 1:n relationship
  MO = 'MANY_TO_ONE', // n:1 relationship
  OO = 'ONE_TO_ONE', // 1:1 relationship
}
