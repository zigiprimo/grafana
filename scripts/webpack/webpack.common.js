const browserslist = require('browserslist');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { resolveToEsbuildTarget } = require('esbuild-plugin-browserslist');
const path = require('path');
const webpack = require('webpack');

const CorsWorkerPlugin = require('./plugins/CorsWorkerPlugin');
const esbuildTargets = resolveToEsbuildTarget(browserslist(), { printUnknownTargets: false });
// esbuild-loader 3.0.0+ requires format to be set to prevent it
// from defaulting to 'iife' which breaks monaco/loader once minified.
const esbuildOptions = {
  target: esbuildTargets,
  format: undefined,
};

module.exports = {
  // enable persistent cache for faster builds
  cache: {
    type: 'filesystem',
    name: 'grafana-default-production',
    buildDependencies: {
      config: [__filename],
    },
  },

  devtool: 'source-map',

  entry: {
    app: './public/app/index.ts',
    dark: './public/sass/grafana.dark.scss',
    light: './public/sass/grafana.light.scss',
  },

  ignoreWarnings: [/export .* was not found in/],

  module: {
    rules: [
      {
        test: require.resolve('jquery'),
        loader: 'expose-loader',
        options: {
          exposes: ['$', 'jQuery'],
        },
      },
      {
        test: /\.html$/,
        exclude: /(index|error)\-template\.html/,
        use: [
          {
            loader: 'ngtemplate-loader?relativeTo=' + path.resolve(__dirname, '../../public') + '&prefix=public',
          },
          {
            loader: 'html-loader',
            options: {
              sources: false,
              minimize: {
                removeComments: false,
                collapseWhitespace: false,
              },
            },
          },
        ],
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'esbuild-loader',
          options: esbuildOptions,
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      require('./sass.rule.js')({
        sourceMap: false,
        preserveUrl: false,
      }),
      {
        test: /\.(svg|ico|jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|cur|ani|pdf)(\?.*)?$/,
        type: 'asset/resource',
        generator: { filename: 'static/img/[name].[hash:8][ext]' },
      },
      // for pre-caching SVGs as part of the JS bundles
      {
        test: /(unicons|mono|custom)[\\/].*\.svg$/,
        type: 'asset/source',
      },
    ],
  },

  output: {
    clean: true,
    path: path.resolve(__dirname, '../../public/build'),
    filename: '[name].[contenthash].js',
    // Keep publicPath relative for host.com/grafana/ deployments
    publicPath: 'public/build/',
  },

  plugins: [
    new webpack.NormalModuleReplacementPlugin(/^@grafana\/schema\/dist\/esm\/(.*)$/, (resource) => {
      resource.request = resource.request.replace('@grafana/schema/dist/esm', '@grafana/schema/src');
    }),
    new CorsWorkerPlugin(),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          context: path.join(require.resolve('monaco-editor/package.json'), '../min/vs/'),
          from: '**/*',
          to: '../lib/monaco/min/vs/', // inside the public/build folder
          globOptions: {
            ignore: [
              '**/*.map', // debug files
            ],
          },
        },
        {
          context: path.join(require.resolve('@kusto/monaco-kusto/package.json'), '../release/min'),
          from: '**/*',
          to: '../lib/monaco/min/vs/language/kusto/',
        },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: 'grafana.[name].[contenthash].css',
    }),
    new HtmlWebpackPlugin({
      filename: path.resolve(__dirname, '../../public/views/error.html'),
      template: path.resolve(__dirname, '../../public/views/error-template.html'),
      inject: false,
      chunksSortMode: 'none',
      excludeChunks: ['dark', 'light'],
    }),
  ],

  resolve: {
    extensions: ['.ts', '.tsx', '.es6', '.js', '.json', '.svg'],
    alias: {
      // some of data source plugins use global Prism object to add the language definition
      // we want to have same Prism object in core and in grafana/ui
      prismjs: require.resolve('prismjs'),
      // some sub-dependencies use a different version of @emotion/react and generate warnings
      // in the browser about @emotion/react loaded twice. We want to only load it once
      '@emotion/react': require.resolve('@emotion/react'),
      // due to our webpack configuration not understanding package.json `exports`
      // correctly we must alias this package to the correct file
      // the alternative to this alias is to copy-paste the file into our
      // source code and miss out in updates
      '@locker/near-membrane-dom/custom-devtools-formatter': require.resolve(
        '@locker/near-membrane-dom/custom-devtools-formatter.js'
      ),
    },
    modules: ['node_modules', path.resolve('public')],
    fallback: {
      buffer: false,
      fs: false,
      stream: false,
      http: false,
      https: false,
      string_decoder: false,
    },
    symlinks: false,
  },

  stats: {
    children: false,
    source: false,
  },

  target: 'web',
};
