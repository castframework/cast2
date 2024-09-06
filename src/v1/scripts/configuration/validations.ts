import { ethers } from 'ethers';

export const IsETHAddress = [
  (val: string) => ethers.isAddress(val),
  { message: 'Must be a valid ETH address ( you can use etherscan to get the right casing if necessary)' },
] as const;
