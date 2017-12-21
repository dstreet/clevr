const { EventEmitter } = require('events')
const Validator = require('./validator')

module.exports =  class Model {
	constructor(definition) {
		if (!definition) throw new Error('Cannot create model: Must provide a definition')

		this._definition = definition
		this._bindings = {
			create: []
		}
	}

	getStatics() {
		return this._definition.statics
	}

	getQuery(name) {
		if (!('queries' in this._definition)) {
			throw new ReferenceError('Failed to get query: No queries defined')
		}

		return this._definition.queries[name]
	}

	getQueryExecutor(name) {
		if (!('queries' in this._definition)) {
			throw new ReferenceError('Failed to get query: No queries defined')
		}

		return (...args) => {
			return this.query.apply(this, [name].concat(args))
		}
	}

	getMutation(name) {
		if (!('mutations' in this._definition)) {
			throw new ReferenceError('Failed to get mutation: No mutations defined')
		}

		return this._definition.mutations[name]
	}

	getMutationExecutor(name) {
		if (!('queries' in this._definition)) {
			throw new ReferenceError('Failed to get mutation: No mutations defined')
		}

		return (...args) => {
			return this.applyMutation.apply(this, [name].concat(args))
		}
	}

	getInitializer() {
		if (!('initializer' in this._definition)) {
			throw new ReferenceError('Failed to get initializer: No initializer defined')
		}

		return this._definition.initializer
	}

	getDestructor() {
		return this._definition.destructor
	}

	getMutationMiddleware() {
		return this._definition.mutationMiddleware
	}

	getDocument(sources, noDefault) {
		const data = this._transformSources(sources, noDefault)

		return {
			selector: this._definition.documentSelector(data, sources),
			data
		}
	}

	async get(input) {
		return this.query('default', input)
	}

	async query(name, input) {
		const query = this.getQuery(name)

		if (!query) throw new ReferenceError(`Failed to execute query: ${name} not found`)
		
		const sources = await query(input)
		
		if (typeof sources === 'undefined') {
			return undefined
		} else if (Array.isArray(sources)) {
			return sources.map(item => {
				return this.getDocument(item)
			})
		} else {
			return this.getDocument(sources)
		}
	}

	async applyMutation(name, document, _data) {
		const mutation = this.getMutation(name)
		const middleware = this.getMutationMiddleware()

		if (!mutation) throw new ReferenceError(`Failed to execute mutation: ${name} not found`)

		let data = _data

		if (middleware.pre) {
			data = await middleware.pre(document, data, name)
		}
		
		const checkValidate = mutation.schema ?
			Validator.validate(mutation.schema, data) :
			{ valid: true }
		
		if (!checkValidate.valid) {
			return [
				undefined,
				checkValidate.error
			]
		}

		let sources = await mutation.fn(document, data)

		if (middleware.post) {
			sources = await middleware.post(document, sources, name)
		}

		return [this.getDocument(sources)]
	}

	async create(inputData) {
		const initializer = this.getInitializer()

		const checkValidate = initializer.schema ?
			Validator.validate(initializer.schema, inputData) :
			{ valid: true }

		if (!checkValidate.valid) {
			return [
				undefined,
				checkValidate.error
			]
		}

		const initializerData = Object.assign({},
			this._definition.documentDefaults(),
			inputData
		)

		const sources = await initializer.fn(initializerData)
		const document = this.getDocument(sources, true)

		for (const binding of this._bindings.create) {
			if (binding.fn(document, binding.input)) {
				binding.emitter.emit('document', document)
			}
		}

		return [document]
	}

	async remove(document) {
		const destructor = this.getDestructor()

		await destructor(document)
	}

	bind(name, input) {
		const binding = this._getBindingDefinitionWithName(name)

		if (!binding) {
			throw new ReferenceError(`Failed to bind to non-existant binding, ${name}`)
		}

		const emitter = new EventEmitter()
		this._bindings[binding.type].push({ name: binding.name, fn: binding.fn, emitter, input })
		
		return emitter
	}

	describe() {
		return this._definition.documentSchema
	}

	_getBindingDefinitionWithName(name) {
		return this._definition.bindings.find(binding => binding.name === name)
	}

	_transformSources(sources, noDefault) {
		const defaults = noDefault ? {} : this._definition.documentDefaults()
		const transformed = this._definition.sourceTransform(sources)
		const filtered = Object.keys(transformed)
			.reduce((acc, key) => {
				const value = transformed[key]
				
				if (typeof value === 'undefined') return acc
				return Object.assign({}, acc, {
					[key]: value
				})
			}, {})
			

		return Object.assign({}, defaults, filtered)
	}
}
