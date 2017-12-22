/* eslint-env jest */
const Model = require('./model')
const ModelBuilder = require('./model-builder')

describe('constructor()', () => {
	test('should throw an error if no definition is provided', () => {
		const fn = () => new Model()

		expect(fn).toThrow('Cannot create model: Must provide a definition')
	})
})

describe('getQuery()', () => {
	test('should throw an error if no queries are defined', () => {
		const model = new Model({})
		const fn = () => model.getQuery('foo')

		expect(fn).toThrow('Failed to get query: No queries defined')
	})
})

describe('getMutation()', () => {
	test('should throw an error if no mutations are defined', () => {
		const model = new Model({})
		const fn = () => model.getMutation('foo')

		expect(fn).toThrow('Failed to get mutation: No mutations defined')
	})
})

describe('getInitializer()', () => {
	test('should throw an error if no initializer is defined', () => {
		const model = new Model({})
		const fn = () => model.getInitializer()

		expect(fn).toThrow('Failed to get initializer: No initializer defined')
	})
})

describe('get()', async () => {
	test('should execute the default query and pass results through the source transform', async () => {
		const model = ModelBuilder
			.create()
			.addQuery('default', () => {
				return {
					user: { id: 1, first: 'John', last: 'Smith' }
				}
			})
			.setSelector((document, { user }) => ({ id: user.id }))
			.describe({
				full: {
					type: String,
					data: ({ user }) => `${user.first} ${user.last}`
				}
			})
			.build()
	
		const result = await model.get(1)
		expect(result).toEqual({
			selector: { id: 1 },
			data: { full: 'John Smith'}
		})
	})
})

describe('query()', async () => {
	test('should execute the named query and pass results through the source transform', async () => {
		const model = ModelBuilder
			.create()
			.addQuery('foo', () => {
				return {
					user: { id: 1, first: 'John', last: 'Smith' }
				}
			})
			.setSelector((document, { user }) => ({ id: user.id }))
			.describe({
				full: {
					type: String,
					data: ({ user }) => `${user.first} ${user.last}`
				}
			})
			.build()
	
		const result = await model.query('foo')
		expect(result).toEqual({
			selector: { id: 1 },
			data: { full: 'John Smith' }
		})
	})

	test('should pass the query results through the source transform and apply defaults', async () => {
		const model = ModelBuilder
			.create()
			.addQuery('foo', () => {
				return {
					user: { id: 1, first: 'John', last: 'Smith' }
				}
			})
			.setSelector((document, { user }) => ({ id: user.id }))
			.describe({
				full: {
					type: String,
					data: ({ user }) => `${user.first} ${user.last}`
				},
				nickname: {
					type: String,
					default: 'Sir pickles',
					data: ({ user }) => user.nickname
				}
			})
			.build()

		const result = await model.query('foo')
		expect(result).toEqual({
			selector: { id: 1 },
			data: { full: 'John Smith', nickname: 'Sir pickles' }
		})
	})
	
	test('should throw an error if query function errors', async () => {
		const model = ModelBuilder
			.create()
			.addQuery('foo', () => {
				throw new Error('Oh no!')
			})
			.setSelector((document, { user }) => ({ id: user.id }))
			.describe({
				full: {
					type: String,
					data: ({ user }) => `${user.first} ${user.last}`
				}
			})
			.build()
	
		expect.assertions(1)
	
		try {
			await model.query('foo')
		} catch (err) {
			expect(err).toBeInstanceOf(Error)
		}
	})
	
	test('should return multiple documents when result of query is an array', async () => {
		const model = ModelBuilder
			.create()
			.addQuery('foo', () => {
				return [
					{
						user: { id: 1, first: 'John', last: 'Smith' }
					},
					{
						user: { id: 2, first: 'Jane', last: 'Doe' }
					}
				]
			})
			.setSelector((document, { user }) => ({ id: user.id }))
			.describe({
				full: {
					type: String,
					data: ({ user }) => `${user.first} ${user.last}`
				}
			})
			.build()
	
		const docs = await model.query('foo')
		expect(docs).toHaveLength(2)
	})
})

