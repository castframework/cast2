import { SecurityToken } from '../../../dist/types';
import { expect, assert } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deploySecurityTokenFixture } from '../utils/builders';
import '@nomicfoundation/hardhat-chai-matchers'; //Added for revertWithCustomErrors

context('getTokenIdByIsin', () => {
  let securityTokenProxy: SecurityToken;

  beforeEach(async () => {
    securityTokenProxy = await loadFixture(deploySecurityTokenFixture);
  });

  it('should correctly convert correct ISIN', async () => {
    expect(
      (await securityTokenProxy.getTokenIdByIsin('FR1234567890')).toString(16),
    ).to.equal('465231323334353637383930');
  });
  it('should convert lowercase letters to uppercase', async () => {
    expect(
      (await securityTokenProxy.getTokenIdByIsin('fr1234567890')).toString(16),
    ).to.equal('465231323334353637383930');
  });
  it('should fail if ISIN is shorter than 12 characters', async () => {
    expect(
      securityTokenProxy.getTokenIdByIsin('FR123456789'),
    ).to.revertedWithCustomError(securityTokenProxy, 'InvalidIsinCodeLength');
  });
  it('should fail if ISIN is longer than 12 characters', async () => {
    expect(
      securityTokenProxy.getTokenIdByIsin('FR1234567890A'),
    ).to.revertedWithCustomError(securityTokenProxy, 'InvalidIsinCodeLength');
  });
  it('should fail if ISIN contains a non-ascii character', async () => {
    expect(securityTokenProxy.getTokenIdByIsin('€R1234567890'))
      .to.revertedWithCustomError(
        securityTokenProxy,
        'InvalidIsinCodeCharacter',
      )
      .withArgs(0xe2);
  });
  it('should fail if ISIN contains a non-alphanumeric character', async () => {
    [...' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'].forEach((character: string) =>
      expect(securityTokenProxy.getTokenIdByIsin(`FR1234${character}67890`))
        .to.revertedWithCustomError(
          securityTokenProxy,
          'InvalidIsinCodeCharacter',
        )
        .withArgs(character.charCodeAt(0)),
    );
  });
});
