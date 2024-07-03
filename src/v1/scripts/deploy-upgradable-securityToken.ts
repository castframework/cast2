import { ethers, upgrades } from 'hardhat';
import { SecurityTokenV1 } from '../../../dist/types';
import { GetNewSecurityTokenImplementationConfig } from './configuration/new-security-token-implementation-config';

async function main() {
  const config = GetNewSecurityTokenImplementationConfig();

  const registrarAddress = config.NewOperatorsAddress.Registrar;
  const technicalAddress = config.NewOperatorsAddress.Technical;

  const SecurityTokenV1 = await ethers.getContractFactory('SecurityTokenV1');

  const securityTokenProxifiedInstance: SecurityTokenV1 =
    await upgrades.deployProxy(
      SecurityTokenV1,
      ['https://www.sgforge.com/erc1155/metadata/{id}'],
      {
        kind: 'uups',
        constructorArgs: [registrarAddress, technicalAddress],
        unsafeAllow: ['constructor'],
      },
    );
    
  await securityTokenProxifiedInstance.waitForDeployment();
  const proxyAddress = await securityTokenProxifiedInstance.getAddress();
  const securityTokenImplAddress: string =
    await upgrades.erc1967.getImplementationAddress(
      proxyAddress
    );
  console.log(
    `SecurityTokenV1 implementation address: ${securityTokenImplAddress}`,
  );
  console.log(
    `SecurityTokenV1 proxy deployed to ${proxyAddress}`,
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
