import { ethers } from 'ethers';

export const ZERO_ADDRESS = ethers.ZeroAddress;
export const MAX_UINT = ethers.MaxUint256;
export const BASE_URI = ''; //TODO whether is necessary to use baseURI
export const RANDOM_TRANSFER_HASH = ethers.encodeBytes32String('transferHash');
