import { MissuseAccessControlInternal, SecurityToken } from '../../../dist/types';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import {
  deploySmartCoinFixture,
  deploySmartCoinV3Fixture,
  deployTestContractMissuseAccessControlInternal,
} from '../utils/builders';
import { getOperatorSigners } from '../utils/signers';
import { ZERO_ADDRESS } from '../utils/contants';
import { Signer } from 'ethers';



context('SecurityToken', () => {
  let securityTokenProxy: SecurityToken;
  let signers: {
    registrar: Signer;
    issuer: Signer;
    investor4: Signer;
    investor1: Signer;
    investor2: Signer;
    investor3: Signer;
    settler: Signer;
    operations: Signer;
    technical: Signer;
  };

  let registrarAddress: string;
  let investor1Address: string;
  let investor2Address: string;
  let operationsAddress: string;
  let technicalAddress: string;

  context('SmartCoin: naming operators', async function () {
    beforeEach(async () => {
      securityTokenProxy = await loadFixture(deploySmartCoinFixture);

      signers = await getOperatorSigners();

      operationsAddress = await signers.operations.getAddress();
      technicalAddress = await signers.technical.getAddress();

      registrarAddress = await signers.registrar.getAddress();
      investor1Address = await signers.investor1.getAddress();
      investor2Address = await signers.investor2.getAddress();
    });
    context('should not accept naming Zero Address operator', async () => {
      it('should not be able to name a zero address registrar', async () => {
        const nameOperators = securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(ZERO_ADDRESS, operationsAddress, technicalAddress);
        await expect(nameOperators).to.be.revertedWithCustomError(
          securityTokenProxy,
          `ZeroAddressCheck`,
        );
      });
      it('should not be able to name a zero address operations', async () => {
        const nameOperators = securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(registrarAddress, ZERO_ADDRESS, technicalAddress);
        await expect(nameOperators).to.be.revertedWithCustomError(
          securityTokenProxy,
          `ZeroAddressCheck`,
        );
      });
      it('should not be able to name a zero address technical', async () => {
        const nameOperators = securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(registrarAddress, operationsAddress, ZERO_ADDRESS);
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
          .nameNewOperators(
            registrarAddress,
            operationsAddress,
            technicalAddress,
          );
      });
      it('should emit an event NamedNewOperatots', async () => {
        await expect(nameNewOperatorsTransaction)
          .to.emit(securityTokenProxy, 'NamedNewOperators')
          .withArgs(registrarAddress, operationsAddress, technicalAddress);
      });
      it('only registrar could name new operators', async () => {
        const nameNewOperators = securityTokenProxy
          .connect(signers.investor1)
          .nameNewOperators(
            registrarAddress,
            operationsAddress,
            technicalAddress,
          );
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
      it('should not be able to accept unauthorized operations role', async () => {
        const acceptOperationsRole = securityTokenProxy
          .connect(signers.investor1)
          .acceptOperationsRole();
        await expect(acceptOperationsRole).to.be.revertedWithCustomError(
          securityTokenProxy,
          `UnauthorizedOperations`,
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
      it('should be able to accept authorized operations role', async () => {
        const acceptOperationsRole = await securityTokenProxy
          .connect(signers.operations)
          .acceptOperationsRole();
        await expect(acceptOperationsRole)
          .to.emit(securityTokenProxy, 'AcceptedOperationsRole')
          .withArgs(operationsAddress);
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

    it('should freeze an address', async () => {
      const addAddressTransaction = await securityTokenProxy
        .connect(signers.registrar)
        .freeze([investor1Address]);

      await expect(addAddressTransaction)
        .to.emit(securityTokenProxy, 'AddressesFrozen')
        .withArgs([investor1Address]);
    });
    it('should get not frozen addresses from a list of addresses', async () => {
      await securityTokenProxy
        .connect(signers.registrar)
        .freeze([investor1Address]);

      await expect((await securityTokenProxy.findNotFrozen([investor1Address, investor2Address, registrarAddress]))).to.deep.eq([investor2Address, registrarAddress])
    });

    it('should unfreeze an address', async () => {
      await securityTokenProxy
        .connect(signers.registrar)
        .freeze([investor2Address]);

      const removeFromAccessControlTransaction = await securityTokenProxy
        .connect(signers.registrar)
        .unfreeze([investor2Address]);

      await expect(removeFromAccessControlTransaction)
        .to.emit(securityTokenProxy, 'AddressesUnFrozen')
        .withArgs([investor2Address]);
    });

    it('should reject blacklist an already frozen address', async () => {
      await securityTokenProxy
        .connect(signers.registrar)
        .freeze([investor2Address]);

      await expect(
        securityTokenProxy
          .connect(signers.registrar)
          .freeze([investor2Address]),
      ).to.be.revertedWithCustomError(
        securityTokenProxy,
        `AddressAlreadyFrozen`,
      );
    });

    it('should reject unfreeze an already unfrozen address', async () => {
      await securityTokenProxy
        .connect(signers.registrar)
        .freeze([investor2Address]);

      await securityTokenProxy
        .connect(signers.registrar)
        .unfreeze([investor2Address]);

      await expect(
        securityTokenProxy
          .connect(signers.registrar)
          .unfreeze([investor2Address]),
      )
        .to.be.revertedWithCustomError(securityTokenProxy, `AddressNotFrozen`)
        .withArgs(investor2Address);
    });

    it('only registrar could freeze an address', async () => {
      await expect(
        securityTokenProxy
          .connect(signers.investor3)
          .freeze([investor2Address]),
      ).to.be.revertedWithCustomError(securityTokenProxy, `UnauthorizedRegistrar`);
    });
    it('only registrar could unfreeze an address', async () => {
      await securityTokenProxy
        .connect(signers.registrar)
        .freeze([investor2Address]);

      await expect(
        securityTokenProxy
          .connect(signers.investor3)
          .unfreeze([investor2Address]),
      ).to.be.revertedWithCustomError(securityTokenProxy, `UnauthorizedRegistrar`);
    });
  });
  context(
    'Check whether named operators match the new implementation operators',
    async function () {
      let newSmartCoinV3Address: string;
      beforeEach(async () => {
        newSmartCoinV3Address = await loadFixture(deploySmartCoinV3Fixture);
      });
      it('only registar could authorize new implementation', async function () {
        await securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(
            registrarAddress,
            operationsAddress,
            technicalAddress,
          );
        await securityTokenProxy.connect(signers.operations).acceptOperationsRole();
        await securityTokenProxy.connect(signers.registrar).acceptRegistrarRole();
        await securityTokenProxy.connect(signers.technical).acceptTechnicalRole();
        const authorizeImplementation = securityTokenProxy
          .connect(signers.technical)
          .authorizeImplementation(newSmartCoinV3Address);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          securityTokenProxy,
          `UnauthorizedRegistrar`,
        );
      });
      it('only not zero address implementation should be authorized', async function () {
        await securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(
            registrarAddress,
            operationsAddress,
            technicalAddress,
          );
        await securityTokenProxy.connect(signers.operations).acceptOperationsRole();
        await securityTokenProxy.connect(signers.registrar).acceptRegistrarRole();
        await securityTokenProxy.connect(signers.technical).acceptTechnicalRole();
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
          .nameNewOperators(
            investor1Address,
            operationsAddress,
            technicalAddress,
          );
        await securityTokenProxy.connect(signers.operations).acceptOperationsRole();
        await securityTokenProxy.connect(signers.investor1).acceptRegistrarRole();
        await securityTokenProxy.connect(signers.technical).acceptTechnicalRole();
        const authorizeImplementation = securityTokenProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSmartCoinV3Address);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          securityTokenProxy,
          `UnauthorizedRegistrar`,
        );
      });
      it('should fail with technical did not match implementation technical', async function () {
        await securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(
            registrarAddress,
            operationsAddress,
            investor1Address,
          );
        await securityTokenProxy.connect(signers.operations).acceptOperationsRole();
        await securityTokenProxy.connect(signers.registrar).acceptRegistrarRole();
        await securityTokenProxy.connect(signers.investor1).acceptTechnicalRole();

        const authorizeImplementation = securityTokenProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSmartCoinV3Address);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          securityTokenProxy,
          `UnauthorizedTechnical`,
        );
      });
      it('should fail with operations did not match implementation operations', async function () {
        await securityTokenProxy
          .connect(signers.registrar)
          .nameNewOperators(
            registrarAddress,
            investor1Address,
            technicalAddress,
          );
        await securityTokenProxy.connect(signers.technical).acceptTechnicalRole();
        await securityTokenProxy.connect(signers.registrar).acceptRegistrarRole();
        await securityTokenProxy.connect(signers.investor1).acceptOperationsRole();
        const authorizeImplementation = securityTokenProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSmartCoinV3Address);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          securityTokenProxy,
          `UnauthorizedOperations`,
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
