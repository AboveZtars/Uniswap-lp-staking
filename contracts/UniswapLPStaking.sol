//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.7;

///Contracts
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
///Interfaces
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
///Libraries
import "./Library/UniswapV2Library.sol";

///Hardhat
import "hardhat/console.sol";

contract UniswapLPStaking is OwnableUpgradeable {
  using SafeERC20Upgradeable for IERC20Upgradeable;
  address private constant FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
  address private constant ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
  IUniswapV2Router02 public constant uniswapRouterV2 =
    IUniswapV2Router02(ROUTER);
  
  IUniswapV2Factory public constant uniswapFactoryV2 =
    IUniswapV2Factory(FACTORY);

  ///Main functions
  function addAndStake(
    address _tokenA,
    address _tokenB,
    uint256 _amountA,
    uint256 _amountB
  ) public {
    ///Liquidity

    ///Specifying the right amount of tokens to send before add to the LP
    (uint amountAToLP,uint amountBToLP) = getAmountOfTokens(_tokenA,_tokenB,_amountA,_amountB); 
    IERC20Upgradeable(_tokenA).safeTransferFrom(msg.sender, address(this), amountAToLP);
    IERC20Upgradeable(_tokenB).safeTransferFrom(msg.sender, address(this), amountBToLP);

    IERC20Upgradeable(_tokenA).safeApprove(ROUTER, amountAToLP);
    IERC20Upgradeable(_tokenB).safeApprove(ROUTER, amountBToLP);

    (uint256 amountA, uint256 amountB, uint256 liquidity) = uniswapRouterV2
      .addLiquidity(
        _tokenA,
        _tokenB,
        amountAToLP,
        amountBToLP,
        1,
        1,
        address(this),
        block.timestamp
      );

    console.log("The lp tokens are: ",liquidity);
    ///Stake
  }

  function withdrawReward() public {}

  ///Functions
  function swap() public {}

  function getAmountOfTokens(
    address _tokenA,
    address _tokenB,
    uint256 _amountA,
    uint256 _amountB
  ) public view returns(uint amountAOptimal,uint amountBOptimal){
    address pair = uniswapFactoryV2.getPair(_tokenA, _tokenB);
    
    (uint reserveA, uint reserveB) = UniswapV2Library.getReserves(pair, _tokenA, _tokenB);

    if(_amountA == 0){
      uint amountAOptimal = UniswapV2Library.quote(_amountB, reserveB, reserveA);
      return (amountAOptimal,_amountB);
    }
    if(_amountB == 0){
      uint amountBOptimal = UniswapV2Library.quote(_amountA, reserveA, reserveB);
      return (_amountA,amountBOptimal);
    }
    
  }
}
