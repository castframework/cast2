import { SecurityToken } from '../../../dist/types';
import { expect, assert } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deploySecurityTokenFixture, deploySecurityTokenV2Fixture } from '../utils/builders';
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

        await expect(pauseTransaction)
            .to.emit(securityToken, 'Paused');
    });
    it('Only registrar could pause the contract', async () => {

        const pauseTransaction = securityToken
            .connect(signers.technical)
            .pause();

        await expect(pauseTransaction)
            .to.be.revertedWithCustomError(securityToken, 'UnauthorizedRegistrar');
    });
    it('Only registrar could unpause the contract', async () => {

        const pauseTransaction = securityToken
            .connect(signers.technical)
            .unpause();

        await expect(pauseTransaction)
            .to.be.revertedWithCustomError(securityToken, 'UnauthorizedRegistrar');
    });

    it('Should unpause the contract', async () => {
        await securityToken
            .connect(signers.registrar)
            .pause();
        const unPauseTransaction = await securityToken
            .connect(signers.registrar)
            .unpause();

        await expect(unPauseTransaction)
            .to.emit(securityToken, 'Unpaused');
    });
    it('Should not be unpause an already unpaused contract', async () => {
        await securityToken
            .connect(signers.registrar)
            .pause();
        await securityToken
            .connect(signers.registrar)
            .unpause();
        const unPauseTransaction2 = securityToken
            .connect(signers.registrar)
            .unpause();

        expect(unPauseTransaction2).to.be.revertedWithCustomError(
            securityToken,
            'ExpectedPause',
        );
    });
    it('Should not be pause an already paused contract', async () => {
        await securityToken
            .connect(signers.registrar)
            .pause();
        const pauseTransaction2 = securityToken
            .connect(signers.registrar)
            .pause();

        expect(pauseTransaction2).to.be.revertedWithCustomError(
            securityToken,
            'EnforcedPause',
        );
    });
    // context("Frobiden actions when contract is paused", async () => {
    //     let newSmartCoinV3Address;
    //     const fakeTransfetHash = "0x60298f78cc0b47170ba79c10aa3851d7648bd96f2f8e46a19dbc777c36fb0c00"
    //     beforeEach(async () => {
    //         await securityToken.connect(signers.registrar).pause();
    //         newSmartCoinV3Address = await loadFixture(deploySmartCoinV3Fixture);

    //     });
    //     it('Should not transfer when contract is paused ', async () => {
    //         await expect(
    //             securityToken
    //                 .connect(signers.investor3)
    //                 .transfer(investor1Address, 1),
    //         )
    //             .to.be.revertedWithCustomError(securityToken, `ContractPaused`);
    //     });

    //     it('Should not transfer from when contract is paused', async () => {
    //         await expect(
    //             securityToken
    //                 .connect(signers.investor1)
    //                 .transferFrom(investor1Address, investor2Address, 1),
    //         )
    //             .to.be.revertedWithCustomError(securityToken, `ContractPaused`)
    //     });
    //     it('Should not approve from when contract is paused', async () => {
    //         await expect(
    //             securityToken
    //                 .connect(signers.investor1)
    //                 .approve(investor1Address, 1),
    //         )
    //             .to.be.revertedWithCustomError(securityToken, `ContractPaused`)
    //     });
    //     it('Should not increaseAllowance when contract is paused', async () => {
    //         await expect(
    //             securityToken
    //                 .connect(signers.investor1)
    //                 .increaseAllowance(investor1Address, 1),
    //         )
    //             .to.be.revertedWithCustomError(securityToken, `ContractPaused`)
    //     });
    //     it('Should not decreaseAllowance when contract is paused', async () => {
    //         await expect(
    //             securityToken
    //                 .connect(signers.investor1)
    //                 .decreaseAllowance(investor1Address, 1),
    //         )
    //             .to.be.revertedWithCustomError(securityToken, `ContractPaused`)
    //     });
    // });
    // context("Allowed actions when contract is paused", async () => {
    //     beforeEach(async () => {
    //         await securityToken.connect(signers.registrar).pause();
    //     });
    //     it("Should allow registrar to mint tokens", async () => {
    //         const amountToMint = 10;
    //         const mintTx = await securityToken
    //             .connect(signers.registrar)
    //             .mint(investor1Address, amountToMint);
    //         expect(mintTx).to.emit(securityToken, "Transfer").withArgs(ZERO_ADDRESS, investor1Address, amountToMint)
    //     });
    //     it("Should allow registrar to burn tokens", async () => {
    //         const amountToBurn = 10;

    //         await securityToken
    //         .connect(signers.registrar)
    //         .mint(registrarAddress, amountToBurn);

    //         const burnTx = await securityToken
    //             .connect(signers.registrar)
    //             .burn(amountToBurn);
    //         expect(burnTx).to.emit(securityToken, "Transfer").withArgs(registrarAddress, ZERO_ADDRESS, amountToBurn)
    //     });
    // });
});

