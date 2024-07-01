import { ethers, upgrades } from 'hardhat';
import { SecurityToken } from '../../../dist/types';
import { GetNewSecurityTokenImplementationConfig } from './configuration/new-security-token-implementation-config';

async function main() {

  const config = GetNewSecurityTokenImplementationConfig();

  const registrarAddress = config.NewOperatorsAddress.Registrar;
  const technicalAddress = config.NewOperatorsAddress.Technical;

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
