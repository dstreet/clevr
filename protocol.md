# Clevr RPC Protocol

Clevr's RPC protocol uses JSON-RPC over a websocket connection

## Announcing a server

The server will announce itself over multicast, allowing other servers
to get its host and port.

## Getting a server's exposed services

Each Clevr server instance exposes the RPC method `__services__`. The method
takes zero parameters, and returns an object, with top-level properties
for each service exposed by the server. Each service contains a service
descriptor, which defines the name of the service, and the methods that
are exposed on that service:

```json
{
	"service_a": {
		"type": "service",
		"name": "service_a",
		"methods": ["method_a", "method_b", "method_c"]
	},
	"service_b": {
		"type": "service",
		"name": "service_b",
		"methods": ["method_a", "method_b"]
	}
}
```

A server can add a new service at any time. When a server adds a new service
after it initially announces, it will emit a `__add_service__` event on the
websocket connection. The data that is passed through the event is similar
to the result of the `__services__` method, but will only contain the new
service.

## Calling RPC methods on the client

When a client requests a service, it is given a new client service instance.
The client service will expose each of the service's methods to the client.
When called, a service method will call the coresponding JSON-RPC method
over the websocket connection. The parameters passed to the client method,
will be passed through to the JSON-RPC method according to the spec. The name
of the JSON-RPC method is the concatenation of the service name and the method
name joined by a dot (".").

The result of the method is an object that contains the data returned from the
server, as well as the data type.

```json
{
	"type": "string",
	"data": "Hello, world!"
}
```

By default, the data type is inferred from the type of data being returned.
This can, however, be overriden to set a custom type. For instance, it may
be useful to return a service descriptor so that the client can request
the new service. In which case, the type could be "serviceDescriptor," allowing
the client to handle that situation appropriately.

## Handling closed connections

During the lifecycle of a server, it is possible that one its service
dependencies goes down. If the websocket connection is dropped for any reason,
the service will emit a "close" event. If the service comes back online, it
will be picked up again by the client, and a "reopenned" event will be fired
on the service. This allows client's to gracefully handle
service interruptions.