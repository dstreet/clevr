/* eslint-env jest */
const DispatchServer = require('./dispatch-server')
const { Service } = require('microserv')
const { EventEmitter } = require('events')

test('Dispatch server should call the `listen` method of each server', () => {
	const local1 = Object.assign({}, EventEmitter.prototype, {
		listen: jest.fn()
	})
	const local2 = Object.assign({}, EventEmitter.prototype, {
		listen: jest.fn()
	})

	const dispatch = new DispatchServer(local1, local2)
	dispatch.listen()
	expect(local1.listen.mock.calls.length).toBe(1)
	expect(local2.listen.mock.calls.length).toBe(1)
})

test('Dispatch server should call the `announce` method of each server', () => {
	const local1 = Object.assign({}, EventEmitter.prototype, {
		announce: jest.fn()
	})
	const local2 = Object.assign({}, EventEmitter.prototype, {
		announce: jest.fn()
	})

	const dispatch = new DispatchServer(local1, local2)
	dispatch.announce()
	expect(local1.announce.mock.calls.length).toBe(1)
	expect(local2.announce.mock.calls.length).toBe(1)
})

test('Dispatch server should emit `close` when server emits', ()=> {
	const local1 = Object.assign({}, EventEmitter.prototype)
	const dispatch = new DispatchServer(local1)
	const prom = new Promise(res => {
		dispatch.on('close', res)
	})

	local1.emit('close')

	return prom
})

test('Dispatch `need` should resolve with first server to resolve', () => {
	const local1 = Object.assign({}, EventEmitter.prototype, {
		need: () => Promise.resolve(['one'])
	})
	const local2 = Object.assign({}, EventEmitter.prototype, {
		need: () => new Promise(res => seTimeout(res.bind(null, ['two']), 10000))
	})

	const dispatch = new DispatchServer(local1, local2)
	return dispatch.need('service')
		.then(data => {
			expect(data).toEqual(['one'])
		})
})

test('Should only add a service to a selected server', () => {
	const local1 = Object.assign({}, EventEmitter.prototype, {
		addService: jest.fn()
	})
	const local2 = Object.assign({}, EventEmitter.prototype, {
		addService: jest.fn()
	})

	const dispatch = new DispatchServer(local1, local2)
	const service = new Service('testing')

	dispatch.addService(service, 0)

	expect(local1.addService.mock.calls.length).toBe(1)
	expect(local1.addService.mock.calls[0][0]).toBe(service)

	expect(local2.addService.mock.calls.length).toBe(0)
})