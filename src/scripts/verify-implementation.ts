import { run } from "hardhat";
import * as dotenv from 'dotenv';
dotenv.config();
import { task } from "hardhat/config";

const REQUIRED_ENVS = ['REGISTRAR', 'OPERATIONS', 'TECHNICAL'];


task("verify-implem", "Verify the implementation")
  .addParam("address", "The implementation's address")
  .setAction(async (_args, { ethers, run }) => {
    REQUIRED_ENVS.forEach((envVarName) => {
      if (!process.env[envVarName]) {
        console.log(`Missing envars: ${envVarName}`);
        process.exit(1);
      }
    });
    const registrarAddress = process.env.REGISTRAR;
    const operationsAddress = process.env.OPERATIONS;
    const technicalAddress = process.env.TECHNICAL;
    
    await run(`verify:verify`, {
      address: _args.address,
      contract: "contracts/smartCoin/SmartCoin.sol:SmartCoin",
      constructorArguments: [registrarAddress, operationsAddress, technicalAddress],
    });
    return  _args.address
  });