const test = require('tape')
const http = require('http')
const fs = require('fs')
const bl = require('bl')
const EE = require('events').EventEmitter
const jsonist = require('./')
const stringify = require('json-stringify-safe')
const after = require('after')

function testServer (serverResponse, statusCode) {
  const ee = new EE()
  const server = http.createServer(handler)

  function handler (req, res) {
    req.pipe(bl((err, data) => {
      if (err) { return ee.emit('error', err) }

      ee.emit('request', req, data.toString())

      setTimeout(server.close.bind(server), 20)
    }))

    res.writeHead(
      typeof statusCode === 'number' ? statusCode : 200
      , { 'content-type': 'application/json' }
    )
    res.end(serverResponse || '')
  }

  server.listen(() => {
    ee.emit('ready', 'http://localhost:' + server.address().port)
  })

  server.on('close', ee.emit.bind(ee, 'close'))

  return ee
}

for (const type of ['get', 'delete']) {
  for (const promise of [true, false]) {
    test(`${type} fetch json doc with ${promise ? 'Promise' : 'callback'}`, (t) => {
      t.plan(7)

      const testDoc = { a: 'test', doc: true, arr: [{ of: 'things' }] }

      function verify (data, response) {
        t.deepEqual(data, testDoc, 'got correct doc')
        t.ok(response, 'got response object')
        t.equal(
          response && response.headers && response.headers['content-type']
          , 'application/json', 'verified response object by content-type header'
        )
      }

      testServer(stringify(testDoc))
        .on('ready', (url) => {
          if (promise) {
            jsonist[type](url).then(({ data, response }) => {
              verify(data, response)
            }).catch((err) => {
              t.ifError(err)
            })
            t.ok(true) // account for callback ifError()
          } else {
            jsonist[type](url, (err, data, response) => {
              t.ifError(err)
              verify(data, response)
            })
          }
        })
        .on('request', (req, data) => {
          t.equal(req.method, type.toUpperCase(), `got ${type} request`)
          t.equal(req.headers.accept, 'application/json', 'got correct accept header')
        })
        .on('close', t.ok.bind(t, true, 'ended'))
    })

    test(`${type} fetch non-json doc with ${promise ? 'Promise' : 'callback'}`, (t) => {
      t.plan(promise ? 4 : 7)

      testServer('this is not json')
        .on('ready', (url) => {
          if (promise) {
            jsonist[type](url).then(() => {
              t.fail('should have errored')
            }).catch((err) => {
              t.ok(/JSON/.test(err.message), 'error says something about "JSON"')
            })
          } else {
            jsonist[type](url, (err, data, response) => {
              t.ok(err, 'got error')
              t.notOk(data, 'no data')
              t.notOk(response, 'no response obj')
              t.ok(/JSON/.test(err.message), 'error says something about "JSON"')
            })
          }
        })
        .on('request', (req, data) => {
          t.equal(req.method, type.toUpperCase(), `got ${type} request`)
          t.equal(req.headers.accept, 'application/json', 'got correct accept header')
        })
        .on('close', t.ok.bind(t, true, 'ended'))
    })
  }
}

