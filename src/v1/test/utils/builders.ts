import {
  MissuseAccessControlInternal,
  SecurityTokenV1,
} from '../../../dist/types/';
import { ethers, upgrades } from 'hardhat';
import { getOperatorSigners } from './signers';
import { BASE_URI, NAME, SYMBOL, URI } from './constants';
import { SatelliteV1 } from 'dist/types';

export async function getSecurityTokenOperatorsAddresses(): Promise<string[]> {
  const signers = await getOperatorSigners();

  const registrarAddress = await signers.registrar.getAddress();
  const technicalAddress = await signers.technical.getAddress();
  return [registrarAddress, technicalAddress];
}

export async function deploySecurityTokenFixture(): Promise<SecurityTokenV1> {
  const SecurityTokenV1 = await ethers.getContractFactory('SecurityTokenV1');

  const securityTokenOperators: Array<string> =
    await getSecurityTokenOperatorsAddresses();
  const securityTokenProxyfiedInstance = (await upgrades.deployProxy(
    SecurityTokenV1,
    [URI, BASE_URI, NAME, SYMBOL],
    {
      kind: 'uups',
      constructorArgs: securityTokenOperators,
      unsafeAllow: ['constructor'],
    },
  )) as SecurityTokenV1;
  return securityTokenProxyfiedInstance;
}

export async function deploySatelliteV1Fixture(): Promise<SatelliteV1> {
  const SatelliteV1 = await ethers.getContractFactory('SatelliteV1');

  const satelliteV1ImplementationInstance =
    (await SatelliteV1.deploy()) as SatelliteV1;
  return satelliteV1ImplementationInstance;
}

export async function deploySecurityTokenV2Fixture(): Promise<string> {
  const signers = await getOperatorSigners();

  const SecurityTokenV2Factory = await ethers.getContractFactory(
    'SecurityTokenFakeV2',
    signers.technical,
  );

  const securityTokenOperators: Array<string> =
    await getSecurityTokenOperatorsAddresses();
  const securityTokenV2Address = await upgrades.deployImplementation(
    SecurityTokenV2Factory,
    {
      constructorArgs: securityTokenOperators,
      unsafeAllow: ['constructor'],
      kind: 'uups',
    },
  );
  return securityTokenV2Address;
}

export async function deployTestContractMissuseAccessControlInternal(): Promise<MissuseAccessControlInternal> {
  const securityTokenOperators: Array<string> =
    await getSecurityTokenOperatorsAddresses();
  const TestContractBase = await ethers.getContractFactory(
    'MissuseAccessControlInternal',
  );

  const testContract = (await upgrades.deployProxy(TestContractBase, [], {
    kind: 'uups',
    constructorArgs: securityTokenOperators,
    unsafeAllow: ['constructor'],
  })) as MissuseAccessControlInternal;
  return testContract;
}
