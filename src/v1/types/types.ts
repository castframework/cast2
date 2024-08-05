export type TokenOperators = {
  registrarAgent: string;
  settlementAgent: string;
};
export type TokenMetadata = {
  uri: string;
  formerSmartContractAddress: string;
  webUri: string
}
export type SatelliteDetails = {
  name: string;
  symbol: string;
  implementationAddress: string;
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
