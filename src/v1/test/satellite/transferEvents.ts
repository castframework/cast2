import {
  deploySatelliteV1Fixture,
  deploySecurityTokenFixture,
} from '../utils/builders';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { Signer, EventLog } from 'ethers';
import { ethers } from 'hardhat';
import { getOperatorSigners } from '../utils/signers';
import {
  SatelliteDetails,
  TokenMetadata,
  TokenOperators,
  TransferKind,
} from '../../types/types';
import { SatelliteV1, SecurityTokenV1 } from 'dist/types';
import {
  FORMER_SMART_CONTRACT_ADDRESS,
  MINT_DATA_TYPES,
  ZERO_ADDRESS,
} from '../utils/constants';
import { operationsAddress } from '../securityToken/constants';
import { token } from 'dist/types/@openzeppelin/contracts';

context('Satellite', () => {
  let securityTokenProxy: SecurityTokenV1;
  let satelliteImplementation: SatelliteV1;
  let signers: {
    registrar: Signer;
    issuer: Signer;
    registrarAgent: Signer;
    investor1: Signer;
    investor2: Signer;
    investor3: Signer;
    settlementAgent: Signer;
  };
  let tokenId = 10;
  let amount: number = 100;
  let receiverAddress;
  let registrarAgentAddress;
  let settlementAgentAddress;
  let newRegistrarAddress;
  const AbiCoder = new ethers.AbiCoder();
  let mintFunction: any; // TODO add right type

  let uri;
  let satelliteImplementationAddress;
  let transactionId = 'laTransaction';

  let satelliteDetails: SatelliteDetails;
  let tokenOperators: TokenOperators;
  let tokenMetadata: TokenMetadata;

  beforeEach(async () => {
    signers = await getOperatorSigners();

    securityTokenProxy = await loadFixture(deploySecurityTokenFixture);
    satelliteImplementation = await loadFixture(deploySatelliteV1Fixture);

    satelliteImplementationAddress = await satelliteImplementation.getAddress();
    receiverAddress = await signers.investor1.getAddress();
    registrarAgentAddress = await signers.registrarAgent.getAddress();
    settlementAgentAddress = await signers.settlementAgent.getAddress();
    newRegistrarAddress = await signers.investor3.getAddress();
    uri = '0x';
    tokenOperators = {
      registrarAgent: registrarAgentAddress,
      settlementAgent: settlementAgentAddress,
    };
    tokenMetadata = {
      uri: '0x',
      formerSmartContractAddress: FORMER_SMART_CONTRACT_ADDRESS,
      webUri: '',
    };
    satelliteDetails = {
      implementationAddress: satelliteImplementationAddress,
      name: 'toto',
      symbol: 'tata',
    };

    mintFunction = () =>
      securityTokenProxy
        .connect(signers.registrar)
        .mint(
          receiverAddress,
          tokenId,
          amount,
          AbiCoder.encode(MINT_DATA_TYPES, [
            tokenOperators,
            tokenMetadata,
            satelliteDetails,
          ]),
        );
  });

  it('should fail with invalid satellite address', async () => {
    satelliteDetails = {
      implementationAddress: registrarAgentAddress,
      name: 'toto',
      symbol: 'tata',
    };
    const mintToken = securityTokenProxy
      .connect(signers.registrar)
      .mint(
        receiverAddress,
        tokenId,
        amount,
        AbiCoder.encode(MINT_DATA_TYPES, [
          tokenOperators,
          tokenMetadata,
          satelliteDetails,
        ]),
      );
    await expect(mintToken).to.be.revertedWithCustomError(
      securityTokenProxy,
      'InvalidSatelliteAddress',
    );
  });

  it('Should be able to create a new satellite', async () => {
    let satelliteTransaction = await mintFunction();
    await expect(satelliteTransaction)
      .to.emit(securityTokenProxy, 'NewSatellite')
      .withArgs(tokenId, (val) => ethers.isAddress(val));
  });

  it('Should emit a transfer event when minting', async () => {
    let satelliteAddressTransaction = await (await mintFunction()).wait();

    let satelliteAddress = (
      satelliteAddressTransaction!.logs as EventLog[]
    ).find((elog) => elog.fragment.name === 'NewSatellite')!.args[1];

    let satellite: SatelliteV1 = await ethers.getContractAt(
      'SatelliteV1',
      satelliteAddress,
    );

    await expect(satelliteAddressTransaction).to.emit(satellite, 'Transfer').withArgs(ZERO_ADDRESS, receiverAddress, amount);
  });

  it('Should emit a transfer event when safeTransferFrom (Direct)', async () => {
    let satelliteAddressTransaction = await (await mintFunction()).wait();
    await expect(satelliteAddressTransaction).to.emit(
      securityTokenProxy,
      'NewSatellite',
    );

    let satelliteAddress = (
      satelliteAddressTransaction!.logs as EventLog[]
    ).find((elog) => elog.fragment.name === 'NewSatellite')!.args[1];

    let satellite: SatelliteV1 = await ethers.getContractAt(
      'SatelliteV1',
      satelliteAddress,
    );

    let safeTransferTransaction = await securityTokenProxy
      .connect(signers.registrarAgent)
      .safeTransferFrom(
        receiverAddress,
        settlementAgentAddress,
        tokenId,
        amount,
        AbiCoder.encode(
          ['tuple(string kind) transferData'],
          [{ kind: TransferKind.DIRECT }],
        ),
      );

    await expect(safeTransferTransaction).to.emit(satellite, 'Transfer').withArgs(receiverAddress, settlementAgentAddress, amount);
  });

  it('Should match the satellite address', async () => {
    let satelliteAddressTransaction = await (await mintFunction()).wait();
    await expect(satelliteAddressTransaction).to.emit(
      securityTokenProxy,
      'NewSatellite',
    );

    let satelliteAddress = (
      satelliteAddressTransaction!.logs as EventLog[]
    ).find((elog) => elog.fragment.name === 'NewSatellite')!.args[1];

    await expect(await securityTokenProxy.satellite(tokenId)).to.eq(
      satelliteAddress,
    );
  });

  it('Should be able to get the tokenURI', async () => {
    let satelliteAddressTransaction = await (await mintFunction()).wait();
    await expect(satelliteAddressTransaction).to.emit(
      securityTokenProxy,
      'NewSatellite',
    );

    let satelliteAddress = (
      satelliteAddressTransaction!.logs as EventLog[]
    ).find((elog) => elog.fragment.name === 'NewSatellite')!.args[1];

    let satellite: SatelliteV1 = await ethers.getContractAt(
      'SatelliteV1',
      satelliteAddress,
    );
    await expect(await satellite.tokenURI()).to.eq(tokenMetadata.uri);
  });

  it('Should be able to get the webUri', async () => {
    let satelliteAddressTransaction = await (await mintFunction()).wait();
    await expect(satelliteAddressTransaction).to.emit(
      securityTokenProxy,
      'NewSatellite',
    );

    let satelliteAddress = (
      satelliteAddressTransaction!.logs as EventLog[]
    ).find((elog) => elog.fragment.name === 'NewSatellite')!.args[1];

    let satellite: SatelliteV1 = await ethers.getContractAt(
      'SatelliteV1',
      satelliteAddress,
    );
    await expect(await satellite.webUri()).to.eq(tokenMetadata.webUri);
  });

  it('Should be able to get the formerSmartContractAddress', async () => {
    let satelliteAddressTransaction = await (await mintFunction()).wait();
    await expect(satelliteAddressTransaction).to.emit(
      securityTokenProxy,
      'NewSatellite',
    );

    let satelliteAddress = (
      satelliteAddressTransaction!.logs as EventLog[]
    ).find((elog) => elog.fragment.name === 'NewSatellite')!.args[1];

    let satellite: SatelliteV1 = await ethers.getContractAt(
      'SatelliteV1',
      satelliteAddress,
    );
    await expect(await satellite.formerSmartContractAddress()).to.eq(
      tokenMetadata.formerSmartContractAddress,
    );
  });

  it('Should be able to get the balance of an account', async () => {
    let satelliteAddressTransaction = await (await mintFunction()).wait();
    await expect(satelliteAddressTransaction).to.emit(
      securityTokenProxy,
      'NewSatellite',
    );

    let satelliteAddress = (
      satelliteAddressTransaction!.logs as EventLog[]
    ).find((elog) => elog.fragment.name === 'NewSatellite')!.args[1];

    let satellite: SatelliteV1 = await ethers.getContractAt(
      'SatelliteV1',
      satelliteAddress,
    );
    await expect((await satellite.balanceOf(receiverAddress)).toString()).to.eq(
      amount.toString(),
    );
  });

  it('Should be able to get the total balance', async () => {
    let satelliteAddressTransaction = await (await mintFunction()).wait();
    await expect(satelliteAddressTransaction).to.emit(
      securityTokenProxy,
      'NewSatellite',
    );

    let satelliteAddress = (
      satelliteAddressTransaction!.logs as EventLog[]
    ).find((elog) => elog.fragment.name === 'NewSatellite')!.args[1];

    let satellite: SatelliteV1 = await ethers.getContractAt(
      'SatelliteV1',
      satelliteAddress,
    );
    await expect((await satellite.totalSupply()).toString()).to.eq(
      amount.toString(),
    );
  });

  it('Should emit a transfer event when safeTransferFrom (Lock)', async () => {
    let satelliteAddressTransaction = await (await mintFunction()).wait();

    await expect(satelliteAddressTransaction).to.emit(
      securityTokenProxy,
      'NewSatellite',
    );

    let satelliteAddress = (
      satelliteAddressTransaction!.logs as EventLog[]
    ).find((elog) => elog.fragment.name === 'NewSatellite')!.args[1];

    let satellite: SatelliteV1 = await ethers.getContractAt(
      'SatelliteV1',
      satelliteAddress,
    );

    let lockTransferTransaction = await securityTokenProxy
      .connect(signers.registrarAgent)
      .safeTransferFrom(
        receiverAddress,
        settlementAgentAddress,
        tokenId,
        amount,
        AbiCoder.encode(
          ['tuple(string kind, string transactionId) lockTransferData'],
          [{ kind: TransferKind.LOCK, transactionId }],
        ),
      );

      await expect(lockTransferTransaction).to.emit(satellite, 'Transfer').withArgs(receiverAddress, settlementAgentAddress, 0);
  });

  it('Should emit a transfer event when releaseTransaction (Lock)', async () => {
    let satelliteAddressTransaction = await (await mintFunction()).wait();

    await expect(satelliteAddressTransaction).to.emit(
      securityTokenProxy,
      'NewSatellite',
    );

    let satelliteAddress = (
      satelliteAddressTransaction!.logs as EventLog[]
    ).find((elog) => elog.fragment.name === 'NewSatellite')!.args[1];

    let satellite: SatelliteV1 = await ethers.getContractAt(
      'SatelliteV1',
      satelliteAddress,
    );

    await securityTokenProxy
      .connect(signers.registrarAgent)
      .safeTransferFrom(
        receiverAddress,
        settlementAgentAddress,
        tokenId,
        amount,
        AbiCoder.encode(
          ['tuple(string kind, string transactionId) lockTransferData'],
          [{ kind: TransferKind.LOCK, transactionId }],
        ),
      );

    let releaseLockTransaction = await securityTokenProxy
      .connect(signers.settlementAgent)
      .releaseTransaction(transactionId);

    await expect(releaseLockTransaction).to.emit(satellite, 'Transfer').withArgs(receiverAddress, settlementAgentAddress, amount);
  });

  it('Should emit a transfer event when cancelTransaction (Lock)', async () => {
    let satelliteAddressTransaction = await (await mintFunction()).wait();

    await expect(satelliteAddressTransaction).to.emit(
      securityTokenProxy,
      'NewSatellite',
    );

    let satelliteAddress = (
      satelliteAddressTransaction!.logs as EventLog[]
    ).find((elog) => elog.fragment.name === 'NewSatellite')!.args[1];

    let satellite: SatelliteV1 = await ethers.getContractAt(
      'SatelliteV1',
      satelliteAddress,
    );

    await securityTokenProxy
      .connect(signers.registrarAgent)
      .safeTransferFrom(
        receiverAddress,
        settlementAgentAddress,
        tokenId,
        amount,
        AbiCoder.encode(
          ['tuple(string kind, string transactionId) lockTransferData'],
          [{ kind: TransferKind.LOCK, transactionId }],
        ),
      );

    let cancelLockTransaction = await securityTokenProxy
      .connect(signers.registrarAgent)
      .cancelTransaction(transactionId);

    await expect(cancelLockTransaction).to.emit(satellite, 'Transfer').withArgs(receiverAddress, settlementAgentAddress, 0);
  });

  it('Should emit a transfer event when burning tokens', async () => {
    let satelliteAddressTransaction = await (await mintFunction()).wait();

    await expect(satelliteAddressTransaction).to.emit(
      securityTokenProxy,
      'NewSatellite',
    );

    let satelliteAddress = (
      satelliteAddressTransaction!.logs as EventLog[]
    ).find((elog) => elog.fragment.name === 'NewSatellite')!.args[1];

    let satellite: SatelliteV1 = await ethers.getContractAt(
      'SatelliteV1',
      satelliteAddress,
    );

    let burnTransaction = await securityTokenProxy
      .connect(signers.registrar)
      .burn(
        receiverAddress,
        tokenId,
        amount
      );

      await expect(burnTransaction).to.emit(satellite, 'Transfer').withArgs(receiverAddress, ZERO_ADDRESS, amount);
  });
});
context('Satellite disable functions', async () => {
  let satelliteImplementation: SatelliteV1;
  let signers: {
    registrar: Signer;
    issuer: Signer;
    registrarAgent: Signer;
    investor1: Signer;
    investor2: Signer;
    investor3: Signer;
    settlementAgent: Signer;
  };
  beforeEach(async () => {
    satelliteImplementation = await deploySatelliteV1Fixture();
    signers = await getOperatorSigners();
  });
  it('should fail to initialise satellite second time', async () => {
    const initialize = () =>
      satelliteImplementation
        .connect(signers.registrarAgent)
        .initialize(operationsAddress, 1, 'toto', 'tata');
    await initialize();
    expect(initialize()).to.be.revertedWithCustomError(
      satelliteImplementation,
      'InvalidInitialization',
    );
  });
  it('should fail with approve is disabled', async () => {
    expect(
      satelliteImplementation
        .connect(signers.registrarAgent)
        .approve(operationsAddress, 100),
    ).to.be.revertedWithCustomError(satelliteImplementation, 'Disabled');
  });
  it('should fail with allowance is disabled', async () => {
    expect(
      satelliteImplementation
        .connect(signers.registrarAgent)
        .allowance(operationsAddress, operationsAddress),
    ).to.be.revertedWithCustomError(satelliteImplementation, 'Disabled');
  });
  it('should fail with transfer is disabled', async () => {
    expect(
      satelliteImplementation
        .connect(signers.registrarAgent)
        .transfer(operationsAddress, 100),
    ).to.be.revertedWithCustomError(satelliteImplementation, 'Disabled');
  });
  it('should fail ERC1155 token could call safeTransfeFrom', async () => {
    await satelliteImplementation
      .connect(signers.registrarAgent)
      .initialize(operationsAddress, 1, 'toto', 'tata');
    expect(
      satelliteImplementation
        .connect(signers.registrarAgent)
        .transferFrom(operationsAddress, operationsAddress, 100),
    ).to.be.revertedWithCustomError(satelliteImplementation, 'Unauthorized');
  });
});
