const path = require('path');

const config = {
  target: 'node',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, '..', 'extension'),
    filename: 'grafana-loki-language-server-client.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    extensionAlias: {
      '.js': ['.js', '.ts'],
      '.cjs': ['.cjs', '.cts'],
      '.mjs': ['.mjs', '.mts'],
    },
  },
  module: {
    rules: [
      {
        test: /\.([cm]?ts)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                module: 'ES6',
              },
            },
          },
        ],
      },
    ],
  },
};

module.exports = config;
