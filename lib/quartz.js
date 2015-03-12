'use strict';

function Quartz(options) {
  options = options || {};
  this.options = options;
  this.options.defaultStatusCode = this.options.defaultStatusCode || 200;
  this.options.parseQuerystring = this.options.parseQuerystring || function(url) {
    var query = {};
    if (url.indexOf('?') > 0) {
      var tokens = url.substr(url.indexOf('?') + 1).split(/&amp;|&/i);
      for (var i=0; i < tokens.length; i++) {
        var token = tokens[i]
          , parts = token.split('=', 2)
          , k = parts[0]
          , v = decodeURIComponent(parts[1].replace(/\+/g, '%20'));
        query[k] = query[k.toLowerCase()] = v;
      }
    }
    return query;
  };
  this._server = null;
  this._handlers = [];
  this._started = false;

  this.logger = new Logger('debug' in this.options ? this.options.debug : -1, 'Quartz: ');
}

Quartz.prototype.listen = function() {
  this.logger.debug('Starting quartz server with options:', this.options);

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

  this.logger.info('Quartz started');

  return this;
};

Quartz.prototype.start = Quartz.prototype.listen;
Quartz.prototype.init = Quartz.prototype.listen;

Quartz.prototype._reattachHandlers = function() {
  this.logger.debug('Reattaching handlers', this._handlers);
  for (var i=0; i < this._handlers.length; i++) {
    var args = this._handlers[i];
    this._responder.apply(this, args);
  }
};

Quartz.prototype._responder = function(verb, route, handler) {
  var _this = this;
  this._server.respondWith(verb, route, function(xhr) {
    _this.logger.log('%s %s -> %s', verb.toUpperCase(), xhr.url, route);
    _this._response(xhr);
    return handler.apply(this, arguments);
  });
};

Quartz.prototype._response = function(xhr) {
  var _this = this;
  var _status = this.options.defaultStatusCode;
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
      _status = code;
      return this;
    },

    json: function(data) {
      return this.contentType('application/json').send(JSON.stringify(data));
    },

    send: function(data) {
      if (void 0 === data || typeof data === 'string') {
        _this.logger.log('Sending response', _status, this.requestHeaders);
        _this.logger.debug('Response data', data);
        this.respond(_status, this.requestHeaders, data);
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
  this.logger.info('Quartz stopped');
  return this;
};

Quartz.prototype.stop = Quartz.prototype.close;
Quartz.prototype.shutdown = Quartz.prototype.close;




function Logger(level, prefix) {
  this.logLevel = level;
  this.prefix = prefix;
  this.proxyTo = global.console;
}

Logger.prototype._log = function(threshold, loggerName, args) {
  if (this.logLevel >= threshold) {
    args = Array.prototype.slice.call(args);
    if (this.prefix) {
      if (typeof args[0] === 'string') {
        args[0] = this.prefix + args[0];
      }
      else {
        args.unshift(this.prefix);
      }
    }
    this.proxyTo[loggerName].apply(this.proxyTo, args);
  }
};

Logger.prototype.debug = function() {
  this._log(3, 'debug', arguments);
};

Logger.prototype.log = function() {
  this._log(2, 'log', arguments);
};

Logger.prototype.info = function() {
  this._log(1, 'info', arguments);
};

Logger.prototype.warn = function() {
  this._log(0, 'warn', arguments);
};

Logger.prototype.error = function() {
  this._log(-1, 'error', arguments);
};

Quartz.Logger = Logger;

global.Quartz = Quartz;
