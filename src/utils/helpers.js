// Convert wei to ether
export function weiToEther(wei) {
  if (typeof wei !== 'bigint') {
    wei = BigInt(wei);
  }
  return Number(wei) / 1e18;
}

// Format balance
export function formatBalance(balance, decimals = 4) {
  if (typeof balance !== 'bigint') {
    balance = BigInt(balance);
  }
  const ether = weiToEther(balance);
  return ether.toFixed(decimals);
}

// If you have an ether function, modify it like this:
export function ether(wei) {
  return weiToEther(wei);
}
