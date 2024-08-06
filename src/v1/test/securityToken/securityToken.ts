import { SecurityTokenV1 } from '../../../dist/types';
import { expect, assert } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import {
  deploySatelliteV1Fixture,
  deploySecurityTokenFixture,
} from '../utils/builders';
import { getOperatorSigners } from '../utils/signers';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import '@nomicfoundation/hardhat-chai-matchers'; //Added for revertWithCustomErrors
import {
  LockTransferData,
  SatelliteDetails,
  TokenMetadata,
  TokenOperators,
  TransferData,
  TransferKind,
  TransferStatus,
} from '../../types/types';
import { randomUUID } from 'crypto';
import {
  FORMER_SMART_CONTRACT_ADDRESS,
  MINT_DATA_TYPES,
  NAME,
  SYMBOL,
} from '../utils/constants';
import { SatelliteV1 } from 'dist/types';

context('SecurityTokenV1', () => {
  let securityTokenProxy: SecurityTokenV1;

  let satelliteImplementationAddress;
  let satelliteImplementation: SatelliteV1;

  const emptyMintData = '0x';
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
  let mintFunction: () => {};
  let uri;

  let satelitteDetails: SatelliteDetails;
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
    satelitteDetails = {
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
            satelitteDetails,
          ]),
        );
    await mintFunction();
  });
  context('Name,symbol and formerSmartContractAddress', async () => {
    it('should match the token name', async () =>
      await expect(await securityTokenProxy.name()).to.be.eq(NAME));
    it('should match the token symbol', async () =>
      await expect(await securityTokenProxy.symbol()).to.be.eq(SYMBOL));

    it('should match the formerSmartContractAddress', async () =>
      await expect(
        await securityTokenProxy.formerSmartContractAddress(tokenId),
      ).to.be.eq(FORMER_SMART_CONTRACT_ADDRESS));
  });
  context('Unsupported Methods', async () => {
    it('should not support safeBatchTransferFrom', async () =>
      await expect(
        securityTokenProxy.safeBatchTransferFrom(
          receiverAddress,
          receiverAddress,
          [1],
          [2],
          '0x',
        ),
      ).to.be.revertedWithCustomError(securityTokenProxy, 'UnsupportedMethod'));
    it('should not support isApprovedForAll', async () =>
      await expect(
        securityTokenProxy.isApprovedForAll(receiverAddress, receiverAddress),
      ).to.be.revertedWithCustomError(securityTokenProxy, 'UnsupportedMethod'));
    it('should not support setApprovalForAll', async () =>
      await expect(
        securityTokenProxy.setApprovalForAll(receiverAddress, true),
      ).to.be.revertedWithCustomError(securityTokenProxy, 'UnsupportedMethod'));
  });
  context('Mint Tokens', async () => {
    it('should revert when data is missing metadataUri', async () => {
      expect(
        securityTokenProxy.connect(signers.registrar).mint(
          receiverAddress,
          tokenId,
          amount,
          AbiCoder.encode(
            ['tuple(address registrarAgent, string settlementAgent) mintData'],
            [
              {
                registrarAgent: registrarAgentAddress,
                settlementAgent: settlementAgentAddress,
              },
            ],
          ),
        ),
      ).to.be.revertedWithoutReason();
    });
    it('should be able to mint tokens to a receiver address', async () => {
      expect(
        await securityTokenProxy.balanceOf(receiverAddress, tokenId),
        amount.toString(),
      );
    });
    it('should match the initiale registar agent address', async () => {
      expect(await securityTokenProxy.getRegistrarAgent(tokenId)).to.be.eq(
        registrarAgentAddress,
      );
    });
    it('should match the initiale settlement agent address', async () => {
      expect(await securityTokenProxy.getSettlementAgent(tokenId)).to.eq(
        settlementAgentAddress,
      );
    });
    it(`should match the initiale token's uri`, async () => {
      expect(await securityTokenProxy.uri(tokenId), uri);
    });
    it('should not mint a token with mintData if its already minted', async () => {
      expect(mintFunction)
        .to.revertedWithCustomError(securityTokenProxy, 'TokenAlreadyMinted')
        .withArgs(tokenId);
    });
    it('only registrar could mint tokens', async () => {
      expect(
        securityTokenProxy.connect(signers.settlementAgent).mint(
          receiverAddress,
          tokenId,
          amount,
          AbiCoder.encode(
            ['tuple(address registrarAgent, string settlementAgent) mintData'],
            [
              {
                registrarAgent: registrarAgentAddress,
                settlementAgent: settlementAgentAddress,
              },
            ],
          ),
        ),
      ).to.be.revertedWithCustomError(
        securityTokenProxy,
        'UnauthorizedRegistrar',
      );
    });
    it('should be able to mint with empty data when token already minted', async () => {
      await securityTokenProxy
        .connect(signers.registrar)
        .mint(receiverAddress, tokenId, amount, emptyMintData);
      expect(
        await securityTokenProxy.balanceOf(receiverAddress, tokenId),
        (amount * 2).toString(),
      );
      let satellite: SatelliteV1 = await ethers.getContractAt(
        'SatelliteV1',
        await securityTokenProxy.satellite(tokenId),
      );
      expect(
        await satellite.balanceOf(receiverAddress),
        (amount * 2).toString(),
      );
    });
    it('should be not be able to mint with empty data when token not already minted', async () => {
      let newTokenId = 11;
      expect(
        securityTokenProxy
          .connect(signers.registrar)
          .mint(receiverAddress, newTokenId, amount, emptyMintData),
      )
        .to.be.revertedWithCustomError(
          securityTokenProxy,
          'TokenNotAlreadyMinted',
        )
        .withArgs(newTokenId);
    });
  });
  context('Burn tokens', async () => {
    it('should be able to burn tokens of an account', async () => {
      await securityTokenProxy
        .connect(signers.registrar)
        .burn(receiverAddress, tokenId, amount);
      expect(await securityTokenProxy.balanceOf(receiverAddress, tokenId), '0');
    });
    it('only registrar could burn tokens', async () => {
      const burn = securityTokenProxy
        .connect(signers.settlementAgent)
        .burn(receiverAddress, tokenId, amount);
      expect(burn).to.be.revertedWithCustomError(
        securityTokenProxy,
        'UnauthorizedRegistrar',
      );
    });
    it('should be able to burn only when balance available', async () => {
      const burn = securityTokenProxy
        .connect(signers.registrar)
        .burn(receiverAddress, tokenId, amount * 2);
      expect(burn)
        .to.be.revertedWithCustomError(
          securityTokenProxy,
          'InsufficientBalance',
        )
        .withArgs(tokenId, amount, amount * 2);
    });
  });
  context('Update Metadata URIs', async () => {
    it('should be able to set base uri', async () => {
      const newBaseUri = 'https://lokon.fr/{id}';
      const tokenURI = 'toto';
      await securityTokenProxy
        .connect(signers.registrar)
        .setBaseURI(newBaseUri);

      await securityTokenProxy
        .connect(signers.registrar)
        .setURI(tokenId, 'toto');

      expect(await securityTokenProxy.uri(tokenId)).to.be.eq(
        newBaseUri.concat(tokenURI),
      );
    });
    it('only registrar should be able to set base uri', async () => {
      const setBaseUrl = securityTokenProxy
        .connect(signers.settlementAgent)
        .setBaseURI('');

      expect(setBaseUrl).to.be.revertedWithCustomError(
        securityTokenProxy,
        'UnauthorizedRegistrar',
      );
    });
    it('only registrar should be able to set uri', async () => {
      const setBaseUrl = securityTokenProxy
        .connect(signers.settlementAgent)
        .setURI(tokenId, 'toto');
      expect(setBaseUrl).to.be.revertedWithCustomError(
        securityTokenProxy,
        'UnauthorizedRegistrar',
      );
    });
    it('should be able to set tokens uri', async () => {
      const newUri = 'https://lokon.fr/{toto}';
      await securityTokenProxy
        .connect(signers.registrar)
        .setURI(tokenId, newUri);
      expect(await securityTokenProxy.uri(tokenId)).to.be.eq(newUri);
    });
    it('only registrar could set token uri', async () => {
      const burn = securityTokenProxy
        .connect(signers.settlementAgent)
        .burn(receiverAddress, tokenId, amount);
      await expect(burn).to.be.revertedWithCustomError(
        securityTokenProxy,
        'UnauthorizedRegistrar',
      );
    });
  });
  context('Update Web URIs', async () => {
    it('should be able to set web uri', async () => {
      const tokenWebURI = 'toto';

      await securityTokenProxy
        .connect(signers.registrar)
        .setWebUri(tokenId, tokenWebURI);

      expect(await securityTokenProxy.webUri(tokenId)).to.be.eq(tokenWebURI);
    });
    it('should email WebUri event', async () => {
      const tokenWebURI = 'toto';
      const setWebToken = securityTokenProxy
        .connect(signers.registrar)
        .setWebUri(tokenId, tokenWebURI);
      expect(setWebToken)
        .to.emit(securityTokenProxy, 'WebUri')
        .withArgs(tokenId, tokenWebURI);
    });
    it('only registrar should be able to set web uri', async () => {
      const setBaseUrl = securityTokenProxy
        .connect(signers.settlementAgent)
        .setWebUri(tokenId, 'uri');

      expect(setBaseUrl).to.be.revertedWithCustomError(
        securityTokenProxy,
        'UnauthorizedRegistrar',
      );
    });
  });
  context('Safe Transfer Tokens', async () => {
    let lockTransferData: LockTransferData;
    let transferAmount: number = 1;
    const transactionId = randomUUID();
    lockTransferData = { kind: TransferKind.LOCK, transactionId };
    const data = AbiCoder.encode(
      ['tuple(string kind, string transactionId) lockTransferData'],
      [lockTransferData],
    );
    it("only token's registrar agent could make a transfer", async () => {
      const safeTransfer = securityTokenProxy
        .connect(signers.investor1)
        .safeTransferFrom(
          receiverAddress,
          settlementAgentAddress,
          tokenId,
          transferAmount,
          data,
        );
      await expect(safeTransfer)
        .to.be.revertedWithCustomError(
          securityTokenProxy,
          'UnauthorizedRegistrarAgent',
        )
        .withArgs(tokenId);
    });
    it('should be able to get lockedTransfer request', async () => {
      await securityTokenProxy
        .connect(signers.registrarAgent)
        .safeTransferFrom(
          receiverAddress,
          settlementAgentAddress,
          tokenId,
          transferAmount,
          data,
        );
      const lockedTransfer = await securityTokenProxy.getLockedAmount(
        transactionId,
      );

      await expect(lockedTransfer[0]).to.be.eq(tokenId.toString());
      await expect(lockedTransfer[1]).to.be.eq(receiverAddress);
      await expect(lockedTransfer[2]).to.be.eq(settlementAgentAddress);
      await expect(lockedTransfer[3]).to.be.eq(transferAmount.toString());

    });
    it('should not be able to get lockedTransfer request', async () => {
      await securityTokenProxy
        .connect(signers.registrarAgent)
        .safeTransferFrom(
          receiverAddress,
          settlementAgentAddress,
          tokenId,
          transferAmount,
          data,
        );
      await securityTokenProxy
        .connect(signers.settlementAgent)
        .releaseTransaction(transactionId);

      await expect(
        securityTokenProxy.getLockedAmount(transactionId),
      ).to.be.revertedWithCustomError(
        securityTokenProxy,
        'InvalidTransferRequestStatus',
      );
    });
    it("only token's registrar could make a force transfer", async () => {
      const safeTransfer = securityTokenProxy
        .connect(signers.investor1)
        .forceSafeTransferFrom(
          receiverAddress,
          settlementAgentAddress,
          tokenId,
          transferAmount,
          data,
        );
      await expect(safeTransfer).to.be.revertedWithCustomError(
        securityTokenProxy,
        'UnauthorizedRegistrar',
      );
    });
    it('should revert with unsupported tranfer type', async () => {
      lockTransferData = { kind: TransferKind.UNDEFINED, transactionId };
      const data = AbiCoder.encode(
        ['tuple(string kind, string transactionId) lockTransferData'],
        [lockTransferData],
      );
      const safeTransfer = securityTokenProxy
        .connect(signers.registrarAgent)
        .safeTransferFrom(
          receiverAddress,
          settlementAgentAddress,
          tokenId,
          transferAmount,
          data,
        );
      await expect(safeTransfer).to.be.revertedWithCustomError(
        securityTokenProxy,
        'InvalidTransferType',
      );
    });
    it('transfer data could not be empty', async () => {
      const safeTransfer = securityTokenProxy
        .connect(signers.registrarAgent)
        .safeTransferFrom(
          receiverAddress,
          settlementAgentAddress,
          tokenId,
          transferAmount,
          '0x',
        );
      await expect(safeTransfer).to.be.revertedWithCustomError(
        securityTokenProxy,
        'DataTransferEmpty',
      );
    });
    it("only token's settlement agent could release locked transfer", async () => {
      await securityTokenProxy
        .connect(signers.registrarAgent)
        .safeTransferFrom(
          receiverAddress,
          settlementAgentAddress,
          tokenId,
          transferAmount,
          data,
        );
      const releaseTransaction = securityTokenProxy
        .connect(signers.investor2)
        .releaseTransaction(transactionId);
      await expect(releaseTransaction)
        .to.be.revertedWithCustomError(
          securityTokenProxy,
          'UnauthorizedSettlementAgent',
        )
        .withArgs(tokenId);
    });

    it('settlement agent could release only valid transfer status', async () => {
      await securityTokenProxy
        .connect(signers.registrarAgent)
        .safeTransferFrom(
          receiverAddress,
          settlementAgentAddress,
          tokenId,
          transferAmount,
          data,
        );
      await securityTokenProxy
        .connect(signers.settlementAgent)
        .releaseTransaction(transactionId);

      const cancelReleasedTransaction = securityTokenProxy
        .connect(signers.settlementAgent)
        .releaseTransaction(transactionId);

      await expect(cancelReleasedTransaction).to.be.revertedWithCustomError(
        securityTokenProxy,
        'InvalidTransferRequestStatus',
      );
    });
    it("only token's registrar agent could cancel locked transfer", async () => {
      await securityTokenProxy
        .connect(signers.registrarAgent)
        .safeTransferFrom(
          receiverAddress,
          settlementAgentAddress,
          tokenId,
          transferAmount,
          data,
        );
      const cancelTransaction = securityTokenProxy
        .connect(signers.investor2)
        .cancelTransaction(transactionId);
      await expect(cancelTransaction)
        .to.be.revertedWithCustomError(
          securityTokenProxy,
          'UnauthorizedRegistrarAgent',
        )
        .withArgs(tokenId);
    });
    it('registrar agent could cancel only valid transfer status', async () => {
      await securityTokenProxy
        .connect(signers.registrarAgent)
        .safeTransferFrom(
          receiverAddress,
          settlementAgentAddress,
          tokenId,
          transferAmount,
          data,
        );
      await securityTokenProxy
        .connect(signers.settlementAgent)
        .releaseTransaction(transactionId);

      const cancelReleasedTransaction = securityTokenProxy
        .connect(signers.registrarAgent)
        .cancelTransaction(transactionId);

      await expect(cancelReleasedTransaction).to.be.revertedWithCustomError(
        securityTokenProxy,
        'InvalidTransferRequestStatus',
      );
    });
    it("only token's settlement agent could cancel locked transfer", async () => {
      await securityTokenProxy
        .connect(signers.registrarAgent)
        .safeTransferFrom(
          receiverAddress,
          settlementAgentAddress,
          tokenId,
          transferAmount,
          data,
        );
      const releaseTransaction = securityTokenProxy
        .connect(signers.investor2)
        .cancelTransaction(transactionId);
      await expect(releaseTransaction)
        .to.be.revertedWithCustomError(
          securityTokenProxy,
          'UnauthorizedRegistrarAgent',
        )
        .withArgs(tokenId);
    });
    it('could make transfer only when balance is available', async () => {
      const fakeTransferAmount = 1000;
      const currentUserBalance = await securityTokenProxy.balanceOf(
        receiverAddress,
        tokenId,
      );
      const safeTransfer = securityTokenProxy
        .connect(signers.registrarAgent)
        .safeTransferFrom(
          receiverAddress,
          settlementAgentAddress,
          tokenId,
          fakeTransferAmount,
          data,
        );
      await expect(safeTransfer)
        .to.be.revertedWithCustomError(
          securityTokenProxy,
          'InsufficientBalance',
        )
        .withArgs(tokenId, currentUserBalance, fakeTransferAmount);
    });
    context('Lock Transfer', () => {
      it('should emit LockReady & transferSingle event', async () => {
        const safeTransferFromTx = securityTokenProxy
          .connect(signers.registrarAgent)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data,
          );

        await expect(safeTransferFromTx)
          .to.emit(securityTokenProxy, 'LockReady')
          .withArgs(
            transactionId,
            registrarAgentAddress,
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data,
          );

        await expect(safeTransferFromTx)
          .to.emit(securityTokenProxy, 'TransferSingle')
          .withArgs(
            registrarAgentAddress,
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            0,
          );
      });
      it('should fail when transactionId already exist', async () => {
        lockTransferData = { kind: TransferKind.LOCK, transactionId };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) lockTransferData'],
          [lockTransferData],
        );
        await securityTokenProxy
          .connect(signers.registrarAgent)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data,
          );
        const transfer2WithSameTransactionId = securityTokenProxy
          .connect(signers.registrarAgent)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data,
          );
        await expect(
          transfer2WithSameTransactionId,
        ).to.be.revertedWithCustomError(
          securityTokenProxy,
          'TransactionAlreadyExists',
        );
      });
      it('should to be able to make lock transfer', async () => {
        const transactionId = randomUUID();
        lockTransferData = {
          kind: TransferKind.LOCK,
          transactionId: transactionId,
        };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) lockTransferData'],
          [lockTransferData],
        );
        await securityTokenProxy
          .connect(signers.registrarAgent)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data,
          );
        await expect(
          Number(await securityTokenProxy.balanceOf(receiverAddress, tokenId)),
          (amount - transferAmount).toString(),
        );
        const balanceOfBatchResult = await securityTokenProxy.balanceOfBatch(
          [receiverAddress],
          [tokenId],
        );
        await expect(
          Number(balanceOfBatchResult[0]),
          (amount - transferAmount).toString(),
        );
        await expect(
          await securityTokenProxy.balanceOf(settlementAgentAddress, tokenId),
          '0',
        );
        await securityTokenProxy
          .connect(signers.settlementAgent)
          .releaseTransaction(transactionId);
        await expect(
          Number(await securityTokenProxy.balanceOf(receiverAddress, tokenId)),
          (amount - transferAmount).toString(),
        );
        await expect(
          await securityTokenProxy.balanceOf(settlementAgentAddress, tokenId),
          transferAmount.toString(),
        );
      });
      it('should to be able to make forceSafeTransferFrom by the registrar', async () => {
        const transactionId = randomUUID();
        lockTransferData = {
          kind: TransferKind.LOCK,
          transactionId: transactionId,
        };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) lockTransferData'],
          [lockTransferData],
        );
        await securityTokenProxy
          .connect(signers.registrar)
          .forceSafeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data,
          );
        await expect(
          Number(await securityTokenProxy.balanceOf(receiverAddress, tokenId)),
          (amount - transferAmount).toString(),
        );
        const balanceOfBatchResult = await securityTokenProxy.balanceOfBatch(
          [receiverAddress],
          [tokenId],
        );
        await expect(
          Number(balanceOfBatchResult[0]),
          (amount - transferAmount).toString(),
        );
        await expect(
          await securityTokenProxy.balanceOf(settlementAgentAddress, tokenId),
          '0',
        );
        await securityTokenProxy
          .connect(signers.settlementAgent)
          .releaseTransaction(transactionId);
        await expect(
          Number(await securityTokenProxy.balanceOf(receiverAddress, tokenId)),
          (amount - transferAmount).toString(),
        );
        await expect(
          await securityTokenProxy.balanceOf(settlementAgentAddress, tokenId),
          transferAmount.toString(),
        );
      });
      it('should emit lock updated event', async () => {
        const transactionId = randomUUID();
        lockTransferData = {
          kind: TransferKind.LOCK,
          transactionId: transactionId,
        };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) lockTransferData'],
          [lockTransferData],
        );
        await securityTokenProxy
          .connect(signers.registrarAgent)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data,
          );
        expect(
          securityTokenProxy
            .connect(signers.settlementAgent)
            .releaseTransaction(transactionId),
        )
          .to.emit(securityTokenProxy, 'LockUpdated')
          .withArgs(
            transactionId,
            registrarAgentAddress,
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            TransferStatus.Validated,
          );
      });
      it('should to be able to force release transaction by registrar', async () => {
        const transactionId = randomUUID();
        lockTransferData = {
          kind: TransferKind.LOCK,
          transactionId: transactionId,
        };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) lockTransferData'],
          [lockTransferData],
        );
        await securityTokenProxy
          .connect(signers.registrarAgent)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data,
          );
        await securityTokenProxy
          .connect(signers.registrar)
          .forceReleaseTransaction(transactionId);
        await expect(
          Number(await securityTokenProxy.balanceOf(receiverAddress, tokenId)),
          (amount - transferAmount).toString(),
        );
        await expect(
          await securityTokenProxy.balanceOf(settlementAgentAddress, tokenId),
          transferAmount.toString(),
        );
      });
      it('should be able to force cancel a lock transfer', async () => {
        const transactionId = randomUUID();
        lockTransferData = {
          kind: TransferKind.LOCK,
          transactionId: transactionId,
        };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) lockTransferData'],
          [lockTransferData],
        );
        await securityTokenProxy
          .connect(signers.registrarAgent)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data,
          );
        await expect(
          Number(
            await securityTokenProxy.engagedAmount(receiverAddress, tokenId),
          ),
          transferAmount.toString(),
        );
        await securityTokenProxy
          .connect(signers.registrar)
          .forceCancelTransaction(transactionId);
        await expect(
          Number(await securityTokenProxy.balanceOf(receiverAddress, tokenId)),
          amount.toString(),
        );
      });
      it('only registrar could force release a lock transfer', async () => {
        const transactionId = randomUUID();
        lockTransferData = {
          kind: TransferKind.LOCK,
          transactionId: transactionId,
        };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) lockTransferData'],
          [lockTransferData],
        );
        await securityTokenProxy
          .connect(signers.registrarAgent)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data,
          );
        await expect(
          Number(
            await securityTokenProxy.engagedAmount(receiverAddress, tokenId),
          ),
          transferAmount.toString(),
        );
        const forceReleaseTransaction = securityTokenProxy
          .connect(signers.registrarAgent)
          .forceReleaseTransaction(transactionId);
        await expect(forceReleaseTransaction).to.be.revertedWithCustomError(
          securityTokenProxy,
          'UnauthorizedRegistrar',
        );
      });
      it('only registrar could force cancel a lock transfer', async () => {
        const transactionId = randomUUID();
        lockTransferData = {
          kind: TransferKind.LOCK,
          transactionId: transactionId,
        };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) lockTransferData'],
          [lockTransferData],
        );
        await securityTokenProxy
          .connect(signers.registrarAgent)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data,
          );
        await expect(
          Number(
            await securityTokenProxy.engagedAmount(receiverAddress, tokenId),
          ),
          transferAmount.toString(),
        );
        const forceCancelTransaction = securityTokenProxy
          .connect(signers.registrarAgent)
          .forceCancelTransaction(transactionId);
        await expect(forceCancelTransaction).to.be.revertedWithCustomError(
          securityTokenProxy,
          'UnauthorizedRegistrar',
        );
      });
      it('should be able to cancel a lock transfer', async () => {
        const transactionId = randomUUID();
        lockTransferData = {
          kind: TransferKind.LOCK,
          transactionId: transactionId,
        };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) lockTransferData'],
          [lockTransferData],
        );
        await securityTokenProxy
          .connect(signers.registrarAgent)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data,
          );
        await expect(
          Number(
            await securityTokenProxy.engagedAmount(receiverAddress, tokenId),
          ),
          transferAmount.toString(),
        );
        await securityTokenProxy
          .connect(signers.registrarAgent)
          .cancelTransaction(transactionId);
        await expect(
          Number(await securityTokenProxy.balanceOf(receiverAddress, tokenId)),
          amount.toString(),
        );
      });
      it('cancel a lock transfer shoud emit LockUpdated Event', async () => {
        const transactionId = randomUUID();
        lockTransferData = {
          kind: TransferKind.LOCK,
          transactionId: transactionId,
        };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) lockTransferData'],
          [lockTransferData],
        );
        expect(
          securityTokenProxy
            .connect(signers.registrarAgent)
            .safeTransferFrom(
              receiverAddress,
              settlementAgentAddress,
              tokenId,
              transferAmount,
              data,
            ),
        )
          .to.emit(securityTokenProxy, 'LockUpdated')
          .withArgs(
            transactionId,
            registrarAgentAddress,
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            TransferStatus.Rejected,
          );
      });
    });
    context('Direct transfer', () => {
      let transferData: TransferData;
      it('should be able to make direct transfer', async () => {
        transferData = {
          kind: TransferKind.DIRECT,
        };
        await securityTokenProxy
          .connect(signers.registrarAgent)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            AbiCoder.encode(
              ['tuple(string kind) transferData'],
              [transferData],
            ),
          );
        await expect(
          await securityTokenProxy.balanceOf(receiverAddress, tokenId),
          (amount - transferAmount).toString(),
        );
        await expect(
          await securityTokenProxy.balanceOf(settlementAgentAddress, tokenId),
          transferAmount.toString(),
        );
      });
    });
  });
});