for (const type of ['post', 'put']) {
  for (const promise of [true, false]) {
    test(`${type} json, no response with ${promise ? 'Promise' : 'callback'}`, (t) => {
      t.plan(9)

      const testDoc = { a: 'test2', doc: true, arr: [{ of: 'things' }] }

      function verify (data, response) {
        t.notOk(data, 'no data')
        t.ok(response, 'got response object')
        t.equal(
          response && response.headers && response.headers['content-type']
          , 'application/json', 'verified response object by content-type header'
        )
      }

      testServer('')
        .on('ready', (url) => {
          if (promise) {
            jsonist[type](url, Object.assign(testDoc)).then(({ data, response }) => {
              verify(data, response)
            }).catch((err) => {
              t.ifError(err)
            })
            t.ok(true) // account for t.ifError() on callback plan
          } else {
            jsonist[type](url, Object.assign(testDoc), (err, data, response) => {
              t.ifError(err)
              verify(data, response)
            })
          }
        })
        .on('request', (req, data) => {
          t.equal(req.method, type.toUpperCase(), `got ${type} request`)
          t.equal(req.headers.accept, 'application/json', 'got correct accept header')
          t.equal(req.headers['content-type'], 'application/json', 'got correct encoding')
          t.deepEqual(JSON.parse(data), testDoc, 'got correct ' + type)
        })
        .on('close', t.ok.bind(t, true, 'ended'))
    })

    test(`${type} json, with response with ${promise ? 'Promise' : 'callback'}`, (t) => {
      t.plan(9)

      const sendDoc = { a: 'test2', doc: true, arr: [{ of: 'things' }] }
      const recvDoc = { recv: 'this', obj: true }

      function verify (data, response) {
        t.deepEqual(data, recvDoc)
        t.ok(response, 'got response object')
        t.equal(
          response && response.headers && response.headers['content-type']
          , 'application/json', 'verified response object by content-type header'
        )
      }

      testServer(stringify(recvDoc))
        .on('ready', (url) => {
          if (promise) {
            jsonist[type](url, Object.assign(sendDoc)).then(({ data, response }) => {
              verify(data, response)
            }).catch((err) => {
              t.ifError(err)
            })
            t.ok(true) // account for t.ifError() on callback plan
          } else {
            jsonist[type](url, Object.assign(sendDoc), (err, data, response) => {
              t.ifError(err)
              verify(data, response)
            })
          }
        })
        .on('request', (req, data) => {
          t.equal(req.method, type.toUpperCase(), `got ${type} request`)
          t.equal(req.headers.accept, 'application/json', 'got correct accept header')
          t.equal(req.headers['content-type'], 'application/json', 'got correct encoding')
          t.deepEqual(JSON.parse(data), sendDoc, 'got correct ' + type)
        })
        .on('close', t.ok.bind(t, true, 'ended'))
    })

    test(`${type} data with no pipe function treated as data with ${promise ? 'Promise' : 'callback'}`, (t) => {
      t.plan(9)

      const sendDoc = {
        a: 'test2',
        doc: true,
        arr: [{ of: 'things' }],
        pipe: 'this is a string and not a function'
      }
      const recvDoc = { recv: 'this', obj: true }

      function verify (data, response) {
        t.deepEqual(data, recvDoc)
        t.ok(response, 'got response object')
        t.equal(
          response && response.headers && response.headers['content-type']
          , 'application/json', 'verified response object by content-type header'
        )
      }

      testServer(stringify(recvDoc))
        .on('ready', (url) => {
          if (promise) {
            jsonist[type](url, Object.assign(sendDoc)).then(({ data, response }) => {
              verify(data, response)
            }).catch((err) => {
              t.ifError(err)
            })
            t.ok(true) // account for t.ifError() on callback plan
          } else {
            jsonist[type](url, Object.assign(sendDoc), (err, data, response) => {
              t.ifError(err)
              verify(data, response)
            })
          }
        })
        .on('request', (req, data) => {
          t.equal(req.method, type.toUpperCase(), `got ${type} request`)
          t.equal(req.headers.accept, 'application/json', 'got correct accept header')
          t.equal(req.headers['content-type'], 'application/json', 'got correct encoding')
          t.deepEqual(JSON.parse(data), sendDoc, 'got correct ' + type)
        })
        .on('close', t.ok.bind(t, true, 'ended'))
    })

    test(`${type} data with pipe function will data.pipe(req) with ${promise ? 'Promise' : 'callback'}`, (t) => {
      t.plan(10)

      const sendDoc = {
        a: 'test2',
        doc: true,
        arr: [{ of: 'things' }]
      }
      const stream = {
        pipe: (req) => {
          t.ok(req, 'request should be set')
          req.end(stringify(sendDoc))
        }
      }
      const recvDoc = { recv: 'this', obj: true }

      function verify (data, response) {
        t.deepEqual(data, recvDoc)
        t.ok(response, 'got response object')
        t.equal(
          response && response.headers && response.headers['content-type']
          , 'application/json', 'verified response object by content-type header'
        )
      }

      testServer(stringify(recvDoc))
        .on('ready', (url) => {
          if (promise) {
            jsonist[type](url, stream).then(({ data, response }) => {
              verify(data, response)
            }).catch((err) => {
              t.ifError(err)
            })
            t.ok(true) // account for t.ifError() on callback plan
          } else {
            jsonist[type](url, stream, (err, data, response) => {
              t.ifError(err)
              verify(data, response)
            })
          }
        })
        .on('request', (req, data) => {
          t.equal(req.method, type.toUpperCase(), `got ${type} request`)
          t.equal(req.headers.accept, 'application/json', 'got correct accept header')
          t.equal(req.headers['content-type'], 'application/json', 'got correct encoding')
          t.deepEqual(JSON.parse(data), sendDoc, 'got correct ' + type)
        })
        .on('close', t.ok.bind(t, true, 'ended'))
    })

    test(`${type} data with pipe function and real stream works with ${promise ? 'Promise' : 'callback'}`, (t) => {
      t.plan(9)

      const file = `${__dirname}/package.json`
      const content = JSON.parse(fs.readFileSync(file))
      const stream = fs.createReadStream(file)
      const recvDoc = { recv: 'this', obj: true }

      function verify (data, response) {
        t.deepEqual(data, recvDoc)
        t.ok(response, 'got response object')
        t.equal(
          response && response.headers && response.headers['content-type']
          , 'application/json', 'verified response object by content-type header'
        )
      }

      testServer(stringify(recvDoc))
        .on('ready', (url) => {
          if (promise) {
            jsonist[type](url, stream).then(({ data, response }) => {
              verify(data, response)
            }).catch((err) => {
              t.ifError(err)
            })
            t.ok(true) // account for t.ifError() on callback plan
          } else {
            jsonist[type](url, stream, (err, data, response) => {
              t.ifError(err)
              verify(data, response)
            })
          }
        })
        .on('request', (req, data) => {
          t.equal(req.method, type.toUpperCase(), `got ${type} request`)
          t.equal(req.headers.accept, 'application/json', 'got correct accept header')
          t.equal(req.headers['content-type'], 'application/json', 'got correct encoding')
          t.deepEqual(JSON.parse(data), content, 'got correct ' + type)
        })
        .on('close', t.ok.bind(t, true, 'ended'))
    })
  }
}

