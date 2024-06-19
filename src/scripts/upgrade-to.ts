import { ethers, upgrades } from 'hardhat';
import config from "../../config/upgrade-to-config.json"

async function main() {
  const registrarAddress = config.RegistrarAddress;
  const upgradeArtifact = config.ImplementationArtifactName; // Contract source name
  const proxyAddress = config.ProxyAddress;

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
