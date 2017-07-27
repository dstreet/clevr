/* eslint-env jest */
const LocalServer = require('./local-server')
const { Service, ClientService } = require('microserv')

test('Server should respond to its own services', () => {
	const server = new LocalServer('test')
	const promise = server.need('service_a')

	const serviceA = new Service('service_a')
	server.addService(serviceA)

	return promise
})

test('Server should resolve with ClientService instances', () => {
	const server = new LocalServer('test')

	const promise = server.need('service_a')
		.then(([ service_a ]) => {
			expect(service_a).toBeInstanceOf(ClientService)
			expect(service_a).toHaveProperty('descriptor', {
				type: 'service',
				name: 'service_a',
				methods: []
			})
		})

	const serviceA = new Service('service_a')
	server.addService(serviceA)

	return promise
})

test('Service methods should apply the service transform function', () => {
	const mockTransform = jest.fn()
	const server = new LocalServer('test', {
		serviceTransform: mockTransform
	})
	const promise = server.need('service_a')
		.then(([ service_a ]) => {
			return service_a.add([1,2])
		})
		.then(res => {
			expect(mockTransform.mock.calls.length).toBe(1)
		})

	const serviceA = new Service('service_a')
	serviceA.register('add', (a, b) => a + b)
	server.addService(serviceA)

	return promise
})