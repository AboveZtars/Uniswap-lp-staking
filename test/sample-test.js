const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { constants } = require("@openzeppelin/test-helpers");
const genericErc20Abi = require("./ERC20/ERC20.json");
const { signERC2612Permit } = require("eth-permit");

//For regular use
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const LINK = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
const ETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; //This is WETH
const source1 = "Uniswap_V3";
const source2 = "Uniswap_V3";
const DAI_ETH_PAIR = "0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11";
const DAI_LINK_PAIR = "0x6D4fd456eDecA58Cf53A8b586cd50754547DBDB2";

//provider
const provider = ethers.provider;

describe("Just a test", function () {
  let ArepaToken;
  let UniswapLPStaking;
  let accounts;
  let blockNumber;
  let staker;

  before("deploy UniswapLPStaking", async () => {
    //impersonating a DAI/ETH UNI LP Token holder
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x79317fC0fB17bC0CE213a2B50F343e4D4C277704"],
    });
    //setting his balance to 1000 ETH
    await network.provider.send("hardhat_setBalance", [
      "0x79317fC0fB17bC0CE213a2B50F343e4D4C277704",
      "0x3635c9adc5dea00000",
    ]);
    staker = await ethers.getSigner(
      "0x79317fC0fB17bC0CE213a2B50F343e4D4C277704"
    );

    accounts = await ethers.getSigners();
    blockNumber = await provider.getBlockNumber();

    //deploying reward token
    console.log("Deploying ArepaToken smart contract");
    const ArepaTokenFactory = await ethers.getContractFactory("ArepaToken");
    ArepaToken = await ArepaTokenFactory.deploy();
    await ArepaToken.deployed();

    //deploying staking contract
    console.log("Deploying UniswapLPStaking smart contract");
    const UniswapLPStakingFactory = await ethers.getContractFactory(
      "UniswapLPStaking"
    );
    UniswapLPStaking = await upgrades.deployProxy(UniswapLPStakingFactory, [
      ArepaToken.address,
      accounts[0].address,
      ethers.utils.parseUnits("1.0", 18),
      blockNumber,
      blockNumber + 100000,
    ]);

    //Swapper tool to get Tokens
    const ToolV2Factory = await ethers.getContractFactory("ToolV2");
    ToolV2 = await ToolV2Factory.deploy();
    await ToolV2.deployed();

    //setting staking contract as owner of reward token for minting
    await ArepaToken.transferOwnership(UniswapLPStaking.address);

    //accepted Contracts
    erc20ContractDAI = new ethers.Contract(DAI, genericErc20Abi, provider);

    erc20ContractUSDC = new ethers.Contract(USDC, genericErc20Abi, provider);

    erc20ContractUSDT = new ethers.Contract(USDT, genericErc20Abi, provider);

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
  });

  it("Checking the return of the amount of DAI and LINK giving just the LINK amount 1", async function () {
    const [amountA, amountB] = await UniswapLPStaking.getAmountOfTokens(
      DAI,
      LINK,
      0,
      "500000000000000000000"
    );
    expect(amountA).to.be.equal("14557956332385352007911");
    expect(amountB).to.be.equal("500000000000000000000");
  });
  it("Checking the return of the amount of DAI and LINK giving just the DAI 2", async function () {
    const [amountA, amountB] = await UniswapLPStaking.getAmountOfTokens(
      DAI,
      LINK,
      "500000000000000000000",
      0
    );
    expect(amountA).to.be.equal("500000000000000000000");
    expect(amountB).to.be.equal("17172740066808331331");
  });

  it("Expect Uniswap to add liquidity and deposit LP tokens in a new pool (pool 1)", async function () {
    let value = "100000000000000000000";
    const result = await signERC2612Permit(
      provider,
      dailinkPairContract.address,
      accounts[0].address,
      UniswapLPStaking.address,
      value
    );

    await expect(
      await UniswapLPStaking.addAndStake(
        DAI,
        LINK,
        "500000000000000000000",
        0,
        result.v,
        result.r,
        result.s
      )
    )
      .to.emit(UniswapLPStaking, "Deposit")
      .withArgs(accounts[0].address, "0", "86478886041831351436");
  });

  it("Expect Uniswap to add liquidity and deposit LP tokens to the same pool (pool 1)", async function () {
    let value = "100000000000000000000";
    const result = await signERC2612Permit(
      provider,
      dailinkPairContract.address,
      accounts[0].address,
      UniswapLPStaking.address,
      value
    );
    console.log(result.v);
    console.log(result.r);
    console.log(result.s);
    await expect(
      await UniswapLPStaking.addAndStake(
        DAI,
        LINK,
        "500000000000000000000",
        0,
        result.v,
        result.r,
        result.s
      )
    )
      .to.emit(UniswapLPStaking, "Deposit")
      .withArgs(accounts[0].address, "0", "86478886041831351436");
  });

  it("Expect Uniswap to add liquidity and deposit LP tokens in a new pool (pool 2)", async function () {
    let value = "100000000000000000000";
    const result = await signERC2612Permit(
      provider,
      daiEthPairContract.address,
      accounts[0].address,
      UniswapLPStaking.address,
      value
    );
    console.log(result.v);
    console.log(result.r);
    console.log(result.s);
    expect(
      await UniswapLPStaking.addAndStake(
        ETH,
        DAI,
        ethers.utils.parseEther("1"),
        0,
        result.v,
        result.r,
        result.s,
        { value: ethers.utils.parseEther("1") }
      )
    )
      .to.emit(UniswapLPStaking, "Deposit")
      .withArgs(accounts[0].address, "1", "37735151535759053557");
  });

  it("Checking deposit to contract staking", async function () {
    await daiEthPairContract
      .connect(staker)
      .approve(UniswapLPStaking.address, ethers.utils.parseUnits("100.0", 18));

    expect(
      await UniswapLPStaking.connect(staker).deposit(
        "1",
        ethers.utils.parseUnits("100.0", 18),
        true
      )
    )
      .to.emit(UniswapLPStaking, "Deposit")
      .withArgs(staker.address, "1", ethers.utils.parseEther("100"));
  });

  it("Expect Uniswap to add liquidity and deposit LP tokens to the same pool (pool 2)", async function () {
    let value = "100000000000000000000";
    const result = await signERC2612Permit(
      provider,
      daiEthPairContract.address,
      accounts[0].address,
      UniswapLPStaking.address,
      value
    );
    expect(
      await UniswapLPStaking.addAndStake(
        ETH,
        DAI,
        ethers.utils.parseEther("1"),
        0,
        result.v,
        result.r,
        result.s,
        { value: ethers.utils.parseEther("1") }
      )
    )
      .to.emit(UniswapLPStaking, "Deposit")
      .withArgs(accounts[0].address, "1", "37735151535759053557");
  });
  it("Checking withdraw rewards after a period of time", async function () {
    await network.provider.send("evm_increaseTime", [1200]);
    await network.provider.send("evm_mine");

    expect(
      await UniswapLPStaking.connect(staker).withdraw(
        "1",
        ethers.utils.parseUnits("100.0", 18)
      )
    )
      .to.emit(UniswapLPStaking, "Withdraw")
      .withArgs(
        staker.address,
        "1",
        ethers.utils.parseEther("100"),
        "8548455058900000000"
      );

    let finalBalance = await ArepaToken.balanceOf(staker.address);
    console.log(`Staker successfully mint: ${finalBalance} AREPA`);
    console.log("The first arepaTokens ever!!!");

    let lpTokenBalance = await daiEthPairContract.balanceOf(staker.address);
    console.log(`Staker DAI/ETH UNI LP Tokens balance: ${lpTokenBalance}`);
  });
  it("Should stake with DAI/ETH UNI LP Token with permit", async function () {
    await daiEthPairContract
      .connect(staker)
      .transfer(accounts[0].address, ethers.utils.parseUnits("100.0", 18));

    let value = "100000000000000000000";
    const result = await signERC2612Permit(
      provider,
      daiEthPairContract.address,
      accounts[0].address,
      UniswapLPStaking.address,
      value
    );

    expect(
      await UniswapLPStaking.depositWithPermit(
        "1",
        value,
        result.deadline,
        result.v,
        result.r,
        result.s,
        true
      )
    )
      .to.emit(UniswapLPStaking, "Deposit")
      .withArgs(accounts[0].address, "1", "100000000000000000000");
  });

  it("Checking withdraw rewards after a LONG period of time", async function () {
    await network.provider.send("evm_increaseTime", [38245236]);
    await network.provider.send("evm_mine");

    expect(
      await UniswapLPStaking.withdraw("1", ethers.utils.parseUnits("100.0", 18))
    )
      .to.emit(UniswapLPStaking, "Withdraw")
      .withArgs(
        accounts[0].address,
        "1",
        ethers.utils.parseEther("100"),
        "9999999999914724576"
      );
  });
});
