/**
 * Base webpack config used across other specific configs
 */

import path from 'path';
import webpack from 'webpack';
import GitRevisionPlugin from 'git-revision-webpack-plugin';
import { dependencies } from '../package.json';

const gitRevisionPlugin = new GitRevisionPlugin();

export default {

  externals: [
    ...Object.keys(dependencies || {})
      .filter(o => o !== 'bitcoinjs-lib-zcash' && o !== 'trezor.js'),
  ],

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true
          }
        }
      }
    ]
  },

  output: {
    path: path.join(__dirname, '..', 'app'),
    // https://github.com/webpack/webpack/issues/1114
    libraryTarget: 'commonjs2'
  },

  /**
   * Determine the array of extensions that should be used to resolve modules.
   */
  resolve: {
    alias: {
      store: path.resolve(__dirname, '../app/store'),
      views: path.resolve(__dirname, '../app/views'),
      utils: path.resolve(__dirname, '../app/utils'),
      components: path.resolve(__dirname, '../app/components'),
      config: path.resolve(__dirname, '../app/config'),
      constants: path.resolve(__dirname, '../app/constants'),
      support: path.resolve(__dirname, '../app/support'),
      images: path.resolve(__dirname, '../app/images'),
      translations: path.resolve(__dirname, '../app/translations'),
      flowtype: path.resolve(__dirname, '../flowtype')
    },
    extensions: ['.js', '.jsx', '.json']
  },

  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production'
    }),
    new webpack.DefinePlugin({
      COMMITHASH: JSON.stringify(gitRevisionPlugin.commithash()),
    }),
    new webpack.NamedModulesPlugin()
  ],

  /**
   * Disables webpack processing of __dirname and __filename.
   * If you run the bundle in node.js it falls back to these values of node.js.
   * https://github.com/webpack/webpack/issues/2010
   */
  node: {
    __dirname: true,
    // __filename: true
  }
};
