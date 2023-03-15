'use strict';

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const { merge } = require('webpack-merge');

const prodConfig = require('./webpack.prod');

module.exports = (env = {}) =>
  merge(prodConfig(env), {
    plugins: [new BundleAnalyzerPlugin()],
    optimization: {
      concatenateModules: false,
    },
  });
