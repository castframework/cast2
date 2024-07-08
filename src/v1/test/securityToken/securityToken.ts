import { SecurityTokenV1 } from '../../../dist/types';
import { expect, assert } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deploySecurityTokenFixture } from '../utils/builders';
import { getOperatorSigners } from '../utils/signers';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import '@nomicfoundation/hardhat-chai-matchers'; //Added for revertWithCustomErrors
import {
  MintData,
  TransferData,
  TransferKind,
  TransferStatus,
} from '../utils/types';
import { randomUUID } from 'crypto';
import { NAME, SYMBOL } from '../utils/constants';

context('SecurityTokenV1', () => {
  let securityTokenProxy: SecurityTokenV1;
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
  let mintData: MintData;
  let uri;

  beforeEach(async () => {
    signers = await getOperatorSigners();
    securityTokenProxy = await loadFixture(deploySecurityTokenFixture);

    receiverAddress = await signers.investor1.getAddress();
    registrarAgentAddress = await signers.registrarAgent.getAddress();
    settlementAgentAddress = await signers.settlementAgent.getAddress();
    newRegistrarAddress = await signers.investor3.getAddress();
    uri = '0x';
    mintData = {
      registrarAgent: registrarAgentAddress,
      settlementAgent: settlementAgentAddress,
      metadataUri: '0x',
    };
    mintFunction = () =>
      securityTokenProxy
        .connect(signers.registrar)
        .mint(
          receiverAddress,
          tokenId,
          amount,
          AbiCoder.encode(
            [
              'tuple(address registrarAgent, address settlementAgent, string metadataUri) mintData',
            ],
            [mintData],
          ),
        );
    await mintFunction();
  });
  context('Name and symbol', async () => {
    it('should match the token name', async () =>
      await expect(await securityTokenProxy.name()).to.be.eq(NAME));
    it('should match the token symbol', async () =>
      await expect(await securityTokenProxy.symbol()).to.be.eq(SYMBOL));
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
        securityTokenProxy.isApprovedForAll(receiverAddress, receiverAddress)
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
  context('Update URIs', async () => {
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
  context('Safe Transfer Tokens', async () => {
    let transferData: TransferData;
    let transferAmount: number = 1;
    const transactionId = randomUUID();
    transferData = { kind: TransferKind.LOCK, transactionId };
    const data = AbiCoder.encode(
      ['tuple(string kind, string transactionId) transferData'],
      [transferData],
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
    it('should revert with unsupported tranfer type', async () => {
      transferData = { kind: TransferKind.UNDEFINED, transactionId };
      const data = AbiCoder.encode(
        ['tuple(string kind, string transactionId) transferData'],
        [transferData],
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
    context('UUID Validity check', async () => {
      context('UpperCaseUUID', async () => {
        const uppercaseUUID = randomUUID().toUpperCase();
        it('could not initiate a safeTransferFrom with uppercase transactionId', async () => {
          transferData = {
            kind: TransferKind.LOCK,
            transactionId: uppercaseUUID,
          };
          const data = AbiCoder.encode(
            ['tuple(string kind, string transactionId) transferData'],
            [transferData],
          );
          const securityTokenProxyTx = securityTokenProxy
            .connect(signers.registrarAgent)
            .safeTransferFrom(
              receiverAddress,
              settlementAgentAddress,
              tokenId,
              transferAmount,
              data,
            );
          await expect(securityTokenProxyTx).to.be.revertedWithCustomError(
            securityTokenProxy,
            'InvalidUUIDCharacter',
          );
        });
        it('could not release transacion with an uppercase transactionId', async () => {
          const releaseTransaction = securityTokenProxy
            .connect(signers.settlementAgent)
            .releaseTransaction(uppercaseUUID);
          await expect(releaseTransaction).to.be.revertedWithCustomError(
            securityTokenProxy,
            'InvalidUUIDCharacter',
          );
        });
        it('could not cancel transacion with an uppercase transactionId', async () => {
          const releaseTransaction = securityTokenProxy
            .connect(signers.settlementAgent)
            .cancelTransaction(uppercaseUUID);
          await expect(releaseTransaction).to.be.revertedWithCustomError(
            securityTokenProxy,
            'InvalidUUIDCharacter',
          );
        });
        it('could not force release transacion with an uppercase transactionId', async () => {
          const forceReleaseTransaction = securityTokenProxy
            .connect(signers.registrar)
            .forceReleaseTransaction(uppercaseUUID);
          await expect(forceReleaseTransaction).to.be.revertedWithCustomError(
            securityTokenProxy,
            'InvalidUUIDCharacter',
          );
        });
        it('could not force cancel transacion with an invalid UUID', async () => {
          const forceCancelTransaction = securityTokenProxy
            .connect(signers.registrar)
            .forceCancelTransaction(uppercaseUUID);
          await expect(forceCancelTransaction).to.be.revertedWithCustomError(
            securityTokenProxy,
            'InvalidUUIDCharacter',
          );
        });
      });
      context('Invalid UUID Length', async () => {
        const truncatedUUID = randomUUID().substring(0, 8);
        it('could not initiate a safeTransferFrom with invalid transactionId', async () => {
          transferData = {
            kind: TransferKind.LOCK,
            transactionId: truncatedUUID,
          };
          const data = AbiCoder.encode(
            ['tuple(string kind, string transactionId) transferData'],
            [transferData],
          );
          const securityTokenProxyTx = securityTokenProxy
            .connect(signers.registrarAgent)
            .safeTransferFrom(
              receiverAddress,
              settlementAgentAddress,
              tokenId,
              transferAmount,
              data,
            );
          await expect(securityTokenProxyTx).to.be.revertedWithCustomError(
            securityTokenProxy,
            'InvalidUUIDLength',
          );
        });
        it('could not release transacion with an invalid transactionId', async () => {
          const releaseTransaction = securityTokenProxy
            .connect(signers.settlementAgent)
            .releaseTransaction(truncatedUUID);
          await expect(releaseTransaction).to.be.revertedWithCustomError(
            securityTokenProxy,
            'InvalidUUIDLength',
          );
        });
        it('could not cancel transacion with an invalid transactionId', async () => {
          const releaseTransaction = securityTokenProxy
            .connect(signers.settlementAgent)
            .cancelTransaction(truncatedUUID);
          await expect(releaseTransaction).to.be.revertedWithCustomError(
            securityTokenProxy,
            'InvalidUUIDLength',
          );
        });
        it('could not force release transacion with an invalid transactionId', async () => {
          const forceReleaseTransaction = securityTokenProxy
            .connect(signers.registrar)
            .forceReleaseTransaction(truncatedUUID);
          await expect(forceReleaseTransaction).to.be.revertedWithCustomError(
            securityTokenProxy,
            'InvalidUUIDLength',
          );
        });
        it('could not force cancel transacion with an invalid UUID', async () => {
          const forceCancelTransaction = securityTokenProxy
            .connect(signers.registrar)
            .forceCancelTransaction(truncatedUUID);
          await expect(forceCancelTransaction).to.be.revertedWithCustomError(
            securityTokenProxy,
            'InvalidUUIDLength',
          );
        });
      });
      context('Check UUID characters', async () => {
        const UUIDs = [
          {
            uuid: 'ecA4542090d6d-43e2-9aa2-c46cd8c0ff7c',
            message: 'first uuid block is invalid',
          },
          {
            uuid: 'eca4542090d6d-43e2-9aa2-c46cd8c0ff7c',
            message: 'first dash missing',
          },
          {
            uuid: '245bd898-7C65-4900-b6f5-86c964149dda',
            message: 'second uuid block not valid',
          },
          {
            uuid: '710bc717-d7be646da-85a4-df94dcb476e1',
            message: 'second dash is missing',
          },
          {
            uuid: 'ed409ad5-af5a-4Y35-8833-36850cccdf1f',
            message: 'third uuid block is invalid',
          },
          {
            uuid: '21738399-4ed1-4954ua99e-294c6859069c',
            message: 'third dash is missing',
          },
          {
            uuid: 'b4a15d10-ac8c-45f6-B663-5c2dfa2aa26b',
            message: 'fourth uuid block is invalid',
          },
          {
            uuid: '773479c5-24a9-405e-9001a5c372dee4f68',
            message: 'fourth dash is missing',
          },
          {
            uuid: '6c329a5c-b4d4-4a9b-b3aa-eb94f8eff01B',
            message: 'fifth uuid block is invalid',
          },
        ];
        for (let element of UUIDs) {
          it(`${element.message}`, async () => {
            const releaseTransaction = securityTokenProxy
              .connect(signers.settlementAgent)
              .releaseTransaction(element.uuid);
            await expect(releaseTransaction).to.be.revertedWithCustomError(
              securityTokenProxy,
              'InvalidUUIDCharacter',
            );
          });
        }
      });
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
        transferData = { kind: TransferKind.LOCK, transactionId };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) transferData'],
          [transferData],
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
        transferData = {
          kind: TransferKind.LOCK,
          transactionId: transactionId,
        };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) transferData'],
          [transferData],
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
        const balanceOfBatchResult = await securityTokenProxy.balanceOfBatch([receiverAddress], [tokenId]);
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
        transferData = {
          kind: TransferKind.LOCK,
          transactionId: transactionId,
        };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) transferData'],
          [transferData],
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
        transferData = {
          kind: TransferKind.LOCK,
          transactionId: transactionId,
        };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) transferData'],
          [transferData],
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
        transferData = {
          kind: TransferKind.LOCK,
          transactionId: transactionId,
        };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) transferData'],
          [transferData],
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
        transferData = {
          kind: TransferKind.LOCK,
          transactionId: transactionId,
        };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) transferData'],
          [transferData],
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
        transferData = {
          kind: TransferKind.LOCK,
          transactionId: transactionId,
        };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) transferData'],
          [transferData],
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
        transferData = {
          kind: TransferKind.LOCK,
          transactionId: transactionId,
        };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) transferData'],
          [transferData],
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
        transferData = {
          kind: TransferKind.LOCK,
          transactionId: transactionId,
        };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) transferData'],
          [transferData],
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
      it('should be able to make direct transfer', async () => {
        transferData = {
          kind: TransferKind.DIRECT,
          transactionId,
        };
        await securityTokenProxy
          .connect(signers.registrarAgent)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            AbiCoder.encode(
              ['tuple(string kind, string transactionId) transferData'],
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
