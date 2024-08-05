import {
  SecurityTokenV1,
  MissuseAccessControlInternal,
} from '../../../dist/types';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import {
  deploySatelliteV1Fixture,
  deploySecurityTokenFixture,
  deploySecurityTokenV2Fixture,
  deployTestContractMissuseAccessControlInternal,
} from '../utils/builders';
import { getOperatorSigners } from '../utils/signers';
import { FORMER_SMART_CONTRACT_ADDRESS, MINT_DATA_TYPES, ZERO_ADDRESS } from '../utils/constants';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { SatelliteDetails, TokenMetadata, TokenOperators } from '../../types/types';
import { symbol } from 'zod';
import { SatelliteV1 } from 'dist/types';

context('SecurityTokenV1', () => {
  let securityTokenProxy: SecurityTokenV1;
  let signers: {
    issuer: Signer;
    registrar: Signer;
    settlementAgent: Signer;
    registrarAgent: Signer;
    investor1: Signer;
    investor2: Signer;
    investor3: Signer;
    technical: Signer;
  };
  let mintFunction: () => {};
  const AbiCoder = new ethers.AbiCoder();

  let registrarAddress: string;
  let investor1Address: string;
  let investor2Address: string;
  let technicalAddress: string;

  context('SecurityTokenV1: naming operators', async function () {
    beforeEach(async () => {
      securityTokenProxy = await loadFixture(deploySecurityTokenFixture);

      signers = await getOperatorSigners();

      technicalAddress = await signers.technical.getAddress();

      registrarAddress = await signers.registrar.getAddress();
      investor1Address = await signers.investor1.getAddress();
      investor2Address = await signers.investor2.getAddress();
    });
    context('should not accept naming Zero Address operator', async () => {
      it('should not be able to name a zero address registrar', async () => {
        const nameOperators = securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(ZERO_ADDRESS, technicalAddress);
        await expect(nameOperators).to.be.revertedWithCustomError(
          securityTokenProxy,
          `ZeroAddressCheck`,
        );
      });
      it('should not be able to name a zero address technical', async () => {
        const nameOperators = securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(registrarAddress, ZERO_ADDRESS);
        await expect(nameOperators).to.be.revertedWithCustomError(
          securityTokenProxy,
          `ZeroAddressCheck`,
        );
      });
    });
    context('should accept only authorized role', async () => {
      let nameNewOperatorsTransaction;
      beforeEach(async () => {
        nameNewOperatorsTransaction = await securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(registrarAddress, technicalAddress);
      });
      it('should emit an event NamedNewOperatots', async () => {
        await expect(nameNewOperatorsTransaction)
          .to.emit(securityTokenProxy, 'NamedNewOperators')
          .withArgs(registrarAddress, technicalAddress);
      });
      it('only registrar could name new operators', async () => {
        const nameNewOperators = securityTokenProxy
          .connect(signers.investor1)
          .nameNewOperators(registrarAddress, technicalAddress);
        await expect(nameNewOperators).to.be.revertedWithCustomError(
          securityTokenProxy,
          `UnauthorizedRegistrar`,
        );
      });
      it('should not be able to accept unauthorized registrar role', async () => {
        const acceptRegistrarRole = securityTokenProxy
          .connect(signers.investor1)
          .acceptRegistrarRole();
        await expect(acceptRegistrarRole).to.be.revertedWithCustomError(
          securityTokenProxy,
          `UnauthorizedRegistrar`,
        );
      });
      it('should not be able to accept unauthorized technical role', async () => {
        const acceptTechnicalRole = securityTokenProxy
          .connect(signers.investor1)
          .acceptTechnicalRole();
        await expect(acceptTechnicalRole).to.be.revertedWithCustomError(
          securityTokenProxy,
          `UnauthorizedTechnical`,
        );
      });

      it('should be able to accept authorized registrar role', async () => {
        const acceptRegistrarRole = await securityTokenProxy
          .connect(signers.registrar)
          .acceptRegistrarRole();
        await expect(acceptRegistrarRole)
          .to.emit(securityTokenProxy, 'AcceptedRegistrarRole')
          .withArgs(registrarAddress);
      });
      it('should be able to accept authorized technical role', async () => {
        const acceptTechnicalRole = await securityTokenProxy
          .connect(signers.technical)
          .acceptTechnicalRole();
        await expect(acceptTechnicalRole)
          .to.emit(securityTokenProxy, 'AcceptedTechnicalRole')
          .withArgs(technicalAddress);
      });
    });
  });
  context('Should be able to set token agents', async () => {
    let tokenId = 10;
    let amount = 100;
    let receiverAddress;
    let registrarAddress;
    let settlementAgentAddress;
    let newRegistrarAddress;
  
    let satelliteImplementationAddress;
    let satelliteImplementation: SatelliteV1;

    let satelitteDetails: SatelliteDetails
    let tokenOperators: TokenOperators;
    let tokenMetadata: TokenMetadata;

    beforeEach(async () => {
      signers = await getOperatorSigners();
      securityTokenProxy = await loadFixture(deploySecurityTokenFixture);

      receiverAddress = await signers.investor1.getAddress();
      registrarAddress = await signers.registrar.getAddress();
      settlementAgentAddress = await signers.settlementAgent.getAddress();
      newRegistrarAddress = await signers.investor3.getAddress();
      satelliteImplementation = await loadFixture(deploySatelliteV1Fixture);

      satelliteImplementationAddress = await satelliteImplementation.getAddress();
      tokenOperators = {
        registrarAgent: registrarAddress,
        settlementAgent: settlementAgentAddress,
      };
      tokenMetadata = {
        uri: '0x',
        formerSmartContractAddress: FORMER_SMART_CONTRACT_ADDRESS,
        webUri:""
      }
      satelitteDetails = {
        implementationAddress: satelliteImplementationAddress,
        name:"toto",
        symbol:"tata",
      }
  
      mintFunction = () =>
        securityTokenProxy
          .connect(signers.registrar)
          .mint(
            receiverAddress,
            tokenId,
            amount,
            AbiCoder.encode(
             MINT_DATA_TYPES,
              [tokenOperators, tokenMetadata, satelitteDetails],
            ),
          );
      await mintFunction();
    });
    it("should be able to set token's settlement agent", async () => {
      await securityTokenProxy
        .connect(signers.registrar)
        .setSettlementAgent(tokenId, receiverAddress);
      await expect(
        await securityTokenProxy.getSettlementAgent(tokenId),
      ).to.be.equals(receiverAddress);
    });
    it("should be able to set token's registrar agent", async () => {
      await securityTokenProxy
        .connect(signers.registrar)
        .setRegistrarAgent(tokenId, newRegistrarAddress);
      await expect(
        await securityTokenProxy.getRegistrarAgent(tokenId),
      ).to.be.equals(newRegistrarAddress);
    });

    it("should emit SettlementAgentUpdated when token's settlement agent has been updated", async () => {

      const setSettlementAgent = securityTokenProxy
        .connect(signers.registrar)
        .setSettlementAgent(tokenId, receiverAddress);

      await expect(setSettlementAgent)
        .to.emit(securityTokenProxy, 'SettlementAgentUpdated')
        .withArgs(tokenId, settlementAgentAddress, receiverAddress);
    });
    it("should emit RegistrarAgentUpdated when token's registrar agent has been updated", async () => {
      const setRegistrarAgent = securityTokenProxy
        .connect(signers.registrar)
        .setRegistrarAgent(tokenId, newRegistrarAddress);
      await expect(setRegistrarAgent)
        .to.emit(securityTokenProxy, 'RegistrarAgentUpdated')
        .withArgs(tokenId, registrarAddress, newRegistrarAddress);
    });

    it("only registrar could set token's settlement agent", async () => {
      const setSettlementAgent = securityTokenProxy
        .connect(signers.technical)
        .setSettlementAgent(tokenId, receiverAddress);
      await expect(setSettlementAgent).to.be.revertedWithCustomError(
        securityTokenProxy,
        'UnauthorizedRegistrar',
      );
    });
    it("only registrar could set token's registrar agent", async () => {
      const setRegistrarAgent = securityTokenProxy
        .connect(signers.technical)
        .setRegistrarAgent(tokenId, newRegistrarAddress);
      await expect(setRegistrarAgent).to.be.revertedWithCustomError(
        securityTokenProxy,
        'UnauthorizedRegistrar',
      );
    });
    it("should not be able to set token's settlement agent to zero address", async () => {
      const setSettlementAgent = securityTokenProxy
        .connect(signers.registrar)
        .setSettlementAgent(tokenId, ZERO_ADDRESS);
      await expect(setSettlementAgent).to.be.revertedWithCustomError(
        securityTokenProxy,
        'ZeroAddressCheck',
      );
    });
    it("should not be able to set token's registrar agent to zero address", async () => {
      const setRegistrarAgent = securityTokenProxy
        .connect(signers.registrar)
        .setRegistrarAgent(tokenId, ZERO_ADDRESS);
      await expect(setRegistrarAgent).to.be.revertedWithCustomError(
        securityTokenProxy,
        'ZeroAddressCheck',
      );
    });
  });
  context('Should not to be able to set token agents', async () => {
    let tokenId = 10;
    let receiverAddress;
    let registrarAddress;
    let settlementAgentAddress;
    let newRegistrarAddress;
    beforeEach(async () => {
      signers = await getOperatorSigners();
      securityTokenProxy = await loadFixture(deploySecurityTokenFixture);

      receiverAddress = await signers.investor1.getAddress();
      registrarAddress = await signers.registrar.getAddress();
      settlementAgentAddress = await signers.settlementAgent.getAddress();
      newRegistrarAddress = await signers.investor3.getAddress();
    });
    it("should not be able to set token's settlement agent", async () => {
      await expect(
        securityTokenProxy
          .connect(signers.registrar)
          .setSettlementAgent(tokenId, receiverAddress),
      ).to.be.revertedWithCustomError(
        securityTokenProxy,
        `NoSettlementAgentCurrentlySet`,
      );
    });
    it("should not be able to set token's registrar agent", async () => {
      await expect(
        securityTokenProxy
          .connect(signers.registrar)
          .setRegistrarAgent(tokenId, newRegistrarAddress),
      ).to.be.revertedWithCustomError(
        securityTokenProxy,
        `NoRegistrarAgentCurrentlySet`,
      );
    });
  });
  context(
    'Check whether named operators match the new implementation operators',
    async function () {
      let newSecurityTokenV2Address: string;
      beforeEach(async () => {
        newSecurityTokenV2Address = await loadFixture(
          deploySecurityTokenV2Fixture,
        );
      });
      it('only registar could authorize new implementation', async function () {
        await securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(registrarAddress, technicalAddress);
        await securityTokenProxy
          .connect(signers.registrar)
          .acceptRegistrarRole();
        await securityTokenProxy
          .connect(signers.technical)
          .acceptTechnicalRole();
        const authorizeImplementation = securityTokenProxy
          .connect(signers.technical)
          .authorizeImplementation(newSecurityTokenV2Address);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          securityTokenProxy,
          `UnauthorizedRegistrar`,
        );
      });
      it('only not zero address implementation should be authorized', async function () {
        await securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(registrarAddress, technicalAddress);
        await securityTokenProxy
          .connect(signers.registrar)
          .acceptRegistrarRole();
        await securityTokenProxy
          .connect(signers.technical)
          .acceptTechnicalRole();
        const authorizeImplementation = securityTokenProxy
          .connect(signers.registrar)
          .authorizeImplementation(ZERO_ADDRESS);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          securityTokenProxy,
          `ZeroAddressCheck`,
        );
      });
      it('should fail with registrar did not match implementation registrar', async function () {
        await securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(investor1Address, technicalAddress);
        await securityTokenProxy
          .connect(signers.investor1)
          .acceptRegistrarRole();
        await securityTokenProxy
          .connect(signers.technical)
          .acceptTechnicalRole();
        const authorizeImplementation = securityTokenProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSecurityTokenV2Address);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          securityTokenProxy,
          `UnauthorizedRegistrar`,
        );
      });
      it('should fail with technical did not match implementation technical', async function () {
        await securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(registrarAddress, investor1Address);
        await securityTokenProxy
          .connect(signers.registrar)
          .acceptRegistrarRole();
        await securityTokenProxy
          .connect(signers.investor1)
          .acceptTechnicalRole();

        const authorizeImplementation = securityTokenProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSecurityTokenV2Address);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          securityTokenProxy,
          `UnauthorizedTechnical`,
        );
      });
    },
  );
  context('AccessControl: internal', async () => {
    let testContract: MissuseAccessControlInternal;

    beforeEach(async () => {
      testContract = await loadFixture(
        deployTestContractMissuseAccessControlInternal,
      );
      signers = await getOperatorSigners();
      registrarAddress = await signers.registrar.getAddress();
    });

    it('should lock init function after init', async () => {
      const doubleInit = testContract.doubleInitAccessControl();
      await expect(doubleInit).to.be.reverted;
    });
  });
});
