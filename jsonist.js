var hyperquest = require('hyperquest')
  , bl         = require('bl')
  , stringify  = require('json-stringify-safe')


function HttpError (status, request) {
    Error.call(this)
    this.status = status
    this.request = request
    Error.captureStackTrace(this, arguments.callee)
}

HttpError.prototype = Object.create(Error.prototype)
HttpError.prototype.constructor = HttpError


function collector (request, callback) {
  request.pipe(bl(function (err, data) {
    if (err)
      return callback(err)

    if (!data.length)
      return callback(null, null, request.response)

    var ret

    try {
      ret = JSON.parse(data.toString())
    } catch (e) {
        if (request.response.statusCode >= 300) {
            var httpError = new HttpError(request.response.statusCode, request)
            return callback(httpError);
        } else {
            var err2 = new SyntaxError('JSON parse error: ' + e.message, e)
            err2.data = data
            err2.response = request.response
            return callback(err2)
        }
    }

    callback(null, ret, request.response)
  }))
}


function makeMethod (method, data) {
  function handler (url, options, callback) {
    if (typeof options == 'function') {
      callback = options
      options = {}
    }

    if (!options.method)
      options.method = method

    if (!options.headers)
      options.headers = {}

    if (data && !options.headers['content-type'])
      options.headers['content-type'] = 'application/json'

    if (!options.headers['accept'])
      options.headers['accept'] = 'application/json'

    var request = (options.hyperquest || hyperquest)(url, options)
    collector(request, callback)

    return request
  }

  function dataHandler (url, data, options, callback) {
    var request = handler(url, options, callback)
    if (typeof data.pipe == 'function')
      data.pipe(request)
    else
      request.end(stringify(data))
    return request
  }

  return data ? dataHandler : handler
}


module.exports.get  = makeMethod('GET'  , false)
module.exports.post = makeMethod('POST' , true)
module.exports.put  = makeMethod('PUT'  , true)
module.exports.HttpError = HttpError

