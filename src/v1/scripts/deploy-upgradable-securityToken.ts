import { ethers, upgrades } from 'hardhat';
import { SecurityToken } from '../../../dist/types';
import { GetNewSecurityTokenImplementationConfig } from './configuration/new-security-token-implementation-config';

async function main() {
  const config = GetNewSecurityTokenImplementationConfig();

  const registrarAddress = config.NewOperatorsAddress.Registrar;
  const technicalAddress = config.NewOperatorsAddress.Technical;

  const SecurityToken = await ethers.getContractFactory('SecurityToken');

  const securityTokenProxifiedInstance: SecurityToken = await upgrades.deployProxy(
    SecurityToken,
    ['https://www.sgforge.com/erc1155/metadata/{id}'],
    {
      kind: 'uups',
      constructorArgs: [registrarAddress, technicalAddress],
      unsafeAllow: ['constructor'],
    },
  );

  await securityTokenProxifiedInstance.deployed();
  const securityTokenImplAddress: string =
    await upgrades.erc1967.getImplementationAddress(
      securityTokenProxifiedInstance.address,
    );
  console.log(`SecurityToken implementation address: ${securityTokenImplAddress}`);
  console.log(
    `SecurityToken proxy deployed to ${securityTokenProxifiedInstance.address}`,
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
