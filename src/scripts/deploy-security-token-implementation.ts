import { ethers, upgrades } from 'hardhat';
import * as dotenv from 'dotenv';
import { SecurityToken } from '../../dist/types';
dotenv.config();

const REQUIRED_ENVS = ['REGISTRAR', 'TECHNICAL'];

async function main() {
  REQUIRED_ENVS.forEach((envVarName) => {
    if (!process.env[envVarName]) {
      console.log(`Missing envars: ${envVarName}`);
      process.exit(1);
    }
  });
  const registrarAddress = process.env.REGISTRAR;
  const technicalAddress = process.env.TECHNICAL;

  const SmartCoin = await ethers.getContractFactory('SecurityToken');

  console.log(`Deploying SecurityToken implementation with registrar[${registrarAddress}] technical[${technicalAddress}]`)

  const implementationAddress: SecurityToken = await upgrades.deployImplementation(
    SecurityToken,
    {
      kind: 'uups',
      constructorArgs: [registrarAddress, technicalAddress],
      unsafeAllow: ['constructor'],
    },
  );

  console.log(`SecurityToken implementation address: ${implementationAddress}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
