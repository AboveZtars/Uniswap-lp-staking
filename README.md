# Uniswap LP Staking

Staking contract using masterchef

## Before test

Run `npm install` to install all dependencies.

## Test
# .env
Remember to add your `.env` file for testing in the root and add in the file:
```
ALCHEMY_KEY=< create one @ https://www.alchemy.com/> 
```
# ChainId
IT'S VERY IMPORTANT THAT THE CHAIN ID IS SET TO 1.
The test and the sign will fail if the chainId is set to other number, this is because of the package (eth-permit) used to get the sign.
```
 chainId: 1
```
This is Only for testing, when trying to test the frontend you will need to change the chainId to 1337.
```
 chainId: 1337
```
# Running the test 
For testing use:
```
npm run test 
```
When running the test it may take a while since it's using the deployment scripts used for the frontend, be patience.

## Design desitions
We decided to add just Two pools to our contract whithout the hability to add more, this is to keep things simple but since Masterchef contract allows the creation of more pools
this can be implemented easily. 


## Hardhat 
```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```
