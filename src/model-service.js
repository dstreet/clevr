const { Service } = require('microserv')
const DocumentService = require('./document-service')

class ModelService extends Service {
	constructor(name, model, server) {
		super(`clevr.model.${name}`)
		this.model = model
		this.server = server
		this.methods = {}
		this.documentServices = []

		this._getMethodsFromModel()
	}

	_getMethodsFromModel() {
		this.model.queries.forEach(query => {
			if (query.name === 'default') {
				this.register('get', (...params) => {
					return this.model.get.apply(this.model, params)
						.then(createDocumentService.bind(this))
				}, 'serviceDescriptor')
			} else {
				this.register(query.name, (...params) => {
					return this.model.query(query.name, params)
						.then(doc => {
							if (Array.isArray(doc)) {
								return doc.map(d => createDocumentService.call(this, d))
							}

							return createDocumentService.call(this, doc)
						})
				}, 'serviceDescriptor')
			}
		})

		this.register('describe', this.model.describe.bind(this.model))
		this.register('create', (...params) => {
			return this.model.create.apply(this.model, params)
				.then(([ doc, error ]) => {
					if (error) return Promise.reject(error)

					return createDocumentService.call(this, doc)
				})
		}, 'serviceDescriptor')
		
		function createDocumentService(document) {
			if (!document.data) {
				return { type: 'null' }
			}

			// Look for existing document in the cache
			let docService = this.documentServices.find(doc => doc.equalsDocument(document))

			if (!docService) {
				docService = new DocumentService(document, this.server)
				this.documentServices.push(docService)
			}
			
			return docService.serviceDescriptor
		}
	}
}

module.exports = ModelService