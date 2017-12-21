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
		this._attachMiddleware()
	}

	_getMethodsFromModel() {
		this.model.queries.forEach(query => {
			if (query === 'default') {
				this.register('get', (...params) => {
					return this.model.get.apply(this.model, params)
						.then(createDocumentService.bind(this))
				}, 'serviceDescriptor')
			} else {
				this.register(query, (...params) => {
					return this.model.query.apply(this.model, [query].concat(params))
						.then(doc => {
							if (Array.isArray(doc)) {
								return doc.map(d => createDocumentService.call(this, d))
							}

							return createDocumentService.call(this, doc)
						})
						// eslint-disable-next-line no-console
						.catch(console.log.bind())
				}, 'serviceDescriptor')
			}
		})

		this.register('describe', this.model.describe.bind(this.model))
		this.register('create', (...params) => {
			return this.model.create.apply(this.model, params)
				.then(([ doc, error ]) => {
					if (error) return Promise.reject(error)
					
					const docService = createDocumentService.call(this, doc)
					this.emit('create', doc.data)

					return docService
				})
				// eslint-disable-next-line no-console
				.catch(console.log.bind())
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

	_attachMiddleware() {
		this.originalMiddleware = this.model.getMutationMiddleware() || {}
		this.model.addMutationMiddleware(this._preMiddleware.bind(this), this._postMiddleware.bind(this))
	}

	_preMiddleware(input, sources, name) {
		this.emit(`pre.${name}`, { input, sources })

		if (this.originalMiddleware.pre) {
			return this.originalMiddleware.pre(input, sources, name)
		} else {
			return [ input, sources ]
		}
	}

	_postMiddleware(input, sources, name) {
		this.emit(`post.${name}`, { input, sources })

		if (this.originalMiddleware.post) {
			return this.originalMiddleware.post(input, sources, name)
		} else {
			return [ input, sources ]
		}
	}
}

module.exports = ModelService
