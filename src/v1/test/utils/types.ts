export type MintData = {
  registrarAgent: string;
  settlementAgent: string;
  metadataUri: string;
};
export type TransferData = {
  kind: string;
};
export type LockTransferData = {
  kind: string;
  transactionId: string;
};
export enum TransferKind {
  LOCK = 'Lock',
  DIRECT = 'Direct',
  UNDEFINED = 'Undefined',
}
export enum TransferStatus {
  Undefined = 0,
  Created = 1,
  Validated = 2,
  Rejected = 3,
}
