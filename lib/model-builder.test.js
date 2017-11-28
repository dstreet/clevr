/* eslint-env jest */
const ModelBuilder = require('./model-builder')
const Model = require('./model')

test('Builds a new Model instance', () => {
	const builder = ModelBuilder.create()

	expect(builder.build()).toBeInstanceOf(Model)
})

test('Passes queries to the Model instance', () => {
	const query1 = () => {}
	const query2 = () => {}

	const builder = ModelBuilder
		.create()
		.addQuery('default', query1)
		.addQuery('foo', query2)

	expect(builder.build().getQuery('default')).toBe(query1)
	expect(builder.build().getQuery('foo')).toBe(query2)
})

test('Passes mutations to the Model instance', () => {
	const mutation1 = { fn: () => {}, schema: Number }
	const mutation2 = { fn: () => {}, schema: String }
	
	const builder = ModelBuilder
		.create()
		.addMutation('foo', mutation1.fn, mutation1.schema)
		.addMutation('bar', mutation2.fn, mutation2.schema)

	expect(builder.build().getMutation('foo')).toEqual(mutation1.fn)
	expect(builder.build().getMutation('bar')).toEqual(mutation2.fn)
})

test('Passes initializer to the Model instance', () => {
	const initializer = { fn: () => {}, schema: Number }
	
	const builder = ModelBuilder
		.create()
		.setInitializer(initializer.fn, initializer.schema)

	expect(builder.build().getInitializer()).toEqual(initializer.fn)
})

test('Initializer schema should extend the document schema', () => {
	const builder = ModelBuilder
		.create()
		.describe({
			foo: { type: String },
			bar: { type: Number }
		})
		.setInitializer(() => {}, {
			bar: { type: String }
		})

	expect(builder._initializer.schema).toEqual({
		type: 'object',
		optional: false,
		properties: {
			foo: {
				type: 'string',
				optional: true
			},
			bar: {
				type: 'string',
				optional: true
			}
		}
	})
})

test('Passes destructor to the Model instance', () => {
	const destructor = () => {}
	
	const builder = ModelBuilder
		.create()
		.setDestructor(destructor)

	expect(builder.build().getDestructor()).toEqual(destructor)
})

test('Passes schema to the Model instance', () => {
	const builder = ModelBuilder
		.create()
		.describe({
			foo: {
				type: String,
				data: ({ foo }) => foo.bar
			}
		})

	expect(builder.build().describe()).toEqual({
		type: 'object',
		optional: false,
		properties: {
			foo: {
				type: 'string',
				optional: true
			}
		}
	})
})

test('Attaches static methods to the Model instance', () => {
	const builder = ModelBuilder
		.create()
		.addStatic('foo', model => () => model)

	const model = builder.build()
	expect(model.foo()).toBe(model)
})

