const { Client: MicroservClient } = require('microserv')

class Client {
	constructor() {
		this._client = new MicroservClient({
			serviceTransform: this._serviceMethodTransform.bind(this)
		})
	}

	connect(connection) {
		return this._client.connect(connection)
	}

	requireServices(...services) {
		return this._client.need.apply(this._client, services)
	}

	_serviceMethodTransform(descriptor) {
		if (descriptor.type === 'serviceDescriptor') {
			if (descriptor.data.type === 'null') {
				return null
			}
			
			if (Array.isArray(descriptor.data)) {
				return this.requireServices.apply(this, descriptor.data.map(item => item.name))
			}

			return this.requireServices(descriptor.data.name)
				.then(([ service ]) => service)
		}

		return descriptor.data
	}
}

module.exports = Client