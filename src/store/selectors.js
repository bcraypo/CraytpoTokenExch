import { get, groupBy, reject, maxBy, minBy } from 'lodash'
import { createSelector } from 'reselect'
import moment from 'moment'
import { ETH_ADDRESS, GREEN, RED, ether, tokens, formatBalance, weiToEther } from '../helpers'

// Utility functions
const createSimpleSelector = (path, defaultValue) => 
  createSelector(state => get(state, path, defaultValue), x => x)

const createLoadedSelector = (path) => createSimpleSelector(path, false)

// Basic selectors
export const accountSelector = createSimpleSelector('web3.account')
export const web3Selector = createSimpleSelector('web3.connection')
export const tokenLoadedSelector = createLoadedSelector('token.loaded')
export const tokenSelector = createSimpleSelector('token.contract')
export const exchangeLoadedSelector = createLoadedSelector('exchange.loaded')
export const exchangeSelector = createSimpleSelector('exchange.contract')

export const contractsLoadedSelector = createSelector(
  tokenLoadedSelector,
  exchangeLoadedSelector,
  (tl, el) => (tl && el)
)

// Order selectors
const allOrders = createSimpleSelector('exchange.allOrders.data', [])
const cancelledOrders = createSimpleSelector('exchange.cancelledOrders.data', [])
const filledOrders = createSimpleSelector('exchange.filledOrders.data', [])

export const cancelledOrdersLoadedSelector = createLoadedSelector('exchange.cancelledOrders.loaded')
export const cancelledOrdersSelector = cancelledOrders
export const filledOrdersLoadedSelector = createLoadedSelector('exchange.filledOrders.loaded')

// Decorator functions
const decorateOrder = (order) => {
  let { tokenGive, amountGive, tokenGet, amountGet, timestamp, id } = order
  let etherAmount, tokenAmount, tokenPrice

  if(tokenGive === ETH_ADDRESS) {
    etherAmount = amountGive
    tokenAmount = amountGet
  } else {
    etherAmount = amountGet
    tokenAmount = amountGive
  }

  // Convert to BigInt before division
  let etherAmountBN = BigInt(etherAmount)
  let tokenAmountBN = BigInt(tokenAmount)
  
  // Perform the division and convert back to a regular number
  tokenPrice = Number(etherAmountBN * BigInt(100000) / tokenAmountBN) / 100000

  // Convert BigInt values to numbers
  etherAmount = Number(etherAmount)
  tokenAmount = Number(tokenAmount)
  timestamp = Number(timestamp)
  id = Number(id)

  return {
    ...order,
    id,
    tokenGive,
    amountGive,
    tokenGet,
    amountGet,
    timestamp,
    etherAmount: weiToEther(etherAmount),
    tokenAmount: tokens(tokenAmount),
    tokenPrice,
    formattedTimestamp: moment.unix(timestamp).format('h:mm:ss a M/D')
  }
}

const decorateFilledOrder = (order, previousOrder) => ({
  ...order,
  tokenPriceClass: previousOrder.id === order.id ? GREEN :
    previousOrder.tokenPrice <= order.tokenPrice ? GREEN : RED
})

const decorateOrderBookOrder = (order) => {
  const orderType = order.tokenGive === ETH_ADDRESS ? 'buy' : 'sell'
  return {
    ...order,
    orderType,
    orderTypeClass: orderType === 'buy' ? GREEN : RED,
    orderFillAction: orderType === 'buy' ? 'sell' : 'buy'
  }
}

// Complex selectors
export const filledOrdersSelector = createSelector(
  filledOrders,
  (orders) => {
    orders = orders.sort((a,b) => Number(a.timestamp) - Number(b.timestamp))
    orders = decorateFilledOrders(orders)
    orders = orders.sort((a,b) => b.timestamp - a.timestamp)
    return orders
  }
)

const decorateFilledOrders = (orders) => {
  let previousOrder = orders[0]
  return orders.map(order => {
    order = decorateOrder(order)
    order = decorateFilledOrder(order, previousOrder)
    previousOrder = order
    return order
  })
}

const openOrders = createSelector(
  allOrders,
  filledOrders,
  cancelledOrders,
  (all, filled, cancelled) => {
    return reject(all, (order) => {
      const orderFilled = filled.some((o) => o.id === order.id)
      const orderCancelled = cancelled.some((o) => o.id === order.id)
      return(orderFilled || orderCancelled)
    })
  }
)

export const orderBookLoadedSelector = createSelector(
  cancelledOrdersLoadedSelector,
  filledOrdersLoadedSelector,
  createLoadedSelector('exchange.allOrders.loaded'),
  (cancelledLoaded, filledLoaded, allLoaded) => cancelledLoaded && filledLoaded && allLoaded
)

export const orderBookSelector = createSelector(
  openOrders,
  (orders) => {
    orders = decorateOrderBookOrders(orders)
    orders = groupBy(orders, 'orderType')
    const buyOrders = get(orders, 'buy', [])
    const sellOrders = get(orders, 'sell', [])
    return {
      ...orders,
      buyOrders: buyOrders.sort((a,b) => b.tokenPrice - a.tokenPrice),
      sellOrders: sellOrders.sort((a,b) => b.tokenPrice - a.tokenPrice)
    }
  }
)

