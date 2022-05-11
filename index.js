const fs = require('fs');
const contract = require('@truffle/contract');

const Web3 = require('web3');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const jsonParser = bodyParser.json();


// instantiate contracts
function instantiateContract(provider, name) {
    var artifact = fs.readFileSync(`build/contracts/${name}.json`);
    var newContract = contract(JSON.parse(artifact));
    newContract.setProvider(provider);
    return newContract;
}

// get all accounts
async function getAccounts(app) {
    let error, accounts = await app.locals.web3.eth.getAccounts();
    if (error) {
        console.log(error); 
        return [];
    }
    return accounts;
}

const itmoRouter = express.Router();

// view all NDCs
itmoRouter.route('/ndc').get((req, res) => {
    res.status(200).send('hello ndc');
})

// view a participant's NDC
itmoRouter.route('/ndc/:address').get(async (req, res) => {
    let instance = await app.locals.ccContract.deployed();
    ndc = await instance.getTargetNDC.call(req.params.address);
    res.status(200).send({ndc: ndc.toNumber()});
})

// allow participants to declare or edit their NDCs
itmoRouter.route('/ndc/:address').post(jsonParser, async (req, res) => {
    if (req.body.goal === undefined) {
        res.status(300).send({status: 300, message: "Please specify an NDC goal (int)"});
        return;
    }
    let instance = await app.locals.ccContract.deployed();
    try {
        await instance.setTargetNDC(req.body.goal, {from: req.params.address});
        res.status(200).send({status: 200});
    } catch (e) {
        console.error(e);
        res.status(500).send({
            status: 500, 
            message: "InternalServerError"
        });
    }
})

// view all ITMO balances
itmoRouter.route('/balance').get((req, res) => {
    res.status(200).send('hello balances');
})

// view a participant's balance
itmoRouter.route('/balance/:address').get(async (req, res) => {
    let instance = await app.locals.ccContract.deployed();
    try {
        balance = await instance.getBalance.call(req.params.address);
        res.status(200).send({balance: balance.toNumber()});
    } catch (e) {
        console.error(e);
        res.status(500).send({
            status: 500, 
            message: "InternalServerError"
        });
    }
});

itmoRouter.route('/bid/:address').get(async (req, res) => {
    let instance = await app.locals.ccContract.deployed();
    try {
        let result = await instance.getBid.call(req.params.address);
        console.log(result['0'].toNumber());
        res.status(200).send({
            amount: result['0'].toNumber(),
            price: result['1'].toNumber(),
            seller: result['2'],
        });
    } catch (e) {
        console.error(e);
        res.status(400).send({
            status: 400,
            message: `member with address ${req.params.address } does not have a bid`
        });
    }
});

itmoRouter.route('/bid/:address').post(jsonParser, async (req, res) => {
    if (req.body.amount === undefined || req.body.price === undefined) {
        res.status(300).send({status: 300, message: "Please specify all required args"});
        return;
    }
    let cc = await app.locals.ccContract.deployed();
    let cct = await app.locals.cctContract.deployed();
    try {
        await cc.requestToBuy(
            cct.address, 
            req.body.amount, 
            req.body.price, 
            {from: req.params.address}
        );
        // console.log(address);
        res.status(200).send({});
    } catch (e) {
        console.error(e);
        res.status(500).send({
            status: 500,
            message: "InternalServerError"
        });
    }
});

itmoRouter.route('/bid/:address/accept').post(jsonParser, async (req, res) => {
    if (req.body.acceptor === undefined) {
        res.status(300).send({status: 300, message: "Please specify all required args"});
        return;
    }
    let cc = await app.locals.ccContract.deployed();
    try {
        await cc.fillRequest(req.params.address, {from: req.body.acceptor});
        res.status(200).send({msg: "bid accepted"});
    } catch (e) {
        console.error(e);
        res.status(500).send({
            status: 500,
            message: "InternalServerError"
        });
    }
});

itmoRouter.route('/issue').post(jsonParser, async (req, res) => {
    if (req.body.issuer === undefined || req.body.address === undefined || req.body.amount === undefined) {
        res.status(300).send({status: 300, message: "Please specify all required args"});
        return;
    }
    let instance = await app.locals.ccContract.deployed();
    try {
        await instance.issue(req.body.address, req.body.amount, {from: req.body.issuer});
        res.status(200).send({});
    } catch (e) {
        console.error(e);
        res.status(500).send({
            status: 500, 
            message: "InternalServerError"
        });
    }
})

itmoRouter.route('/join').post(jsonParser, async (req, res) => {
    if (req.body.address === undefined) {
        res.status(300).send({status: 300, message: "Please specify all required args"});
        return;
    }
    let cc = await app.locals.ccContract.deployed();
    let cct = await app.locals.cctContract.deployed();
    try {
        await cc.join(cct.address, {from: req.body.address});
        res.status(200).send({msg: "success"});
    } catch (e) {
        console.error(e);
        res.status(500).send({
            status: 500, 
            message: "InternalServerError"
        });
    }
});

itmoRouter.route('/participant/:address').get(async (req, res) => {
    let cc = await app.locals.ccContract.deployed();
    let result = await cc.isParticipant.call(req.params.address);
    console.log(result);
    res.status(200).send({});
});

const tokenRouter = express.Router();

tokenRouter.route('/transfer').post(jsonParser, async (req, res) => {
    if (req.body.from === undefined || req.body.to === undefined || req.body.value === undefined) {
        res.status(300).send({status: 300, message: "Please specify all required args"});
        return;
    }
    let instance = await app.locals.cctContract.deployed();
    try {
        await instance.transfer(req.body.to, req.body.value, {from: req.body.from});
        res.status(200).send({message: "success"});
    } catch (e) {
        console.error(e);
        res.status(500).send({
            status: 500, 
            message: "InternalServerError"
        });
    }
});

tokenRouter.route('/balance').get(jsonParser, async (req, res) => {
    if (req.body.owner === undefined) {
        res.status(300).send({status: 300, message: "Please specify all required args"});
        return;
    }
    let instance = await app.locals.cctContract.deployed();
    try {
        let balance = await instance.balanceOf.call(req.body.owner);
        res.status(200).send({owner: req.body.owner, balance: balance.toNumber()});
    } catch (e) {
        console.error(e);
        res.status(500).send({
            status: 500, 
            message: "InternalServerError"
        });
    }
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.use('/itmo', itmoRouter);
app.use('/token', tokenRouter);

app.listen(3000, async () => {
    app.locals.provider = new Web3.providers.HttpProvider("http://127.0.0.1:7545");
    app.locals.ccContract = instantiateContract(app.locals.provider, "CarbonCredit");
    app.locals.cctContract = instantiateContract(app.locals.provider, "CarbonCreditToken");
    app.locals.web3 = new Web3(app.locals.provider);
    // let result = await instance.getYear.call();
    // console.log("RESULT: ", result.toNumber());

    // let accounts = await getAccounts(app);
    // console.log("accounts: ", accounts);

    console.log(`API listening on port 3000`);
})