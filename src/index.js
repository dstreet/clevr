const model = require('./model')

module.exports = Object.assign({}, model, {
	App: require('./app'),
	Client: require('./client')
})