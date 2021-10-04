const { expect } = require("chai");
const { ethers, upgrades, deployments, getNamedAccounts } = require("hardhat");

const { signERC2612Permit } = require("eth-permit");

//For regular use
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const LINK = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
const ETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; //This is WETH
const DAI_ETH_PAIR = "0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11";
const DAI_LINK_PAIR = "0x6D4fd456eDecA58Cf53A8b586cd50754547DBDB2";

//provider
const provider = ethers.provider;

describe("Staking contract", function () {
  let ArepaToken;
  let UniswapLPStaking;
  let accounts;
  let ToolV2;
  // let blockNumber;
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

    await deployments.fixture(["UniswapLPStaking", "ToolV2", "ArepaToken"])

    ArepaToken = await deployments.get("ArepaToken")
    ArepaToken = await ethers.getContractAt("ArepaToken", ArepaToken.address)


    UniswapLPStaking = await deployments.get("UniswapLPStaking")
    UniswapLPStaking = await ethers.getContractAt("UniswapLPStaking", UniswapLPStaking.address)
    

    ToolV2 = await deployments.get("ToolV2")
    ToolV2 = await ethers.getContractAt("ToolV2", ToolV2.address)

  });

  describe("Initialization", function() {

    it("Should set the right owner", async function() {
      expect(await UniswapLPStaking.owner()).to.equal(accounts[0].address)
    })

    it("Should set right arepaToken, arepaReward per block, startblock and bonusEndBlock", async function() {
      expect(await UniswapLPStaking.arepa()).to.equal(ArepaToken.address)
      expect(await UniswapLPStaking.arepaPerBlock()).to.equal("100000000000000000000")
      expect(await UniswapLPStaking.startBlock()).to.equal("13224139")
      expect(await UniswapLPStaking.bonusEndBlock()).to.equal("13324139")
    })
  })

  describe("Adding pools to the staking contract", function() {
    it("Should correctly set first pool Dai/Link", async function() {
      let dai_link_pool = await UniswapLPStaking.poolInfo("0")
      expect(dai_link_pool.lpToken).to.equal(DAI_LINK_PAIR)
      expect(dai_link_pool.allocPoint).to.equal(1)
      expect(dai_link_pool.lastRewardBlock).to.be.above(0)
      expect(dai_link_pool.accArepaPerShare).to.equal(0)
      expect(await UniswapLPStaking.lpTokenPid0()).to.equal(DAI_LINK_PAIR)
      expect(await UniswapLPStaking.pairPid(DAI_LINK_PAIR)).to.equal(0)
    })

    it("Should correctly set a second pool Dai/Eth", async function(){
      let dai_eth_pool = await UniswapLPStaking.poolInfo("1")
      expect(dai_eth_pool.lpToken).to.equal(DAI_ETH_PAIR)
      expect(dai_eth_pool.allocPoint).to.equal(1)
      expect(dai_eth_pool.lastRewardBlock).to.be.above(0)
      expect(dai_eth_pool.accArepaPerShare).to.equal(0)
      expect(await UniswapLPStaking.lpTokenPid0()).to.equal(DAI_LINK_PAIR)
      expect(await UniswapLPStaking.pairPid(DAI_ETH_PAIR)).to.equal(1)
    })
  })

  describe("Obtaining amounts to add liquidity", function() {
    it("Checking the return of the amount of DAI and LINK giving just the LINK amount", async function () {
      const [amountA, amountB] = await UniswapLPStaking.getAmountOfTokens(
        DAI,
        LINK,
        0,
        ethers.utils.parseUnits("500.0", 18)
      );
      expect(amountA).to.be.equal("14557956332385352007911");
      expect(amountB).to.be.equal(ethers.utils.parseUnits("500.0", 18));
    });
  
    it("Checking the return of the amount of DAI and LINK giving just the DAI amount", async function () {
      const [amountA, amountB] = await UniswapLPStaking.getAmountOfTokens(
        DAI,
        LINK,
        ethers.utils.parseUnits("500.0", 18),
        0
      );
      expect(amountA).to.be.equal(ethers.utils.parseUnits("500.0", 18));
      expect(amountB).to.be.equal("17172740066808331331");
    });
  })

  describe("Adding liquidity and staking", function() {
    it("Expect Uniswap to add liquidity in dai/link pool and deposit LP tokens in contract", async function () {
      expect(
        await UniswapLPStaking.addAndStake(
          DAI,
          LINK,
          ethers.utils.parseUnits("500.0", 18),
          0
        )
      )
      .to.emit(UniswapLPStaking, "Deposit")
      .withArgs(accounts[0].address, "0", "86478886041831351436");
      let user = await UniswapLPStaking.userInfo("0", accounts[0].address)
      expect(user.amount).to.equal("86478886041831351436")
    });
  
    it("Expect Uniswap to add liquidity in dai/link and deposit LP tokens to the same pool", async function () {
  
      await expect(
        await UniswapLPStaking.addAndStake(
          DAI,
          LINK,
          ethers.utils.parseUnits("500.0", 18),
          0
        )
      )
      .to.emit(UniswapLPStaking, "Deposit")
      .withArgs(accounts[0].address, "0", "86478886041831351436");
      let user = await UniswapLPStaking.userInfo("0", accounts[0].address)
      expect(user.amount).to.be.above("86478886041831351436")
    });
    
  
    it("Expect Uniswap to add liquidity in dai/eth and deposit LP tokens in contract", async function () {
  
      expect(
        await UniswapLPStaking.addAndStake(
          ETH,
          DAI,
          ethers.utils.parseEther("1"),
          0,
          { value: ethers.utils.parseEther("1") }
        )
      )
      .to.emit(UniswapLPStaking, "Deposit")
      .withArgs(accounts[0].address, "1", "37735151535759053557");
      let user = await UniswapLPStaking.userInfo("1", accounts[0].address)
      expect(user.amount).to.equal("37735151535759053557")
    });

    it("Expect Uniswap to add liquidity in dai/eth and deposit LP tokens to the same pool", async function () {

      expect(
        await UniswapLPStaking.addAndStake(
          ETH,
          DAI,
          ethers.utils.parseEther("1"),
          0,
          { value: ethers.utils.parseEther("1") }
        )
      )
      .to.emit(UniswapLPStaking, "Deposit")
      .withArgs(accounts[0].address, "1", "37735151535759053557");
      let user = await UniswapLPStaking.userInfo("1", accounts[0].address)
      expect(user.amount).to.be.above("37735151535759053557")
    });
  })

  describe("Adding liquidity only", function() {
    it("Should give LPTokens to user", async function() {
        await UniswapLPStaking.connect(accounts[1]).addLiquidityOnly(
          ETH,
          DAI,
          ethers.utils.parseEther("1"),
          0,
          { value: ethers.utils.parseEther("1") }
        )
        let lpTokenBalance = await daiEthPairContract.balanceOf(accounts[1].address)
        console.log(`Balance user 1: ${lpTokenBalance}`)
        expect(lpTokenBalance).to.equal("37735151535759053557")
    })
  })
  
  describe("Staking LPToken only", function(){
    it("Checking deposit to staking contract", async function () {
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
          ethers.utils.parseUnits("100"),
          "569897003934800000000"
        );
  
      let finalBalance = await ArepaToken.balanceOf(staker.address);
      expect(finalBalance).to.equal("569897003934800000000")
    });
  })
  
  describe("Staking with permit only", function() {
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
          result.s
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
      .to.emit(UniswapLPStaking, "Withdraw");
      
      let lpTokenbalance = await daiEthPairContract.balanceOf(accounts[0].address)
      expect(lpTokenbalance).to.equal(ethers.utils.parseUnits("100"))
      let finalBalanceOwner = await ArepaToken.balanceOf(accounts[0].address)
      //the balance of AREPAs is diferent than the amount of the event because on each new deposit the contract automatically transfer the 
      //pending AREPAs to the msg.sender
      expect(finalBalanceOwner).to.equal("4430102996064794690231")
    });
  })
  
});
