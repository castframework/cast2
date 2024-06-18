import { SecurityToken } from '../../../dist/types';
import { expect, assert } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deploySecurityTokenFixture } from '../utils/builders';
import { getOperatorSigners } from '../utils/signers';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import "@nomicfoundation/hardhat-chai-matchers"; //Added for revertWithCustomErrors
import { MintData } from '../utils/types';


context('SecurityToken', () => {
  let securityTokenProxy: SecurityToken;
  const mintingAmount = 1000;
  let signers: {
    registrar: Signer;
    issuer: Signer;
    investor4: Signer;
    investor1: Signer;
    investor2: Signer;
    investor3: Signer;
    settler: Signer;
  };

  context.only('Mint Tokens', async () => {
    let tokenId = 10;
    let amount = 100;
    let receiverAddress;
    let registrarAddress;
    let settlementAgentAddress;
    let newRegistrarAddress;
    const AbiCoder = new ethers.AbiCoder();
    let mintFunction: () => {};
    let minData: MintData;
    let uri;
    beforeEach(async () => {
      signers = await getOperatorSigners();
      securityTokenProxy = await loadFixture(deploySecurityTokenFixture);

      receiverAddress = await signers.investor1.getAddress()
      registrarAddress = await signers.registrar.getAddress()
      settlementAgentAddress = await signers.settler.getAddress();
      newRegistrarAddress = await signers.investor3.getAddress();
      uri = "0x";

      const minData: MintData = { registrarAgent: registrarAddress, settlementAgent: settlementAgentAddress, metadataUri: "0x" }
      mintFunction = () => securityTokenProxy
        .connect(signers.registrar)
        .mint(
          receiverAddress,
          tokenId,
          amount,
          AbiCoder.encode(["tuple(address registrarAgent, string settlementAgent, string metadataUri) mintData"], [minData])
        );
      await mintFunction();
    });
    it('should revert when data is missing metadataUri', async () => {
      expect(securityTokenProxy
        .connect(signers.registrar)
        .mint(
          receiverAddress,
          tokenId,
          amount,
          AbiCoder.encode(["tuple(address registrarAgent, string settlementAgent) mintData"], [{ registrarAgent: registrarAddress, settlementAgent: settlementAgentAddress }])
        )).to.be.revertedWithoutReason();
    })
    it('should be able to mint tokens to a receiver address', async () => {
      expect(await securityTokenProxy.balanceOf(receiverAddress, tokenId), amount.toString())
    });
    it('should match the initiale registar agent address', async () => {
      expect(await securityTokenProxy.getRegistrarAgent(tokenId), registrarAddress)
    });
    it('should match the initiale settlement agent address', async () => {
      expect(await securityTokenProxy.getSettlementAgent(tokenId), settlementAgentAddress)
    });
    it(`should match the initiale token's uri`, async () => {
      expect(await securityTokenProxy.uri(tokenId), uri)
    });
    it('should not mint a token with mintData if its already minted', async () => {
      expect(mintFunction).to.revertedWithCustomError(securityTokenProxy, "TokenAlreadyMinted").withArgs(tokenId);
    })

  });
});
