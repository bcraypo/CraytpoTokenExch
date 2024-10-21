import Web3 from 'web3'
import {
  web3Loaded,
  web3AccountLoaded,
  tokenLoaded,
  exchangeLoaded,
  cancelledOrdersLoaded,
  filledOrdersLoaded,
  allOrdersLoaded,
  orderCancelling,
  orderCancelled,
  orderFilling,
  orderFilled,
  etherBalanceLoaded,
  tokenBalanceLoaded,
  exchangeEtherBalanceLoaded,
  exchangeTokenBalanceLoaded,
  balancesLoaded,
  balancesLoading,
  buyOrderMaking,
  sellOrderMaking,
  orderMade
} from './actions'
import Token from '../abis/Token.json'
import Exchange from '../abis/Exchange.json'
import { ETH_ADDRESS } from '../helpers'

export const loadWeb3 = async (dispatch) => {
  if(typeof window.ethereum!=='undefined'){
    const web3 = new Web3(window.ethereum)
    dispatch(web3Loaded(web3))
    return web3
  } else {
    window.alert('Please install MetaMask')
    window.location.assign("https://metamask.io/")
  }
}

export const loadAccount = async (web3, dispatch) => {
  const accounts = await web3.eth.getAccounts()
  const account = await accounts[0]
  if(typeof account !== 'undefined'){
    dispatch(web3AccountLoaded(account))
    return account
  } else {
    window.alert('Please login with MetaMask')
    return null
  }
}

export const loadToken = async (web3, networkId, dispatch) => {
  try {
    const token = new web3.eth.Contract(Token.abi, Token.networks[networkId].address)
    dispatch(tokenLoaded(token))
    return token
  } catch (error) {
    console.log('Contract not deployed to the current network. Please select another network with Metamask.')
    return null
  }
}

export const loadExchange = async (web3, networkId, dispatch) => {
  try {
    const exchange = new web3.eth.Contract(Exchange.abi, Exchange.networks[networkId].address)
    dispatch(exchangeLoaded(exchange))
    return exchange
  } catch (error) {
    console.log('Contract not deployed to the current network. Please select another network with Metamask.')
    return null
  }
}

export const loadAllOrders = async (exchange, dispatch) => {
  // Fetch cancelled orders with the "Cancel" event stream
  const cancelStream = await exchange.getPastEvents('Cancel', { fromBlock: 0, toBlock: 'latest' })
  // Format cancelled orders
  const cancelledOrders = cancelStream.map((event) => event.returnValues)
  // Add cancelled orders to the redux store
  dispatch(cancelledOrdersLoaded(cancelledOrders))

  // Fetch filled orders with the "Trade" event stream
  const tradeStream = await exchange.getPastEvents('Trade', { fromBlock: 0, toBlock: 'latest' })
  // Format filled orders
  const filledOrders = tradeStream.map((event) => event.returnValues)
  // Add cancelled orders to the redux store
  dispatch(filledOrdersLoaded(filledOrders))

  // Load order stream
  const orderStream = await exchange.getPastEvents('Order', { fromBlock: 0,  toBlock: 'latest' })
  // Format order stream
  const allOrders = orderStream.map((event) => event.returnValues)
  // Add open orders to the redux store
  dispatch(allOrdersLoaded(allOrders))
}

export const subscribeToEvents = async (exchange, dispatch) => {
  exchange.events.Cancel({}, (error, event) => {
    dispatch(orderCancelled(event.returnValues))
  })

  exchange.events.Trade({}, (error, event) => {
    dispatch(orderFilled(event.returnValues))
  })

  exchange.events.Deposit({}, (error, event) => {
    dispatch(balancesLoaded())
  })

  exchange.events.Withdraw({}, (error, event) => {
    dispatch(balancesLoaded())
  })

  exchange.events.Order({}, (error, event) => {
    dispatch(orderMade(event.returnValues))
  })
}

