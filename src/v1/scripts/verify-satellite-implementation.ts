import { run } from 'hardhat';
import { task } from 'hardhat/config';

task('verify-satellite-implem', 'Verify the satellite implementation')
  .addParam('address', "The implementation's address")
  .setAction(async (_args, { ethers, run }) => {

    await run(`verify:verify`, {
      address: _args.address,
      contract:
        'contracts/v1/satellite/SatelliteV1.sol:SatelliteV1',
      constructorArguments: [],
    });
    return _args.address;
  });
