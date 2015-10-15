# jsonist

[![Build Status](https://secure.travis-ci.org/rvagg/jsonist.png)](http://travis-ci.org/rvagg/jsonist)

**JSON over HTTP**: A simple wrapper around [hyperquest](https://github.com/substack/hyperquest) for dealing with JSON web APIs.

[![NPM](https://nodei.co/npm/jsonist.svg)](https://nodei.co/npm/jsonist/)

A simple GET:

```js
var url  = 'https://api.github.com/users/rvagg'
  , opts = { headers: { 'user-agent': 'yee haw grandma' } }
  , fn   = function (err, data, resp) {
      console.log(data)
    }

jsonist.get(url, opts, fn)

// → { login: 'rvagg',
//     id: 495647,
//   ...
//   }

```

or a POST:

```js
var url  = 'https://api.github.com/repos/rvagg/jsonist/issues'
  , opts = {
        headers : { 'user-agent': 'yee haw grandma' }
      , auth    : 'rvagg:24d5dee258c64aef38a66c0c5eca459c379901c2'
    }
  , data = {
        'title' : 'Not a bug'
      , 'body'  : 'Just guinea-pigging your repo dude, move along.'
    }
  , fn   = function (err, data, resp) {
      console.log(data)
    }

jsonist.post(url, data, opts, fn)

// → { url: 'https://api.github.com/repos/rvagg/jsonist/issues/1',
//   ...
//   }

// you can also jsonist.put(), the kids love PUT requests these days
```

## API

### jsonist.get(url, [ options, ] callback)

Send a GET request to `url` and return the callback with an error or JSON deserialised data.

The `options` object is optional and is passed on to hyperquest. One option is observed by jsonist:

* `followRedirects` (default `false`): if truthy, jsonist will follow HTTP redirects to new locations, up to a maximum of `10` times. Set `followRedirects` to an integer to change the maximum number of redirects to follow.

The callback is called with up to 3 arguments. If there is an error there will only be an error argument in the first position, otherwise it will be `null`. The second argument will contain the deserialised object obtained from the server and the third argument will be the response object itself if you need to fetch headers or other metadata.

### jsonist.post(url, data, [ options, ] callback)

Send a POST request to `url`, writing JSON serialised data to the request, and return the callback with an error or JSON deserialised data (if any).

`'method'` is set to `'POST'` for you before passing on to hyperquest.

The `data` parameter can also be a readable stream that will get `.pipe()`'d to the request.

The `options` object is optional and is passed on to hyperquest.

### jsonist.put(url, data, [ options, ] callback)

Same as  `jsonist.post()` but for when that extra character is too much to type or you have to use someone's overloaded API. `'method'` is set to `'PUT'`.

*Note: in each of the requests you can provide an optional `'hyperquest'` parameter in your options if you want to really customise the http chain (see [this](https://github.com/hyperquest))*

### jsonist.delete(url, [ options, ] callback)

Send a DELETE request to `url` and return the callback with an error or JSON deserialised data.

Otherwise works the same as GET.

## License

**jsonist** is Copyright (c) 2014 Rod Vagg [@rvagg](https://github.com/rvagg) and licensed under the MIT licence. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE file for more details.
