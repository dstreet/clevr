const { EventEmitter } = require('events')

class DispatchServer extends EventEmitter {
	constructor(...servers) {
		super()
		this.servers = []
		servers.forEach(server => this.addServer(server))
	}

	addServer(server) {
		server.on('close', (code, services) => {
			this.emit('close', services)
		})
		server.on('error', this._error)
		this.servers.push(server)
	}

	addService(service, serverIndex) {
		if (typeof serverIndex !== 'undefined') {
			this.servers[serverIndex].addService(service)
		} else {
			this.servers.forEach(server => {
				server.addService(service)
			})
		}

		return this
	}

	need(...services) {
		const promises = services.map(service => {
			return Promise.race(
				this.servers.map(server => server.need.call(server, service))
			).then(([ service ]) => service)
		})

		return Promise.all(promises)
	}

	listen() {
		this.servers.forEach(server => {
			server.listen()
		})
	}

	announce() {
		this.servers.forEach(server => {
			server.announce()
		})
	}

	_error(err) {
		// eslint-disable-next-line no-console
		console.log(err)
	}
}

module.exports = DispatchServer