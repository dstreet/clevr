const Validator = require('./validator')

module.exports =  class Model {
	constructor(definition) {
		if (!definition) throw new Error('Cannot create model: Must provide a definition')

		this._definition = definition
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

	getMutation(name) {
		if (!('mutations' in this._definition)) {
			throw new ReferenceError('Failed to get mutation: No mutations defined')
		}

		return this._definition.mutations[name]
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

	getDocument(sources) {
		const data = this._transformSources(sources)

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
		
		if (Array.isArray(sources)) {
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

		const sources = initializer.fn(inputData)

		return [this.getDocument(sources)]
	}

	async remove(document) {
		const destructor = this.getDestructor()

		await destructor(document)
	}

	describe() {
		return this._definition.documentSchema
	}

	_transformSources(sources) {
		return this._definition.sourceTransform(sources)
	}
}
