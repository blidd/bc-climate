const CarbonCredit = artifacts.require("CarbonCredit");
const CarbonCreditToken = artifacts.require("CarbonCreditToken");

module.exports = function (deployer) {
  deployer.deploy(CarbonCredit);
  deployer.deploy(CarbonCreditToken, "Carbon Credit Token", "cct", 18);
};
