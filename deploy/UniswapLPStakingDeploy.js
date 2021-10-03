const { constants } = require("@openzeppelin/test-helpers");
const ArepaTokenAddress = "0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const LINK = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
const ETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; //This is WETH
const DAI_LINK_PAIR = "0x6D4fd456eDecA58Cf53A8b586cd50754547DBDB2";
const DAI_ETH_PAIR = "0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11";
const genericErc20Abi = require("../Abis/ERC20.json");

//provider
const provider = ethers.provider;

//accepted Contracts
erc20ContractDAI = new ethers.Contract(DAI, genericErc20Abi, provider);
erc20ContractLINK = new ethers.Contract(LINK, genericErc20Abi, provider);

daiEthPairContract = new ethers.Contract(
  DAI_ETH_PAIR,
  genericErc20Abi,
  provider
);

dailinkPairContract = new ethers.Contract(
  DAI_LINK_PAIR,
  genericErc20Abi,
  provider
);
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  //deploying staking contract
  await deploy("UniswapLPStaking", {
    from: deployer,

    Proxy: {
      owner: deployer,
      proxyContract: "OpenZeppelinTransparentProxy",
      viaAdminContract: "DefaultProxyAdmin",
    },
    log: true,
  });

  let UniswapLPStaking = await deployments.get("UniswapLPStaking");
  UniswapLPStaking = await ethers.getContractAt(
    "UniswapLPStaking",
    UniswapLPStaking.address
  );
  await UniswapLPStaking.initialize(
    ArepaTokenAddress,
    deployer,
    "100000000000000000000",
    "13224139",
    "13324139"
  );
  await UniswapLPStaking.add("1", DAI_LINK_PAIR, false);
  await UniswapLPStaking.add("1", DAI_ETH_PAIR, false);
  const accounts = await ethers.getSigners();
  //Approve for all accounts
  for (let i = 0; i < 10; i++) {
    await erc20ContractDAI
      .connect(accounts[i])
      .approve(UniswapLPStaking.address, constants.MAX_UINT256.toString());

    await erc20ContractLINK
      .connect(accounts[i])
      .approve(UniswapLPStaking.address, constants.MAX_UINT256.toString());
  }
  
  ArepaToken = await ethers.getContractAt("ArepaToken", ArepaTokenAddress);
  //setting staking contract as owner of reward token for minting
  await ArepaToken.transferOwnership(UniswapLPStaking.address);
};
module.exports.tags = ["UniswapLPStaking"];
