/*
 * WebSocket Broadcast Client
 */

function BroadcastClient(config) {
}

/*
 * Configuration Reset
 */
BroadcastClient.prototype.config_reset = function() {
	this.index = 0;
	this.delay = this.poll_freq;
};


/*
 * Connection
 */
BroadcastClient.prototype.Connect = function () {
	// Get current configuration
	this.delay = 0;
	var config = this.configs[this.index++];
	if (this.index >= this.configs.length) {
		this.config_reset();
	}

	if (config.url.match(/^ws(s)?/)) {
		this.WSConnect(config);
	} else if (config.url.match(/^http(s)?/)) {
		this.AJAXConnect(config);
	} else {
		this.logger.error('Unsupported URL - ' + config.url);
		setTimeout($.proxy(this.Connect, this), this.delay * 1000);
	}
};


/*
 * AJAX Connection
 */
BroadcastClient.prototype.AJAXConnect = function (config) {
	var url = config.url;
	this.logger.log('AJAX Request "' + url + '"...');
	$.ajax(url, {
		context:	this,
		cache:		false,
		dataType:	'json',
		ifModified:	true,
		headers:	{}	// TODO: Last Modification Time
	}).done(function (data, status, jqXHR) {
		// XXX: status, jqXHR?
		this.logger.log('AJAX Request Successful.');
		this.onData(data, config);
		this.config_reset();
		setTimeout($.proxy(this.Connect, this), this.delay * 1000);
	}).fail(function (jqXHR, status, error) {
		// XXX: jqXHR?
		this.logger.error('AJAX Error - ' + error);
		setTimeout($.proxy(this.Connect, this), this.delay * 1000);
	});

	// Successfully initiated connection attempt.
	return true;
};

/*
 * WebSocket Connection
 */
BroadcastClient.prototype.WSConnect = function(config) {

	this.logger.log('WebSocket Request - ' + config.url);

	// Sanity
	if (this.ws) {
		this.logger.error('Websocket already connected!');
		return false;
	}

	//
	// Open WebSocket Connection
	//
	try {
		// Standard WebSocket Implementation
		this.ws = new WebSocket(url);
	} finally {
		if (!this.ws) {
			try {
				// Mozilla WebSocket Implementation
				this.ws = new MozWebSocket(url);
			} finally {
				if (!this.ws) {
					this.logger.error('WebSockets not Supported by Browser!');
					setTimeout($.proxy(this.Connect, this), this.delay * 1000);
				}
			}
		}
	}

	//
	// Install WebSocket Handlers
	//
	var self = this;

	// WebSocket Connection Complete
	this.ws.onopen = function() {
		self.logger.log('WebSocket Connected.');
		self.config_reset();
		self.ws_error = false;

		// Send filters
		if (config.filters !== undefined) {
			self.filters_send(config.filters);
		}
	};

	// WebSocket Message
	this.ws.onmessage = function(m) {
		self.rx_data += m.data.length;
		var message = m.data;
		if (self.gzip) {
			message = pack.inflate(m.data, { to: 'string' });
		}
		var data = null;
		try {
			data = JSON.parse(message);
		} catch (e) {
			self.logger.error('WebSocket JSON Parse Error!');
			this.close();
		}
	};

	// WebSocket Closed
	this.ws.onclose = function(e) {
		self.logger.warn('WebSocket Disconnected.');
		setTimeout($.proxy(self.Connect, self), self.delay * 1000);
	};

	// WebSocket Error
	this.ws.onerror = function(e) {
		self.logger.error('WebSocket Error - ' + e); // XXX
	};

	return true;
};
