/** @type import('hardhat/config').HardhatUserConfig */
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import 'solidity-docgen';
import { HardhatUserConfig, subtask } from "hardhat/config";

const {
  TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD,
} = require("hardhat/builtin-tasks/task-names");
const path = require("path");
import "@nomicfoundation/hardhat-chai-matchers"; //Added for revertWithCustomErrors
import "./src/v1/scripts/verify-implementation";

import * as dotenv from 'dotenv';
dotenv.config()

const privateKey = process.env.PRIVATE_KEY;
const infuraKey = process.env.INFURA_KEY;
const etherScanApiKey = process.env.ETHERSCAN_API_KEY;
const exaionKey = process.env.EXAION_KEY;


function warn(message: string){
  if(!process.env['HARDHAT_CONFIG_QUIET']) console.warn(message);
}

subtask(
  TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD,
  async (
    args: {
      solcVersion: string;
    },
    hre,
    runSuper
  ) => {
    if (args.solcVersion === "0.8.26") {
      const compilerPath = path.join(
        __dirname,
        "soljson-v0.8.26+commit.8a97fa7a.js"
      );

      return {
        compilerPath,
        isSolcJs: true, // if you are using a native compiler, set this to false
        version: args.solcVersion,
        // This is used as extra information in the build-info files,
        // but other than that is not important
        longVersion: "soljson-v0.8.26+commit.8a97fa7a.js",
      };
    }

    // since we only want to override the compiler for version 0.8.24,
    // the runSuper function allows us to call the default subtask.
    return runSuper();
  }
);

function buildNetworkFromEnv(){
  if(!privateKey){
    warn('No PRIVATE_KEY given, only the hardhat test network will be available');
    return {};
  }

  if(!process.env.INFURA_KEY){
    warn('No INFURA_KEY given')
  }
  const infuraNetworks = process.env.INFURA_KEY ? 
    {
      sepolia: {
        url: `https://sepolia.infura.io/v3/${infuraKey}`,
        accounts: [{
          privateKey: privateKey,
          balance: "0"
        }
      ]
      },
      mainnet: {
        url: `https://mainnet.infura.io/v3/${infuraKey}`,
        accounts:  [{
          privateKey: privateKey,
          balance: "0"
        }
      ]
      },
    } : {}

  if(!process.env.EXAION_KEY){
    warn('No EXAION_KEY given')
  }
  const exaionNetwork = process.env.EXAION_KEY ? 
  {
    exaion:{
      url: `https://node.exaion.com/api/v1/${exaionKey}/rpc`,
      accounts:  [{
          privateKey: privateKey,
          balance: "0"
        }
      ]
    }
  } : {};


  return {
    ...infuraNetworks,
    ...exaionNetwork
  }
}

const config : HardhatUserConfig  = {
  solidity: {
    version: '0.8.26',
    settings: {
      viaIR: true,//TODO a discuter pour les custom errors in require
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: { 
        "*": {
          "*": [ "storageLayout" ],
        } ,
      }
    },
  },
  mocha: {
    reporter: 'mocha-multi-reporters',
    reporterOptions: {
      configFile: "mocha-multi-reporters.json"
    }
  },
  typechain: {
    outDir: 'dist/types',
    target: 'ethers-v6',
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
  },
  paths: {
    sources: './contracts',
    tests: './src/v1/test',
    cache: './cache',
    artifacts: './dist',
  },
  networks: buildNetworkFromEnv(),
  etherscan: {
    apiKey: etherScanApiKey
  },
  docgen: {
    pages: 'items',
  }
};
export default config;
