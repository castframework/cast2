import { ethers } from 'ethers';

export const IsETHAddress = [
  (val: string) => ethers.isAddress(val),
  { message: 'Must be a valid ETH address ( checksum must be valid )' },
] as const;
