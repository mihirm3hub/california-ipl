const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

const rootPath = process.cwd()
const distPath = path.join(rootPath, 'dist')
const srcPath = path.join(rootPath, 'src')

const makeJsLoader = () => ({
  test: /\.js$/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: ['@babel/preset-env'],
      plugins: ['@babel/plugin-transform-runtime'],
    },
  },
  exclude: /node_modules/,
})

const makeTsLoader = () => ({
  test: /\.ts$/,
  loader: 'ts-loader',
  exclude: /node_modules/,
})

const makeCssLoader = () => ({
  test: /\.css$/,
  exclude: /\/assets\//,
  use: ['style-loader', 'css-loader'],
})

const makeSassLoader = () => ({
  test: /\.scss$/,
  use: ['style-loader', 'css-loader', 'sass-loader'],
})

const makeDefaultHtmlLoader = () => ({
  test: /\.html$/,
  use: {
    loader: 'html-loader',
    options: {
      esModule: false,
      // Keep URLs in HTML untouched; external vendor files are copied as static assets.
      sources: false,
    },
  },
})

const config = {
  entry: path.join(srcPath, 'app.js'),
  output: {
    filename: 'bundle.js',
    path: distPath,
    publicPath: '/',
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(srcPath, 'index.html'),
      filename: 'index.html',
      inject: false,
    }),
    new HtmlWebpackPlugin({
      template: path.join(srcPath, 'benefit-collection.html'),
      filename: 'benefit-collection.html',
      inject: false,
    }),
    new HtmlWebpackPlugin({
      template: path.join(srcPath, 'missing-out.html'),
      filename: 'missing-out.html',
      inject: false,
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.join(rootPath, 'external'),
          to: path.join(distPath, 'external'),
          noErrorOnMissing: true,
        },
        {
          from: path.join(srcPath, 'assets'),
          to: path.join(distPath, 'assets'),
          noErrorOnMissing: true,
        },
        {
          from: path.join(rootPath, 'image-targets'),
          to: path.join(distPath, 'image-targets'),
          noErrorOnMissing: true,
        },
        {
          from: path.join(rootPath, 'almond.glb'),
          to: path.join(distPath, 'almond.glb'),
          noErrorOnMissing: true,
        },
        {
          from: path.join(rootPath, 'ring.mp4'),
          to: path.join(distPath, 'ring.mp4'),
          noErrorOnMissing: true,
        },
        {
          from: path.join(rootPath, '2.mp4'),
          to: path.join(distPath, '2.mp4'),
          noErrorOnMissing: true,
        },
        {
          from: path.join(rootPath, 'sparkles.mp4'),
          to: path.join(distPath, 'sparkles.mp4'),
          noErrorOnMissing: true,
        },
        {
          from: path.join(rootPath, 'logoM.png'),
          to: path.join(distPath, 'logoM.png'),
          noErrorOnMissing: true,
        },
        {
          from: path.join(rootPath, 'Ellipse.png'),
          to: path.join(distPath, 'Ellipse.png'),
          noErrorOnMissing: true,
        },
        {
          from: path.join(rootPath, 'Ellipse.png'),
          to: path.join(distPath, 'ellipse.png'),
          noErrorOnMissing: true,
        },
        {
          from: path.join(rootPath, 'Ellipse-yellow.png'),
          to: path.join(distPath, 'Ellipse-yellow.png'),
          noErrorOnMissing: true,
        },
        {
          from: path.join(rootPath, 'Ellipse-yellow.png'),
          to: path.join(distPath, 'ellipse-yellow.png'),
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
  resolve: {extensions: ['.ts', '.js']},
  module: {
    rules: [
      makeJsLoader(),
      makeTsLoader(),
      makeCssLoader(),
      makeSassLoader(),
      makeDefaultHtmlLoader(),
    ],
  },
  optimization: {
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
  },
  performance: {
    hints: false,
  },
  mode: 'production',
  devtool: false,
  context: srcPath,
  devServer: {
    open: false,
    compress: true,
    hot: true,
    liveReload: false,
    static: {
      directory: rootPath,
      watch: true,
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
    client: {
      overlay: {
        warnings: false,
        errors: true,
      },
    },
  },
}

module.exports = config
