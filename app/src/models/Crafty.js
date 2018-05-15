import { computed } from 'mobx'
import BN from 'bn.js'

import CraftyArtifact from '../artifacts/Crafty.json'

import RootStore from '../store/RootStore'
import CraftableToken from '../models/CraftableToken'

import {
  createFromEthereumBlock,
  collect,
} from '../util'

export default class Crafty {
  contract = null

  constructor (web3, networkId) {
    this.web3 = web3
    try {
      this.contract = new web3.eth.Contract(
        CraftyArtifact.abi,
        RootStore.config.crafty
      )
    } catch (error) {
      throw error
    }
  }

  @computed get address () {
    return this.contract._address
  }

  addCraftable = async (...args) => {
    const receipt = await this.contract.methods.addCraftable(
      ...args
    ).send({
      from: RootStore.web3Context.currentAddress,
    })

    if (!receipt.events || !receipt.events.CraftableAdded) {
      throw new Error('no events found!')
    }

    return receipt.events.CraftableAdded.returnValues.addr
  }

  craft = async (...args) => {
    return this.contract.methods.craft(
      ...args
    ).send({
      from: RootStore.web3Context.currentAddress,
    })
  }

  totalCraftables = createFromEthereumBlock(
    RootStore.web3Context.latestBlock
  )(
    new BN(0),
    () => {},
    async () => {
      return new BN(
        await this.contract.methods.getTotalCraftables().call()
      )
    }
  )

  craftableTokenAddresses = createFromEthereumBlock(
    RootStore.web3Context.latestBlock
  )(
    [],
    () => this.totalCraftables.current(),
    async (totalCraftables) =>
      collect(totalCraftables.toNumber(), async (i) => {
        return this.contract.methods.getCraftable(i).call()
      })
  )

  @computed get craftableTokens () {
    return this.craftableTokenAddresses.current()
      .filter(a => a !== '0x0000000000000000000000000000000000000000') // Filter-out deleted tokens
      .map(a => new CraftableToken(a))
  }
}