test('follow redirect', (t) => {
  t.plan(7)

  const expectedResponse = { ok: 'foobar!' }
  const server = http.createServer((req, res) => {
    if (req.url === '/') { // 2 requests come in here
      t.ok('got /')
      res.writeHead(302, { location: '/foobar' })
      return res.end()
    }
    // one comes in here
    t.equal(req.url, '/foobar', 'got /foobar')
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(stringify(expectedResponse))
  })

  server.listen(() => {
    const port = server.address().port
    const done = after(2, () => { server.close() })

    jsonist.get('http://localhost:' + port, (err, data) => {
      // don't follow redirect, don't get data
      t.error(err, 'no error')
      t.equal(data, null, 'no redirect, no data')
      done()
    })

    jsonist.get('http://localhost:' + port, { followRedirects: true }, (err, data) => {
      t.error(err, 'no error')
      t.deepEqual(data, expectedResponse, 'redirect, got data')
      done()
    })
  })
})

test('follow redirect limit', (t) => {
  t.plan(6 + 10 + 5 + 10)

  const expectedResponse = { ok: 'foobar!' }
  const server = http.createServer((req, res) => {
    const m = +req.url.match(/^\/(\d+)/)[1]
    if (m < 20) { // 2 requests come in here
      t.ok('got /')
      res.writeHead(302, { location: '/' + (m + 1) })
      return res.end()
    }
    // one comes in here
    t.equal(req.url, '/20', 'got /20')
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(stringify(expectedResponse))
  })

  server.listen(() => {
    const port = server.address().port
    const done = after(3, () => { server.close() })

    jsonist.get(`http://localhost:${port}/1`, { followRedirects: true }, (err, data) => {
      t.ok(err, 'got error')
      t.equal(err.message, 'Response was redirected too many times (10)')
      done()
    })

    jsonist.get(`http://localhost:${port}/1`, { followRedirects: 5 }, (err, data) => {
      t.ok(err, 'got error')
      t.equal(err.message, 'Response was redirected too many times (5)')
      done()
    })

    jsonist.get(`http://localhost:${port}/11`, { followRedirects: true }, (err, data) => {
      t.error(err, 'no error')
      t.deepEqual(data, expectedResponse, 'redirect, got data')
      done()
    })
  })
})

test('server error, non-JSON', (t) => {
  t.plan(7)

  const responseText = 'there was an error'

  testServer(responseText, 501)
    .on('ready', (url) => {
      jsonist.get(url, (err, data, response) => {
        t.ok(err)
        t.ok(err instanceof jsonist.HttpError)
        t.equal(err.data.toString(), responseText, 'got correct response')
        t.equal(err.statusCode, 501, 'got correct statusCode')
      })
    })
    .on('request', (req, data) => {
      t.equal(req.method, 'GET', 'got GET request')
      t.equal(req.headers.accept, 'application/json', 'got correct accept header')
    })
    .on('close', t.ok.bind(t, true, 'ended'))
})

test('server error, with-JSON', (t) => {
  t.plan(8)

  const responseDoc = 'there was an error'

  testServer(stringify(responseDoc), 501)
    .on('ready', (url) => {
      jsonist.get(url, (err, data, response) => {
        t.ifError(err)
        t.deepEqual(data, responseDoc, 'got correct doc')
        t.ok(response, 'got response object')
        t.equal(response.statusCode, 501, 'got correct status code')
        t.equal(
          response && response.headers && response.headers['content-type']
          , 'application/json', 'verified response object by content-type header'
        )
      })
    })
    .on('request', (req, data) => {
      t.equal(req.method, 'GET', 'got GET request')
      t.equal(req.headers.accept, 'application/json', 'got correct accept header')
    })
    .on('close', t.ok.bind(t, true, 'ended'))
})
