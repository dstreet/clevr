module.exports = (app, serviceClass) => {
	return app.registerService(
		serviceClass.getServiceName(),
		serviceClass.getRequiredServices(),
		( ...services ) => {
			const instance = new (Function.prototype.bind.apply(serviceClass, [ null, ...services ]))
			const methods = Object.getOwnPropertyNames(serviceClass.prototype)

			return methods
				.filter(m => m !== 'constructor' && m[0] !== '_')
				.map(method => ({
					name: method,
					cb: instance[method].bind(instance),
				}))
		}
	)
}
