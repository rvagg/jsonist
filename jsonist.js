const hyperquest = require('hyperquest')
    , bl         = require('bl')
    , stringify  = require('json-stringify-safe')


function collector (callback) {
  return bl(function (err, data) {
    if (err)
      return callback(err)

    if (!data.length)
      return callback(null, null)

    var ret

    try {
      ret = JSON.parse(data.toString())
    } catch (e) {
      var err = new SyntaxError('JSON parse error: ' + e.message, e)
      err.data = data
      return callback(err)
    }

    callback(null, ret)
  })
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
    request.pipe(collector(callback))

    return request
  }

  function dataHandler (url, data, options, callback) {
    return handler(url, options, callback).end(stringify(data))
  }

  return data ? dataHandler : handler
}


module.exports.get  = makeMethod('GET'  , false)
module.exports.post = makeMethod('POST' , true)
module.exports.put  = makeMethod('PUT'  , true)
