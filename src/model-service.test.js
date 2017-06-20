/* eslint-env jest */
const ModelService = require('./model-service')
const { Model, Schema, Query, MemStore } = require('polymod')

const store = new MemStore({
	data: [
		{
			id: 1,
			data: 'one'
		},
		{
			id: 2,
			data: 'two'
		}
	]
})
const DataSchema = new Schema(store, 'data')
const Data = Model
	.create()
	.addSource('data', DataSchema)
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
	.addQuery('default',
		Query
			.create()
			.input(id => ({ data: { id } }))
			.populate('data', ({ data }) => ({ id: data.id }))
	)

test('Creates descriptor with model methods', () => {
	const service = new ModelService('data', Data)
	
	expect(service.serviceDescriptor).toEqual({
		name: 'clevr.model.data',
		type: 'service',
		methods: ['get', 'describe', 'create']
	})
})