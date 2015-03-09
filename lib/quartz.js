'use strict';

function Quartz(options) {
  options = options || {};
  this.options = options;
  this.options.defaultStatusCode = this.options.defaultStatusCode || 200;
  this.options.parseQuerystring = this.options.parseQuerystring || function(url) {
    // grabbed this from somewhere at some point... should probably have something better
    return (function(a) {
        if (a == "") return {};
        var b = {};
        for (var i = 0; i < a.length; ++i)
        {
            var p=a[i].split('=');
            if (p.length != 2) continue;
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })((url.split('?', 2)[1] || '').split(/&(amp;)?/g));
  };
  this._server = null;
  this._handlers = [];
  this._started = false;
}

Quartz.prototype.listen = function() {
  var _this = this;
  var sinon = require('sinon');
  this._server = sinon.fakeServer.create();

  this._server.autoRespond = true;
  this._server.autoRespondAfter = 'latency' in this.options ? this.options.latency : 10;

  // ignore all requests except ones that have a route attached
  this._server.xhr.useFilters = true;
  this._server.xhr.addFilter(function(method, url) {
    return !_this.handlerExists(url, method);
  });

  if (this.options.onCreate) {
    this._server.xhr.onCreate = this.options.onCreate;
  }

  this._started = true;

  if (this._handlers.length) {
    this._reattachHandlers();
  }

  return this;
};

Quartz.prototype.start = Quartz.prototype.listen;
Quartz.prototype.init = Quartz.prototype.listen;

Quartz.prototype._reattachHandlers = function(first_argument) {
  for (var i=0; i < this._handlers.length; i++) {
    var args = this._handlers[i];
    this._responder.apply(this, args);
  }
};

Quartz.prototype._responder = function(verb, route, handler) {
  var _this = this;
  this._server.respondWith(verb, route, function(xhr) {
    _this._response(xhr);
    return handler.apply(this, arguments);
  });
};

Quartz.prototype._response = function(xhr) {
  var _this = this;
  var _findHeaderKey = function(lookup) {
    for (var k in xhr.requestHeaders) {
      if (k.toLowerCase() === lookup) {
        return k;
      }
    }
    return null;
  };
  var extensions = {
    get: function(lookup) {
      var k = _findHeaderKey(lookup);
      return k ? this.requestHeaders[k] : null;
    },

    set: function(name, value) {
      var obj = {};
      if (1 === arguments.length) {
        obj = name;
      }
      else {
        obj[name] = value;
      }
      for (var lookup in obj) {
        var k = _findHeaderKey(lookup);
        this.requestHeaders[k || lookup] = obj[lookup];
      }
    },

    contentType: function(type) {
      this.set('content-type', type);
      return this;
    },

    status: function(code) {
      this.status = code;
      return this;
    },

    json: function(data) {
      return this.contentType('application/json').send(JSON.stringify(data));
    },

    send: function(data) {
      if (void 0 === data || typeof data === 'string') {
        this.respond(this.status || _this.options.defaultStatusCode, this.requestHeaders, data);
      }
      else {
        this.json(data);
      }
      return this;
    },

    end: function() {
      return this.send();
    }
  };

  xhr.query = this.options.parseQuerystring(xhr.url) || {};

  for (var k in extensions) {
    xhr[k] = extensions[k].bind(xhr);
  }
};

Quartz.prototype.handlerExists = function(url, verb) {
  for (var i=0; i < this._handlers.length; i++) {
    var handler = this._handlers[i]
      , routeMatch = handler[1] instanceof RegExp ? handler[1].test(url) : url === handler[1]
      , verbMatch = handler[0] === null || !verb || handler[0] === verb;
    // if the url matches a route and
    //    a) the handler doesn't have a verb (all)
    //    b) not testing for verb
    //    c) handler verb is a match with test verb
    if (routeMatch && verbMatch) {
      return true;
    }
  }
  return false;
};

Quartz.prototype.all = function(route, handler) {
  return this.on(null, route, handler);
};

Quartz.prototype.opts = function(route, handler) {
  return this.on('OPTIONS', route, handler);
};

Quartz.prototype.head = function(route, handler) {
  return this.on('HEAD', route, handler);
};

Quartz.prototype.get = function(route, handler) {
  return this.on('GET', route, handler);
};

Quartz.prototype.post = function(route, handler) {
  return this.on('POST', route, handler);
};

Quartz.prototype.put = function(route, handler) {
  return this.on('PUT', route, handler);
};

Quartz.prototype.del = function(route, handler) {
  return this.on('DELETE', route, handler);
};

Quartz.prototype.on = function(verb, route, handler) {
  if (typeof verb === 'string') {
    verb = verb.toUpperCase();
  }
  this._handlers.push(arguments);
  if (true === this._started) {
    this._responder(verb, route, handler);
  }
  return this;
};

Quartz.prototype.close = function() {
  this._server.restore();
  this._started = false;
  return this;
};

Quartz.prototype.stop = Quartz.prototype.close;
Quartz.prototype.shutdown = Quartz.prototype.close;

global.Quartz = Quartz;
