const path = require('path')
const nodeExternals = require('webpack-node-externals')

module.exports = {
	target: 'node',
	externals: [nodeExternals()],
	entry: {
		index: './src/index.js',
		browser: './src/index.browser.js'
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
		library: 'clevr',
		libraryTarget: 'umd'
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: [/node_modules/],
				use: [{
					loader: 'babel-loader',
					options: {
						presets: ['stage-3']
					}
				}]
			},
			{
				test: /\.node$/,
				use: 'node-loader'
			}
		]
	}
}
