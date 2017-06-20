/* eslint-env jest */
const DocumentService = require('./document-service')
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
	.addMutation('updateData', [
		{ source: 'data', data: data => data }
	])

test('Creates descriptor with document methods', () => {
	const server = {
		addService: () => {}
	}

	return Data.get(1)
		.then(document => {
			const service = new DocumentService(document, server)
			expect(service.serviceDescriptor).toEqual({
				name: `document.${service.id}`,
				type: 'service',
				methods: ['mutate', 'del', 'getData']
			})
		})
})

test('Correctly compares document service to document', () => {
	const server = {
		addService: () => {}
	}

	return Data.get(1)
		.then(document => {
			const service = new DocumentService(document, server)
			expect(service.equalsDocument(document)).toBeTruthy()
		})
})