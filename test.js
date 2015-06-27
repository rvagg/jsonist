const test      = require('tape')
    , http      = require('http')
    , fs        = require('fs')
    , bl        = require('bl')
    , xtend     = require('xtend')
    , EE        = require('events').EventEmitter
    , jsonist   = require('./')
    , stringify = require('json-stringify-safe')


function testServer (serverResponse) {
  var ee     = new EE()
    , server = http.createServer(handler)

  function handler (req, res) {
    req.pipe(bl(function (err, data) {
      if (err)
        return ee.emit('error', err)

      ee.emit('request', req, data.toString())

      setTimeout(server.close.bind(server), 20)
    }))

    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(serverResponse || '')
  }

  server.listen(function () {
    ee.emit('ready', 'http://localhost:' + server.address().port)
  })

  server.on('close', ee.emit.bind(ee, 'close'))

  return ee
}


test('fetch json doc', function (t) {
  t.plan(7)

  var testDoc = { a: 'test', doc: true, arr: [ { of: 'things' } ] }

  testServer(JSON.stringify(testDoc))
    .on('ready', function (url) {
      jsonist.get(url, function (err, data, response) {
        t.notOk(err, 'no error')
        t.deepEqual(data, testDoc, 'got correct doc')
        t.ok(response, 'got response object')
        t.equal(
            response && response.headers && response.headers['content-type']
          , 'application/json', 'verified response object by content-type header'
        )
      })
    })
    .on('request', function (req, data) {
      t.equal(req.method, 'GET', 'got get request')
      t.equal(req.headers['accept'], 'application/json', 'got correct accept header')
    })
    .on('close', t.ok.bind(t, true, 'ended'))
})

test('fetch non-json doc', function (t) {
  t.plan(7)

  testServer('this is not json')
    .on('ready', function (url) {
      jsonist.get(url, function (err, data, response) {
        t.ok(err, 'got error')
        t.notOk(data, 'no data')
        t.notOk(response, 'no response obj')
        t.ok(/JSON/.test(err.message), 'error says something about "JSON"')
      })
    })
    .on('request', function (req, data) {
      t.equal(req.method, 'GET', 'got get request')
      t.equal(req.headers['accept'], 'application/json', 'got correct accept header')
    })
    .on('close', t.ok.bind(t, true, 'ended'))
})

