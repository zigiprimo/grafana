'use strict';

const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { EsbuildPlugin } = require('esbuild-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const { merge } = require('webpack-merge');

const HTMLWebpackCSSChunks = require('./plugins/HTMLWebpackCSSChunks');
const common = require('./webpack.common.js');

module.exports = (env = {}) =>
  merge(common, {
    mode: 'production',

    // https://webpack.js.org/plugins/split-chunks-plugin/#split-chunks-example-3
    optimization: {
      minimize: parseInt(env.noMinify, 10) !== 1,
      minimizer: [new EsbuildPlugin(esbuildOptions), new CssMinimizerPlugin()],
      nodeEnv: 'production',
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
        minChunks: 1,
        cacheGroups: {
          unicons: {
            test: /[\\/]node_modules[\\/]@iconscout[\\/]react-unicons[\\/].*[jt]sx?$/,
            chunks: 'initial',
            priority: 20,
            enforce: true,
          },
          moment: {
            test: /[\\/]node_modules[\\/]moment[\\/].*[jt]sx?$/,
            chunks: 'initial',
            priority: 20,
            enforce: true,
          },
          angular: {
            test: /[\\/]node_modules[\\/]angular[\\/].*[jt]sx?$/,
            chunks: 'initial',
            priority: 50,
            enforce: true,
          },
          defaultVendors: {
            test: /[\\/]node_modules[\\/].*[jt]sx?$/,
            chunks: 'initial',
            priority: -10,
            reuseExistingChunk: true,
            enforce: true,
          },
          default: {
            priority: -20,
            chunks: 'all',
            test: /.*[jt]sx?$/,
            reuseExistingChunk: true,
          },
        },
      },
    },

    plugins: [
      new HtmlWebpackPlugin({
        filename: path.resolve(__dirname, '../../public/views/index.html'),
        template: path.resolve(__dirname, '../../public/views/index-template.html'),
        inject: false,
        excludeChunks: ['manifest', 'dark', 'light'],
        chunksSortMode: 'none',
      }),
      new HTMLWebpackCSSChunks(),
      new WebpackManifestPlugin({
        fileName: path.join(process.cwd(), 'manifest.json'),
        filter: (file) => !file.name.endsWith('.map'),
      }),
      function () {
        this.hooks.done.tap('Done', function (stats) {
          if (stats.compilation.errors && stats.compilation.errors.length) {
            console.log(stats.compilation.errors);
            process.exit(1);
          }
        });
      },
    ],
  });
