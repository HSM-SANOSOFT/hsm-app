export enum OracleConstrainType {
  C = 'C', //Check constraint on a table
  P = 'P', //Primary key
  U = 'U', //Unique key
  R = 'R', //Referential integrity (foreign key)
  V = 'V', //With check option, on a view
  O = 'O', //With read only, on a view
  H = 'H', //Hash expression
  F = 'F', //Constraint that involves a REF column
  S = 'S', //Supplemental logging
}
