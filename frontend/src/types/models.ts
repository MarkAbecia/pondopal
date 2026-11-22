import type { Database } from './database';

type Public = Database['public'];
export type Row<T extends keyof Public['Tables']> = Public['Tables'][T]['Row'];
export type SpaceType = Public['Enums']['space_type'];
export type SpaceRole = Public['Enums']['space_role'];
export type TxnType = Public['Enums']['txn_type'];
