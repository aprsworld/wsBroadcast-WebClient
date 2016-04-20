/*
 * BroadcastClient Object
 *
 *	Will immediately start a connection to periodically obtain data from
 *	a broadcast server.
 *
 * config object
 *	url is the base HTTP or HTTPS url used for both AJAX and WS connections.
 *	url_ws is an optional different websocket server url.
 *	delay_inc is the amount of seconds added after each failed connection
 *	delay_max is the longest delay waited after each failed connection
 *	poll_freq is the frequency at which AJAX polls will happen 
 *
 *	callback_error is a callback called whenever there is an error
 *		error([errors], reconnect_delay)
 *			where [errors] is an array of errors with the first
 *			always being a string containing a general and short
 *			description of the error.
 *			where reconnect_delay is the number of seconds until
 *			another connection attempt will happen if needed.
 *
 *	logger	is a 'logger' object.  If one isn't passed in the standard
 *		console object from the browser is used.
 *		Currently it uses log, error, warn, info, and debug.
 *		If any aren't defined they fallback to log and if that
 *		doesn't exist, it's an empty function.
 *		If debug doesn't exist and config doesn't contain debug
 *		the logger's debug will be an empty function.
 *		Simply passing null in will suffice to disable all messages.
 *
 *	debug is a flag to specify print extra crap for debugging purposes.
 *
 *	method allows you to force an underlying method for testing reasons.
 *		'WebSocket' forces use of standard native WebSockets.
 *		'MozWebSocket' forces use of the Mozilla WebSockets.
 *		'FlashWebSocket' forces use of the Flash emulation.
 *		'AJAX' forces the use of AJAX polling.
 *		'Fail' forces the use of none (failure).
 */
function BroadcastClient(config) {
	// Set Defaults
	this.protocol = window.location.protocol;
	this.hostname = window.location.hostname;
	this.port = window.location.port;
	this.gzip = true;

	this.delay_inc = 1;		// 1 seconds default
	this.delay_max = 10;		// 10 seconds default
	this.poll_freq = 20;		// 20 second default

	// error([errors], reconnect_delay)
	this.callback_error = function() {};
	// update(data)
	this.callback_update = function() {};
	
	this.logger = console;


	// merge in config object
	$.extend(this, config);
	
	//change url format to remove colon if port is not set
	if(!this.port || this.port === ''){
		this.url = this.protocol + '//' + this.hostname +'/data/now';
	}
	else{
		this.url = this.protocol + '//' + this.hostname + ':' + this.port + '/data/now';
	}
	
	// Clean up logger
	if (!this.logger) {
		this.loger = { log: function() {} };
	}
	var logger = this.logger;
	if (!logger.error) {
		logger.error = logger.log;
	}
	if (!logger.warn) {
		logger.warn = logger.log;
	}
	if (!logger.info) {
		logger.info = logger.log;
	}
	if (!logger.debug) {
		if (this.debug) {
			logger.debug = logger.log;
		} else {
			logger.debug = function() {};
		}
	}

	if (!this.url_ws) {
		if (this.url.search('/^http:\\/\\//i')) {
			this.url_ws = this.url.replace('http', 'ws');
			this.url_ws = this.url_ws + '.json';
		} else {
			this.logger.error('wsb-client: Invalid URL!');
			return false;
		}
	}

	// Set initial properties
	this.rx_data = 0;
	this.connect = false;
	this.delay = 0;	// delay after connection failure
	this.ws = null; // current WebSocket
	this.ws_error = false;	// false if no WebSocket error, otherwise the error

	// Handle IE ('application/json' -> 'text/plain') Hack
	var agent = window.navigator.userAgent;
	if (agent.search('MSIE') >= 0 || agent.search('Trident') >= 0) {
		this.ie_hack = '.dat';
	} else {
		this.ie_hack = '.json';
	}

	// Make sure we have pako for gzip
	if (this.gzip) {
		var error=false;
		try {
			if (!pako || !pako.inflate) {
				error=true;
			}
		} catch (e) {
			error=true;
		};
		if (error) {
			this.logger.error('wsb-client: Pako compression library not available! Disabling gzip compression.');
			this.gzip=false;
		}
	}	

	// Make a Connection
	if (!this.Connect()) {
		this.delay = -1;
		this.onError(['Connection Impossible']);
	}

	// We should be good.
	return this;
}

/*
 * Set Subscription Filters
 * 
 * filters_set([URI, ...]);
 */
