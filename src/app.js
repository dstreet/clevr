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

		this.networkOpts = Object.assign({}, {
			port: null,
			secure: false,
			key: null,
			cert: null
		}, networkOpts)

		const transform = this._serviceMethodTransform.bind(this)

		this.server = new DispatchServer(
			new LocalServer(namespace, { serviceTransform: transform })
		)

		if (networkOpts) {
			let key, cert

			if (this.networkOpts.key) key = fs.readFileSync(this.networkOpts.key)
			if (this.networkOpts.cert) cert = fs.readFileSync(this.networkOpts.cert)

			this.server.addServer(
				new Server(namespace, {
					secure: this.networkOpts.secure,
					server: (this.networkOpts.secure ?
						require('https').createServer({ key, cert }).listen(this.networkOpts.port) :
						require('http').createServer().listen(this.networkOpts.port)),
					serviceTransform: transform
				})
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
		
		if (required.length) {
			this.deferredServices.push(
				this.requireServices.apply(this, required)
					.then(services => {
						this.registerService(name, [], methods.apply(null, services), localOnly)
					})
					.catch(console.log.bind(console))
			)

			return this
		}

		const service = new Service(name)
		
		methods.forEach(method => {
			service.register(method.name, method.cb, method.type)
		})

		this.server.addService(service, localOnly ? 0 : undefined)

		return service
	}

	registerLocalService(...args) {
		return this.registerService.apply(this, args.concat(true))
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