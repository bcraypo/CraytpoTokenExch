import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Tabs, Tab } from 'react-bootstrap'
import Spinner from './Spinner'
import {
  loadBalances,
  depositEther,
  depositToken,
  withdrawEther,
  withdrawToken
} from '../store/interactions'
import {
  exchangeSelector,
  tokenSelector,
  accountSelector,
  web3Selector,
  etherBalanceSelector,
  tokenBalanceSelector,
  exchangeEtherBalanceSelector,
  exchangeTokenBalanceSelector,
  balancesLoadingSelector,
  etherDepositAmountSelector,
  etherWithdrawAmountSelector,
  tokenDepositAmountSelector,
  tokenWithdrawAmountSelector,
} from '../store/selectors'
import {
  etherDepositAmountChanged,
  etherWithdrawAmountChanged,
  tokenDepositAmountChanged,
  tokenWithdrawAmountChanged,
} from '../store/actions'
import { formatBalance } from '../helpers'
import { refreshComponents } from '../store/actions'

const showForm = (props) => {
  const {
    dispatch,
    exchange,
    web3,
    account,
    etherBalance,
    tokenBalance,
    exchangeEtherBalance,
    exchangeTokenBalance,
    etherDepositAmount,
    etherWithdrawAmount,
    token,
    tokenDepositAmount,
    tokenWithdrawAmount
  } = props

  return(
    <Tabs defaultActiveKey="deposit" className="bg-dark text-white">
      <Tab eventKey="deposit" title="Deposit" className="bg-dark">
        <table className="table table-dark table-sm small">
          <thead>
            <tr>
              <th>Token</th>
              <th>Wallet</th>
              <th>Exchange</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ETH</td>
              <td>{formatBalance(etherBalance)}</td>
              <td>{formatBalance(exchangeEtherBalance)}</td>
            </tr>
            <tr>
              <td>CRAYPTO</td>
              <td>{formatBalance(tokenBalance)}</td>
              <td>{formatBalance(exchangeTokenBalance)}</td>
            </tr>
          </tbody>
        </table>

        <form className="row mt-3" onSubmit={(event) => {
          event.preventDefault()
          depositEther(dispatch, exchange, web3, etherDepositAmount, account)
            .then(() => {
              loadBalances(dispatch, web3, exchange, token, account)
            })
            .catch((error) => {
              console.error('Error depositing Ether:', error)
            })
        }}>
          <div className="col-12">
            <input
              type="text"
              placeholder="ETH Amount"
              onChange={(e) => dispatch( etherDepositAmountChanged(e.target.value) )}
              className="form-control form-control-sm bg-dark text-white"
              required />
          </div>
          <div className="col-12 mt-2">
            <button type="submit" className="btn btn-primary btn-sm btn-block">Deposit ETH</button>
          </div>
        </form>

        <form className="row mt-3" onSubmit={(event) => {
          event.preventDefault()
          depositToken(dispatch, exchange, web3, token, tokenDepositAmount, account)
            .then(() => {
              loadBalances(dispatch, web3, exchange, token, account)
            })
            .catch((error) => {
              console.error('Error depositing token:', error)
            })
        }}>
          <div className="col-12">
            <input
              type="text"
              placeholder="CRAYPTO Amount"
              onChange={(e) => dispatch(tokenDepositAmountChanged(e.target.value))}
              className="form-control form-control-sm bg-dark text-white"
              required />
          </div>
          <div className="col-12 mt-2">
            <button type="submit" className="btn btn-primary btn-sm btn-block">Deposit CRAYPTO</button>
          </div>
        </form>
      </Tab>

      <Tab eventKey="withdraw" title="Withdraw" className="bg-dark">
        <table className="table table-dark table-sm small">
          <thead>
            <tr>
              <th>Token</th>
              <th>Wallet</th>
              <th>Exchange</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ETH</td>
              <td>{formatBalance(etherBalance)}</td>
              <td>{formatBalance(exchangeEtherBalance)}</td>
            </tr>
            <tr>
              <td>CRAYPTO</td>
              <td>{formatBalance(tokenBalance)}</td>
              <td>{formatBalance(exchangeTokenBalance)}</td>
            </tr>
          </tbody>
        </table>

        <form className="row mt-3" onSubmit={(event) => {
          event.preventDefault()
          withdrawEther(dispatch, exchange, web3, token, etherWithdrawAmount, account)
          .then(() => loadBalances(dispatch, web3, exchange, token, account))
        }}>
          <div className="col-12">
            <input
              type="text"
              placeholder="ETH Amount"
              onChange={(e) => dispatch( etherWithdrawAmountChanged(e.target.value) )}
              className="form-control form-control-sm bg-dark text-white"
              required />
          </div>
          <div className="col-12 mt-2">
            <button type="submit" className="btn btn-primary btn-sm btn-block">Withdraw ETH</button>
          </div>
        </form>

        <form className="row mt-3" onSubmit={(event) => {
          event.preventDefault()
          withdrawToken(dispatch, exchange, web3, token, tokenWithdrawAmount, account)
            .then(() => {
              loadBalances(dispatch, web3, exchange, token, account)
            })
            .catch((error) => {
              console.error('Error withdrawing token:', error)
            })
        }}>
          <div className="col-12">
            <input
              type="text"
              placeholder="CRAYPTO Amount"
              onChange={(e) => dispatch( tokenWithdrawAmountChanged(e.target.value) )}
              className="form-control form-control-sm bg-dark text-white"
              required />
          </div>
          <div className="col-12 mt-2">
            <button type="submit" className="btn btn-primary btn-sm btn-block">Withdraw CRAYPTO</button>
          </div>
        </form>
      </Tab>
    </Tabs>
  )
}

class Balance extends Component {
  componentDidMount() {
    this.loadBlockchainData()
  }

  async loadBlockchainData() {
    const { dispatch, web3, exchange, token, account } = this.props
    await loadBalances(dispatch, web3, exchange, token, account)
  }

  render() {
    return (
      <div className="card bg-dark text-white">
        <div className="card-header">
          Balance
        </div>
        <div className="card-body">
          {this.props.showForm ? showForm(this.props) : <Spinner />}
        </div>
      </div>
    )
  }
}

function mapStateToProps(state) {
  const balancesLoading = balancesLoadingSelector(state)

  return {
    account: accountSelector(state),
    exchange: exchangeSelector(state),
    token: tokenSelector(state),
    web3: web3Selector(state),
    etherBalance: etherBalanceSelector(state),
    tokenBalance: tokenBalanceSelector(state),
    exchangeEtherBalance: exchangeEtherBalanceSelector(state),
    exchangeTokenBalance: exchangeTokenBalanceSelector(state),
    balancesLoading,
    showForm: !balancesLoading,
    etherDepositAmount: etherDepositAmountSelector(state),
    etherWithdrawAmount: etherWithdrawAmountSelector(state),
    tokenDepositAmount: tokenDepositAmountSelector(state),
    tokenWithdrawAmount: tokenWithdrawAmountSelector(state),
  }
}

export default connect(mapStateToProps)(Balance)
