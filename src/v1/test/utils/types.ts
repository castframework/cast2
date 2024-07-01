export type MintData = {
  registrarAgent: string;
  settlementAgent: string;
  metadataUri: string;
};
export type TransferData = {
  kind: string;
  transactionId: string;
};
export enum TransferKind {
  LOCK = 'Lock',
  DIRECT = 'Direct',
  UNDEFINED = 'Undefined',
}
