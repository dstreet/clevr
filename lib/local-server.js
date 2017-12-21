const { ClientService: _ClientService } = require('microserv')
const { EventEmitter } = require('events')

class ClientService extends _ClientService {
	constructor(service, descriptor, opts) {
		super(service.emitter, descriptor, opts)
		this._serviceMethods = service.methods
	}

	_applyMethods() {
		this.descriptor.methods.forEach(key => {
			this[key] = (...args) => Promise.resolve(this._serviceMethods[key].call(null, args)).then(this.opts.serviceTransform)
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
		service.addSocket(service.emitter)
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