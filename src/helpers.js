export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'
export const GREEN = 'success'
export const RED = 'danger'

export const DECIMALS = BigInt(10**18)

export function weiToEther(wei) {
  if (typeof wei !== 'bigint') {
    wei = BigInt(wei);
  }
  return Number(wei) / Number(DECIMALS);
}

export function formatBalance(balance, decimals = 4) {
  if (typeof balance === 'string' || typeof balance === 'number') {
    // If balance is already a string or number, assume it's in ether and just format it
    return Number(balance).toFixed(decimals);
  }
  
  if (typeof balance !== 'bigint') {
    try {
      balance = BigInt(balance);
    } catch (error) {
      console.error('Error converting balance to BigInt:', error);
      return '0.0000';
    }
  }
  
  const ether = weiToEther(balance);
  return ether.toFixed(decimals);
}

export function ether(wei) {
  return weiToEther(wei);
}

export const tokens = ether
