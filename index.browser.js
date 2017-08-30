const model = require('./lib/model')

module.exports = Object.assign({}, model, {
	Client: require('./lib/client')
})