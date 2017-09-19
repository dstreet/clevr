const fs = require('fs')
const { EventEmitter } = require('events')
const { Server, Service } = require('microserv')
const ModelService = require('./model-service')
const DispatchServer = require('./dispatch-server')
const LocalServer = require('./local-server')

const getMasterService = clevr => ([
	{
		name: 'getModelData',
		cb: (model, id) => {
			return clevr.models[model].get(parseInt(id)).then(doc => doc.data)
		}
	},
	{
		name: 'getModel',
		type: 'serviceDescriptor',
		cb: name => {
			const modelService = new ModelService(name, clevr.models[name], clevr.server)
			return modelService.serviceDescriptor
		}
	}
])

class App extends EventEmitter {
	constructor(namespace, isMaster, networkOpts) {
		super()
		this.models = {}
		this.isMaster = isMaster
		this.deferredServices = []

		const transform = this._serviceMethodTransform.bind(this)

		this.networkOpts = Object.assign({}, {
			port: null,
			secure: false,
			key: null,
			cert: null,
			noAnnounce: false,
			serviceTransform: transform
		}, networkOpts)

		this.noAnnounce = this.networkOpts.noAnnounce

		this.server = new DispatchServer(
			new LocalServer(namespace, { serviceTransform: transform })
		)

		if (networkOpts) {
			let key, cert

			if (this.networkOpts.key) key = fs.readFileSync(this.networkOpts.key)
			if (this.networkOpts.cert) cert = fs.readFileSync(this.networkOpts.cert)

			if (!this.networkOpts.server) {
				this.networkOpts.sever = this.networkOpts.secure ?
					require('https').createServer({ key, cert }).listen(this.networkOpts.port) :
					require('http').createServer().listen(this.networkOpts.port)
			}

			this.server.addServer(
				new Server(namespace, this.networkOpts)
			)
		}

		this.server.on('close', this.emit.bind(this))
	}

	addModel(name, model) {
		this.models[name] = model
		return this
	}

	attachPlugin(plugin) {
		plugin(this)
		return this
	}
	
	registerService(name, required, methods, localOnly) {
		if (!required && !methods) return this.registerService(name, [], [], false)
		if (typeof methods === 'undefined') return this.registerService(name, [], required)
		if (typeof localOnly === 'undefined' && typeof methods === 'number') return this.registerService(name, required, [], methods)

		const service = new Service(name)
		
		if (required.length) {
			this.deferredServices.push(
				this.requireServices.apply(this, required)
					.then(services => {
						const serviceMethods = typeof methods === 'function' ? methods.apply(null, services) : methods
						this.attachMethods(service, serviceMethods)
						this.server.addService(service, localOnly ? 0 : undefined)
					})
					// eslint-disable-next-line no-console
					.catch(console.log.bind(console))
			)
		} else {
			this.attachMethods(service, methods)
			this.server.addService(service, localOnly ? 0 : undefined)
		}

		return service
	}

	registerLocalService(...args) {
		return this.registerService.apply(this, args.concat(true))
	}

	attachMethods(service, _methods) {
		const methods = typeof _methods === 'function' ? _methods() : _methods
		
		if (!Array.isArray(methods)) return service
		
		methods.forEach(method => {
			service.register(method.name, method.cb, method.type)
		})

		return service
	}

	requireServices(...services) {
		return this.server.need.apply(this.server, services)
	}

	start() {
		if (this.isMaster) {
			this.registerService('clevr', getMasterService(this))
		}

		if (this.models) {
			Object.keys(this.models).forEach(key => {
				this.server.addService(new ModelService(key, this.models[key], this.server))
			})
		}

		this.server.listen()

		if (this.noAnnounce) return

		if (this.deferredServices.length) {
			Promise.all(this.deferredServices)
				.then(() => this.server.announce())
		} else {
			this.server.announce()
		}
	}

	_serviceMethodTransform(descriptor) {
		if (descriptor.type === 'serviceDescriptor') {
			if (descriptor.data.type === 'null') {
				return null
			}
			
			if (Array.isArray(descriptor.data)) {
				return this.requireServices.apply(this, descriptor.data.map(item => item.name))
			}

			return this.requireServices(descriptor.data.name)
				.then(([ service ]) => service)
		}

		return descriptor.data
	}
}

module.exports = App
