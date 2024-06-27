import { run } from "hardhat";
import { task } from "hardhat/config";
import { GetNewSecurityTokenImplementationConfig } from "./configuration/new-security-token-implementation-config";

task("verify-implem", "Verify the implementation")
  .addParam("address", "The implementation's address")
  .setAction(async (_args, { ethers, run }) => {
    const config = GetNewSecurityTokenImplementationConfig();

    const registrarAddress = config.NewOperatorsAddress.Registrar;
    const technicalAddress = config.NewOperatorsAddress.Technical;
    
    await run(`verify:verify`, {
      address: _args.address,
      contract: 'contracts/securityToken/SecurityToken.sol:SecurityToken',
      constructorArguments: [registrarAddress, technicalAddress],
    });
    return _args.address;
  });
