import { observable, action } from 'mobx';
import Logger from 'js-logger';
// import type { Session as TrezorSession } from 'trezor.js';
import { BridgeV2 as Transport } from 'trezor-link';

import configLocal from '../static/config_signed.bin';
import { DeviceList } from 'trezor.js';
import { httpRequest } from 'utils/networkUtils';

import { parseCoinsJson } from 'utils/data/CoinInfo';
import { CoinsJson } from 'utils/data/coins'

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

export default class AppState {

  @observable
  firmwareVersion: string = '';

  @observable
  deviceLabel: string = '';

  @observable
  deviceConnected: boolean = false;

  // @observable
  // session: TrezorSession = null;

  @action
  async start() {
    // load coin information
    parseCoinsJson(CoinsJson);
    Logger.info('Loaded coin information');
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

      self.deviceLabel = device.features.label;
      self.deviceConnected = true;
      self.firmwareVersion = device.getVersion();
      Logger.info(`Connected device: ${self.deviceLabel}; firmware Version: ${self.firmwareVersion}`);

      device.on('disconnect', function() {
        self.deviceConnected = false;
        self.deviceLabel = '';
        self.firmwareVersion = '';
        Logger.info('Disconnected an opened device');
      });
    });

    // list.on('connectUnacquired', u => {
    //   console.log(`DeviceList connectUnacquired; UnacquiredDevice: ${u}`);
    // });
    //
    // list.on('transport', t => {
    //   console.log(`DeviceList  transport is successfully initialized; Transport: ${t}`);
    // });
    //
    // list.on('disconnect', d => {
    //   console.log(`DeviceList device is disconnected; Device: ${d}`);
    // });
    //
    // list.on('disconnectUnacquired', u => {
    //   console.log(`DeviceList unacquired device is disconnected; UnacquiredDevice: ${u}`);
    // });

    list.on('error', e => {
      console.log(`DeviceList initialization error: ${e}`);
    });
  }
}
