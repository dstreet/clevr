const crypto = require('crypto')
const { Service } = require('microserv')

class DocumentService extends Service {
	constructor(document, server) {
		super()
		this.document = document
		this.server = server
		this.type = 'service'

		this.id = crypto
			.createHash('md5')
			.update(JSON.stringify(document.data))
			.digest('hex')

		this.name = `document.${this.id}`

		this._getMethodsFromDocument()
		server.addService(this)
	}

	equalsDocument(doc) {
		const tmp = crypto
			.createHash('md5')
			.update(JSON.stringify(doc.data))
			.digest('hex')

		return tmp === this.id
	}

	_getMethodsFromDocument() {
		this.register('mutate', (...params) => {
			return this.document.mutate.apply(this.document, params)
				.then(([doc, error]) => {
					if (error) return Promise.reject(error)
					
					const docService = new DocumentService(doc, this.server)
					// this.emit('updated', docService.serviceDescriptor)
					return docService.serviceDescriptor
				})
		}, 'serviceDescriptor')

		this.register('del', this.document.del.bind(this.document))
		this.register('getData', () => this.document.data)
	}
}

module.exports = DocumentService