export type ObjectPrivileges = Record<
  string,
  Record<string, { privileges: string[] }>
>;
