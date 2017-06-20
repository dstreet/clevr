const { EventEmitter } = require('events')

class ClientService extends EventEmitter {
	constructor(service, descriptor, opts) {
		super()
		this.service = service
		this.descriptor = descriptor
		this.opts = Object.assign({}, {
			serviceTransform: data => data
		}, opts)

		this._applyMethods()
	}

	subscribe(name, cb) {
		this.service.emitter.on(name, cb)
	}

	_applyMethods() {
		this.descriptor.methods.forEach(key => {
			this[key] = (...args) => Promise.resolve(this.service.methods[key].call(null, args)).then(this.opts.serviceTransform)
		})
	}
}

class LocalServer extends EventEmitter {
	constructor(namespace, opts) {
		super()
		this.namespace = namespace
		this.opts = Object.assign({}, {
			serviceTransform: data => data
		}, opts)
		this.services = []
		this.requiredServices = []
		this.foundServices = {}
		this.started = false
		this.listen = () => {}
	}

	addService(service) {
		service.emitter = new EventEmitter()
		service.emitter.register = () => {}
		service.setSocket(service.emitter)
		this.services.push(service)
		this.announce([service])

		return this
	}

	need(...services) {
		const promises = services.map(service => {
			if (service in this.foundServices) {
				return Promise.resolve(
					this.foundServices[service]
				)
			}

			return new Promise(res => {
				const cb = clientService => res(clientService)
				this.requiredServices.push({ name: service, cb })
			})
		})

		return Promise.all(promises)
	}

	announce(_services) {
		const services = _services || this.services
		services.forEach(service => {
			const clientService = this.foundServices[service.name] = new ClientService(service, service.serviceDescriptor, { serviceTransform: this.opts.serviceTransform })
			
			this.foundServices[service.name] = clientService

			this.requiredServices
				.filter(s => s.name === service.name)
				.forEach(s => s.cb(clientService))
		})
	}
}

module.exports = LocalServer