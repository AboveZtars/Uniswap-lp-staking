// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
// THE SELECTION OF A TOKEN AND THE PERCENTAGE MUST BE DONE IN THE FRONTEND OR TESTING SCRIPT

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "hardhat/console.sol";
//IERC20 for testing Purposes, know the balances of the tokens
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ToolV2 {
    /* IUniswapV2Router02 public constant uniswapRouterV2 = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D); */
    ISwapRouter public constant uniswapRouterV3 =
        ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);

    //WETH TOKEN ADDRESS
    address internal constant WETH9 =
        0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    //ToolV2 function
    function swapForPercentageV2(
        uint256[] memory percentage,
        address[] memory tokenAddress,
        string[] memory protocol
    ) external payable {
        string memory UNISWAP_V3 = "Uniswap_V3";
        require(msg.value > 0, "Must pass non 0 ETH amount");
        require(percentage[0] <= 100, "Must be 0 or greater"); // overflow - underflow guard

        uint256 balance = msg.value;

        ISwapRouter.ExactInputSingleParams memory params1 = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: WETH9,
                tokenOut: tokenAddress[0], // change this one for testing
                fee: 3000,
                recipient: msg.sender,
                deadline: block.timestamp + 15,
                amountIn: (balance * percentage[0]) / 100,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        ISwapRouter.ExactInputSingleParams memory params2 = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: WETH9,
                tokenOut: tokenAddress[1], // change this one for testing
                fee: 3000,
                recipient: msg.sender,
                deadline: block.timestamp + 15,
                amountIn: (balance * (100 - percentage[0])) / 100,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
        //UNISWAP V3 protocols
        if (
            keccak256(abi.encodePacked((protocol[0]))) ==
            keccak256(abi.encodePacked((UNISWAP_V3)))
        ) {
            swapUNIV3((balance * percentage[0]) / 100, params1);
        }
        if (
            keccak256(abi.encodePacked((protocol[1]))) ==
            keccak256(abi.encodePacked((UNISWAP_V3)))
        ) {
            swapUNIV3((balance * (100 - percentage[0])) / 100, params2);
            //sendFee(dexFee);
        }
    }

    function swapUNIV3(
        uint256 valueForTx,
        ISwapRouter.ExactInputSingleParams memory params
    ) private {
        uniswapRouterV3.exactInputSingle{value: valueForTx}(params);
    }
}
