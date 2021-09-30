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