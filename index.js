const model = require('./lib/model')

module.exports = Object.assign({}, model, {
	App: require('./lib/app'),
	Client: require('./lib/client')
})