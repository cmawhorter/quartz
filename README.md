# quartz

Quartz allows you to build a fake clientside XHR server in the browser.  No server needed.

It is meant to help ease transitioning a web app to a completely static website.

## Example

Some existing web app that uses jquery:

```javascript
var MyWebApp = {
  appIt: function() {
    $.get('/bad-api?action=categories&some=other&data=true', function(data) {
      MyWebApp.renderCategories(data);
    });
  }
};
```

And here's some new website:

```javascript
// we already have all our categories right here
var categories = [
  { id: 1, name: 'some category' }
];
```

Instead of rewriting the app to work with either XHR or local data, we can just use quartz like this:

```javascript
var quartz = new Quartz();
quartz.get('/bad-api?action=categories&some=other&data=true', function(res) {
  res.json(categories);
});
quartz.listen();
```

And now, `MyWebApp.appIt()` calls our quartz handler and returns our local data.  Easy!

## How it works

ALL of the heavy lifting is done by SinonJS' [fake XMLHttpRequest](http://sinonjs.org/docs/#server) -- which is a well tested library for... testing.

Quartz wraps sinon's fake XHR object with an API that mimics the express response, and also does some extra stuff to make it work better in a non-testing environment.

## Usage

The API is designed to somewhat mimic express to make it easier to get started.  All methods return `this` unless documented otherwise.

### Options

```javascript
var quartz = new Quartz({
  // if no http status is set, it defaults to this
  defaultStatusCode: 200

  // function that gets called every time a new XHR request is created
  // called before the xhr gets wrapped by Quartz
  // see: http://sinonjs.org/docs/#useFakeXMLHttpRequest
  onCreate: undefined,

  // parses the querystring to res.query in the handler.  null to disable
  parseQuerystring: function(url) {
    // crappy default function
  }
});
```

### `Quartz#listen()`

Alias: `Quartz#start()`, `Quartz#init()`

Start the server and start responding to XHR requests.  Only matching requests handled.  All other requests pass through to a normal XHR request.

Any existing handlers will also be (re)attached at this point too.

### `Quartz#close()`

Alias: `Quartz#stop()`, `Quartz#shutdown()`

Stops the server and restores the native browser XHR.

### `Quartz#handlerExists(url[, verb])`

Check if a URL has an existingn handler.  URL can be a string or a regex.

Excluding verb will match any http request verb.

### `Quartz#on(verb, route, handler)`

Shortcuts: `Quartz#all(route, handler)`, `Quartz#opts(route, handler)`, `Quartz#head(route, handler)`, `Quartz#get(route, handler)`, `Quartz#post(route, handler)`, `Quartz#put(route, handler)`, `Quartz#del(route, handler)`

`verb`: Any string is accepted for verb.  Using `quartz.on(null, ...)` is the same as `quartz.all()`.

`route`: Can be a string or regex. Regex capture groups will be passed as arguments to the handler.  See [sinon documentation](http://sinonjs.org/docs/#fakeServer) for more information.

`function handler(res)`: Similar to express.  Passes response object to handle replying. See below for details.

### Response

Your handlers will be passed an XHR object that is wrapped with some express-like methods.  All of the sinon properties will exist.  

Additionally, you can use:  `get`, `set`, `contentType`, `status`, `json`, `send`, `end`.

So this is possible:

```javascript
new Quartz().start().on(/^\/api\/.*/, function(res) {
  res.contentType('text/html').status(500).send('Fake server error');

  // or

  res.json({ some: 'data', here: 1 });
});
```

## Todo

Right now, the entire sinon library is included as-is via browserify.  This is obviously less than desirable, and leads to a much larger quartz.js file size.  PR welcome.

## License

MIT
