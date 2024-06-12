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

  const smartCoinProxifiedInstance: SmartCoin = await upgrades.deployProxy(
    SmartCoin,
    ['EUR CoinVertible', 'EURCV'],
    {
      kind: 'uups',
      constructorArgs: [registrarAddress, operationsAddress, technicalAddress],
      unsafeAllow: ['constructor'],
    },
  );

  await smartCoinProxifiedInstance.deployed();
  const smartCoinImplAddress: string =
    await upgrades.erc1967.getImplementationAddress(
      smartCoinProxifiedInstance.address,
    );
  console.log(`SmartCoin implementation address: ${smartCoinImplAddress}`);
  console.log(
    `SmartCoin proxy deployed to ${smartCoinProxifiedInstance.address}`,
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
