import { tokens, ether, EVM_REVERT, ETH_ADDRESS, checkEvent } from './helpers'

require('chai')
  .use(require('chai-as-promised'))
  .should()

const Token = artifacts.require('./Token')
const Exchange = artifacts.require('./Exchange')

contract('Exchange', ([deployer, feeAccount, user1, user2]) => {
  let  token,exchange, amount, result
  const etherAmount = ether(1)
  const oneToken = tokens(1)
  const tenTokens = tokens(10)
  const hundredTokens = tokens(100)
  const feePercent = 10
  const gasPrice = ether(0.00206736)

  beforeEach(async () => {
    // Deploy token
    token = await Token.new()

    // Transfer some tokens to user1
    token.transfer(user1, hundredTokens, { from: deployer })

    // Deploy exchange
    exchange = await Exchange.new(feeAccount, feePercent)
  })

  describe('Deployment', () => {
   it('tracks the fee account', async () => {
     const result = await exchange.feeAccount()
     result.should.equal(feeAccount)
   })

   it('tracks the fee percent', async () => {
     const result = await exchange.feePercent()
     result.toString().should.equal(feePercent.toString())
   })
  })

  describe('Fallback', () => {
   it('reverts when Ether is sent', () => {
      exchange.sendTransaction({ value: 1, from: user1 }).should.be.rejectedWith(EVM_REVERT)
   })
  })

  describe('Depositing Ether', () => {

   beforeEach(async () => {
     amount = etherAmount
     result = await exchange.depositEther({ from: user1, value: amount})
   })

   it('tracks the Ether deposit', async () => {
     const balance = await exchange.tokens(ETH_ADDRESS, user1)
     balance.toString().should.equal(amount.toString())
   })

   it('emits an ether Deposit event', async () => {
     await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
     const log = result.logs[0];
     checkEvent(log, 'Deposit', {
         token: ETH_ADDRESS,
         user: user1,
         amount: amount,
         balance: amount,
     });
   })
  })

  describe('Withdrawing Ether', () => {

   beforeEach(async () => {
     // Deposit Ether first
     amount = etherAmount
     await exchange.depositEther({ from: user1, value: amount })
   })

   describe('success', () => {
     beforeEach(async () => {
       // Withdraw Ether
       result = await exchange.withdrawEther(amount, { from: user1 })
     })

     it('withdraws Ether funds', async () => {
       const balance = await exchange.tokens(ETH_ADDRESS, user1)
       balance.toString().should.equal('0')
     })

     it('emits a "Withdraw" event', () => {
      const log = result.logs[0];
      checkEvent(log, 'Withdraw', {
          token: ETH_ADDRESS,
          user: user1,
          amount: amount,
          balance: '0',
      });
     })
   })

   describe('failure', () => {
     it('rejects withdraws for insufficient balances', async () => {
       await exchange.withdrawEther(ether(100), { from: user1 }).should.be.rejectedWith(EVM_REVERT)
     })
   })
  })

  describe('Depositing Tokens', () => {

    describe('success', () => {
      beforeEach(async () => {
        amount = tenTokens
        await token.approve(exchange.address, amount, { from: user1 })
        result = await exchange.depositToken(token.address, amount, { from: user1 })
      })

      it('tracks the token deposit', async () => {
        // Check exchange token balance
        let balance
        balance = await token.balanceOf(exchange.address)
        balance.toString().should.equal(amount.toString())
        // Check tokens on exchange
        balance = await exchange.tokens(token.address, user1)
        balance.toString().should.equal(amount.toString())
      })

      it('emits a Deposit event', () => {
        const log = result.logs[0];
        checkEvent(log, 'Deposit', {
          token: token.address,
          user: user1,
          amount: amount,
          balance: amount,
        });
    })

    describe('failure', () => {
      it('rejects Ether deposits', () => {
        exchange.depositToken(ETH_ADDRESS, tenTokens, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
      })

      it('fails when no tokens are approved', () => {
        // Don't approve any tokens before depositing
        exchange.depositToken(token.address, tenTokens, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
      })
    })
  })
  })

  describe('Withdrawing Tokens', () => {

   describe('success', async () => {
     beforeEach(async () => {
       // Deposit tokens first
       amount = tenTokens
       await token.approve(exchange.address, amount, { from: user1 })
       await exchange.depositToken(token.address, amount, { from: user1 })

       // Withdraw tokens
       result = await exchange.withdrawToken(token.address, amount, { from: user1 })
     })

     it('withdraws token funds', async () => {
       const balance = await exchange.tokens(token.address, user1)
       balance.toString().should.equal('0')
     })

     it('emits a "Withdraw" event', () => {
      const log = result.logs[0];
      checkEvent(log, 'Withdraw', {
          token: token.address,
          user: user1,
          amount: amount,
          balance: '0',
      });
     })
   })

    describe('failure', () => {
      it('rejects Ether withdraws', () => {
        exchange.withdrawToken(ETH_ADDRESS, tenTokens, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
      })

      it('fails for insufficient balances', () => {
        // Attempt to withdraw tokens without depositing any first
        exchange.withdrawToken(token.address, tenTokens, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
      })
    })
  })

  describe('Checking Balances', () => {
   beforeEach(async () => {
    await exchange.depositEther({ from: user1, value: etherAmount })
   })

   it('returns user balance', async () => {
     const result = await exchange.balanceOf(ETH_ADDRESS, user1)
     result.toString().should.equal(etherAmount.toString())
   })
  })
  
  describe('making orders', () => {

    beforeEach(async () => {
      // Deposit token to user1
    result = await exchange.makeOrder(token.address, oneToken, ETH_ADDRESS, etherAmount, { from: user1 })
    })
    
    it('tracks the newly created order', async () => {
      const orderCount = await exchange.orderCount()
      orderCount.toString().should.equal('1')
      const order = await exchange.orders('1')
      order.id.toString().should.equal('1', 'id is correct')
      order.user.should.equal(user1, 'user is correct')
      order.tokenGet.should.equal(token.address, 'tokenGet is correct')
      order.amountGet.toString().should.equal(oneToken.toString(), 'amountGet is correct')
      order.tokenGive.should.equal(ETH_ADDRESS, 'tokenGive is correct')
      order.amountGive.toString().should.equal(etherAmount.toString(), 'amountGive is correct')
      order.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
    })

    it('emits an Order event', () => {
      const log = result.logs[0]
      checkEvent(log, 'Order', {
        id: '1',
        user: user1,
        tokenGet: token.address,
        amountGet: oneToken.toString(),
        tokenGive: ETH_ADDRESS,
        amountGive: etherAmount.toString(),
        timestamp: (timestamp) => {
          (typeof timestamp).should.equal( 'number', 'timestamp is a number')
        }
      })
    })
  })

  describe('Order Actions', () => {

    beforeEach(async () => {
      // user1 deposits ether only
      await exchange.depositEther({ from: user1, value: etherAmount })
      // give tokens to user2
      await token.transfer(user2, hundredTokens, { from: deployer })
      // user2 deposits tokens only
      await token.approve(exchange.address, tokens(2), { from: user2 })
      await exchange.depositToken(token.address, tokens(2), { from: user2 })
      // user1 makes an order to buy tokens with Ether
      await exchange.makeOrder(token.address, oneToken, ETH_ADDRESS, etherAmount, { from: user1 })
    })

    describe('filling orders', async () => {

      describe('success', async () => {
        beforeEach(async () => {
          //user2 fills order
          result = await exchange.fillOrder('1', { from: user2 })
        })
        //user2 should receive 10% less ether
        it('executes the trade & charges fees', async () => {
          let balance
          balance = await exchange.balanceOf(token.address, user1)
          balance.toString().should.equal(oneToken.toString(), 'user1 received tokens')
          balance = await exchange.balanceOf(ETH_ADDRESS, user2)
          balance.toString().should.equal(etherAmount.toString(), 'user2 received Ether')
          balance = await exchange.balanceOf(ETH_ADDRESS, user1)
          balance.toString().should.equal('0', 'user1 Ether deducted')
          balance = await exchange.balanceOf(token.address, user2)
          balance.toString().should.equal(tokens(0.9).toString(), 'user2 tokens deducted with fee applied')
          const feeAccount = await exchange.feeAccount()
          balance = await exchange.balanceOf(token.address, feeAccount)
          balance.toString().should.equal(tokens(0.1).toString(), 'feeAccount received fee')
        })

        it('updates filled orders', async () => {
          const orderFilled = await exchange.orderFilled(1)
          orderFilled.should.equal(true)
        })

        it('emits a "Trade" event', () => {
          const log = result.logs[0]
          checkEvent(log, 'Trade', {
            id: '1',
            user: user1,
            tokenGet: token.address,
            amountGet: oneToken.toString(),
            tokenGive: ETH_ADDRESS,
            amountGive: etherAmount.toString(),
            userFill: user2,
            timestamp: (timestamp) => {
              (typeof timestamp).should.equal( 'number', 'timestamp is a number')
            }
          })
        })
      })


      describe('failure', () => {
        it('rejects invalid order ids', () => {
          const invalidOrderId = 99999
          exchange.fillOrder(invalidOrderId, { from: user2 }).should.be.rejectedWith(EVM_REVERT)
        })

        it('rejects already-filled orders', async () => {
          // Fill the order once
          await exchange.fillOrder('1', { from: user2 })
          // Try to fill it again
          try {
            await exchange.fillOrder('1', { from: user2 })
            assert.fail('The transaction should have thrown an error')
          } catch (error) {
            assert(error.message.includes('Error, order already filled'), 'The error message should contain "Error, order already filled"')
          }
        })

        it('rejects cancelled orders', async () => {
          // Cancel the order
          await exchange.cancelOrder('1', { from: user1 })
          // Try to fill the cancelled order
          await exchange.fillOrder('1', { from: user2 }).should.be.rejectedWith(/order already cancelled/)
        })
      })
    })

    describe('cancelling orders', () => {
      
      describe('success', () => {
        
        beforeEach(async () => {
          result = await exchange.cancelOrder('1', { from: user1 })
        })

        it('cancels an order', async () => {
          const orderCancelled = await exchange.orderCancelled(1)
          orderCancelled.should.equal(true)
        })
        it('emits a Cancel event', () => {
          const log = result.logs[0]
          checkEvent(log, 'Cancel', {
            id: '1',
            user: user1,
            tokenGet: token.address,
            amountGet: oneToken.toString(),
            tokenGive: ETH_ADDRESS,
            amountGive: etherAmount.toString(),
            timestamp: (timestamp) => {
              (typeof timestamp).should.equal( 'number', 'timestamp is a number')
            }
          })
        })
      })
      
      describe('failure', () => {
        it('fails to cancel an order that does not exist', () => {
          exchange.cancelOrder('99', { from: user1 }).should.be.rejectedWith(EVM_REVERT)
        })

        it('fails to cancel an order that does not belong to the user', () => {
          exchange.cancelOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
        })
      })
    })
  })
  
  describe('FillOrder()', () => {
    describe('Check balances after filling user1 buy Tokens order', () => {
      beforeEach(async () => {
        // user1 deposit 1 ETHER to the exchange
        await exchange.depositEther({from: user1, value: etherAmount})
        // user1 create order to buy 10 tokens for 1 ETHER
        await exchange.makeOrder(token.address, tenTokens, ETH_ADDRESS, etherAmount, {from: user1})
        // user2 gets tokens
        await token.transfer(user2, tokens(11), {from: deployer})
        // user2 approve exchange to spend his tokens
        await token.approve(exchange.address, tokens(11), {from: user2})
        // user2 deposit tokens + fee cost (1 token) to the exchange
        await exchange.depositToken(token.address, tokens(11), {from: user2})
        // user2 fills the order
        await exchange.fillOrder('1', {from: user2})
      })

      it('user1 tokens balance on exchange should eq. 10', async () => {
        await (await exchange.balanceOf(token.address, user1)).toString().should.eq(tenTokens.toString())
      })

      it('user1 ether balance on exchange should eq. 0', async () => {
        await (await exchange.balanceOf(ETH_ADDRESS, user1)).toString().should.eq('0')
      })

      it('user2 tokens balance on exchange should eq. 0', async () => {
        await (await exchange.balanceOf(token.address, user2)).toString().should.eq('0')
      })

      it('user2 ether balance on exchange should eq. 1', async () => {
        await (await exchange.balanceOf(ETH_ADDRESS, user2)).toString().should.eq(etherAmount.toString())
      })
    })

    describe('Check balances after filling user1 buy Ether order', () => {
      beforeEach(async () => {
        // Uuser1 Gets the 10 tokens
        await token.transfer(user1, tenTokens, {from: deployer})
        // user1 approve exchange to spend his tokens
        await token.approve(exchange.address, tenTokens, {from: user1})
        // user1 approve send tokens to the exchange 
        await exchange.depositToken(token.address, tenTokens, {from: user1})
        // user1 create order to buy 1 Ether for 10 tokens
        await exchange.makeOrder(ETH_ADDRESS, etherAmount, token.address, tenTokens, {from: user1})
        // user2 deposit 1 ETHER + fee cost (.1 ETH) to the exchange
        await exchange.depositEther({from: user2, value: ether(1.1)})
        // user2 fills the order
        await exchange.fillOrder('1', {from: user2})
      })

      it('user1 tokens balance on exchange should eq. 0', async () => {
        await (await exchange.balanceOf(token.address, user1)).toString().should.eq('0')
      })

      it('user1 Ether balance on exchange should eq. 1', async () => {
        await (await exchange.balanceOf(ETH_ADDRESS, user1)).toString().should.eq(etherAmount.toString())
      })

      it('user2 tokens balance on exchange should eq. 10', async () => {
        await (await exchange.balanceOf(token.address, user2)).toString().should.eq(tenTokens.toString())
      })

      it('user2 ether balance on exchange should eq. 0', async () => {
        await (await exchange.balanceOf(ETH_ADDRESS, user2)).toString().should.eq('0')
      })
    })
  })
})