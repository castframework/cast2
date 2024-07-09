import { SecurityTokenV1 } from '../../../dist/types';
import { expect, assert } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import {
  deploySecurityTokenFixture,
  deploySecurityTokenV2Fixture,
} from '../utils/builders';
import { getOperatorSigners } from '../utils/signers';
import { Signer } from 'ethers';
import { sign } from 'crypto';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

context('SecurityTokenV1 Pausable', () => {
  let securityToken: SecurityTokenV1;
  const mintingAmount = 1000;
  let signers: {
    registrar: Signer;
    issuer: Signer;
    registrarAgent: Signer;
    investor1: Signer;
    investor2: Signer;
    investor3: Signer;
    settlementAgent: Signer;
  };

  let registrarAddress: string;
  let investor1Address: string;
  let investor2Address: string;

  beforeEach(async () => {
    securityToken = await loadFixture(deploySecurityTokenFixture);
    signers = await getOperatorSigners();

    registrarAddress = await signers.registrar.getAddress();
    investor1Address = await signers.investor1.getAddress();
    investor2Address = await signers.investor2.getAddress();
  });

  it('Should pause the contract', async () => {
    const pauseTransaction = await securityToken
      .connect(signers.registrar)
      .pause();

    await expect(pauseTransaction).to.emit(securityToken, 'Paused');
  });
  it('Only registrar could pause the contract', async () => {
    const pauseTransaction = securityToken.connect(signers.investor1).pause();

    await expect(pauseTransaction).to.be.revertedWithCustomError(
      securityToken,
      'UnauthorizedRegistrar',
    );
  });
  it('Only registrar could unpause the contract', async () => {
    const pauseTransaction = securityToken.connect(signers.investor1).unpause();

    await expect(pauseTransaction).to.be.revertedWithCustomError(
      securityToken,
      'UnauthorizedRegistrar',
    );
  });

  it('Should unpause the contract', async () => {
    await securityToken.connect(signers.registrar).pause();
    const unPauseTransaction = await securityToken
      .connect(signers.registrar)
      .unpause();

    await expect(unPauseTransaction).to.emit(securityToken, 'Unpaused');
  });
  it('Should not be unpause an already unpaused contract', async () => {
    await securityToken.connect(signers.registrar).pause();
    await securityToken.connect(signers.registrar).unpause();
    const unPauseTransaction2 = securityToken
      .connect(signers.registrar)
      .unpause();

    expect(unPauseTransaction2).to.be.revertedWithCustomError(
      securityToken,
      'ExpectedPause',
    );
  });
  it('Should not be pause an already paused contract', async () => {
    await securityToken.connect(signers.registrar).pause();
    const pauseTransaction2 = securityToken.connect(signers.registrar).pause();

    expect(pauseTransaction2).to.be.revertedWithCustomError(
      securityToken,
      'EnforcedPause',
    );
  });
  context('Prohibited methods when contract is paused', async () => {
    beforeEach(
      async () => await securityToken.connect(signers.registrar).pause(),
    );
    it('should call setURI only when contract not paused', async () =>
      await expect(
        securityToken.connect(signers.registrar).setURI(1, '0x'),
      ).to.be.revertedWithCustomError(securityToken, 'EnforcedPause'));
    it('should call setBaseURI only when contract not paused', async () => {
      await expect(
        securityToken.connect(signers.registrar).setBaseURI('0x'),
      ).to.be.revertedWithCustomError(securityToken, 'EnforcedPause');
    });
    it('should call mint only when contract not paused', async () =>
      await expect(
        securityToken.connect(signers.registrar).mint(ZERO_ADDRESS, 1, 1, '0x'),
      ).to.be.revertedWithCustomError(securityToken, 'EnforcedPause'));
    it('should call burn only when contract not paused', async () => {
      await expect(
        securityToken.connect(signers.registrar).burn(ZERO_ADDRESS, 1, 1),
      ).to.be.revertedWithCustomError(securityToken, 'EnforcedPause');
    });
    it('should call safeTransferFrom only when contract not paused', async () =>
      await expect(
        securityToken
          .connect(signers.registrar)
          .safeTransferFrom(ZERO_ADDRESS, ZERO_ADDRESS, 1, 1, '0x'),
      ).to.be.revertedWithCustomError(securityToken, 'EnforcedPause'));
    it('should call forceSafeTransferFrom only when contract not paused', async () =>
      await expect(
        securityToken
          .connect(signers.registrar)
          .forceSafeTransferFrom(ZERO_ADDRESS, ZERO_ADDRESS, 1, 1, '0x'),
      ).to.be.revertedWithCustomError(securityToken, 'EnforcedPause'));
    it('should call cancelTransaction only when contract not paused', async () =>
      await expect(
        securityToken.connect(signers.registrar).cancelTransaction('0x'),
      ).to.be.revertedWithCustomError(securityToken, 'EnforcedPause'));
    it('should call forceCancelTransaction only when contract not paused', async () => {
      await expect(
        securityToken.connect(signers.registrar).forceCancelTransaction('0x'),
      ).to.be.revertedWithCustomError(securityToken, 'EnforcedPause');
    });
    it('should call releaseTransaction only when contract not paused', async () =>
      await expect(
        securityToken.connect(signers.registrar).releaseTransaction('0x'),
      ).to.be.revertedWithCustomError(securityToken, 'EnforcedPause'));
    it('should call forceReleaseTransaction only when contract not paused', async () =>
      await expect(
        securityToken.connect(signers.registrar).forceReleaseTransaction('0x'),
      ).to.be.revertedWithCustomError(securityToken, 'EnforcedPause'));
    it('should call setRegistrarAgent only when contract not paused', async () =>
      await expect(
        securityToken
          .connect(signers.registrar)
          .setRegistrarAgent(1, ZERO_ADDRESS),
      ).to.be.revertedWithCustomError(securityToken, 'EnforcedPause'));
    it('should call setSettlementAgent only when contract not paused', async () =>
      await expect(
        securityToken
          .connect(signers.registrar)
          .setSettlementAgent(1, ZERO_ADDRESS),
      ).to.be.revertedWithCustomError(securityToken, 'EnforcedPause'));
  });
});
