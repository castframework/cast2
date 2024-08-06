import { ethers } from 'ethers';

export const ZERO_ADDRESS = ethers.ZeroAddress;
export const MAX_UINT = ethers.MaxUint256;
export const URI = '';
export const BASE_URI = ''; //TODO whether is necessary to use baseURI
export const RANDOM_TRANSFER_HASH = ethers.encodeBytes32String('transferHash');
export const NAME = 'SECURITY TOKEN';
export const SYMBOL = 'SKT';
export const FORMER_SMART_CONTRACT_ADDRESS =
  '0x42ce53569Ef39e3708E0324709cfafDaf643833f';

export const MINT_DATA_TYPES = [
  'tuple(address registrarAgent, address settlementAgent) tokenOperators',
  'tuple(string uri, address formerSmartContractAddress, string webUri) tokenMetadata',
  'tuple(address implementationAddress, string name, string symbol) satelitteDetails',
];
