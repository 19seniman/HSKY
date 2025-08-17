const { ethers } = require("ethers");
const readline = require("readline");
const axios = require("axios");
require("dotenv").config();

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
};

const logger = {
    info: (msg) => console.log(`${colors.cyan}[i] ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}[!] ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}[x] ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}[+] ${msg}${colors.reset}`),
    loading: (msg) => console.log(`${colors.magenta}[*] ${msg}${colors.reset}`),
    step: (msg) => console.log(`${colors.blue}[>] ${colors.bold}${msg}${colors.reset}`),
    critical: (msg) => console.log(`${colors.red}${colors.bold}[FATAL] ${msg}${colors.reset}`),
    summary: (msg) => console.log(`${colors.green}${colors.bold}[SUMMARY] ${msg}${colors.reset}`),
    banner: () => {
        const border = `${colors.blue}${colors.bold}╔═════════════════════════════════════════╗${colors.reset}`;
        const title = `${colors.blue}${colors.bold}║      🍉 19Seniman From Insider     🍉      ║${colors.reset}`;
        const bottomBorder = `${colors.blue}${colors.bold}╚═════════════════════════════════════════╝${colors.reset}`;
        
        console.log(`\n${border}`);
        console.log(`${title}`);
        console.log(`${bottomBorder}\n`);
    },
    section: (title) => {
        const line = '─'.repeat(40);
        console.log(`\n${colors.gray}${line}${colors.reset}`);
        if (title) console.log(`${colors.white}${colors.bold} ${title} ${colors.reset}`);
        console.log(`${colors.gray}${line}${colors.reset}\n`);
    },
    countdown: (msg) => process.stdout.write(`\r${colors.blue}[⏰] ${msg}${colors.reset}`),
};


const RPC_URL = "https://testnet.hsk.xyz/";
const EXPLORER_URL = "https://testnet-explorer.hsk.xyz/";
const FAUCET_URL = "https://beeperp-server-production.up.railway.app/api/v1/marketings/claimTestCoin/";

const SWAP_CONTRACT = "0x88a62f533DdB7ACA1953a39542c7E67Eb7C919EE";
const STABLESWAP_POOL = "0xb5de5Fa6436AE3a7E396eF53E0dE0FC5208f61a4";
const HKDA_HKDB_POOL = "0x092FadF3fA0c2a721C0Ed51f4b271A0d139191b8";

const TOKENS = [
  {
    symbol: "USDT",
    address: "0x60EFCa24B785391C6063ba37fF917Ff0edEb9f4a",
    decimals: 6,
    logoURI: "https://www.hyperindex.trade/img/usdt.svg",
  },
  {
    symbol: "USDC",
    address: "0x47725537961326e4b906558BD208012c6C11aCa2",
    decimals: 6,
    logoURI: "https://equalhub-oss.4everland.store/usdc_logo.png",
  },
  {
    symbol: "HKDA",
    address: "0xE8bbE0E706EbDaB3Be224edf2FE6fFff16df1AC1",
    decimals: 18,
    logoURI: "https://equalhub.4everland.store/hkd.png",
  },
  {
    symbol: "HKDB",
    address: "0x779CA066b69F4B39cD77bA1a1C4d3c5c097A441e",
    decimals: 18,
    logoURI: "https://equalhub.4everland.store/hkda.png",
  },
  {
    symbol: "USDC-USDT-LP",
    address: STABLESWAP_POOL, 
    decimals: 18, 
    logoURI: "",
  },
];

