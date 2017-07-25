# wsBroadcast-WebClient

Web-Browser JavaScript library for connecting to the wsBroadcast System with a Flash based WebSockets fall-back.  Please see the comments in 'ws/wsb-client.js' for API and usage information.

## js/wsb-client.js

The client library for Web-Browsers.  Is supports native WebSockets, 'Flash' emulation of WebSockets *(currently defunct)*, and falling back to "AJAX"-based polling.  It currently requires 'JQuery' (http://www.jquery.com/) and the Flash Emualtion of WebSockets library 'web-socket-js' (http://github.com/gimite/web-socket-js/).  Release copies of both of these libraries are contained in this repositor in the 'res' directory.  It should be ECMA3 compliant and work on all modern browsers.  Every attempt has been made to make it as compatible as humanly possible.

### test.html

test.html is a simple example that will display the entire data available from the system into a table that is dynamically generated using 'JQuery'.  It also sets the 'DELME' configuration setting and then retrieves it for testing purposes.

### res/

Contains external third-party resources required for this library to function.

# Usage

## Required Includes

`<script src="/wsBroadcast-WebClient/res/jquery-2.1.4.min.js"></script>
<script src="/wsBroadcast-WebClient/res/pako.min.js"></script>
<script src="/wsBroadcast-WebClient/res/swfobject-2.2.min.js"></script> <!-- SWFObject [Flash fallback for web_socket_js] -->
<script src="/wsBroadcast-WebClient/res/web-socket-js/web_socket.js"></script> <!-- git.com/gimite/web-socket-js WebSockets Compatibility Fall-Back library -->
<!-- Global Settings for web-socket-js library -->
<script>WEB_SOCKET_SWF_LOCATION = "/wsBroadcast-WebClient/res/web-socket-js/WebSocketMain.swf";</script>
<script src="/wsBroadcast-WebClient/js/wsb-client.js"></script> <!-- WebSockets Broadcast Client -->`

## BroadcastClient Object

`var update_object = new BroadcastClient({
			callback_update: data_update,
			callback_error: data_error
		});`

### rx_data_counter()

This function will return a rough estimate of data transferred from the server to the client in bytes.

### filters_set ([URI, ...])

This function will limit the returned results during updates to branches that match the URIs listed.

## BroadcastClient Configuration Object

### url

This URL should be the base HTTP or HTTPS url used for both AJAX and WS connections.  If it is not present the default url for the host this library is included from.

### url_ws

This URL should be specified if the WebSocket server URL is different than the AJAX one.  Should be VERY rarely needed.

### delay_inc delay_max poll_freq

delay_inc is the number of seconds to add to the delay after each failed attempt to contact the server, delay_max is the maximum number of seconds to wait before attempting to reconnect to the server after an error, and poll_freq is the frequency at which AJAX polling should occure if that method is in use.


### callback_update *REQUIRED*

This should be a javascript function with the prototype `function data_update (data)`.  Everytime data is updated on the server this function will be called with the delta changes.  If a node on the tree is removed, a `null` value will be returned for that node value.  Example: `{ deleted_node:  null }`.

### callback_error *REQUIRED*

This should be a javascript function with the prototype `function data_error (errors, reconnect_delay)`.  errors will be an array of the actual errors that occured and reconnect_delay will be the amount of seconds before an attempt to reconnect to the server is made.

### debug

debug is a simple true/false flag to specify printing extra debugging information.

### logger

If the logger object is not present, the standard consol object from the browser is used for logging.  Currently it uses log, error, warn, info, and debug.  If any of these member functions are not present it will fallback to log and if that doesn't exist, an empty function will be used.

### method

This configuration option allows you to force an underlying method to be used for testing purposes.  It really should never be used in production code.  The options are 'WebSocket', 'MozWebSocket', 'FlashWebSocket', 'AJAX', and 'Fail'.

---
Copyright (C) APRS World, LLC. 2015  
ALL RIGHTS RESERVED!  
david@aprsworld.com
