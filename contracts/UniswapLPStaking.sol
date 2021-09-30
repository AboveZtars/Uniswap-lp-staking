//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.7;

///Reward Token
import "./ArepaToken.sol";
///Contracts
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
///Interfaces
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol";
///Libraries
import "./Library/UniswapV2Library.sol";

///Hardhat
import "hardhat/console.sol";

contract UniswapLPStaking is OwnableUpgradeable {
  using SafeMathUpgradeable for uint256;

  event addLiquidityInfo(uint256 LPtokens);

  using SafeERC20Upgradeable for IERC20Upgradeable;
  address private constant FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
  address private constant ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
  address private constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
  IUniswapV2Router02 public constant uniswapRouterV2 =
    IUniswapV2Router02(ROUTER);

  IUniswapV2Factory public constant uniswapFactoryV2 =
    IUniswapV2Factory(FACTORY);

  struct UserInfo {
    uint256 amount; // How many LP tokens the user has provided.
    uint256 rewardDebt; // Reward debt. See explanation below.
    //
    // We do some fancy math here. Basically, any point in time, the amount of SUSHIs
    // entitled to a user but is pending to be distributed is:
    //
    //   pending reward = (user.amount * pool.accSushiPerShare) - user.rewardDebt
    //
    // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
    //   1. The pool's `accSushiPerShare` (and `lastRewardBlock`) gets updated.
    //   2. User receives the pending reward sent to his/her address.
    //   3. User's `amount` gets updated.
    //   4. User's `rewardDebt` gets updated.
  }
  // Info of each pool.
  struct PoolInfo {
    IERC20Upgradeable lpToken; // Address of LP token contract.
    uint256 allocPoint; // How many allocation points assigned to this pool. SUSHIs to distribute per block.
    uint256 lastRewardBlock; // Last block number that SUSHIs distribution occurs.
    uint256 accSushiPerShare; // Accumulated SUSHIs per share, times 1e12. See below.
  }
  // The SUSHI TOKEN!
  ArepaToken public sushi;
  // Dev address.
  address public devaddr;
  // Block number when bonus SUSHI period ends.
  uint256 public bonusEndBlock;
  // SUSHI tokens created per block.
  uint256 public sushiPerBlock;
  // Bonus muliplier for early sushi makers.
  uint256 public constant BONUS_MULTIPLIER = 10;
  // Info of each pool.
  PoolInfo[] public poolInfo;
  // Info of pid of the pairs
  mapping(address => uint256) public pairPid;
  // Info of each user that stakes LP tokens.
  mapping(uint256 => mapping(address => UserInfo)) public userInfo;
  // Total allocation poitns. Must be the sum of all allocation points in all pools.
  uint256 public totalAllocPoint;
  // The block number when SUSHI mining starts.
  uint256 public startBlock;
  // First lp token
  address public lpTokenPid0;
  event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
  event Withdraw(
    address indexed user,
    uint256 indexed pid,
    uint256 amount,
    uint256 pending
  );
  event EmergencyWithdraw(
    address indexed user,
    uint256 indexed pid,
    uint256 amount
  );

  function initialize(
    ArepaToken _sushi,
    address _devaddr,
    uint256 _sushiPerBlock,
    uint256 _startBlock,
    uint256 _bonusEndBlock
  ) public initializer {
    OwnableUpgradeable.__Ownable_init();
    sushi = _sushi;
    devaddr = _devaddr;
    sushiPerBlock = _sushiPerBlock;
    bonusEndBlock = _bonusEndBlock;
    startBlock = _startBlock;
    totalAllocPoint = 0;
  }

  ///Main functions
  function addAndStake(
    address _tokenA,
    address _tokenB,
    uint256 _amountA,
    uint256 _amountB
  ) public payable {
    ///Liquidity
    address _token;
    uint256 amountTokenDesired;
    uint256 liquidityScope;

    if (msg.value > 0) {
      if (_tokenA == WETH) {
        _token = _tokenB;
        amountTokenDesired = _amountB;
      }
      if (_tokenB == WETH) {
        _token = _tokenA;
        amountTokenDesired = _amountA;
      }

      (, uint256 amountTokenToLP) = getAmountOfTokens(
        WETH,
        _token,
        msg.value,
        amountTokenDesired
      );
      IERC20Upgradeable(_token).safeTransferFrom(
        msg.sender,
        address(this),
        amountTokenToLP
      );
      IERC20Upgradeable(_token).safeApprove(ROUTER, amountTokenToLP);
      (, , uint256 liquidity) = uniswapRouterV2.addLiquidityETH{
        value: msg.value
      }(_token, amountTokenToLP, 1, 1, address(this), block.timestamp);
      liquidityScope = liquidity;
    } else {
      ///Specifying the right amount of tokens to send before add to the LP
      (uint256 amountAToLP, uint256 amountBToLP) = getAmountOfTokens(
        _tokenA,
        _tokenB,
        _amountA,
        _amountB
      );
      IERC20Upgradeable(_tokenA).safeTransferFrom(
        msg.sender,
        address(this),
        amountAToLP
      );
      IERC20Upgradeable(_tokenB).safeTransferFrom(
        msg.sender,
        address(this),
        amountBToLP
      );

      IERC20Upgradeable(_tokenA).safeApprove(ROUTER, amountAToLP);
      IERC20Upgradeable(_tokenB).safeApprove(ROUTER, amountBToLP);

      (, , uint256 liquidity) = uniswapRouterV2.addLiquidity(
        _tokenA,
        _tokenB,
        amountAToLP,
        amountBToLP,
        1,
        1,
        address(this),
        block.timestamp
      );
      liquidityScope = liquidity;
    }

    ///Stake
    address pair = uniswapFactoryV2.getPair(_tokenA, _tokenB);
    IERC20Upgradeable pairContract = IERC20Upgradeable(pair);
    if (pairPid[pair] == 0 && pair != lpTokenPid0) {
      if (lpTokenPid0 == address(0)) {
        lpTokenPid0 = pair;
      } //To store the first lp token in stake
      add(1, pairContract, false);
      pairPid[pair] = poolLength() - 1;
    }
    deposit(pairPid[pair], liquidityScope, false);
  }

  function justAddLiquidity(
    address _tokenA,
    address _tokenB,
    uint256 _amountA,
    uint256 _amountB
  ) public payable {
    address _token;
    uint256 amountTokenDesired;
    if (msg.value > 0) {
      if (_tokenA == WETH) {
        _token = _tokenB;
        amountTokenDesired = _amountB;
      }
      if (_tokenB == WETH) {
        _token = _tokenA;
        amountTokenDesired = _amountA;
      }

      (, uint256 amountTokenToLP) = getAmountOfTokens(
        WETH,
        _token,
        msg.value,
        amountTokenDesired
      );
      IERC20Upgradeable(_token).safeTransferFrom(
        msg.sender,
        address(this),
        amountTokenToLP
      );
      IERC20Upgradeable(_token).safeApprove(ROUTER, amountTokenToLP);
      (, , uint256 liquidity) = uniswapRouterV2.addLiquidityETH{value: msg.value}(_token, amountTokenToLP, 1, 1, msg.sender, block.timestamp);
      console.log("token just add liquidity: ",liquidity);
      emit addLiquidityInfo(liquidity);
    } else {
      ///Specifying the right amount of tokens to send before add to the LP
      (uint256 amountAToLP, uint256 amountBToLP) = getAmountOfTokens(
        _tokenA,
        _tokenB,
        _amountA,
        _amountB
      );
      IERC20Upgradeable(_tokenA).safeTransferFrom(
        msg.sender,
        address(this),
        amountAToLP
      );
      IERC20Upgradeable(_tokenB).safeTransferFrom(
        msg.sender,
        address(this),
        amountBToLP
      );

      IERC20Upgradeable(_tokenA).safeApprove(ROUTER, amountAToLP);
      IERC20Upgradeable(_tokenB).safeApprove(ROUTER, amountBToLP);

      (, , uint256 liquidity) = uniswapRouterV2.addLiquidity(
        _tokenA,
        _tokenB,
        amountAToLP,
        amountBToLP,
        1,
        1,
        msg.sender,
        block.timestamp
      );
      emit addLiquidityInfo(liquidity);
    }
  }

  function getAmountOfTokens(
    address _tokenA,
    address _tokenB,
    uint256 _amountA,
    uint256 _amountB
  ) public view returns (uint256 amountAOptimal, uint256 amountBOptimal) {
    address pair = uniswapFactoryV2.getPair(_tokenA, _tokenB);
    (uint256 reserveA, uint256 reserveB) = UniswapV2Library.getReserves(
      pair,
      _tokenA,
      _tokenB
    );

    if (_amountA == 0) {
      amountAOptimal = UniswapV2Library.quote(_amountB, reserveB, reserveA);
      return (amountAOptimal, _amountB);
    }
    if (_amountB == 0) {
      amountBOptimal = UniswapV2Library.quote(_amountA, reserveA, reserveB);
      return (_amountA, amountBOptimal);
    }
  }

  ////STAKING PART / sushiswap masterchef fork
  function poolLength() public view returns (uint256) {
    return poolInfo.length;
  }

  // Add a new lp to the pool. Can only be called by the owner.
  // XXX DO NOT add the same LP token more than once. Rewards will be messed up if you do.
  function add(
    uint256 _allocPoint,
    IERC20Upgradeable _lpToken,
    bool _withUpdate
  ) public onlyOwner {
    if (_withUpdate) {
      massUpdatePools();
    }
    uint256 lastRewardBlock = block.number > startBlock
      ? block.number
      : startBlock;
    totalAllocPoint = totalAllocPoint.add(_allocPoint);
    poolInfo.push(
      PoolInfo({
        lpToken: _lpToken,
        allocPoint: _allocPoint,
        lastRewardBlock: lastRewardBlock,
        accSushiPerShare: 0
      })
    );
  }

  // Update the given pool's SUSHI allocation point. Can only be called by the owner.
  function set(
    uint256 _pid,
    uint256 _allocPoint,
    bool _withUpdate
  ) public onlyOwner {
    if (_withUpdate) {
      massUpdatePools();
    }
    totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(
      _allocPoint
    );
    poolInfo[_pid].allocPoint = _allocPoint;
  }

  // Return reward multiplier over the given _from to _to block.
  function getMultiplier(uint256 _from, uint256 _to)
    public
    view
    returns (uint256)
  {
    if (_to <= bonusEndBlock) {
      return _to.sub(_from).mul(BONUS_MULTIPLIER);
    } else if (_from >= bonusEndBlock) {
      return _to.sub(_from);
    } else {
      return
        bonusEndBlock.sub(_from).mul(BONUS_MULTIPLIER).add(
          _to.sub(bonusEndBlock)
        );
    }
  }

  // View function to see pending SUSHIs on frontend.
  function pendingSushi(uint256 _pid, address _user)
    external
    view
    returns (uint256)
  {
    PoolInfo storage pool = poolInfo[_pid];
    UserInfo storage user = userInfo[_pid][_user];
    uint256 accSushiPerShare = pool.accSushiPerShare;
    uint256 lpSupply = pool.lpToken.balanceOf(address(this));
    if (block.number > pool.lastRewardBlock && lpSupply != 0) {
      uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
      uint256 sushiReward = multiplier
        .mul(sushiPerBlock)
        .mul(pool.allocPoint)
        .div(totalAllocPoint);
      accSushiPerShare = accSushiPerShare.add(
        sushiReward.mul(1e12).div(lpSupply)
      );
    }
    return user.amount.mul(accSushiPerShare).div(1e12).sub(user.rewardDebt);
  }

  // Update reward variables for all pools. Be careful of gas spending!
  function massUpdatePools() public {
    uint256 length = poolInfo.length;
    for (uint256 pid = 0; pid < length; ++pid) {
      updatePool(pid);
    }
  }

  // Update reward variables of the given pool to be up-to-date.
  function updatePool(uint256 _pid) public {
    PoolInfo storage pool = poolInfo[_pid];
    if (block.number <= pool.lastRewardBlock) {
      return;
    }
    uint256 lpSupply = pool.lpToken.balanceOf(address(this));
    if (lpSupply == 0) {
      pool.lastRewardBlock = block.number;
      return;
    }
    uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
    uint256 sushiReward = multiplier
      .mul(sushiPerBlock)
      .mul(pool.allocPoint)
      .div(totalAllocPoint);
    sushi.mint(address(this), sushiReward);
    pool.accSushiPerShare = pool.accSushiPerShare.add(
      sushiReward.mul(1e12).div(lpSupply)
    );
    pool.lastRewardBlock = block.number;
  }

  // Deposit LP tokens to MasterChef for SUSHI allocation.
  function deposit(
    uint256 _pid,
    uint256 _amount,
    bool transfer
  ) public {
    PoolInfo storage pool = poolInfo[_pid];
    UserInfo storage user = userInfo[_pid][msg.sender];
    updatePool(_pid);
    if (user.amount > 0) {
      uint256 pending = user.amount.mul(pool.accSushiPerShare).div(1e12).sub(
        user.rewardDebt
      );
      safeSushiTransfer(msg.sender, pending);
    }
    if (transfer) {
      pool.lpToken.safeTransferFrom(
        address(msg.sender),
        address(this),
        _amount
      );
    }
    user.amount = user.amount.add(_amount);
    user.rewardDebt = user.amount.mul(pool.accSushiPerShare).div(1e12);
    emit Deposit(msg.sender, _pid, _amount);
  }

  // Deposit LP tokens to MasterChef for SUSHI allocation with permit functionality.
  function depositWithPermit(
    uint256 _pid,
    uint256 _amount,
    uint256 _deadline,
    uint8 _v,
    bytes32 _r,
    bytes32 _s,
    bool transfer
  ) public {
    PoolInfo storage pool = poolInfo[_pid];
    UserInfo storage user = userInfo[_pid][msg.sender];
    updatePool(_pid);
    if (user.amount > 0) {
      uint256 pending = user.amount.mul(pool.accSushiPerShare).div(1e12).sub(
        user.rewardDebt
      );
      safeSushiTransfer(msg.sender, pending);
    }
    if (transfer) {
      IUniswapV2Pair(address(pool.lpToken)).permit(
        msg.sender,
        address(this),
        _amount,
        _deadline,
        _v,
        _r,
        _s
      );
      pool.lpToken.safeTransferFrom(
        address(msg.sender),
        address(this),
        _amount
      );
    }
    user.amount = user.amount.add(_amount);
    user.rewardDebt = user.amount.mul(pool.accSushiPerShare).div(1e12);
    emit Deposit(msg.sender, _pid, _amount);
  }

  // Withdraw LP tokens from MasterChef.
  function withdraw(uint256 _pid, uint256 _amount) public {
    PoolInfo storage pool = poolInfo[_pid];
    UserInfo storage user = userInfo[_pid][msg.sender];
    require(user.amount >= _amount, "withdraw: not good");
    updatePool(_pid);
    uint256 pending = user.amount.mul(pool.accSushiPerShare).div(1e12).sub(
      user.rewardDebt
    );
    safeSushiTransfer(msg.sender, pending);
    user.amount = user.amount.sub(_amount);
    user.rewardDebt = user.amount.mul(pool.accSushiPerShare).div(1e12);
    pool.lpToken.safeTransfer(address(msg.sender), _amount);
    emit Withdraw(msg.sender, _pid, _amount, pending);
  }

  // Withdraw without caring about rewards. EMERGENCY ONLY.
  function emergencyWithdraw(uint256 _pid) public {
    PoolInfo storage pool = poolInfo[_pid];
    UserInfo storage user = userInfo[_pid][msg.sender];
    pool.lpToken.safeTransfer(address(msg.sender), user.amount);
    emit EmergencyWithdraw(msg.sender, _pid, user.amount);
    user.amount = 0;
    user.rewardDebt = 0;
  }

  // Safe sushi transfer function, just in case if rounding error causes pool to not have enough SUSHIs.
  function safeSushiTransfer(address _to, uint256 _amount) internal {
    uint256 sushiBal = sushi.balanceOf(address(this));
    if (_amount > sushiBal) {
      sushi.transfer(_to, sushiBal);
    } else {
      sushi.transfer(_to, _amount);
    }
  }

  // Update dev address by the previous dev.
  function dev(address _devaddr) public {
    require(msg.sender == devaddr, "dev: wut?");
    devaddr = _devaddr;
  }

  receive() external payable {}
}