'post put'.split(' ').forEach(function (type) {
  test(type + ' json, no response', function (t) {
    t.plan(9)

    var testDoc = { a: 'test2', doc: true, arr: [ { of: 'things' } ] }

    testServer('')
      .on('ready', function (url) {
        jsonist[type](url, xtend(testDoc), function (err, data, response) {
          t.notOk(err, 'no error')
          t.notOk(data, 'no data')
          t.ok(response, 'got response object')
          t.equal(
              response && response.headers && response.headers['content-type']
            , 'application/json', 'verified response object by content-type header'
          )
        })
      })
      .on('request', function (req, data) {
        t.equal(req.method, type.toUpperCase(), 'got ' + type + ' request')
        t.equal(req.headers['accept'], 'application/json', 'got correct accept header')
        t.equal(req.headers['content-type'], 'application/json', 'got correct encoding')
        t.deepEqual(JSON.parse(data), testDoc, 'got correct ' + type)
      })
      .on('close', t.ok.bind(t, true, 'ended'))
  })

  test(type + ' json, with response', function (t) {
    t.plan(9)

    var sendDoc = { a: 'test2', doc: true, arr: [ { of: 'things' } ] }
      , recvDoc = { recv: 'this', obj: true }

    testServer(JSON.stringify(recvDoc))
      .on('ready', function (url) {
        jsonist[type](url, xtend(sendDoc), function (err, data, response) {
          t.notOk(err, 'no error')
          t.deepEqual(data, recvDoc)
          t.ok(response, 'got response object')
          t.equal(
              response && response.headers && response.headers['content-type']
            , 'application/json', 'verified response object by content-type header'
          )
        })
      })
      .on('request', function (req, data) {
        t.equal(req.method, type.toUpperCase(), 'got ' + type + ' request')
        t.equal(req.headers['accept'], 'application/json', 'got correct accept header')
        t.equal(req.headers['content-type'], 'application/json', 'got correct encoding')
        t.deepEqual(JSON.parse(data), sendDoc, 'got correct ' + type)
      })
      .on('close', t.ok.bind(t, true, 'ended'))
  })

  test(type + ' data with no pipe function treated as data', function (t) {
    t.plan(9)

    var sendDoc = {
            a    : 'test2'
          , doc  : true
          , arr  : [ { of: 'things' } ]
          , pipe : 'this is a string and not a function'
        }
      , recvDoc = { recv: 'this', obj: true }

    testServer(JSON.stringify(recvDoc))
      .on('ready', function (url) {
        jsonist[type](url, xtend(sendDoc), function (err, data, response) {
          t.notOk(err, 'no error')
          t.deepEqual(data, recvDoc)
          t.ok(response, 'got response object')
          t.equal(
              response && response.headers && response.headers['content-type']
            , 'application/json', 'verified response object by content-type header'
          )
        })
      })
      .on('request', function (req, data) {
        t.equal(req.method, type.toUpperCase(), 'got ' + type + ' request')
        t.equal(req.headers['accept'], 'application/json', 'got correct accept header')
        t.equal(req.headers['content-type'], 'application/json', 'got correct encoding')
        t.deepEqual(JSON.parse(data), sendDoc, 'got correct ' + type)
      })
      .on('close', t.ok.bind(t, true, 'ended'))
  })

  test(type + ' data with pipe function will data.pipe(req)', function (t) {
    t.plan(10)

    var sendDoc = {
            a    : 'test2'
          , doc  : true
          , arr  : [ { of: 'things' } ]
        }
      , stream = {
          pipe: function (req) {
            t.ok(req, 'request should be set')
            req.end(stringify(sendDoc))
          }
        }
      , recvDoc = { recv: 'this', obj: true }

    testServer(JSON.stringify(recvDoc))
      .on('ready', function (url) {
        jsonist[type](url, stream, function (err, data, response) {
          t.notOk(err, 'no error')
          t.deepEqual(data, recvDoc)
          t.ok(response, 'got response object')
          t.equal(
              response && response.headers && response.headers['content-type']
            , 'application/json', 'verified response object by content-type header'
          )
        })
      })
      .on('request', function (req, data) {
        t.equal(req.method, type.toUpperCase(), 'got ' + type + ' request')
        t.equal(req.headers['accept'], 'application/json', 'got correct accept header')
        t.equal(req.headers['content-type'], 'application/json', 'got correct encoding')
        t.deepEqual(JSON.parse(data), sendDoc, 'got correct ' + type)
      })
      .on('close', t.ok.bind(t, true, 'ended'))
  })

  test(type + ' data with pipe function and real stream works', function (t) {
    t.plan(9)

    var file    = __dirname + '/package.json'
      , content = JSON.parse(fs.readFileSync(file))
      , stream  = fs.createReadStream(file)
      , recvDoc = { recv: 'this', obj: true }

    testServer(JSON.stringify(recvDoc))
      .on('ready', function (url) {
        jsonist[type](url, stream, function (err, data, response) {
          t.notOk(err, 'no error')
          t.deepEqual(data, recvDoc)
          t.ok(response, 'got response object')
          t.equal(
              response && response.headers && response.headers['content-type']
            , 'application/json', 'verified response object by content-type header'
          )
        })
      })
      .on('request', function (req, data) {
        t.equal(req.method, type.toUpperCase(), 'got ' + type + ' request')
        t.equal(req.headers['accept'], 'application/json', 'got correct accept header')
        t.equal(req.headers['content-type'], 'application/json', 'got correct encoding')
        t.deepEqual(JSON.parse(data), content, 'got correct ' + type)
      })
      .on('close', t.ok.bind(t, true, 'ended'))
  })
})