export const cancelOrder = (dispatch, exchange, order, account) => {
  return new Promise((resolve, reject) => {
    exchange.methods.cancelOrder(order.id).send({ from: account })
    .on('transactionHash', (hash) => {
       dispatch(orderCancelling())
    })
    .on('receipt', async (receipt) => {
       dispatch(orderCancelled(order))
       await loadAllOrders(exchange, dispatch)
       await loadBalances(dispatch, exchange, account)
       // Remove this line:
       // dispatch(refreshComponents())
       resolve() // Resolve the promise when the transaction is complete
    })
    .on('error', (error) => {
      console.error(error)
      window.alert('There was an error!')
      dispatch({ type: 'ORDER_CANCEL_FAILED' })
      reject(error) // Reject the promise if there's an error
    })
  })
}

export const fillOrder = (dispatch, exchange, order, account) => {
  return new Promise((resolve, reject) => {
    exchange.methods.fillOrder(order.id).send({ from: account })
    .on('transactionHash', (hash) => {
       dispatch(orderFilling())
    })
    .on('receipt', async (receipt) => {
      dispatch(orderFilled(order))
      await loadAllOrders(exchange, dispatch)
      await loadBalances(dispatch, exchange, account)
      resolve()
    })
    .on('error', (error) => {
      console.error('Fill order error:', error)
      let errorMessage = 'There was an error filling the order.'
      
      if (error.message.includes('Insufficient balance for trade')) {
        errorMessage = 'Insufficient balance in your exchange account to complete this trade.'
      } else if (error.message.includes('Internal JSON-RPC error')) {
        errorMessage = 'Insufficient funds in your exchange account to complete this trade.'
      }
      
      window.alert(errorMessage)
      dispatch({ type: 'ORDER_FILL_FAILED' })
      reject(error)
    })
  })
}

export const loadBalances = async (dispatch, web3, exchange, token, account) => {
  if (!web3 || !account) {
    console.error('Web3 or account not initialized');
    return;
  }

  try {
    // Ether balance in wallet
    const etherBalance = await web3.eth.getBalance(account)
    dispatch(etherBalanceLoaded(etherBalance))

    // Token balance in wallet
    if (token && token.methods) {
      const tokenBalance = await token.methods.balanceOf(account).call()
      dispatch(tokenBalanceLoaded(tokenBalance))
    } else {
      console.warn('Token contract not initialized or missing methods');
    }

    // Ether balance in exchange
    if (exchange && exchange.methods) {
      const exchangeEtherBalance = await exchange.methods.balanceOf(ETH_ADDRESS, account).call()
      dispatch(exchangeEtherBalanceLoaded(exchangeEtherBalance))

      // Token balance in exchange
      if (token && token.options && token.options.address) {
        const exchangeTokenBalance = await exchange.methods.balanceOf(token.options.address, account).call()
        dispatch(exchangeTokenBalanceLoaded(exchangeTokenBalance))
      } else {
        console.warn('Token contract not fully initialized');
      }
    } else {
      console.warn('Exchange contract not initialized or missing methods');
    }

    dispatch(balancesLoaded())
  } catch (error) {
    console.error('Error loading balances:', error)
    dispatch(balancesLoaded())  // Dispatch this to reset loading state even if there's an error
  }
}

export const depositEther = (dispatch, exchange, web3, amount, account) => {
  return new Promise((resolve, reject) => {
    if (!exchange || !exchange.methods || !web3 || !account) {
      console.error('Exchange, web3, or account not properly initialized');
      reject(new Error('Exchange, web3, or account not properly initialized'));
      return;
    }

    exchange.methods.depositEther().send({ from: account, value: web3.utils.toWei(amount, 'ether') })
      .on('transactionHash', (hash) => {
        dispatch(balancesLoading())
      })
      .on('receipt', async (receipt) => {
        await loadBalances(dispatch, web3, exchange, null, account)
        resolve()
      })
      .on('error', (error) => {
        console.error('Error depositing Ether:', error)
        dispatch(balancesLoaded())
        reject(error)
      })
  })
}

