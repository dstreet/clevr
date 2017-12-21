const { Service } = require('microserv')

class ModelService extends Service {
	constructor(name, builder, server) {
		super(`clevr.model.${name}`)
		this.builder = builder
		this.server = server
		this.methods = {}
		this.documentServices = []

		this._attachMiddleware()
		this._build()
		this._registerMethods()
	}

	_registerMethods() {
		this.register('get', this._get.bind(this))
		this.register('applyMutation', this._applyMutation.bind(this))
		this.register('describe', this._describe.bind(this))
		this.register('create', this._create.bind(this))
		this.register('remove', this._remove.bind(this))

		for (const name of this.model.getStatics()) {
			this.register(name, this._getStaticCallback(name))
		}
	}

	_attachMiddleware() {
		this.originalMiddleware = this.builder.getMutationMiddleware() || {}
		this.builder.setMutationMiddleware(this._preMiddleware.bind(this), this._postMiddleware.bind(this))
	}

	_build() {
		this.model = this.builder.build()
	}

	_get(...params) {
		return this.model.get.apply(this.model, params)
	}

	_applyMutation(...params) {
		return this.model.applyMutation.apply(this.model, params)
	}

	_describe() {
		return this.model.describe()
	}

	_create(...params) {
		return this.model.create.apply(this.model, params)
	}

	_remove(...params) {
		return this.model.remove.apply(this.model, params)
	}

	_getStaticCallback(name) {
		return (...params) => this.model[name].apply(this.model, params)
	}

	_preMiddleware(document, data, name) {
		this.emit(`pre.${name}`, { document, data })

		if (this.originalMiddleware.pre) {
			return this.originalMiddleware.pre(document, data, name)
		} else {
			return data
		}
	}

	_postMiddleware(document, sources, name) {
		this.emit(`post.${name}`, { document, sources })

		if (this.originalMiddleware.post) {
			return this.originalMiddleware.post(document, sources, name)
		} else {
			return sources
		}
	}
}

module.exports = ModelService
