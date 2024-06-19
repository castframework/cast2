import { run } from "hardhat";
import config from "../../config/new-security-token-implementation-config.json"
import { task } from "hardhat/config";

task("verify-implem", "Verify the implementation")
  .addParam("address", "The implementation's address")
  .setAction(async (_args, { ethers, run }) => {
    const registrarAddress = config.NewOperatorsAddress.Registrar;
    const technicalAddress = config.NewOperatorsAddress.Technical;
    
    await run(`verify:verify`, {
      address: _args.address,
      contract: "contracts/securityToken/SecurityToken.sol:SecurityToken",
      constructorArguments: [registrarAddress, technicalAddress],
    });
    return  _args.address
  });