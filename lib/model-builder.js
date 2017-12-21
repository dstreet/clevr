const Model = require('./model')
const Validator = require('./validator')

module.exports = class ModelBuilder {
	static create() {
		return new ModelBuilder()
	}

	constructor() {
		this._rawDocumentSchema = {}
		this._documentSchema = {}
		this._documentData = {}
		this._documentDefaults = {}
		this._queries = {}
		this._mutations = {}
		this._statics = {}
		this._documentSelector = () => ({})
		this._mutationMiddleware = {}
	}

	build() {
		const sourceTransform = sources => {
			return Object.keys(this._documentData).reduce((acc, key) => {
				return Object.assign({}, acc, {
					[key]: this._documentData[key](sources)
				})
			}, {})	
		}

		const documentDefaults = () => {
			return Object.keys(this._documentDefaults).reduce((acc, key) => {
				let value = this._documentDefaults[key]

				if (typeof this._documentDefaults[key] === 'function') {
					value = this._documentDefaults[key]()
				}

				return Object.assign({}, acc, {
					[key]: value
				})
			}, {})
		}

		const model = new Model({
			documentSchema: this._documentSchema,
			sourceTransform,
			documentDefaults,
			queries: this._queries,
			mutations: this._mutations,
			documentSelector: this._documentSelector,
			initializer: this._initializer,
			destructor: this._destructor,
			statics: Object.keys(this._statics),
			mutationMiddleware: this._mutationMiddleware
		})

		for (const key in this._statics) {
			model[key] = this._statics[key](model)
		}

		return model
	}

	addQuery(name, fn) {
		this._queries[name] = fn
		return this
	}

	addStaticQuery(name, fn) {
		return this
			.addQuery(name, fn)
			.addStatic(name, model => model.getQueryExecutor(name))
	}

	addMutation(name, fn, schema) {
		this._mutations[name] = { fn, schema: Validator.parseType(schema) }
		return this
	}

	addStaticMutation(name, fn, schema) {
		return this
			.addMutation(name, fn, schema)
			.addStatic(name, model => model.getMutationExecutor(name))
	}

	addStatic(name, fn) {
		this._statics[name] = fn
		return this
	}

	setSelector(fn) {
		this._documentSelector = fn
		return this
	}

	setInitializer(fn, schema, noExtend) {
		let compiledSchema = schema

		if (typeof schema !== 'undefined') {
			if (!noExtend) {
				compiledSchema = Validator.parseType(
					Object.assign({}, this._rawDocumentSchema, schema),
					true
				)
			} else {
				compiledSchema = Validator.parseType(schema)
			}
		}

		this._initializer = { fn, schema: compiledSchema }
		return this
	}

	setDestructor(fn) {
		this._destructor = fn
		return this
	}

	setMutationMiddleware(pre, post) {
		this._mutationMiddleware = { pre, post }
		return this
	}

	getMutationMiddleware() {
		return this._mutationMiddleware
	}

	describe(shape) {
		const documentData = {}
		const documentDefaults = {}

		const schema = Object.keys(shape).reduce((acc, key) => {
			const tmp = Object.assign({}, shape[key])
			
			documentData[key] = shape[key].data

			if (typeof shape[key].default !== 'undefined') {
				documentDefaults[key] = shape[key].default
			}

			delete tmp.data
			delete tmp.default
			
			return Object.assign({}, acc, {
				[key]: tmp
			}, )
		}, {})

		this._rawDocumentSchema = schema
		this._documentSchema = Validator.parseType(schema, true)
		this._documentData = documentData
		this._documentDefaults = documentDefaults

		return this
	}
}