const decorateOrderBookOrders = (orders) => {
  return orders.map((order) => {
    order = decorateOrder(order)
    order = decorateOrderBookOrder(order)
    return order
  })
}

export const myFilledOrdersLoadedSelector = filledOrdersLoadedSelector

export const myFilledOrdersSelector = createSelector(
  accountSelector,
  filledOrders,
  (account, orders) => {
    orders = orders.filter((o) => o.user === account || o.userFill === account)
    orders = orders.sort((a,b) => Number(a.timestamp) - Number(b.timestamp))
    orders = decorateMyFilledOrders(orders, account)
    return orders
  }
)

const decorateMyFilledOrders = (orders, account) => {
  return orders.map((order) => {
    order = decorateOrder(order)
    order = decorateMyFilledOrder(order, account)
    return order
  })
}

const decorateMyFilledOrder = (order, account) => {
  const myOrder = order.user === account

  let orderType
  if (myOrder) {
    // If it's my order, I'm buying tokens when I'm giving ETH
    orderType = order.tokenGive === ETH_ADDRESS ? 'buy' : 'sell'
  } else {
    // If it's not my order, I'm buying tokens when I'm getting tokens (i.e., when the other person is giving tokens)
    orderType = order.tokenGive === ETH_ADDRESS ? 'sell' : 'buy'
  }

  return {
    ...order,
    orderType,
    orderTypeClass: (orderType === 'buy') ? GREEN : RED,
    orderSign: (orderType === 'buy') ? '+' : '-'
  }
}

export const myOpenOrdersLoadedSelector = orderBookLoadedSelector

export const myOpenOrdersSelector = createSelector(
  accountSelector,
  openOrders,
  (account, orders) => {
    orders = orders.filter((o) => o.user === account)
    orders = decorateMyOpenOrders(orders)
    orders = orders.sort((a,b) => Number(b.timestamp) - Number(a.timestamp))
    return orders
  }
)

const decorateMyOpenOrders = (orders) => {
  return orders.map((order) => {
    order = decorateOrder(order)
    order = decorateMyOpenOrder(order)
    return order
  })
}

const decorateMyOpenOrder = (order) => {
  const orderType = order.tokenGive === ETH_ADDRESS ? 'buy' : 'sell'
  return {
    ...order,
    orderType,
    orderTypeClass: orderType === 'buy' ? GREEN : RED
  }
}

export const priceChartLoadedSelector = filledOrdersLoadedSelector

export const priceChartSelector = createSelector(
  filledOrders,
  (orders) => {
    // Sort orders by timestamp
    orders = orders.sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
    orders = orders.map(decorateOrder)
    const [secondLastOrder, lastOrder] = orders.slice(-2)
    const lastPrice = get(lastOrder, 'tokenPrice', 0)
    const secondLastPrice = get(secondLastOrder, 'tokenPrice', 0)

    return {
      lastPrice,
      lastPriceChange: lastPrice >= secondLastPrice ? '+' : '-',
      series: [{
        data: buildGraphData(orders)
      }]
    }
  }
)

const buildGraphData = (orders) => {
  orders = groupBy(orders, (o) => moment.unix(o.timestamp).startOf('hour').format())
  const hours = Object.keys(orders)
  return hours.map((hour) => {
    const group = orders[hour]
    const open = group[0]
    const high = maxBy(group, 'tokenPrice')
    const low = minBy(group, 'tokenPrice')
    const close = group[group.length - 1]
    return {
      x: new Date(hour),
      y: [open.tokenPrice, high.tokenPrice, low.tokenPrice, close.tokenPrice]
    }
  })
}

export const orderCancellingSelector = createSimpleSelector('exchange.orderCancelling', false)
export const orderFillingSelector = createSimpleSelector('exchange.orderFilling', false)
export const balancesLoadingSelector = createSimpleSelector('exchange.balancesLoading', true)

const createBalanceSelector = (path) => createSelector(
  createSimpleSelector(path, '0'),
  (balance) => formatBalance(balance)
)

export const etherBalanceSelector = createBalanceSelector('web3.balance')
export const tokenBalanceSelector = createBalanceSelector('token.balance')
export const exchangeEtherBalanceSelector = createBalanceSelector('exchange.etherBalance')
export const exchangeTokenBalanceSelector = createBalanceSelector('exchange.tokenBalance')

const createAmountSelector = (path) => createSimpleSelector(path, '0')

export const etherDepositAmountSelector = createAmountSelector('exchange.etherDepositAmount')
export const etherWithdrawAmountSelector = createAmountSelector('exchange.etherWithdrawAmount')
export const tokenDepositAmountSelector = createAmountSelector('exchange.tokenDepositAmount')
export const tokenWithdrawAmountSelector = createAmountSelector('exchange.tokenWithdrawAmount')

export const buyOrderSelector = createSimpleSelector('exchange.buyOrder', {})
export const sellOrderSelector = createSimpleSelector('exchange.sellOrder', {})
