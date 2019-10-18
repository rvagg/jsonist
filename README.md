# jsonist

[![Build Status](https://api.travis-ci.org/rvagg/jsonist.svg?branch=master)](http://travis-ci.org/rvagg/jsonist)

**A super-simple HTTP fetch utility for JSON APIs**

[![NPM](https://nodei.co/npm/jsonist.svg)](https://nodei.co/npm/jsonist/)

* [Example](#example)
* [API](#api)
  * [jsonist.get(url[, options ][, callback ])](#jsonistgeturl-options--callback-)
  * [jsonist.post(url, data[, options ][, callback ])](#jsonistposturl-data-options--callback-)
  * [jsonist.put(url, data[, options ][, callback ])](#jsonistputurl-data-options--callback-)
  * [jsonist.delete(url[, options ][, callback ])](#jsonistdeleteurl-options--callback-)
* [Error handling and bad JSON responses](#error-handling-and-bad-json-responses)
* [License & copyright](#license--copyright)

## Example

A simple GET:

```js
const url  = 'https://api.github.com/users/rvagg'
const opts = { headers: { 'user-agent': 'wascally wabbit' } }

const { data } = await jsonist.get(url, opts)

console.log(`${data.name} (@${data.login}) is: ${data.bio}`)

// → Rod Vagg (@rvagg) is: Awk Ninja; Yak Shaving Rock Star
```

or a POST:

```js
const url  = 'https://api.github.com/repos/rvagg/jsonist/issues'
const opts = {
  headers: { 'user-agent': 'yee haw grandma' },
  auth: 'rvagg:24d5dee258c64aef38a66c0c5eca459c379901c2'
}
const data = {
  'title': 'Not a bug'
  'body': 'Just guinea-pigging your repo, don\'t get so uptight.'
}
const { data } = await jsonist.post(url, data, opts, fn)
console.log(data)

// → { url: 'https://api.github.com/repos/rvagg/jsonist/issues/1',
//   ...
//   }

// you can also jsonist.put(), the kids love PUT requests these days
```

You can use the `Promise` API for async / await, or steer clear entirely of Promises and provide a `callback` argument (in which case there won't be any `Promise` in your stack to ruin your error handling).

**jsonist** uses [hyperquest](https://github.com/substack/hyperquest) under the hood, `options` for the API below where present are passed on to hyperquest.

## API

### jsonist.get(url[, options ][, callback ])

Sends a GET request to `url` and returns (via `callback` if supplied or a returned `Promise` if not) an error or JSON deserialised data.

The `options` object is optional and is passed on to hyperquest where present:

* `followRedirects` (default `false`): if truthy, jsonist will follow HTTP redirects to new locations, up to a maximum of `10` times. Set `followRedirects` to an integer to change the maximum number of redirects to follow.
* `hyperquest`: if provided, will be used in place of the bare hyperquest package. This can be used to customise the HTTP chain with a hyperquest wrapper, such as those at [github.com/hyperquest](https://github.com/hyperquest). Use with caution.

Options understood by hyperquest include:

* `headers` (default `{}`, in addition, jsonist will set `content-type` to `'application/json'` and `accept` to `'application/json'`): any additional headers required for the request.
* `auth` (default `undefined`): set automatically when the `url` has an auth string in it such as "http://user:passwd@host". Set to a string of the form `"user:pass"` where auth is required.
* `agent` (default `false`): can be set to a custom [`http.Agent`](https://nodejs.org/api/http.html#http_class_http_agent).
* `timeout` (default `2`<sup>`32`</sup>` * 1000`): set on the underlying `request.setTimeout()`.
* `localAddress`: the local interface to bind for network connections when issuing the request.

For HTTPS connections, the following options are passed on to [`tls.connect()`](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback):

* `pfx`
* `key`
* `cert`
* `ca`
* `ciphers`
* `rejectUnauthorized`
* `secureProtocol`

If a `callback` is supplied, it will be called with up to 3 arguments. If there is an error there will only be an error argument in the first position, otherwise it will be `null`. The second argument will contain the deserialised object obtained from the server and the third argument will be the response object itself if you need to fetch headers or other metadata.

When a `callback` is supplied, `jsonist.get()` will immediately return the underlying hyperquest stream for this request. Can be safely ignored in most circumstances. This is not available on the non-callback version.

If no `callback` is supplied, a `Promise` is returned directly, allowing for `await`. If the `Promise` resolves, it will receive an object with a `data` property containing the deserialised object obtained from the server, and a `response` property containing the response object itself if you need to fetch headers or other metadata. These two properties can be destructured with `const { data, response } = await jsonist.get(...)`.

### jsonist.post(url, data[, options ][, callback ])

Sends a POST request to `url`, writing JSON serialised data to the request, and returns (via `callback` if supplied or a returned `Promise` if not) an error or JSON deserialised data (if any).

`'method'` is set to `'POST'` for you before passing on to hyperquest.

The `data` parameter can also be a readable stream that will get `.pipe()`'d to the request.

See [`jsonist.get()`](#jsonistgeturl-options--callback-) for more details on options and the behaviour when passing a `callback` or using the `Promise` version.

### jsonist.put(url, data[, options ][, callback ])

Same as  `jsonist.post()` but for when that extra character is too much to type or you have to use someone's overloaded API. `'method'` is set to `'PUT'`.

See [`jsonist.get()`](#jsonistgeturl-options--callback-) for more details on options and the behaviour when passing a `callback` or using the `Promise` version.

### jsonist.delete(url[, options ][, callback ])

Sends a DELETE request to `url` and returns (via `callback` if supplied or a returned `Promise` if not) an error or JSON deserialised data.

Otherwise works the same as GET.

See [`jsonist.get()`](#jsonistgeturl-options--callback-) for more details on options and the behaviour when passing a `callback` or using the `Promise` version.

## Error handling and bad JSON responses

Server errors (i.e. response codes >= 300) are handled as standard responses. You can get the status code from the response object which is the third argument to the standard callback if you need to handle error responses in a different way.

However, if any type of response returns data that is not JSON format, an error will be generated and passed as the first argument on the callback, with the following customisations:

* If the status code from the server is >= 300, you will receive an error of type `jsonist.HttpError`, otherwise it will be of type `SyntaxError` indicating a bad JSON parse on a normal response.
* The error will come with the following additional properties attached:
  - `data`: a `Buffer` containing the full response from the server
  - `response`: the full HTTP response object
  - `statusCode`: the status code received from the server (a short-cut to `response.statusCode`)

## License & copyright

**jsonist** is Copyright (c) 2014 Rod Vagg [@rvagg](https://github.com/rvagg) and licensed under the MIT licence. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE file for more details.
