/* eslint-env jest */
const DocumentService = require('./document-service')
const { Model, MemSource, Query, MemStore } = require('polymod')

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
const DataSource = new MemSource(store, 'data')
const Data = Model
	.create()
	.addSource('data', DataSource)
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
			.addPopulation({
				name: 'data',
				operation: 'read',
				selector: ({ input }) => ({ id: input })
			})
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
				methods: ['mutate', 'remove', 'getData']
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