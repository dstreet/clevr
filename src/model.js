const { Model, Query, Schema } = require('polymod')

function getMutationParams(sources) {
	const methods = []
	const sourceParams = sources.reduce((acc, source) => {
		return Object.assign({}, acc, {
			[source.name]: {
				create: cb => methods.push({ source: source.name, data: cb, operation: 'create' }),
				update: cb => methods.push({ source: source.name, data: cb, operation: 'update' }),
				delete: cb => methods.push({ source: source.name, data: cb, operation: 'delete' })
			}
		})
	}, {})

	return [sourceParams, methods]
}

function prop(type) {
	return function(target, property, descriptor) {
		if (!target.properties) target.properties = {}
		if (!target.properties[property]) target.properties[property] = {}

		if (descriptor.get) {
			target.properties[property].data = sources => {
				target.sources = sources
				return descriptor.get.apply(target)
			}
		}

		if (descriptor.set) {
			if (!target.properties[property].mutation) target.properties[property].mutation = {}
			target.properties[property].mutation.method = sources => {
				const [sourceParams, methods] = getMutationParams(sources)
				target.sources = sources
				descriptor.set.call(target, sourceParams)
				return methods
			}
		}

		if (type) {
			target.properties[property].type = type
		}
	}
}

function type(type) {
	return function (target, property, descriptor) {
		if (!target.properties) target.properties = {}
		if (!target.properties[property]) target.properties[property] = {}

		if (descriptor.set) {
			if (!target.properties[property].mutation) target.properties[property].mutation = {}
			target.properties[property].mutation.type = type
		}
	}
}

function required(target, property) {
	if (!target.properties) target.properties = {}
	if (!target.properties[property]) target.properties[property] = {}

	target.properties[property].required = true
}

function mutation(type) {
	return function(target, property, descriptor) {
		if (!target.mutations) target.mutations = []

		target.mutations.push({
			name: property,
			method: sources => {
				const [sourceParams, methods] = getMutationParams(sources)
				target.sources = sources
				descriptor.value.call(target, sourceParams)
				return methods
			},
			type
		})
	}
}

class ModelFactory {
	constructor() {
		this.sources = this.constructor.sources
		this.defaultData = this.constructor.defaultData
		this.defaultQuery = this.constructor.defaultQuery
		this.queries = this.constructor.queries || {}
		this.defaults = this.constructor.defaults || {}
	}

	createModel() {
		const model = Model.create()

		// Add sources
		this.sources.forEach(source => {
			const args = [source.name, source.schema, source.required]

			if (source.bound) {
				model.addBoundSource.apply(model, args)
			} else {
				model.addSource.apply(model, args)
			}
		})

		// Add model descriptor
		model.describe(Object.keys(this.properties).reduce((acc, key) => {
			const prop = this.properties[key]
			const propDescriptor = {
				...acc,
				[key]: prop
			}
			
			// Mutation method
			if (propDescriptor[key].mutation && propDescriptor[key].mutation.method) {
				propDescriptor[key].mutation.method = propDescriptor[key].mutation.method(this.sources)
			}

			// Default
			if (this.defaults[key]) {
				propDescriptor[key].default = this.defaults[key]
			}

			return propDescriptor
		}, {}))

		// Add queries
		model.addQuery('default', this.defaultQuery)
		Object.keys(this.queries).forEach(key => {
			model.addQuery(key, this.queries[key])
		})

		// Add named mutations
		if (this.mutations) {
			this.mutations.forEach(mutation => {
				model.addMutation(mutation.name, mutation.method(this.sources), mutation.type)
			})
		}

		return model
	}
}

module.exports = {
	Model,
	Query,
	Schema,
	
	ModelFactory,
	prop,
	type,
	required,
	mutation
}