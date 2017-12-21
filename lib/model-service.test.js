/* eslint-env jest */
const ModelService = require('./model-service')
const ModelBuilder = require('./model-builder')

test('Creates descriptor with model methods', () => {
	const Data = ModelBuilder
		.create()
		.describe({
			id: {
				type: Number,
				data: ({ data }) => data.id
			},
			data: {
				type: String,
				data: ({ data }) => data.data
			}
		})
		.addQuery('default', () => {})
		.addMutation('updateData', () => {})
		.setInitializer(() => {})
		.setDestructor(() => {})
		.addStatic('foo', () => () => {})

	const service = new ModelService('data', Data)
	
	expect(service.serviceDescriptor).toEqual({
		name: 'clevr.model.data',
		type: 'service',
		methods: ['get', 'applyMutation', 'describe', 'create', 'remove', 'foo']
	})
})

test('`get` method should call the model\'s default query', async () => {
	const fn = jest.fn()
	const Data = ModelBuilder
		.create()
		.addQuery('default', fn)

	const service = new ModelService('data', Data)
	
	await service.methods.get(['foo'])
	expect(fn).toHaveBeenCalledWith('foo')
})

test('`applyMutation` method should call the model\'s `applyMutation`', async () => {
	const fn = jest.fn()
	const Data = ModelBuilder
		.create()
		.addMutation('foo', fn)

	const service = new ModelService('data', Data)
	
	await service.methods.applyMutation(['foo', {}, 'bar'])
	expect(fn).toHaveBeenCalledWith({}, 'bar')
})

test('`create` method should call the model\'s `initializer`', async () => {
	const fn = jest.fn()
	const Data = ModelBuilder
		.create()
		.setInitializer(fn)

	const service = new ModelService('data', Data)
	
	await service.methods.create(['foo'])
	expect(fn).toHaveBeenCalledWith('foo')
})

test('`remove` method should call the model\'s `destructor`', async () => {
	const fn = jest.fn()
	const Data = ModelBuilder
		.create()
		.setDestructor(fn)

	const service = new ModelService('data', Data)
	
	await service.methods.remove({})
	expect(fn).toHaveBeenCalledWith({})
})
