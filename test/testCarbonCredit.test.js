const CarbonCredit = artifacts.require("CarbonCredit");
const CarbonCreditToken = artifacts.require("CarbonCreditToken");

contract("CarbonCredit", (accounts) => {

    let cc, cct;

    before(async () => {
        cc = await CarbonCredit.deployed();
        cct = await CarbonCreditToken.deployed();
        // console.log("***** CCT ADDRESS: ", cct.address);

        cct.transfer(accounts[1], 100);
        cct.transfer(accounts[2], 100);
    });

    describe("minting carbon credits and allocating to entities", async () => {

        let amountMinted = 100;

        before("sending credits to accounts[0]", async () => {
            await cc.issue(accounts[0], amountMinted);
        });

        it("sets and gets NDC", async () => {
            await cc.setTargetNDC(100);
            ndc = await cc.getTargetNDC(accounts[0]);
            assert.equal(ndc, 100);
        });

        it("issues the right number of credits to account 0", async () => {
            balance = await cc.getBalance(accounts[0]);
            // console.log("balance: ", balance);
            assert.equal(balance, amountMinted);
        });

        it("correctly measures progress toward NDC", async () => {
            ndc = await cc.getTargetNDC(accounts[0]);
            balance = await cc.getBalance(accounts[0]);
            assert.equal(ndc.toNumber(), balance.toNumber());
        })

        it("sends half of credits from account 0 to account 1", async () => {
            await cc.sendCredits(accounts[1], amountMinted / 2);
            balance0 = await cc.getBalance(accounts[0]);
            balance1 = await cc.getBalance(accounts[1]);
            assert.equal(balance0.toNumber(), balance1.toNumber());
        });

        it("sends credits from account 1 to account 2", async () => {
            await cc.sendCredits(accounts[2], 25, {from: accounts[1]});
            balance1 = await cc.getBalance(accounts[1]);
            balance2 = await cc.getBalance(accounts[2]);
            assert.equal(balance1.toNumber(), 25);
            assert.equal(balance2.toNumber(), 25);
        });

        it("complete full transaction flow", async () => {
            await cc.requestToBuy(cct.address, 10, 10);
            result = await cc.getBid(accounts[0]);
            assert.equal(result['0'].toNumber(), 10);

            // result = await cc.getBid(accounts[3]);
            // assert.equal(result['1'].toNumber(), 10);
            // console.log(amount, seller);

            await cc.fillRequest(accounts[0], {from: accounts[1]});
            balance0 = await cc.getBalance(accounts[0]);
            assert.equal(balance0.toNumber(), 60);
        })
    });

});