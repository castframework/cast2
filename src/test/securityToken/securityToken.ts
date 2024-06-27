import { SecurityToken } from '../../../dist/types';
import { expect, assert } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deploySecurityTokenFixture } from '../utils/builders';
import { getOperatorSigners } from '../utils/signers';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import '@nomicfoundation/hardhat-chai-matchers'; //Added for revertWithCustomErrors
import { MintData, TransferData, TransferKind } from '../utils/types';
import { randomUUID } from 'crypto';

context('SecurityToken', () => {
  let securityTokenProxy: SecurityToken;
  const emptyMintData = '0x';
  let signers: {
    registrar: Signer;
    issuer: Signer;
    investor4: Signer;
    investor1: Signer;
    investor2: Signer;
    investor3: Signer;
    settler: Signer;
  };

  context('Mint Tokens', async () => {
    let tokenId = 10;
    let amount: number = 100;
    let receiverAddress;
    let registrarAddress;
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
      registrarAddress = await signers.registrar.getAddress();
      settlementAgentAddress = await signers.settler.getAddress();
      newRegistrarAddress = await signers.investor3.getAddress();
      uri = '0x';
      mintData = {
        registrarAgent: registrarAddress,
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
                registrarAgent: registrarAddress,
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
      expect(
        await securityTokenProxy.getRegistrarAgent(tokenId),
      ).to.be.eq(registrarAddress);
    });
    it('should match the initiale settlement agent address', async () => {
      expect(
        await securityTokenProxy.getSettlementAgent(tokenId),
      ).to.eq(settlementAgentAddress);
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
        securityTokenProxy.connect(signers.settler).mint(
          receiverAddress,
          tokenId,
          amount,
          AbiCoder.encode(
            ['tuple(address registrarAgent, string settlementAgent) mintData'],
            [
              {
                registrarAgent: registrarAddress,
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
    context('Burn tokens', async () => {
      it('should be able to burn tokens of an account', async () => {
        await securityTokenProxy
          .connect(signers.registrar)
          .burn(receiverAddress, tokenId, amount);
        expect(
          await securityTokenProxy.balanceOf(receiverAddress, tokenId),
          '0',
        );
      });
      it('only registrar could burn tokens', async () => {
        const burn = securityTokenProxy
          .connect(signers.settler)
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
          .setURI(tokenId, "toto");

        expect(await securityTokenProxy.uri(tokenId)).to.be.eq(newBaseUri.concat(tokenURI));
      });
      it('only registrar should be able to set base uri', async () => {

        const setBaseUrl = securityTokenProxy
          .connect(signers.settler)
          .setBaseURI("");

        expect(setBaseUrl).to.be.revertedWithCustomError(securityTokenProxy, "UnauthorizedRegistrar");
      });
      it('only registrar should be able to set uri', async () => {
        const setBaseUrl = securityTokenProxy
          .connect(signers.settler)
          .setURI(tokenId, "toto");
        expect(setBaseUrl).to.be.revertedWithCustomError(securityTokenProxy, "UnauthorizedRegistrar");
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
          .connect(signers.settler)
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
            data
          )
        await expect(safeTransfer).to.be.revertedWithCustomError(securityTokenProxy, "UnauthorizedRegistrarAgent").withArgs(tokenId);
      })
      it('should revert with unsupported tranfer type', async () => {
        transferData = { kind: TransferKind.UNDEFINED, transactionId };
        const data = AbiCoder.encode(
          ['tuple(string kind, string transactionId) transferData'],
          [transferData],
        );
        const safeTransfer = securityTokenProxy
          .connect(signers.registrar)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data
          )
        await expect(safeTransfer).to.be.revertedWithCustomError(securityTokenProxy, "InvalidTransferType");

      })
      it("transfer data could not be empty", async () => {
        const safeTransfer = securityTokenProxy
          .connect(signers.registrar)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            "0x"
          )
        await expect(safeTransfer).to.be.revertedWithCustomError(securityTokenProxy, "DataTransferEmpty");
      })
      it("only token's settlement agent could release locked transfer", async () => {
        await securityTokenProxy
          .connect(signers.registrar)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data
          )
        const releaseTransaction = securityTokenProxy
          .connect(signers.investor2)
          .releaseTransaction(transactionId);
        await expect(releaseTransaction).to.be.revertedWithCustomError(securityTokenProxy, "UnauthorizedSettlementAgent").withArgs(tokenId);
      })
      it("only token's settlement agent could release locked transfer", async () => {
        await securityTokenProxy
          .connect(signers.registrar)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data
          )
        await securityTokenProxy
          .connect(signers.settler)
          .releaseTransaction(transactionId);

        const cancelReleasedTransaction = securityTokenProxy
          .connect(signers.settler)
          .releaseTransaction(transactionId);

        await expect(cancelReleasedTransaction).to.be.revertedWithCustomError(securityTokenProxy, "InvalidTransferRequestStatus");
      })
      it("only token's settlement agent could cancel locked transfer", async () => {
        await securityTokenProxy
          .connect(signers.registrar)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data
          )
        const cancelTransaction = securityTokenProxy
          .connect(signers.investor2)
          .cancelTransaction(transactionId);
        await expect(cancelTransaction).to.be.revertedWithCustomError(securityTokenProxy, "UnauthorizedSettlementAgent").withArgs(tokenId);
      })
      it("only token's settlement agent could cancel locked transfer", async () => {
        await securityTokenProxy
          .connect(signers.registrar)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data
          )
        await securityTokenProxy
          .connect(signers.settler)
          .releaseTransaction(transactionId);

        const cancelReleasedTransaction = securityTokenProxy
          .connect(signers.settler)
          .cancelTransaction(transactionId);

        await expect(cancelReleasedTransaction).to.be.revertedWithCustomError(securityTokenProxy, "InvalidTransferRequestStatus");
      })
      it("only token's settlement agent could cancel locked transfer", async () => {
        await securityTokenProxy
          .connect(signers.registrar)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            transferAmount,
            data
          )
        const releaseTransaction = securityTokenProxy
          .connect(signers.investor2)
          .cancelTransaction(transactionId);
        await expect(releaseTransaction).to.be.revertedWithCustomError(securityTokenProxy, "UnauthorizedSettlementAgent").withArgs(tokenId);
      })
      it("could not release a transaction that does not exists", async () => {
        const releaseTransaction = securityTokenProxy
          .connect(signers.settler)
          .releaseTransaction("fakeTransactionId");
        await expect(releaseTransaction).to.be.revertedWithCustomError(securityTokenProxy, "UnauthorizedSettlementAgent");
      })
      it("could not cancel a transaction that does not exists", async () => {
        const releaseTransaction = securityTokenProxy
          .connect(signers.settler)
          .cancelTransaction("fakeTransactionId");
        await expect(releaseTransaction).to.be.revertedWithCustomError(securityTokenProxy, "UnauthorizedSettlementAgent");
      })
      it("could make transfer only when balance is available", async () => {
        const fakeTransferAmount = 1000;
        const currentUserBalance = await securityTokenProxy.balanceOf(receiverAddress, tokenId);
        const safeTransfer = securityTokenProxy
          .connect(signers.registrar)
          .safeTransferFrom(
            receiverAddress,
            settlementAgentAddress,
            tokenId,
            fakeTransferAmount,
            data
          )
        await expect(safeTransfer).to.be.revertedWithCustomError(securityTokenProxy, "InsufficientBalance").withArgs(tokenId, currentUserBalance, fakeTransferAmount);
      })
      context("Lock Transfer", () => {
        it('should emit TransferRequested event', async () => {

         await expect(securityTokenProxy
            .connect(signers.registrar)
            .safeTransferFrom(
              receiverAddress,
              settlementAgentAddress,
              tokenId,
              transferAmount,
              data
            )).to.emit(securityTokenProxy, "TransferRequested").withArgs(
              transactionId,
              receiverAddress,
              settlementAgentAddress,
              tokenId,
              transferAmount,
              data
            )
        });
        it('should failt when transactionId already exist', async () => {
          transferData = { kind: TransferKind.LOCK, transactionId };
          const data = AbiCoder.encode(
            ['tuple(string kind, string transactionId) transferData'],
            [transferData],
          );
          await securityTokenProxy
            .connect(signers.registrar)
            .safeTransferFrom(
              receiverAddress,
              settlementAgentAddress,
              tokenId,
              transferAmount,
              data
            );
          const transfer2WithSameTransactionId = securityTokenProxy
            .connect(signers.registrar)
            .safeTransferFrom(
              receiverAddress,
              settlementAgentAddress,
              tokenId,
              transferAmount,
              data
            );
         await expect(transfer2WithSameTransactionId).to.be.revertedWithCustomError(securityTokenProxy, "TransactionAlreadyExists");
        });
        it('should to be able to make lock transfer', async () => {
          const transactionId = randomUUID();
          transferData = { kind: TransferKind.LOCK, transactionId: transactionId };
          const data = AbiCoder.encode(
            ['tuple(string kind, string transactionId) transferData'],
            [transferData],
          );
          await securityTokenProxy
            .connect(signers.registrar)
            .safeTransferFrom(
              receiverAddress,
              settlementAgentAddress,
              tokenId,
              transferAmount,
              data
            );
          await securityTokenProxy
            .connect(signers.settler)
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
        it('should to be able to cancel a lock transfer', async () => {
          const transactionId = randomUUID();
          transferData = { kind: TransferKind.LOCK, transactionId: transactionId };
          const data = AbiCoder.encode(
            ['tuple(string kind, string transactionId) transferData'],
            [transferData],
          );
          await securityTokenProxy
            .connect(signers.registrar)
            .safeTransferFrom(
              receiverAddress,
              settlementAgentAddress,
              tokenId,
              transferAmount,
              data
            );
          await expect(
            Number(await securityTokenProxy.engagedAmount(receiverAddress, tokenId)),
            (transferAmount).toString(),
          );
          await securityTokenProxy
            .connect(signers.settler)
            .cancelTransaction(transactionId);
          await expect(
            Number(await securityTokenProxy.balanceOf(receiverAddress, tokenId)),
            (amount).toString(),
          );
        });
      });
      context("Direct transfer", () => {
        it('should be able to make direct transfer', async () => {
          transferData = {
            kind: TransferKind.DIRECT,
            transactionId,
          };
          await securityTokenProxy
            .connect(signers.registrar)
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
});
