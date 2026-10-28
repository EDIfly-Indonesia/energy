'use strict';

/**
 * Adapt an Express-style `(req, res)` route handler to a Fastify handler.
 *
 * The legacy controllers are written against Express (req.body / res.send /
 * res.json / res.end). This shim keeps them working unchanged while the HTTP
 * layer migrates to Fastify. Business logic is preserved verbatim.
 */

function toFastify(handler) {
  return async function (request, reply) {
    const res = {
      status: (code) => {
        reply.code(code);
        return res;
      },
      send: (body) => reply.send(body),
      json: (body) => reply.send(body),
      end: () => {},
      set: (name, value) => {
        reply.header(name, value);
        return res;
      },
      setHeader: (name, value) => {
        reply.header(name, value);
        return res;
      },
      getHeader: (name) => reply.getHeader(name),
    };

    return handler(request, res);
  };
}

module.exports = { toFastify };
