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
	}

	build() {
		const sourceTransform = sources => {
			return Object.keys(this._documentData).reduce((acc, key) => {
				return Object.assign({}, acc, {
					[key]: this._documentData[key](sources)
				})
			}, {})	
		}

		const model = new Model({
			documentSchema: this._documentSchema,
			sourceTransform,
			documentDefaults: this.documentDefaults,
			queries: this._queries,
			mutations: this._mutations,
			documentSelector: this._documentSelector,
			initializer: this._initializer,
			destructor: this._destructor
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
			.addStatic(name, model => model.getQuery(name))
	}

	addMutation(name, fn, schema) {
		this._mutations[name] = { fn, schema: Validator.parseType(schema) }
		return this
	}

	addStaticMutation(name, fn, schema) {
		return this
			.addMutation(name, fn, schema)
			.addStatic(name, model => model.getMutation(name))
	}

	addStatic(name, fn) {
		this._statics[name] = fn
		return this
	}

	setSelector(fn) {
		this._documentSelector = fn
		return this
	}

	setInitializer(fn, schema) {
		let compiledSchema = schema

		if (typeof schema !== 'undefined') {
			compiledSchema = Validator.parseType(
				Object.assign({}, this._rawDocumentSchema, schema),
				true
			)
		}

		this._initializer = { fn, schema: compiledSchema }
		return this
	}

	setDestructor(fn) {
		this._destructor = fn
		return this
	}

	describe(shape) {
		const documentData = {}
		const documentDefaults = {}

		const schema = Object.keys(shape).reduce((acc, key) => {
			const tmp = Object.assign({}, shape[key])
			
			documentData[key] = shape[key].data
			documentDefaults[key] = shape[key].default

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
