import { SecurityToken } from '../../../dist/types';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import {
  deploySecurityTokenFixture,
  deploySecurityTokenV2Fixture,
  getSecurityTokenOperatorsAddresses,
} from '../utils/builders';
import { getOperatorSigners } from '../utils/signers';
import { ethers } from 'hardhat';
import { Signer } from 'ethers';
import { EncodedVersionFunction } from '../utils/encodeCall';
import { BASE_URI, ZERO_ADDRESS } from '../utils/constants';

context('SecurityToken: Proxy', () => {
  let securityTokenProxy: SecurityToken;
  let signers: {
    registrar: Signer;
    investor1: Signer;
    technical: Signer;
  };

  let registrarAddress: string;
  let technicalAddress: string;

  context('Proxy Implementation upgrade', async function () {
    beforeEach(async () => {
      securityTokenProxy = await loadFixture(deploySecurityTokenFixture);
      signers = await getOperatorSigners();

      registrarAddress = await signers.registrar.getAddress();
      technicalAddress = await signers.technical.getAddress();
    });

    it('should not be able to call initialize after initialization', async () => {
      const transaction = securityTokenProxy.initialize(BASE_URI);
      await expect(transaction).to.be.revertedWithCustomError(
        securityTokenProxy,
        'InvalidInitialization',
      );
    });
    context('Check operators consistency', () => {
      it('should not deploy with zero address registrar', async () => {
        const rslt = securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(ZERO_ADDRESS, technicalAddress);
        expect(rslt).to.be.revertedWithCustomError(
          securityTokenProxy,
          'ZeroAddressCheck',
        );
      });
      it('should not deploy with zero address technical', async () => {
        const rslt = securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(technicalAddress, ZERO_ADDRESS);
        expect(rslt).to.be.revertedWithCustomError(
          securityTokenProxy,
          'ZeroAddressCheck',
        );
      });
      it('should not deploy when registrar and technical have same address', async () => {
        const rslt = securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(
            technicalAddress,
            technicalAddress,
          );
        expect(rslt).to.be.revertedWithCustomError(
          securityTokenProxy,
          'InconsistentOperators',
        );
      });
    });
    it('should be able to be upgraded by the technical', async () => {
      expect(await securityTokenProxy.version()).to.be.equals('V1');

      await securityTokenProxy
        .connect(signers.registrar)
        .nameNewOperators(
          registrarAddress,
          technicalAddress,
        );
      securityTokenProxy.connect(signers.registrar).acceptRegistrarRole();
      securityTokenProxy.connect(signers.technical).acceptTechnicalRole();

      const newSecurityTokenV2Address = await loadFixture(deploySecurityTokenV2Fixture);

     await securityTokenProxy
        .connect(signers.registrar)
        .authorizeImplementation(newSecurityTokenV2Address);
      await securityTokenProxy
        .connect(signers.technical)
        .upgradeToAndCall(newSecurityTokenV2Address, '0x');

      expect(await securityTokenProxy.version()).to.be.equals('V2');
    });
    context('Check new implementation authorization', async function () {
      let newSecurityTokenV2Address: string;
      beforeEach(async () => {
        newSecurityTokenV2Address = await loadFixture(deploySecurityTokenV2Fixture);
        await securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(
            registrarAddress,
            technicalAddress,
          );
        await securityTokenProxy.connect(signers.registrar).acceptRegistrarRole();
        await securityTokenProxy.connect(signers.technical).acceptTechnicalRole();
      });
      it('should emit an event implementation authorized', async function () {
        const authorizedImplemTransaction = await securityTokenProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSecurityTokenV2Address);
        await expect(authorizedImplemTransaction)
          .to.emit(securityTokenProxy, 'ImplementationAuthorized')
          .withArgs(newSecurityTokenV2Address);
      });
      it('should fail upgradeTo securityToken with unauthorized new Implementation', async function () {
        const upgradeSmartContract = securityTokenProxy
          .connect(signers.technical)
          .upgradeToAndCall(newSecurityTokenV2Address, '0x');
        await expect(upgradeSmartContract)
          .to.be.revertedWithCustomError(
            securityTokenProxy,
            `UnauthorizedImplementation`,
          )
          .withArgs(newSecurityTokenV2Address);
      });
      it('should fail upgradeToAndCall securityToken with unauthorized new Implementation', async function () {
        const upgradeSmartContract = securityTokenProxy
          .connect(signers.technical)
          .upgradeToAndCall(newSecurityTokenV2Address, EncodedVersionFunction);
        await expect(upgradeSmartContract)
          .to.be.revertedWithCustomError(
            securityTokenProxy,
            `UnauthorizedImplementation`,
          )
          .withArgs(newSecurityTokenV2Address);
      });
      it('should upgradeTo securityToken with authorized new Implementation', async function () {
        await securityTokenProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSecurityTokenV2Address);
        await securityTokenProxy
          .connect(signers.technical)
          .upgradeToAndCall(newSecurityTokenV2Address, '0x');
        expect(await securityTokenProxy.version()).to.be.equals('V2');
      });
      it('should fail the second upgradeToAndCall for the same implementation', async function () {
        await securityTokenProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSecurityTokenV2Address);
        await securityTokenProxy
          .connect(signers.technical)
          .upgradeToAndCall(newSecurityTokenV2Address, '0x');

        const upgradeSmartContract = securityTokenProxy
          .connect(signers.technical)
          .upgradeToAndCall(newSecurityTokenV2Address, '0x');
        await expect(upgradeSmartContract)
          .to.be.revertedWithCustomError(
            securityTokenProxy,
            `UnauthorizedImplementation`,
          )
          .withArgs(newSecurityTokenV2Address);
      });
    });
    context('Check new securityToken operators role acceptence', async function () {
      let newSecurityTokenV2Address: string;
      beforeEach(async () => {
        newSecurityTokenV2Address = await loadFixture(deploySecurityTokenV2Fixture);
        await securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(
            registrarAddress,
            technicalAddress,
          );
      });
      it('should fail with registrar did not accept his role', async function () {
        await securityTokenProxy.connect(signers.technical).acceptTechnicalRole();
        const authorizeImplementation = securityTokenProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSecurityTokenV2Address);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          securityTokenProxy,
          `UnauthorizedRegistrar`,
        );
      });
      it('should fail with technical did not accept his role', async function () {
        await securityTokenProxy.connect(signers.registrar).acceptRegistrarRole();
        const authorizeImplementation = securityTokenProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSecurityTokenV2Address);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          securityTokenProxy,
          `UnauthorizedTechnical`,
        );
      });
    });

    it('should be able to be upgraded only by the technical', async () => {
      await securityTokenProxy
        .connect(signers.registrar)
        .nameNewOperators(
          registrarAddress,
          technicalAddress,
        );

      await securityTokenProxy.connect(signers.registrar).acceptRegistrarRole();
      await securityTokenProxy.connect(signers.technical).acceptTechnicalRole();

      const newSecurityTokenAddress = await loadFixture(deploySecurityTokenV2Fixture);

      await securityTokenProxy
        .connect(signers.registrar)
        .authorizeImplementation(newSecurityTokenAddress);
      const upgradeSmartContract = securityTokenProxy
        .connect(signers.investor1)
        .upgradeToAndCall(newSecurityTokenAddress, '0x');

      await expect(upgradeSmartContract).to.be.revertedWithCustomError(
        securityTokenProxy,
        `UnauthorizedTechnical`,
      );
    });
    context(
      'upgradeTo and UpdateToAndCall must be called only through delegatecall',
      async () => {
        let securityToken: SecurityToken;
        let newSecurityTokenAddress: string;
        beforeEach(async () => {
          const securityTokenOperators = await getSecurityTokenOperatorsAddresses();
          const SecurityTokenFactory = await ethers.getContractFactory('SecurityToken');
          securityToken = (await SecurityTokenFactory.deploy(...securityTokenOperators)) as SecurityToken;
          // securityToken.deployed();

          newSecurityTokenAddress = await loadFixture(deploySecurityTokenV2Fixture);
        });
        it('should be able to call upgraded upgradeToAndCall only via delegatecall', async () => {
          const upgrateTo = securityToken
            .connect(signers.technical)
            .upgradeToAndCall(newSecurityTokenAddress, '0x');
          await expect(upgrateTo).to.be.revertedWithCustomError(
            securityToken,
            'UUPSUnauthorizedCallContext',
          );
        });
      },
    );
  });
});
