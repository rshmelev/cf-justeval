/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'worker.js',
    path: path.join(__dirname, 'dist'),
  },
  devtool: 'inline-cheap-module-source-map',
  mode: 'production',
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    fallback: { vm: require.resolve('vm-browserify') },
  },
  performance: {
    maxEntrypointSize: 912000,
    maxAssetSize: 912000,
  },

  plugins: [],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          // transpileOnly is useful to skip typescript checks occasionally:
          // transpileOnly: true,
        },
      },
    ],
  },
};
