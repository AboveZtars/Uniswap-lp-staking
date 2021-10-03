
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    //deploying reward token contract
    const ArepaToken = await deploy('ArepaToken', {
      from:deployer,
      log:true,
    })
    //deploying staking contract
    await deploy('UniswapLPStaking', {
      from: deployer,
      
      Proxy: {
        owner: deployer,
        proxyContract: "OpenZeppelinTransparentProxy",
        viaAdminContract: "DefaultProxyAdmin",
      },
      log:true,
    });
    
    let stakeInit = await deployments.get("UniswapLPStaking")
    stakeInit = await ethers.getContractAt("UniswapLPStaking", stakeInit.address)
    await stakeInit.initialize(ArepaToken.address, deployer, '100000000000000000000', '13224139', '13324139')
    //deploying swapping contract
    await deploy('ToolV2', {
      from: deployer,
      log:true,
    })

  };
  module.exports.tags = ['UniswapLPStaking'];