BroadcastClient.prototype.filters_set = function(filters) {
	this.logger.log("wsb-client: Set filters.");
	this.filters = filters;
	if (!this.ws) {
		this.logger.warn("wsb-client: Can't set filters as we're not connected!");
		return;
	}
	this.filters_send();
};
BroadcastClient.prototype.filters_send = function() {
	if (!this.ws) {
		this.logger.error("wsb-client: Attempting to set filters when not connected!");
		return;
	}
	if (this.ws.readyState != 1) {
		return;
	}
	var message = { wsb: { filters: this.filters } };
	this.ws.send(JSON.stringify(message));
	this.logger.log("wsb-client:  Sent filters.");
};

/*
 * Get Data Counter
 */
BroadcastClient.prototype.rx_data_counter = function() {
	return this.rx_data;
};

/*
 * Message Handler
 */
BroadcastClient.prototype.onMessage = function(text) {
	//this.logger.debug('wsb-client: Received message.');

	// Parse JSON Message
	var data = null;
	try {
		data = JSON.parse(text);
	} catch (e) {
		this.onError(['JSON Parse Error', e]);
		return;
	}

	// Do something with data
	this.onData(data);
};


/*
 * Data Handler
 */
BroadcastClient.prototype.onData = function(data) {
	this.logger.debug('wsb-client: Received new data.');
	try {
		this.callback_update(data);
	} catch (e) {
		this.onError(['Error in executing update callback!', e]);
	}
};


/*
 * Error Handler
 */
BroadcastClient.prototype.onError = function(error) {
	this.logger.error('wsb-client: ' + error[0]);
	try {
		this.callback_error(error, this.delay);
	} catch (e) {
		this.logger.error('wsb-client: Error in executing error callback function!');
	}
};


/*
 * Delay Throttling
 */
BroadcastClient.prototype.ConnectThrottle = function (reset) {

	// Reset the throttle?
	if (reset) {
		this.delay = 0;
		return;
	}

	// Throttle it more
	this.delay = this.delay + this.delay_inc;
	if (this.delay > this.delay_max) {
		this.delay = this.delay_max;
	}
};


/*
 * AJAX Polling
 */
BroadcastClient.prototype.AJAXConnect = function (uri) {

	// Disconnect
	if (!this.connect) {
		return false;
	}

	this.logger.debug('wsb-client: Making JQuery AJAX Request...');

	if (!uri) {
		uri = '';
	}
	$.ajax(this.url + this.ie_hack + uri, {
		context:	this,
		cache:		false,
		dataType:	'json',
		ifModified:	true,
		headers:	{}	// TODO: Last Modification Time
	}).done(function (data, status, XHR) {
		// XXX: status, XHR?
		this.onData(data);
		setTimeout($.proxy(this.AJAXConnect, this), this.poll_freq * 1000);
	}).fail(function (XHR, status, error) {
		this.ConnectThrottle();
		// XXX: XHR?
		this.onError(['AJAX Error!', status, error]);
		setTimeout($.proxy(this.AJAXConnect, this), this.delay * 1000);
	});

	// Was successful (in theory)...
	return true;
};

/*
 * WebSocket Connection
 */
