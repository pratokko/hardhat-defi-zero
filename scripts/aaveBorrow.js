const { getNamedAccounts, ethers } = require("hardhat");

// const {getWeth, AMOUNT} = require("../scripts/getWeth")

const AMOUNT = ethers.utils.parseEther("0.02");

async function getWeth() {
  const { deployer } = await getNamedAccounts();
  const iWeth = await ethers.getContractAt(
    "IWeth",
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    ethers.provider.getSigner(deployer)
  );
  const tx = await iWeth.deposit({ value: AMOUNT });
  await tx.wait(1);
  const wethBalance = await iWeth.balanceOf(deployer);
  console.log(`got ${wethBalance.toString()} WETH`);
}

async function main() {
  await getWeth();
  const { deployer } = await getNamedAccounts();
  const lendingPool = await getLendingPool(deployer);
  console.log(`lendingPool address: ${lendingPool.address}`);
  //deposit
  const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  //approve
  await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT);
  console.log("depositing...");
  await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
  console.log("deposited!!!!!");
  let { totalDebtETH, availableBorrowsETH } = await getBorrowUserData(
    lendingPool,
    deployer
  );
  const daiPrice = await getDaiPrice();
  const amountDaiToBorrow =
    availableBorrowsETH.toString() *
    0.95 *
    (1 / parseFloat(daiPrice.toString()));
  console.log(`you can borrow ${amountDaiToBorrow} DAI`);
  const amountDaiToBorrowWei = ethers.utils.parseEther(
    amountDaiToBorrow.toString()
  );

  // availableBorrowsETH ?? what the conversion rate on DAI is
  //
  //time to borrow now
  //hiw much we have borrow , how much we have in collateral and how much we can borrow
  const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer);
  await getBorrowUserData(lendingPool, deployer)
//   await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer)

  await getBorrowUserData(lendingPool, deployer)
}


async function repay (amount, daiAddress, lendingPool, account) {
await approveErc20(daiAddress, lendingPool.address, amount, account)

const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
await repayTx.wait(1)
console.log("Repayed!!!");
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrow, account) {
  const borrowTx = await lendingPool.borrow(
    daiAddress,
    amountDaiToBorrow,
    1,
    0,
    account
  );
  await borrowTx.wait(1);
  console.log("borrowed successfully!!!!!");
}

async function getDaiPrice() {
  const daiEthPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    "0x773616E4d11A78F511299002da57A0a94577F1f4"
  );
  const roundData = await daiEthPriceFeed.latestRoundData();
  if (roundData === undefined) {
    throw new Error("Failed to retrieve latest price round data");
  }
  const price = roundData[1].toString();
  console.log(`the DAI/ETH price is ${price}`);
  return price;
}

async function getBorrowUserData(lendingPool, account) {
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account);
  console.log(`you have ${totalCollateralETH} worth of ETH deposited.`);
  console.log(`you have ${totalDebtETH} worth of ETH borrowed.`);
  console.log(`you can borrow ${availableBorrowsETH} worth of ETH .`);
  return { totalDebtETH, availableBorrowsETH };
}

async function getLendingPool(account) {
  const lendingPoolAddressesProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    ethers.provider.getSigner(account)
  );
  const lendingPoolAddress =
    await lendingPoolAddressesProvider.getLendingPool();
  const lendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPoolAddress,
    ethers.provider.getSigner(account)
  );
  return lendingPool;
}
async function approveErc20(
  erc20Address,
  spenderAddress,
  amountToSpend,
  account
) {
  const erc20Token = await ethers.getContractAt(
    "IERC20",
    erc20Address,
    account
  );
  const tx = await erc20Token.approve(spenderAddress, amountToSpend);
  await tx.wait(1);
  console.log("Approved");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