describe('applyMutation()', async () => {
	test('should execute the named mutation and pass results through the source transform', async () => {
		const model = ModelBuilder
			.create()
			.addQuery('default', () => {
				return {
					user: { id: 1, first: 'John', last: 'Smith' }
				}
			})
			.addMutation('updateLastName', (document, data) => {
				const user = { id: 1, first: 'John', last: 'Smith' }
				user.last = data
	
				return { user }
			})
			.setSelector((document, { user }) => ({ id: user.id }))
			.describe({
				full: {
					type: String,
					data: ({ user }) => `${user.first} ${user.last}`
				}
			})
			.build()
	
		const doc = await model.get()
		const [ updatedDoc ] = await model.applyMutation('updateLastName', doc, 'Simpson')
		expect(updatedDoc.data).toEqual({
			full: 'John Simpson'
		})
	})
	
	test('should return a validation error if the input does not match the schema', async () => {
		const model = ModelBuilder
		.create()
		.addQuery('default', () => {
			return {
				user: { id: 1, first: 'John', last: 'Smith' }
			}
		})
		.addMutation('updateLastName', (document, data) => {
			const user = { id: 1, first: 'John', last: 'Smith' }
			user.last = data
	
			return { user }
		}, String)
		.setSelector((document, { user }) => ({ id: user.id }))
		.describe({
			full: {
				type: String,
				data: ({ user }) => `${user.first} ${user.last}`
			}
		})
		.build()
	
		const doc = await model.get()
		const [ updatedDoc, err ] = await model.applyMutation('updateLastName', doc, 120)
		expect(updatedDoc).toBeUndefined()
		expect(err).toEqual([
			{
				code: null,
				message: 'must be string, but is number',
				property: '@',
				reason: 'type'
			}
		])
	})

	test('should execute the "pre" and "post" middleware', async () => {
		const pre = jest.fn((document, input) => input)
		const post = jest.fn((document, sources) => sources)

		const model = ModelBuilder
			.create()
			.addQuery('default', () => {
				return {
					user: { id: 1, first: 'John', last: 'Smith' }
				}
			})
			.addMutation('updateLastName', (document, data) => {
				const user = { id: 1, first: 'John', last: 'Smith' }
				user.last = data
	
				return { user }
			})
			.setMutationMiddleware(pre, post)
			.setSelector((document, { user }) => ({ id: user.id }))
			.describe({
				full: {
					type: String,
					data: ({ user }) => `${user.first} ${user.last}`
				}
			})
			.build()
	
		const doc = await model.get()
		const [ updatedDoc ] = await model.applyMutation('updateLastName', doc, 'Simpson')
		
		expect(updatedDoc.data).toEqual({
			full: 'John Simpson'
		})
		expect(pre).toHaveBeenCalledWith(
			{
				selector: { id: 1 },
				data: { full: 'John Smith' }
			},
			'Simpson',
			'updateLastName'
		)
		expect(post).toHaveBeenCalledWith(
			{
				selector: { id: 1 },
				data: { full: 'John Smith' }
			},
			{
				user: { id: 1, first: 'John', last: 'Simpson' }
			},
			'updateLastName'
		)
	})
})

describe('create()', async () => {
	test('should execute the initializer and pass data through the source transform', async () => {
		const model = ModelBuilder
			.create()
			.addQuery('default', () => {
				return {
					user: { id: 1, first: 'John', last: 'Smith' }
				}
			})
			.setInitializer(data => {
				return {
					user: data
				}
			})
			.setSelector((document, { user }) => ({ id: user.id }))
			.describe({
				full: {
					type: String,
					data: ({ user }) => `${user.first} ${user.last}`
				}
			})
			.build()

		const [ newDocument ] = await model.create({ id: 2, first: 'Jane', last: 'Doe' })
		expect(newDocument).toEqual({
			selector: { id: 2 },
			data: {
				full: 'Jane Doe'
			}
		})
	})

	test('should return a validation error if the input does not match the schema', async () => {
		const model = ModelBuilder
			.create()
			.addQuery('default', () => {
				return {
					user: { id: 1, first: 'John', last: 'Smith' }
				}
			})
			.setInitializer(data => {
				return {
					user: data
				}
			}, {
				first: {
					type: String,
					required: true
				},
				last: {
					type: String,
					required: true
				}
			})
			.setSelector((document, { user }) => ({ id: user.id }))
			.describe({
				full: {
					type: String,
					data: ({ user }) => `${user.first} ${user.last}`
				}
			})
			.build()

		const [ newDocument, err ] = await model.create({ id: 2, first: 'Jane' })
		expect(newDocument).toBeUndefined()
		expect(err).toEqual([
			{
				code: null,
				message: 'is missing and not optional',
				property: '@.last',
				reason: 'optional'
			}
		])
	})

	test('should emit the document to all matching bindings', async () => {
		const model = ModelBuilder
			.create()
			.addQuery('default', () => {
				return {
					user: { id: 1, first: 'John', last: 'Smith' }
				}
			})
			.setInitializer(data => {
				return {
					user: data
				}
			})
			.setSelector((document, { user }) => ({ id: user.id }))
			.addBinding('create', 'newMatchingName', (document, input) => {
				return document.data.full.indexOf(input) >= 0
			})
			.describe({
				full: {
					type: String,
					data: ({ user }) => `${user.first} ${user.last}`
				}
			})
			.build()
		
		model.bind('newMatchingName', 'Jane')
		const spy = jest.fn()

		model.on('newMatchingName', spy)
		const [ newDocument ] = await model.create({ id: 2, first: 'Jane', last: 'Doe' })
		
		expect(spy).toHaveBeenCalledWith(newDocument)
	})
})

describe('remove()', async () => {
	test('should execute the destructor function', async () => {
		const fn = jest.fn()
		const model = ModelBuilder
			.create()
			.setDestructor(fn)
			.build()
		
		await model.remove({ data: { full: 'John Doe' }})
		expect(fn).toHaveBeenCalledWith({ data: { full: 'John Doe' }})
	})
})