const TRADING_PAIRS = [
  { from: 0, to: 1, name: "USDT → USDC", pool: STABLESWAP_POOL, methodId: "0x6cfccb77", type: "stable" },
  { from: 1, to: 0, name: "USDC → USDT", pool: STABLESWAP_POOL, methodId: "0x6cfccb77", type: "stable" },
  { from: 0, to: 2, name: "USDT → HKDA", pool: STABLESWAP_POOL, targetPool: HKDA_HKDB_POOL, methodId: "0x76f6dece", type: "cross" },
  { from: 1, to: 2, name: "USDC → HKDA", pool: STABLESWAP_POOL, targetPool: HKDA_HKDB_POOL, methodId: "0x76f6dece", type: "cross" },
  { from: 0, to: 3, name: "USDT → HKDB", pool: STABLESWAP_POOL, targetPool: HKDA_HKDB_POOL, methodId: "0x76f6dece", type: "cross" },
  { from: 1, to: 3, name: "USDC → HKDB", pool: STABLESWAP_POOL, targetPool: HKDA_HKDB_POOL, methodId: "0x76f6dece", type: "cross" },
  { from: 2, to: 3, name: "HKDA → HKDB", pool: HKDA_HKDB_POOL, methodId: "0x6cfccb77", type: "stable" },
  { from: 3, to: 2, name: "HKDB → HKDA", pool: HKDA_HKDB_POOL, methodId: "0x6cfccb77", type: "stable" },
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const POOL_ABI = [
  "function addLiquidity(uint256[] amounts, uint256 minToMint) returns (uint256)",
  "function removeLiquidity(uint256 amount, uint256[] minAmounts) returns (uint256[])",
];

const provider = new ethers.JsonRpcProvider(RPC_URL);

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/128.0.2739.54 Safari/537.36",
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getRandomAmount(min, max, decimals) {
  const amount = min + Math.random() * (max - min);
  return Number(amount.toFixed(decimals));
}

function getUserInput(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function loadPrivateKeys() {
  const privateKeys = [];
  let index = 1;
  while (process.env[`PRIVATE_KEY_${index}`]) {
    privateKeys.push(process.env[`PRIVATE_KEY_${index}`]);
    index++;
  }
  return privateKeys;
}

async function claimFaucet(walletAddress) {
  try {
    const response = await axios.get(`${FAUCET_URL}${walletAddress}`, {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.7",
        priority: "u=1, i",
        "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Brave\";v=\"138\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sec-gpc": "1",
        Referer: "https://www.equalhub.xyz/",
        "User-Agent": getRandomUserAgent(),
      },
    });

    if (response.data.code === 200 && response.data.message === "claim success") {
      logger.success(`Faucet claim successful for ${walletAddress}. Tx: ${response.data.txHash}`);
      return true;
    } else {
      logger.error(`Faucet claim failed for ${walletAddress}: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    logger.error(`Faucet claim failed for ${walletAddress}: ${error.message}`);
    return false;
  }
}

function createStableSwapData(poolAddress, tokenInIndex, tokenOutIndex, amountIn, minAmountOut) {
  const methodId = "0x6cfccb77";
  const poolAddressHex = ethers.zeroPadValue(poolAddress, 32);
  const tokenInIndexHex = ethers.zeroPadValue(ethers.toBeHex(tokenInIndex), 32);
  const tokenOutIndexHex = ethers.zeroPadValue(ethers.toBeHex(tokenOutIndex), 32);
  const amountInHex = ethers.zeroPadValue(ethers.toBeHex(amountIn), 32);
  const minAmountOutHex = ethers.zeroPadValue(ethers.toBeHex(minAmountOut), 32);
  return (
    methodId +
    poolAddressHex.slice(2) +
    tokenInIndexHex.slice(2) +
    tokenOutIndexHex.slice(2) +
    amountInHex.slice(2) +
    minAmountOutHex.slice(2)
  );
}

function createCrossPoolSwapData(fromPool, targetPool, tokenInIndex, tokenOutIndex, amountIn, minAmountOut) {
  const methodId = "0x76f6dece";
  const fromPoolHex = ethers.zeroPadValue(fromPool, 32);
  const offsetHex = ethers.zeroPadValue(ethers.toBeHex(160), 32);
  const targetPoolHex = ethers.zeroPadValue(targetPool, 32);
  const tokenInIndexHex = ethers.zeroPadValue(ethers.toBeHex(tokenInIndex), 32);
  const minAmountOutHex = ethers.zeroPadValue(ethers.toBeHex(minAmountOut), 32);
  const arrayLengthHex = ethers.zeroPadValue(ethers.toBeHex(2), 32);
  const tokenInIndexArrayHex = ethers.zeroPadValue(ethers.toBeHex(tokenInIndex), 32);
  const amountInHex = ethers.zeroPadValue(ethers.toBeHex(amountIn), 32);
  return (
    methodId +
    fromPoolHex.slice(2) +
    offsetHex.slice(2) +
    targetPoolHex.slice(2) +
    tokenInIndexArrayHex.slice(2) +
    minAmountOutHex.slice(2) +
    arrayLengthHex.slice(2) +
    tokenInIndexArrayHex.slice(2) +
    amountInHex.slice(2)
  );
}

function getTokenIndexForPool(tokenSymbol, poolAddress) {
  if (poolAddress === STABLESWAP_POOL) {
    switch (tokenSymbol) {
      case "USDT":
        return 0;
      case "USDC":
        return 1;
      default:
        return -1;
    }
  } else if (poolAddress === HKDA_HKDB_POOL) {
    switch (tokenSymbol) {
      case "HKDA":
        return 0;
      case "HKDB":
        return 1;
      default:
        return -1;
    }
  }
  return -1;
}

function getRandomTradingPair() {
  return TRADING_PAIRS[Math.floor(Math.random() * TRADING_PAIRS.length)];
}

async function performSwap(wallet, tokenAmount, selectedPair) {
  try {
    const fromToken = TOKENS[selectedPair.from];
    const toToken = TOKENS[selectedPair.to];

    const fromContract = new ethers.Contract(fromToken.address, ERC20_ABI, wallet);

    const formattedAmount = Number(tokenAmount.toFixed(fromToken.decimals));
    const amountInWei = ethers.parseUnits(formattedAmount.toString(), fromToken.decimals);

    const balance = await fromContract.balanceOf(wallet.address);
    if (balance < amountInWei) {
      logger.error(
        `Insufficient ${fromToken.symbol} balance. Required: ${formattedAmount}, Available: ${ethers.formatUnits(
          balance,
          fromToken.decimals
        )}`
      );
      return false;
    }

    const currentAllowance = await fromContract.allowance(wallet.address, SWAP_CONTRACT);
    if (currentAllowance < amountInWei) {
      logger.loading(`Approving ${fromToken.symbol} spending for swap contract...`);
      const approveTx = await fromContract.approve(SWAP_CONTRACT, ethers.parseUnits("999999", fromToken.decimals));
      await approveTx.wait();
      logger.success("Token approval successful");
    }

    const minAmountOut = ethers.parseUnits((formattedAmount * 0.95).toFixed(toToken.decimals), toToken.decimals);

    let swapData;
    if (selectedPair.type === "stable") {
      const tokenInIndex = getTokenIndexForPool(fromToken.symbol, selectedPair.pool);
      const tokenOutIndex = getTokenIndexForPool(toToken.symbol, selectedPair.pool);
      if (tokenInIndex === -1 || tokenOutIndex === -1) {
        logger.error(`Invalid token indices for pool ${selectedPair.pool}`);
        return false;
      }
      swapData = createStableSwapData(selectedPair.pool, tokenInIndex, tokenOutIndex, amountInWei, minAmountOut);
    } else {
      const tokenInIndex = getTokenIndexForPool(fromToken.symbol, selectedPair.pool);
      if (tokenInIndex === -1) {
        logger.error(`Invalid token index for source pool ${selectedPair.pool}`);
        return false;
      }
      swapData = createCrossPoolSwapData(
        selectedPair.pool,
        selectedPair.targetPool,
        tokenInIndex,
        selectedPair.to,
        amountInWei,
        minAmountOut
      );
    }

    logger.loading(`Swapping ${formattedAmount} ${fromToken.symbol} to ${toToken.symbol}...`);

    const swapTx = await wallet.sendTransaction({
      to: SWAP_CONTRACT,
      data: swapData,
      gasLimit: 700000,
      gasPrice: ethers.parseUnits("1.5", "gwei"),
    });

    logger.loading(`Transaction sent: ${swapTx.hash}`);
    const receipt = await swapTx.wait();

    if (receipt.status === 1) {
      logger.success(`Swap successful! ${fromToken.symbol} → ${toToken.symbol}`);
      logger.info(`Tx: ${EXPLORER_URL}tx/${swapTx.hash}`);
      return true;
    } else {
      logger.error("Swap transaction failed");
      return false;
    }
  } catch (error) {
    logger.error(`Swap failed: ${error.message}`);
    return false;
  }
}

async function addLiquidity(wallet, usdcAmount, usdtAmount) {
  try {
    const usdcToken = TOKENS[1]; 
    const usdtToken = TOKENS[0]; 
    const poolContract = new ethers.Contract(STABLESWAP_POOL, POOL_ABI, wallet);

    const formattedUsdcAmount = Number(usdcAmount.toFixed(6));
    const formattedUsdtAmount = Number(usdtAmount.toFixed(6));
    const usdcAmountWei = ethers.parseUnits(formattedUsdcAmount.toString(), usdcToken.decimals);
    const usdtAmountWei = ethers.parseUnits(formattedUsdtAmount.toString(), usdtToken.decimals);
    const amounts = [usdtAmountWei, usdcAmountWei, 0, 0]; 
    const minToMint = 0; 

    const usdcContract = new ethers.Contract(usdcToken.address, ERC20_ABI, wallet);
    const usdtContract = new ethers.Contract(usdtToken.address, ERC20_ABI, wallet);
    const usdcBalance = await usdcContract.balanceOf(wallet.address);
    const usdtBalance = await usdtContract.balanceOf(wallet.address);

    if (usdcBalance < usdcAmountWei) {
      logger.error(
        `Insufficient USDC balance. Required: ${formattedUsdcAmount}, Available: ${ethers.formatUnits(
          usdcBalance,
          usdcToken.decimals
        )}`
      );
      return false;
    }
    if (usdtBalance < usdtAmountWei) {
      logger.error(
        `Insufficient USDT balance. Required: ${formattedUsdtAmount}, Available: ${ethers.formatUnits(
          usdtBalance,
          usdtToken.decimals
        )}`
      );
      return false;
    }

    const usdcAllowance = await usdcContract.allowance(wallet.address, STABLESWAP_POOL);
    if (usdcAllowance < usdcAmountWei) {
      logger.loading(`Approving USDC spending for pool contract...`);
      const approveUsdcTx = await usdcContract.approve(STABLESWAP_POOL, ethers.parseUnits("999999", usdcToken.decimals));
      await approveUsdcTx.wait();
      logger.success("USDC approval successful");
    }

    const usdtAllowance = await usdtContract.allowance(wallet.address, STABLESWAP_POOL);
    if (usdtAllowance < usdtAmountWei) {
      logger.loading(`Approving USDT spending for pool contract...`);
      const approveUsdtTx = await usdtContract.approve(STABLESWAP_POOL, ethers.parseUnits("999999", usdtToken.decimals));
      await approveUsdtTx.wait();
      logger.success("USDT approval successful");
    }

    logger.loading(`Adding liquidity: ${formattedUsdcAmount} USDC and ${formattedUsdtAmount} USDT...`);

    const addLiquidityTx = await poolContract.addLiquidity(amounts, minToMint, {
      gasLimit: 150000, 
      gasPrice: ethers.parseUnits("0.001000253", "gwei"), 
    });

    logger.loading(`Transaction sent: ${addLiquidityTx.hash}`);
    const receipt = await addLiquidityTx.wait();

    if (receipt.status === 1) {
      logger.success(`Liquidity added successfully! ${formattedUsdcAmount} USDC and ${formattedUsdtAmount} USDT`);
      logger.info(`Tx: ${EXPLORER_URL}tx/${addLiquidityTx.hash}`);
      return true;
    } else {
      logger.error("Add liquidity transaction failed");
      return false;
    }
  } catch (error) {
    logger.error(`Add liquidity failed: ${error.message}`);
    return false;
  }
}

async function removeLiquidity(wallet, lpAmount) {
  try {
    const lpToken = TOKENS[4]; 
    const poolContract = new ethers.Contract(STABLESWAP_POOL, POOL_ABI, wallet);

    const formattedLpAmount = Number(lpAmount.toFixed(18));
    const lpAmountWei = ethers.parseUnits(formattedLpAmount.toString(), lpToken.decimals);
    const minAmounts = [0, 0, 0, 0]; 

    const lpContract = new ethers.Contract(lpToken.address, ERC20_ABI, wallet);
    const lpBalance = await lpContract.balanceOf(wallet.address);
    if (lpBalance < lpAmountWei) {
      logger.error(
        `Insufficient LP token balance. Required: ${formattedLpAmount}, Available: ${ethers.formatUnits(
          lpBalance,
          lpToken.decimals
        )}`
      );
      return false;
    }

    const lpAllowance = await lpContract.allowance(wallet.address, STABLESWAP_POOL);
    if (lpAllowance < lpAmountWei) {
      logger.loading(`Approving LP token spending for pool contract...`);
      const approveLpTx = await lpContract.approve(STABLESWAP_POOL, ethers.parseUnits("999999", lpToken.decimals));
      await approveLpTx.wait();
      logger.success("LP token approval successful");
    }

    logger.loading(`Removing liquidity: ${formattedLpAmount} USDC-USDT-LP...`);

    const removeLiquidityTx = await poolContract.removeLiquidity(lpAmountWei, minAmounts, {
      gasLimit: 150000, 
      gasPrice: ethers.parseUnits("0.001000253", "gwei"),
    });

    logger.loading(`Transaction sent: ${removeLiquidityTx.hash}`);
    const receipt = await removeLiquidityTx.wait();

    if (receipt.status === 1) {
      logger.success(`Liquidity removed successfully! ${formattedLpAmount} USDC-USDT-LP`);
      logger.info(`Tx: ${EXPLORER_URL}tx/${removeLiquidityTx.hash}`);
      return true;
    } else {
      logger.error("Remove liquidity transaction failed");
      return false;
    }
  } catch (error) {
    logger.error(`Remove liquidity failed: ${error.message}`);
    return false;
  }
}

async function executeTransactions(privateKeys, swapTxCount, addLiquidityTxCount, removeLiquidityTxCount) {
  let totalSuccess = 0;
  let totalFailed = 0;

  for (let i = 0; i < privateKeys.length; i++) {
    const wallet = new ethers.Wallet(privateKeys[i], provider);
    logger.section(`Processing Wallet ${i + 1}/${privateKeys.length}: ${wallet.address}`);

    logger.loading(`Claiming faucet for ${wallet.address}...`);
    await claimFaucet(wallet.address); 

    if (swapTxCount > 0) {
      for (let j = 0; j < swapTxCount; j++) {
        const selectedPair = getRandomTradingPair();
        const swapAmount = getRandomAmount(0.001, 0.002, TOKENS[selectedPair.from].decimals);
        logger.info(
          `Swap tx ${j + 1}/${swapTxCount} for wallet ${i + 1} | ${swapAmount} ${TOKENS[selectedPair.from].symbol} (${selectedPair.name})`
        );
        const success = await performSwap(wallet, swapAmount, selectedPair);
        if (success) {
          totalSuccess++;
        } else {
          totalFailed++;
        }
        if (j < swapTxCount - 1) {
          logger.loading("Waiting 2 seconds before next transaction...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    if (addLiquidityTxCount > 0) {
      for (let j = 0; j < addLiquidityTxCount; j++) {
        const liquidityAmount = getRandomAmount(0.01, 0.02, 6); 
        logger.info(
          `Add liquidity tx ${j + 1}/${addLiquidityTxCount} for wallet ${i + 1} | ${liquidityAmount} USDC/USDT`
        );
        const success = await addLiquidity(wallet, liquidityAmount, liquidityAmount);
        if (success) {
          totalSuccess++;
        } else {
          totalFailed++;
        }
        if (j < addLiquidityTxCount - 1) {
          logger.loading("Waiting 2 seconds before next transaction...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    if (removeLiquidityTxCount > 0) {
      for (let j = 0; j < removeLiquidityTxCount; j++) {
        const lpAmount = getRandomAmount(0.01, 0.02, 18); 
        logger.info(
          `Remove liquidity tx ${j + 1}/${removeLiquidityTxCount} for wallet ${i + 1} | ${lpAmount} USDC-USDT-LP`
        );
        const success = await removeLiquidity(wallet, lpAmount);
        if (success) {
          totalSuccess++;
        } else {
          totalFailed++;
        }
        if (j < removeLiquidityTxCount - 1) {
          logger.loading("Waiting 2 seconds before next transaction...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    if (i < privateKeys.length - 1) {
      logger.loading("Waiting 3 seconds before next wallet...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  
  logger.section();
  logger.summary(`Transaction batch completed. Success: ${totalSuccess}, Failed: ${totalFailed}`);
}

async function displayCountdown(nextRunTime) {
  while (Date.now() < nextRunTime) {
    const remainingMs = nextRunTime - Date.now();
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
    logger.countdown(`Next run in ${hours}h ${minutes}m ${seconds}s `);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  process.stdout.write("\n");
}

async function main() {
  logger.banner();
  try {
    const privateKeys = loadPrivateKeys();
    if (privateKeys.length === 0) {
      logger.critical("No private keys found in .env file");
      logger.info("Please add private keys in format: PRIVATE_KEY_1=your_key_here");
      return;
    }
    logger.info(`Loaded ${privateKeys.length} wallet(s)`);

    const swapTxCount = await getUserInput("Enter number of daily swap transactions per wallet: ");
    const addLiquidityTxCount = await getUserInput("Enter number of daily add liquidity transactions per wallet: ");
    const removeLiquidityTxCount = await getUserInput(
      "Enter number of daily remove liquidity transactions per wallet: "
    );

    if (isNaN(parseInt(swapTxCount)) || parseInt(swapTxCount) < 0) {
      logger.error("Invalid swap transaction count");
      return;
    }
    if (isNaN(parseInt(addLiquidityTxCount)) || parseInt(addLiquidityTxCount) < 0) {
      logger.error("Invalid add liquidity transaction count");
      return;
    }
    if (isNaN(parseInt(removeLiquidityTxCount)) || parseInt(removeLiquidityTxCount) < 0) {
      logger.error("Invalid remove liquidity transaction count");
      return;
    }

    const swapTxCountNum = parseInt(swapTxCount);
    const addLiquidityTxCountNum = parseInt(addLiquidityTxCount);
    const removeLiquidityTxCountNum = parseInt(removeLiquidityTxCount);

    while (true) {
      logger.section("Starting Daily Transactions");
      await executeTransactions(privateKeys, swapTxCountNum, addLiquidityTxCountNum, removeLiquidityTxCountNum);

      const now = new Date();
      // Schedule the next run for 24 hours from now
      const nextRunTime = now.getTime() + 24 * 60 * 60 * 1000;
      const nextRunDate = new Date(nextRunTime);

      logger.info(`Next run scheduled at ${nextRunDate.toLocaleString()}`);
      await displayCountdown(nextRunTime);
    }
  } catch (error) {
    logger.critical(`An unexpected error occurred: ${error.message}`);
  }
}

main().catch(console.error);