export const withdrawEther = (dispatch, exchange, web3, token, amount, account) => {
  exchange.methods.withdrawEther(web3.utils.toWei(amount, 'ether'))
    .send({ from: account })
    .on('transactionHash', (hash) => {
      dispatch(balancesLoading())
    })
    .on('receipt', async (receipt) => {
      await loadBalances(dispatch, web3, exchange, token, account)
    })
    .on('error',(error) => {
      console.error(error)
      window.alert(`There was an error!`)
      dispatch(balancesLoaded())
    })
}

export const depositToken = (dispatch, exchange, web3, token, amount, account) => {
  amount = web3.utils.toWei(amount, 'ether')

  return new Promise((resolve, reject) => {
    token.methods.approve(exchange.options.address, amount).send({ from: account })
      .on('transactionHash', (hash) => {
        exchange.methods.depositToken(token.options.address, amount).send({ from: account })
          .on('transactionHash', (hash) => {
            dispatch(balancesLoading())
          })
          .on('receipt', async (receipt) => {
            await loadBalances(dispatch, web3, exchange, token, account)
            resolve()
          })
          .on('error',(error) => {
            console.error(error)
            window.alert(`There was an error!`)
            dispatch(balancesLoaded())
            reject(error)
          })
      })
      .on('error', (error) => {
        console.error(error)
        window.alert(`There was an error with the token approval!`)
        reject(error)
      })
  })
}

export const withdrawToken = (dispatch, exchange, web3, token, amount, account) => {
  return new Promise((resolve, reject) => {
    exchange.methods.withdrawToken(token.options.address, web3.utils.toWei(amount, 'ether'))
      .send({ from: account })
      .on('transactionHash', (hash) => {
        dispatch(balancesLoading())
      })
      .on('receipt', async (receipt) => {
        await loadBalances(dispatch, web3, exchange, token, account)
        resolve()
      })
      .on('error',(error) => {
        console.error(error)
        window.alert(`There was an error!`)
        dispatch(balancesLoaded())
        reject(error)
      })
  })
}

export const makeBuyOrder = (dispatch, exchange, token, web3, order, account) => {
  const tokenGet = token.options.address
  const amountGet = web3.utils.toWei(order.amount, 'ether')
  const tokenGive = ETH_ADDRESS
  const amountGive = web3.utils.toWei((order.amount * order.price).toString(), 'ether')

  exchange.methods.makeOrder(tokenGet, amountGet, tokenGive, amountGive).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(buyOrderMaking())
    dispatch(balancesLoading())
  })
  .on('receipt', async (receipt) => {
    dispatch(orderMade(receipt.events.Order.returnValues))
    await loadBalances(dispatch, web3, exchange, token, account)
    await loadAllOrders(exchange, dispatch)
  })
  .on('error',(error) => {
    console.error(error)
    window.alert(`There was an error!`)
    dispatch({ type: 'BUY_ORDER_MAKING_ERROR' })
    dispatch(balancesLoaded())  // Reset loading state in case of error
  })
}

export const makeSellOrder = (dispatch, exchange, token, web3, order, account) => {
  const tokenGet = ETH_ADDRESS
  const amountGet = web3.utils.toWei((order.amount * order.price).toString(), 'ether')
  const tokenGive = token.options.address
  const amountGive = web3.utils.toWei(order.amount, 'ether')

  exchange.methods.makeOrder(tokenGet, amountGet, tokenGive, amountGive).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(sellOrderMaking())
    dispatch(balancesLoading())
  })
  .on('receipt', async (receipt) => {
    dispatch(orderMade(receipt.events.Order.returnValues))
    await loadBalances(dispatch, web3, exchange, token, account)
    await loadAllOrders(exchange, dispatch)
  })
  .on('error',(error) => {
    console.error(error)
    window.alert(`There was an error!`)
    dispatch({ type: 'SELL_ORDER_MAKING_ERROR' })
    dispatch(balancesLoaded())  // Reset loading state in case of error
  })
}
