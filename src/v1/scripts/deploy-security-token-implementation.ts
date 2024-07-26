import { ethers, upgrades } from 'hardhat';
import { SecurityTokenV1 } from '../../../dist/types';
import { GetNewSecurityTokenImplementationConfig } from './configuration/new-security-token-implementation-config';

async function main() {
  const config = GetNewSecurityTokenImplementationConfig();

  const registrarAddress = config.NewOperatorsAddress.Registrar;
  const technicalAddress = config.NewOperatorsAddress.Technical;

  console.log(
    `Deploying SecurityTokenV1 implementation with registrar[${registrarAddress}] technical[${technicalAddress}]`,
  );

  const implementationAddress: SecurityTokenV1 =
    await upgrades.deployImplementation(SecurityTokenV1, {
      kind: 'uups',
      constructorArgs: [registrarAddress, technicalAddress],
      unsafeAllow: ['constructor'],
    });

  console.log(
    `SecurityTokenV1 implementation address: ${implementationAddress}`,
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
