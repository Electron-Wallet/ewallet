import { observable, action } from 'mobx';
import Logger from 'js-logger';
// import type { Session as TrezorSession } from 'trezor.js';
import { BridgeV2 as Transport } from 'trezor-link';
import Link from 'components/Link';
import GetAccountInfo from 'utils/GetAccountInfo'
import EthereumGetAccountInfo from 'utils/EthereumGetAccountInfo'
import Account from 'utils/account'

import configLocal from '../static/config_signed.bin';
import { DeviceList } from 'trezor.js';
import { httpRequest } from 'utils/networkUtils';
import type { Features, Device, Session } from 'trezor.js';
import { parseCoinsJson, getCoinInfo, CoinInfo } from 'utils/data/CoinInfo';
import { CoinsJson } from 'utils/data/coins'
import ComposeTransaction from 'utils/ComposeTransaction';
import type { BitcoinNetworkInfo } from '../utils/types';
import { parseAmount } from 'utils/btcParse';
import React from 'react';

const CoinGecko = require('coingecko-api');
const CoinGeckoClient = new CoinGecko();

const EWALLETD_URL = `http://127.0.0.1:58567`;
const EWALLETD_NEWVERSION = '2.0.25';

Logger.useDefaults();

let deviceDebug: boolean = false;

if (process.env.NODE_ENV === 'development') {
  Logger.setLevel(Logger.DEBUG);
  deviceDebug = true;
} else if (process.env.DEBUG_PROD === 'true') {
  Logger.setLevel(Logger.INFO);
} else {
  Logger.setLevel(Logger.WARN);
}

export type EWalletDevice = {
  label: string,
  // features
  // pin_protection: boolean,
  // passphrase_protection: boolean,
  // device_id: string,
  firmware: string,
  features: Features,
  connected: boolean, // device is connected
  available: boolean,
  device: Device,
  session: Session,
};

export type Wallet = {
  dropdownOpened: boolean,
  showSidebar: boolean,
  account: Account,
  accountEth: Account,
  rates: any,
  //
  buttonRequest_ConfirmOutput: boolean,
  buttonRequest_SignTx: boolean,
  // notification
  notification: any,
};

export type LocalStorage = {
  networks: Array<BitcoinNetworkInfo>,
};


export default class AppState {

  @observable
  eWalletDevice: EWalletDevice = {
    firmware: '',
    features: null,
    connected: false,
    available: false,
    device: null,
  };

  @observable
  wallet: Wallet = {
    path: '',
    pathEth: '',
    dropdownOpened: false,
    showSidebar: false,
    account: null,
    accountEth: null,
    rates: null,
    //
    buttonRequest_ConfirmOutput: false,
    buttonRequest_SignTx: false,
    //
    notification: null,
  };

  @observable
  localStorage: LocalStorage = {
    networks: [],
  };

  cleanDevice() {
    this.eWalletDevice.firmware = '';
    this.eWalletDevice.features = null;
    this.eWalletDevice.connected = false;
    this.eWalletDevice.available = false;
    this.eWalletDevice.device = null;
  }

  cleanWallet() {
    this.wallet.dropdownOpened = false;
    this.wallet.showSidebar = false;
    this.wallet.account = null;
    this.wallet.accountEth = null;
  }

  @action
  async start() {
    // load coin information
    parseCoinsJson(CoinsJson);
    Logger.info('Loaded coin information');
    //
    let coinInfo = getCoinInfo('bitcoin');
    if (coinInfo) {
      this.localStorage.networks.push(coinInfo);
    }

    coinInfo = getCoinInfo('ethereum');
    if (coinInfo) {
      this.localStorage.networks.push(coinInfo);
    }

    // load configuration from local
    const config = await httpRequest(configLocal);
    Logger.info('Loaded device configuration');
    Logger.debug('configuration: ', config);

    // Logger.debug(`set transport; url: ${EWALLETD_URL}; newVersion: ${EWALLETD_NEWVERSION}`);
    // const transport = new Transport(EWALLETD_URL, null, EWALLETD_NEWVERSION);
    const transport = new Transport(EWALLETD_URL);

    const list = new DeviceList({
      debug: deviceDebug,
      debugInfo: deviceDebug,
      transport,
      config });

    list.on('connect', (device) => {
      const self: AppState = this;
      self.eWalletDevice.device = device;
      self.eWalletDevice.features = device.features;
      self.eWalletDevice.connected = true;
      self.eWalletDevice.available = true;
      self.eWalletDevice.firmware = device.getVersion();
      Logger.info(`Connected device: ${self.eWalletDevice.features.label}; firmware Version: ${self.eWalletDevice.firmware}`);

      device.on('disconnect', function() {
        self.cleanDevice();
        self.cleanWallet();
        Logger.info('Disconnected an opened device');
      });
    });

    list.on('connectUnacquired', u => {
      Logger.info(`DeviceList connectUnacquired; UnacquiredDevice: ${u}`);
    });

    list.on('transport', t => {
      Logger.info(`DeviceList  transport is successfully initialized; Transport: ${t}`);
    });

    list.on('disconnect', d => {
      Logger.info(`DeviceList device is disconnected; Device: ${d}`);
    });

    list.on('disconnectUnacquired', u => {
      Logger.info(`DeviceList unacquired device is disconnected; UnacquiredDevice: ${u}`);
    });

    list.on('error', e => {
      Logger.info(`DeviceList initialization error: ${e}`);
    });
  }

