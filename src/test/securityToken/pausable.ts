import { SecurityToken } from '../../../dist/types';
import { expect, assert } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import {
  deploySecurityTokenFixture,
  deploySecurityTokenV2Fixture,
} from '../utils/builders';
import { getOperatorSigners } from '../utils/signers';
import { Signer } from 'ethers';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

context('SecurityToken Pausable', () => {
  let securityToken: SecurityToken;
  const mintingAmount = 1000;
  let signers: {
    registrar: Signer;
    issuer: Signer;
    investor4: Signer;
    investor1: Signer;
    investor2: Signer;
    investor3: Signer;
    settler: Signer;
    technical: Signer;
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
    const pauseTransaction = securityToken.connect(signers.technical).pause();

    await expect(pauseTransaction).to.be.revertedWithCustomError(
      securityToken,
      'UnauthorizedRegistrar',
    );
  });
  it('Only registrar could unpause the contract', async () => {
    const pauseTransaction = securityToken.connect(signers.technical).unpause();

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
});
