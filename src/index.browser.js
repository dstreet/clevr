const model = require('./model')

module.exports = Object.assign({}, model, {
	Client: require('./client')
})