  @action
  async updateRate() {
    let rates = await CoinGeckoClient.simple.price({
      ids: ['bitcoin', 'ethereum'],
      vs_currencies: ['usd', 'cny'],
    });
    if (rates && rates.success === true && rates.message === 'OK') {
      this.wallet.rates = rates.data;
    }
  };

  @action
  getCurrentNetworkByShortcut(shortcut: string) {
    if (this.localStorage && this.localStorage.networks ) {
      const networks = this.localStorage.networks
        .filter(n => n.shortcut.toLowerCase() === shortcut.toLowerCase());
      if (networks && networks.length === 0) {
        return null;
      }
      return networks[0];
    }
    return null;
  }

  @action
  async getAccountInfo() {
    const device = this.eWalletDevice.device;

    if (!!device) {
      device.waitForSessionAndRun(async (session) => {
        try {
          const compose = new GetAccountInfo({
            path: "m/49'/0'/0'",
            coin: "btc",
            session: session
          });
          this.wallet.account = await compose.run();
        } catch (e) {
          console.error('Call rejected:', e);
        }
      }).catch(function(error) {
        console.error('Call rejected:', error);
      })
    }
  }

  static async ethereumGetAddress(session: Session)  {
    const response = await session.ethereumGetAddress(
      [44 | 0x80000000, 60 | 0x80000000, 0 | 0x80000000, 0, 0],
      false
    );

    if (response.type !== 'EthereumAddress') {
      return null;
    }

    return {
      address: `0x${response.message.address}`,
      path: response.message.path,
    };
  }

  @action
  async getEthereumAccountInfo() {
    const device = this.eWalletDevice.device;
    // const network = this.getCurrentNetworkByShortcut('eth');
    if (!!device) {
      device.waitForSessionAndRun(async (session) => {
        try {
          const response = await AppState.ethereumGetAddress(session);
          if (!response) {
            // handle error
            return;
          }
          const address = response.address;
          console.log(address);
          const compose = new EthereumGetAccountInfo({
            account: {
              address,
              block: 0,
              transactions: 0,
              balance: '0',
              availableBalance: '0',
              nonce: 0,
            },
            coin: 'eth',
          });
          const txs = await compose.run();
          console.log('EthereumGetAccountInfo');
          console.log(txs);
          if (!txs.success) {
            // throw new Error(txs.payload.error);
          }
        } catch (e) {
          console.error('Call rejected:', e);
        }
      }).catch(function(error) {
        console.error('Call rejected:', error);
      })
    }
  }

  @action
  async btcComposeTransaction(toAddress: string, amount: string,
                              fee: string, push: boolean, callback: Function) {
    const device = this.eWalletDevice.device;
    const satAmount = parseAmount(`${amount} btc`).toString();
    if (!!device) {
      const self = this;
      device.waitForSessionAndRun(async (session) => {
        session.on('button', type => {
          Logger.info(`session.on button ${type}`);
          switch (type) {
            case 'ButtonRequest_ConfirmOutput':
              this.wallet.buttonRequest_ConfirmOutput = true;
              break;
            case 'ButtonRequest_SignTx':
              this.wallet.buttonRequest_SignTx = true;
              break;
          }
          this.wallet.buttonRequest = true;
        });

        session.on('error', e => {
          Logger.info(`session.on error ${e}`);
          this.wallet.buttonRequest_ConfirmOutput = false;
          this.wallet.buttonRequest_SignTx = false;
          this.wallet.notification = {
            type: 'error',
            title: 'Session error',
            message: e.message || e,
            cancelable: true,
            actions: [],
          };
          callback(false);
        });

        try {
          const compose = new ComposeTransaction({
            outputs: [{
              amount: satAmount,
              address: toAddress
            }],
            path: "m/49'/0'/0'",
            coin: "btc",
            fee: fee,
            push: push,
            session: session,
            account: this.wallet.account,
          });
          const response = await compose.run();
          this.wallet.buttonRequest_ConfirmOutput = false;
          this.wallet.buttonRequest_SignTx = false;
          if (response && response.txid) {
            const externalAddress = `https://www.blockchain.com/btc/tx/${response.txid}`;
            this.wallet.notification = {
              type: 'success',
              title: 'Transaction success',
              message: <Link openExternal={externalAddress} isGray>See transaction detail</Link>,
              cancelable: true,
              actions: [],
            };
            callback(true);
          } else {
            this.wallet.notification = {
              type: 'error',
              title: 'Transaction error',
              // message: error.message || error,
              cancelable: true,
              actions: [],
            };
            callback(false);
          }
        } catch (e) {
          console.error('Call rejected:', e);
          this.wallet.buttonRequest_ConfirmOutput = false;
          this.wallet.buttonRequest_SignTx = false;
          this.wallet.notification = {
            type: 'error',
            title: 'Transaction error',
            message: e.message || e,
            cancelable: true,
            actions: [],
          };
          callback(false);
        }
      }).catch(function(error) {
        console.error('Call rejected:', error);
        self.wallet.buttonRequest_ConfirmOutput = false;
        self.wallet.buttonRequest_SignTx = false;
        self.wallet.notification = {
          type: 'error',
          title: 'Transaction error',
          message: error.message || error,
          cancelable: true,
          actions: [],
        };
        callback(false);
      })
    }
  }
}
