import { SecurityToken } from '../../../dist/types';
import { expect, assert } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deploySecurityTokenFixture } from '../utils/builders';
import { getOperatorSigners } from '../utils/signers';
import { Signer } from 'ethers';
import { BASE_URI } from '../utils/constants';
import { ethers } from 'hardhat';
import "@nomicfoundation/hardhat-chai-matchers"; //Added for revertWithCustomErrors

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

context('SecurityToken', () => {
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
  };

  let registrarAddress: string;
  let investor1Address: string;
  let investor2Address: string;

  // context('SmartCoin: Balance Administration', async function () {
  //   beforeEach(async () => {
  //     securityToken = await loadFixture(deploySecurityTokenFixture);
  //     signers = await getOperatorSigners();

  //     registrarAddress = await signers.registrar.getAddress();
  //     investor1Address = await signers.investor1.getAddress();
  //     investor2Address = await signers.investor2.getAddress();
  //   });
  //   context('Operators zero address & consistency check ', () => {
  //     let SmartCoinFactory;
  //     beforeEach(async () => {
  //       SmartCoinFactory = await ethers.getContractFactory('SmartCoin');
  //     });
  //     it('should not deploy with zero address operations', async () => {
  //       const newSmartCoin = SmartCoinFactory.deploy(
  //         registrarAddress,
  //         ZERO_ADDRESS,
  //         investor1Address,
  //       );
  //       expect(newSmartCoin).to.be.revertedWithCustomError(
  //         securityToken,
  //         'ZeroAddressCheck',
  //       );
  //     });
  //     it('should not deploy with zero address registrar', async () => {
  //       const newSmartCoin = SmartCoinFactory.deploy(
  //         ZERO_ADDRESS,
  //         investor2Address,
  //         investor1Address,
  //       );
  //       expect(newSmartCoin).to.be.revertedWithCustomError(
  //         securityToken,
  //         'ZeroAddressCheck',
  //       );
  //     });
  //     it('should not deploy with zero address technical', async () => {
  //       const newSmartCoin = SmartCoinFactory.deploy(
  //         investor1Address,
  //         investor2Address,
  //         ZERO_ADDRESS,
  //       );
  //       expect(newSmartCoin).to.be.revertedWithCustomError(
  //         securityToken,
  //         'ZeroAddressCheck',
  //       );

  //       it('should not deploy when operations and registrar have same address', async () => {
  //         const newSmartCoin = SmartCoinFactory.deploy(
  //           investor1Address,
  //           investor1Address,
  //           investor2Address,
  //         );
  //         expect(newSmartCoin).to.be.revertedWithCustomError(
  //           securityToken,
  //           'InconsistentOperators',
  //         );
  //       });
  //       it('should not deploy when operations and technical have same address', async () => {
  //         const newSmartCoin = SmartCoinFactory.deploy(
  //           investor2Address,
  //           investor1Address,
  //           investor1Address,
  //         );
  //         expect(newSmartCoin).to.be.revertedWithCustomError(
  //           securityToken,
  //           'InconsistentOperators',
  //         );
  //       });
  //       it('should not deploy when registrar and technical have same address', async () => {
  //         const newSmartCoin = SmartCoinFactory.deploy(
  //           investor1Address,
  //           investor2Address,
  //           investor1Address,
  //         );
  //         expect(newSmartCoin).to.be.revertedWithCustomError(
  //           securityToken,
  //           'InconsistentOperators',
  //         );
  //       });
  //     });
  //   });
  //   it('should mint tokens to unfrozen address', async () => {

  //     const mintTransaction = await securityToken
  //       .connect(signers.registrar)
  //       .mint(investor1Address, mintingAmount);

  //     await expect(mintTransaction)
  //       .to.emit(securityToken, 'Transfer')
  //       .withArgs(ZERO_ADDRESS, investor1Address, mintingAmount);

  //     await expect(await securityToken.balanceOf(investor1Address)).to.be.eq(
  //       mintingAmount,
  //     );
  //   });

  //   it('should fail to mint to frozen address', async () => {
  //     await securityToken.connect(signers.registrar).freeze([investor1Address]);
  //     await expect(
  //       securityToken.connect(signers.registrar).mint(investor1Address, 10),
  //     ).to.be.reverted;
  //   });

  //   it("should match the token's symbol", async () => {
  //     await expect(await securityToken.symbol()).to.be.eq(TOKEN_SYMBOL);
  //   });
  //   it("should match the token's name", async () => {
  //     await expect(await securityToken.name()).to.be.eq(TOKEN_NAME);
  //   });

  //   it('should burn tokens from registrar account', async () => {

  //     await securityToken
  //       .connect(signers.registrar)
  //       .mint(registrarAddress, mintingAmount);

  //     const burnTransaction = await securityToken
  //       .connect(signers.registrar)
  //       .burn(mintingAmount);

  //     await expect(burnTransaction)
  //       .to.emit(securityToken, 'Transfer')
  //       .withArgs(registrarAddress, ZERO_ADDRESS, mintingAmount);

  //     await expect(
  //       (await securityToken.balanceOf(registrarAddress)).toString(),
  //     ).to.be.eq('0');
  //   });

  //   it('should match the total supply', async () => {

  //     await securityToken
  //       .connect(signers.registrar)
  //       .mint(investor1Address, mintingAmount);

  //     await securityToken
  //       .connect(signers.registrar)
  //       .mint(investor2Address, mintingAmount);

  //     await expect((await securityToken.totalSupply()).toNumber()).to.be.eq(
  //       mintingAmount * 2,
  //     );
  //   });

  //   it('should fail with only registrar could perform a mint', async () => {
  //     await expect(
  //       securityToken.connect(signers.investor2).mint(investor1Address, 1000),
  //     ).to.be.revertedWithCustomError(securityToken, `UnauthorizedRegistrar`);
  //   });

  //   it('should fail with only registrar could perform a wipeFrozenAddress', async () => {

  //     await securityToken
  //       .connect(signers.registrar)
  //       .mint(investor1Address, mintingAmount);

  //     await expect(
  //       securityToken
  //         .connect(signers.investor2)
  //         .wipeFrozenAddress(investor1Address),
  //     ).to.be.revertedWithCustomError(securityToken, `UnauthorizedRegistrar`);
  //   });
  //   it('should fail to wipe from not frozen address', async () => {
  //     await securityToken
  //       .connect(signers.registrar)
  //       .mint(investor1Address, mintingAmount);

  //     await expect(
  //       securityToken
  //         .connect(signers.registrar)
  //         .wipeFrozenAddress(investor1Address),
  //     ).to.be.revertedWithCustomError(securityToken, `AddressNotFrozen`).withArgs(investor1Address);
  //   });
  //   it('should  wipe from  frozen address', async () => {
      
  //     await securityToken
  //       .connect(signers.registrar)
  //       .mint(investor1Address, mintingAmount);

  //     await securityToken.connect(signers.registrar).freeze([investor1Address]);

  //     const wipeTransaction = await securityToken.connect(signers.registrar).wipeFrozenAddress(investor1Address);


  //     await expect(wipeTransaction)
  //     .to.emit(securityToken, 'Transfer').withArgs(investor1Address, ZERO_ADDRESS, mintingAmount);

  //     assert((await securityToken.callStatic.balanceOf(investor1Address)).toString(), '0')

  //   });
  //   it('should wipeFrozenAddress from an investor', async () => {

  //     await securityToken
  //       .connect(signers.registrar)
  //       .mint(investor1Address, mintingAmount);

  //     await securityToken
  //       .connect(signers.registrar)
  //       .freeze([investor1Address]);

  //     await securityToken
  //       .connect(signers.registrar)
  //       .wipeFrozenAddress(investor1Address);
  //     assert.equal(
  //       (await securityToken.balanceOf(registrarAddress)).toNumber(),
  //       0,
  //       'Invalid allowed amount ',
  //     );
  //   });

  //   it('should fail with only registrar could perform a burn', async () => {

  //     await securityToken
  //       .connect(signers.registrar)
  //       .mint(investor1Address, mintingAmount);

  //     await expect(
  //       securityToken.connect(signers.investor2).burn(mintingAmount),
  //     ).to.be.revertedWithCustomError(securityToken, `UnauthorizedRegistrar`);
  //   });

  //   it('should not burn amount higher than current balance', async () => {
  //     const higherAmount = mintingAmount + 10;

  //     await securityToken
  //       .connect(signers.registrar)
  //       .mint(investor1Address, mintingAmount);

  //     const currentBalance = (
  //       await securityToken.balanceOf(registrarAddress)
  //     ).toNumber();

  //     await expect(securityToken.connect(signers.registrar).burn(higherAmount))
  //       .to.be.revertedWithCustomError(securityToken, `InsufficientBalance`)
  //       .withArgs(currentBalance, higherAmount);
  //   });
  // });
});
