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
};

const loggerTheme = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgGray: "\x1b[100m",
};

const fancyBox = (title, subtitle) => {
  console.log(`${loggerTheme.cyan}${loggerTheme.bold}`);
  console.log('╔══════════════════════════════════════════════╗');
  console.log(`║  ${title.padEnd(42)}  ║`);
  if (subtitle) {
    console.log(`║  ${subtitle.padEnd(42)}  ║`);
  }
  console.log('╚══════════════════════════════════════════════╝');
  console.log(loggerTheme.reset);
};

const logger = {
  info: (msg) => console.log(`${loggerTheme.blue}[ ℹ INFO ] → ${msg}${loggerTheme.reset}`),
  warn: (msg) => console.log(`${loggerTheme.yellow}[ ⚠ WARNING ] → ${msg}${loggerTheme.reset}`),
  error: (msg) => console.log(`${loggerTheme.red}[ ✖ ERROR ] → ${msg}${loggerTheme.reset}`),
  success: (msg) => console.log(`${loggerTheme.green}[ ✔ DONE ] → ${msg}${loggerTheme.reset}`),
  loading: (msg) => console.log(`${loggerTheme.cyan}[ ⌛ LOADING ] → ${msg}${loggerTheme.reset}`),
  step: (msg) => console.log(`${loggerTheme.magenta}[ ➔ STEP ] → ${msg}${loggerTheme.reset}`),
  banner: () => fancyBox('🚀 Hashkey Terminal Logger', '— Airdrop Tracker —'),
};

const RPC_URL = "https://testnet.hsk.xyz/";
const EXPLORER_URL = "https://testnet-explorer.hsk.xyz/";
const FAUCET_URL = "https://beeperp-server-production.up.railway.app/api/v1/marketings/claimTestCoin/";

const SWAP_CONTRACT = "0x88a62f533DdB7ACA1953a39542c7E67Eb7C919EE";
const STABLESWAP_POOL = "0xb5de5Fa6436AE3a7E396eF53E0dE0FC5208f61a4";

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
];

const TRADING_PAIRS = [
  { from: 0, to: 1, name: "USDT → USDC", pool: STABLESWAP_POOL, methodId: "0x6cfccb77", type: "stable" },
  { from: 1, to: 0, name: "USDC → USDT", pool: STABLESWAP_POOL, methodId: "0x6cfccb77", type: "stable" },
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
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

    const tokenInIndex = getTokenIndexForPool(fromToken.symbol, selectedPair.pool);
    const tokenOutIndex = getTokenIndexForPool(toToken.symbol, selectedPair.pool);
    
    if (tokenInIndex === -1 || tokenOutIndex === -1) {
      logger.error(`Invalid token indices for pool ${selectedPair.pool}`);
      return false;
    }
    
    const swapData = createStableSwapData(selectedPair.pool, tokenInIndex, tokenOutIndex, amountInWei, minAmountOut);

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
      logger.success(`Tx: ${EXPLORER_URL}tx/${swapTx.hash}`);
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

async function executeTransactions(privateKeys, swapTxCount) {
  let totalSuccess = 0;
  let totalFailed = 0;

  for (let i = 0; i < privateKeys.length; i++) {
    const wallet = new ethers.Wallet(privateKeys[i], provider);
    logger.step(`Processing wallet ${i + 1}/${privateKeys.length}: ${wallet.address}`);

    logger.loading(`Claiming faucet for ${wallet.address}...`);
    await claimFaucet(wallet.address);

    for (let j = 0; j < swapTxCount; j++) {
      const selectedPair = getRandomTradingPair();
      const swapAmount = getRandomAmount(0.001, 0.002, TOKENS[selectedPair.from].decimals);
      logger.info(
        `Swap transaction ${j + 1}/${swapTxCount} for wallet ${i + 1} with ${swapAmount} ${TOKENS[selectedPair.from].symbol} (${selectedPair.name})`
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

    if (i < privateKeys.length - 1) {
      logger.loading("Waiting 3 seconds before next wallet...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  logger.step(`Transaction batch completed. Success: ${totalSuccess}, Failed: ${totalFailed}`);
}

async function displayCountdown(nextRunTime) {
  while (Date.now() < nextRunTime) {
    const remainingMs = nextRunTime - Date.now();
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
    process.stdout.write(`\r${colors.cyan}[⟳] Next run in ${hours}h ${minutes}m ${seconds}s${colors.reset}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  process.stdout.write("\n");
}

async function main() {
  logger.banner();
  try {
    const privateKeys = loadPrivateKeys();
    if (privateKeys.length === 0) {
      logger.error("No private keys found in .env file");
      logger.info("Please add private keys in format: PRIVATE_KEY_1=your_key_here");
      return;
    }
    logger.info(`Loaded ${privateKeys.length} wallet(s)`);

    const swapTxCount = await getUserInput("Enter number of daily swap transactions per wallet (USDT/USDC only): ");

    if (isNaN(parseInt(swapTxCount)) || parseInt(swapTxCount) < 0) {
      logger.error("Invalid swap transaction count");
      return;
    }

    const swapTxCountNum = parseInt(swapTxCount);

    while (true) {
      logger.info("Starting daily USDT/USDC swap transactions...");
      await executeTransactions(privateKeys, swapTxCountNum);

      const now = new Date();
      const nextDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const nextRunTime = nextDay.getTime();
      logger.info(`Next run scheduled at ${nextDay.toUTCString()}`);
      await displayCountdown(nextRunTime);
    }
  } catch (error) {
    logger.error(`Error: ${error.message}`);
  }
}

main().catch(console.error);
