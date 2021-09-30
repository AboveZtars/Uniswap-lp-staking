const {hre, ethers} = require("hardhat");
const toolV2Abi = require("../Abis/ToolV2abi.json");
const genericErc20Abi = require("../Abis/ERC20.json");

const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const LINK = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
const source1 = "Uniswap_V3";
const source2 = "Uniswap_V3";

const ToolV2Address = "0xc351628EB244ec633d5f21fBD6621e1a683B1181";
//provider
const provider = ethers.provider;

ToolV2 = new ethers.Contract(
  ToolV2Address,
  toolV2Abi,
  provider
);



// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.


module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  await deploy('ToolV2', {
    from: deployer,
    args:[],
    log: true,
  });

  async function main() {
    accounts = await ethers.getSigners();
  
    //accepted Contracts
    erc20ContractDAI = new ethers.Contract(DAI, genericErc20Abi, provider);
    erc20ContractUSDC = new ethers.Contract(USDC, genericErc20Abi, provider);
    erc20ContractUSDT = new ethers.Contract(USDT, genericErc20Abi, provider);
    erc20ContractLINK = new ethers.Contract(LINK, genericErc20Abi, provider);
    
    for (let i = 0; i < 10; i++) {
      console.log("Obtaining Tokens for Testing please wait...");
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
    
  }
  main()
  .then(() => console.log("Tokens obtained"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
};
module.exports.tags = ['ToolV2'];


