import { ethers, upgrades } from 'hardhat';
import * as dotenv from 'dotenv';
import { SmartCoin } from '../../dist/types';
dotenv.config();

const REQUIRED_ENVS = ['REGISTRAR', 'OPERATIONS', 'TECHNICAL'];

async function main() {
  REQUIRED_ENVS.forEach((envVarName) => {
    if (!process.env[envVarName]) {
      console.log(`Missing envars: ${envVarName}`);
      process.exit(1);
    }
  });
  const registrarAddress = process.env.REGISTRAR;
  const operationsAddress = process.env.OPERATIONS;
  const technicalAddress = process.env.TECHNICAL;

  const SmartCoin = await ethers.getContractFactory('SmartCoin');

  console.log(`Deploying SmartCoin implementation with registrar[${registrarAddress}] operations[${operationsAddress}] technical[${technicalAddress}]`)

  const implementationAddress: SmartCoin = await upgrades.deployImplementation(
    SmartCoin,
    {
      kind: 'uups',
      constructorArgs: [registrarAddress, operationsAddress, technicalAddress],
      unsafeAllow: ['constructor'],
    },
  );

  console.log(`SmartCoin implementation address: ${implementationAddress}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
