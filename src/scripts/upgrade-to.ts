import { ethers, upgrades } from 'hardhat';

async function main() {
  if (!process.env.UPGRADE_ARTIFACT) {
    console.error('Missing upgrade artifact name');
    process.exit(1);
  }
  if (!process.env.UUPS_PROXY_ADDRESS) {
    console.error('Missing upgrade proxy address');
    process.exit(1);
  }
  if (!process.env.REGISTRAR) {
    console.error('Missing registrar address');
    process.exit(1);
  }

  const registrarAddress = process.env.REGISTRAR;
  const upgradeArtifact = process.env.UPGRADE_ARTIFACT; // Contract source name
  const proxyAddress = process.env.UUPS_PROXY_ADDRESS;

  const UpgradeContract = await ethers.getContractFactory(
    upgradeArtifact,
    ethers.getSigner(registrarAddress),
  );

  await upgrades.upgradeProxy(proxyAddress, UpgradeContract);

  console.log(`Code upgraded`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
