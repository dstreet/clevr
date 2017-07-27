/* eslint-env jest */
const App = require('./app')
const ModelService = require('./model-service')

test('Plugins should be called', () => {
	const app = new App('testing', true)
	const plugin = jest.fn()

	app.attachPlugin(plugin)
	expect(plugin.mock.calls.length).toBe(1)
	expect(plugin.mock.calls[0][0]).toBe(app)
})

test('Models should be exposed as services', () => {
	const app = new App('testing', false)
	app.server.addService = jest.fn()

	const model = {
		queries: [],
		describe: () => {},
		get: () => {},
		create: () => {},
		getMutationMiddleware: () => {},
		addMutationMiddleware: () => {}
	}

	app.addModel('test', model)
	app.start()

	expect(app.server.addService.mock.calls.length).toBe(1)
	expect(app.server.addService.mock.calls[0][0]).toBeInstanceOf(ModelService)
})

test('App should not announce until all deferred services are resolved', () => {
	const app = new App('testing', false)

	app.server.announce = jest.fn()

	app.registerService('defer-me', ['msg'], () => ([]))
	app.start('one')

	expect(app.server.announce.mock.calls.length).toBe(0)

	app.registerService('msg', [])

	return (new Promise(res => {
		setTimeout(res, 200)
	})).then(() => {
		expect(app.server.announce.mock.calls.length).toBe(1)
	})
})