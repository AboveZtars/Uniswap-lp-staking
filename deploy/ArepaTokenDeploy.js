const UniswapLPStakingAddress = "0xFD471836031dc5108809D173A067e8486B9047A3"
module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  await deploy('ArepaToken', {
    from: deployer,
    args:[],
    log: true,
  });

};
module.exports.tags = ['ArepaToken'];