BroadcastClient.prototype.WSConnect = function() {

	// Disconnect
	if (!this.connect) {
		return false;
	}

	this.logger.log('wsb-client: Connecting via WebSockets...');

	// Sanity
	if (this.ws) {
		this.logger.error('wsb-client: WebSockets already connected!');
		return false;
	}


	//
	// Create WebSocket
	//

	// Standard WebSockets Implementation
	if (!this.method || this.method == 'WebSocket') {
		try {
			var url = this.url_ws;
			if (this.gzip) {
				url += '.gz';
			}
			this.ws = new WebSocket(url);
		} finally {
			if (!this.ws && this.method) {
				this.logger.error('wsb-client: WebSockets unavailable!');
				return false;
			}
		}
	}

	// Mozilla WebSockets Implementation
	if (!this.ws && (!this.method || this.method == 'MozWebSocket')) {
		try {
			var url = this.url_ws;
			if (this.gzip) {
				url += '.gz';
			}
			this.ws = new MozWebSocket(url);
		} finally {
			if (!this.ws && this.method) {
				this.logger.error('wsb-client: MozWebSockets unavailable!');
				return false;
			}
		}
	}

	// Flash WebSockets Emulation
	if (!this.ws && (!this.method || this.method == 'FlashWebSocket')) {
		try {
			this.logger.info('wsb-client: FlashWebSocket is broken!');
			//this.ws = new FlashWebSocket(this.url_ws);
		} finally {
			if (!this.ws && this.method) {
				this.logger.error('wsb-client: FlashWebSocket unavailable!');
				return false;
			}
		}
	}

	// Method chosen doesn't actually exist
	if (!this.ws && this.method) {
		this.logger.error('wsb-client: ' + this.method + ' implementation doesn\'t exist!');
		return false;
	}

	// All methods failed
	if (!this.ws) {
		this.logger.error('wsb-client: No WebSocket implementations available!');
		return false;
	}


	//
	// Install WebSocket Handlers
	//
	var self = this;

	// WebSocket Connection Complete
	this.ws.onopen = function() {
		self.logger.log('wsb-client: WebSocket Connected.');
		self.ConnectThrottle(true);
		self.ws_error = false;

		// Send filters
		if (self.filters !=== undefined) {
			self.filters_send();
		}
	};

	// WebSocket Message
	this.ws.onmessage = function(m) {
		self.rx_data += m.data.length;
		var message = m.data;
		if (self.gzip) {
			message = pako.inflate(m.data, { to: 'string' });
		}
		self.onMessage(message);
	};

	// WebSocket Closed
	this.ws.onclose = function(e) {
		self.logger.warn('wsb-client: WebSocket Disconnected.');
		// XXX: e
		if (!self.ws_error) {
			self.onError(['WebSocket Disconnected', e]);
		} else {
			self.ConnectThrottle();
		}
		self.ws = null;
		setTimeout($.proxy(self.WSConnect, self), self.delay * 1000);
	};

	// WebSocket Error
	this.ws.onerror = function(e) {
		self.onError(['WebSocket Error', e]);
		self.ws_error = e;
	};

	// Was successful (in theory)...
	return true;
};

/*
 * Connect
 *
 * If a method configuration is set use that specific method, otherwise
 * try them all until one works...
 */
BroadcastClient.prototype.Connect = function() {

	// We are connecting
	this.connect = true;

	// WebSockets methods
	if (!this.method || this.method.search('WebSocket$') != -1) {
		if (this.WSConnect()) {
			return true;
		}
	}

	// AJAX method
	if (!this.method || this.method == 'AJAX') {
		if (this.AJAXConnect()) {
			return true;
		}
	}

	// All methods failed or we requested to just fail here
	if (!this.method || this.method == 'Fail') {
		this.logger.error('wsb-client: All connection methods failed!');
		return false;
	}

	// Some method we don't support was requested
	this.logger.error('wsb-client: Connection method ' + this.method + ' does not exist!');
	return false;
};


/*
 * Disconnect
 */
BroadcastClient.prototype.Disconnect = function() {
	
	this.logger.info('wsb-client: Disconnecting.');

	// Prevent attempts to reconnect
	this.connect = false;

	// Disconnect active connections
	if (this.ws) {
		this.ws.close();
	}
};


/*
 * AJAX Response Handler
 */
BroadcastClient.prototype.Response = function(XHR, status, data, error) {
	return {
		client: {
			XHR:	XHR,
			status:	status,
			error:	error
		},
		data:	data,
		error:	(error) ? true : undefined
	};
};

/*
 * Get Value
 */
BroadcastClient.prototype.ValueGet = function(callback, uri) {
	$.ajax(this.url + this.ie_hack + '/' + uri, {
		context:	this,
		cache:		false,
		dataType:	'json'
	}).done(function (data, status, XHR) {
		callback(this.Response(XHR, status, data, undefined));
	}).fail(function (XHR, status, error) {
		callback(this.Response(XHR, status, undefined, error));
	});
};


/*
 * Set Value
 */
BroadcastClient.prototype.ValueSet = function(callback, uri, value, persist) {
	if (persist) {
		persist = '?persist=true';
	} else {
		persist = '';
	}
	$.ajax(this.url + this.ie_hack + '/' + uri + persist, {
		context:	this,
		cache:		false,
		dataType:	'json',
		//contentType:	'application/json',
		method:		'POST',
		data:		JSON.stringify(value)
	}).done(function (data, status, XHR) {
		callback(this.Response(XHR, status, data, undefined));
	}).fail(function (XHR, status, error) {
		callback(this.Response(XHR, status, undefined, error));
	});
};
