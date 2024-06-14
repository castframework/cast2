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
