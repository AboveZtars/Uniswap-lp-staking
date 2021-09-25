const { expect } = require("chai");
const { ethers } = require("hardhat");
const { constants, BN } = require("@openzeppelin/test-helpers");
const genericErc20Abi = require("./ERC20/ERC20.json");

//For regular use
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const LINK = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
const ETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; //This is WETH
const source1 = "Uniswap_V3";
const source2 = "Uniswap_V3";

describe("Just a test", function () {

  let UniswapLPStaking;
  let accounts;

  before("deploy UniswapLPStaking", async () => {
    accounts = await ethers.getSigners();
    console.log("Deploying UniswapLPStaking smart contract");
    const UniswapLPStakingFactory = await ethers.getContractFactory(
      "UniswapLPStaking"
    );
    UniswapLPStaking = await UniswapLPStakingFactory.deploy();
    await UniswapLPStaking.deployed();

    //Swapper tool to get Tokens
    const ToolV2Factory = await ethers.getContractFactory("ToolV2");
    ToolV2 = await ToolV2Factory.deploy();
    await ToolV2.deployed();


    //accepted Contracts
    erc20ContractDAI = new ethers.Contract(
      DAI,
      genericErc20Abi,
      await ethers.provider
    );

    erc20ContractUSDC = new ethers.Contract(
      USDC,
      genericErc20Abi,
      await ethers.provider
    );

    erc20ContractUSDT = new ethers.Contract(
      USDT,
      genericErc20Abi,
      await ethers.provider
    );

    erc20ContractLINK = new ethers.Contract(
      LINK,
      genericErc20Abi,
      await ethers.provider
    );

    //Obtaining DAI, USDC, USDT and LINK tokens to test transfers an all accounts
    for (let i = 0; i < 10; i++) {
      const Tx = await ToolV2.connect(accounts[i]).swapForPercentageV2(
        [50],
        [DAI, USDC],
        [source1, source2],
        { value: ethers.utils.parseEther("100") }
      );
      await Tx.wait();

      const Tx2 = await ToolV2.connect(accounts[i]).swapForPercentageV2(
        [50],
        [USDT, LINK],
        [source1, source2],
        { value: ethers.utils.parseEther("100") }
      );
      await Tx2.wait();
    }

    //Approve for all accounts
    for (let i = 0; i < 10; i++) {
      await erc20ContractDAI
        .connect(accounts[i])
        .approve(UniswapLPStaking.address, constants.MAX_UINT256.toString());

      await erc20ContractUSDC
        .connect(accounts[i])
        .approve(UniswapLPStaking.address, constants.MAX_UINT256.toString());

      await erc20ContractUSDT
        .connect(accounts[i])
        .approve(UniswapLPStaking.address, constants.MAX_UINT256.toString());
      
      await erc20ContractLINK
        .connect(accounts[i])
        .approve(UniswapLPStaking.address, constants.MAX_UINT256.toString());
    }

    // Create a transaction object for contract to pay gas fees
    /* let tx = {
      to: NoLossLottery.address,
      // Convert currency unit from ether to wei
      value: ethers.utils.parseEther("5"),
    };

    await accounts[0].sendTransaction(tx);
    // Send LINK for Chainlink VRF
    await erc20ContractLINK
      .connect(accounts[0])
      .transfer(NoLossLottery.address, "10000000000000000000"); */
  });

  it("Checking the return of the amount of DAI and LINK giving just the LINK amount 1", async function () {
    const [amountA,amountB] = await UniswapLPStaking.getAmountOfTokens(DAI,LINK,0,"500000000000000000000");
    expect(amountA).to.be.equal("14557956332385352007911");
    expect(amountB).to.be.equal("500000000000000000000");
  });
  it("Checking the return of the amount of DAI and LINK giving just the DAI 2", async function () {
    const [amountA,amountB] = await UniswapLPStaking.getAmountOfTokens(DAI,LINK,"500000000000000000000",0);
    expect(amountA).to.be.equal("500000000000000000000");
    expect(amountB).to.be.equal("17172740066808331331");
  });
  it("Expect Uniswap to emit exact DAI, LINK and LP Tokens", async function () {
    await expect(await UniswapLPStaking.addAndStake(DAI,LINK,"500000000000000000000",0))
      .to.emit(UniswapLPStaking, "addLiquidityInfo")
      .withArgs("500000000000000000000","17172740066808331331","86478886041831351436");    
  });
  it("Expect Uniswap to emit exact ETH, DAI and LP Tokens", async function () {
    expect(await UniswapLPStaking.addAndStake(ETH, DAI, ethers.utils.parseEther("1"), 0, { value: ethers.utils.parseEther("1") }))
    .to.emit(UniswapLPStaking, "addLiquidityInfo")
      .withArgs("3349223226028460328924","999999999999999999","37735151535759053557");   
  });
});
