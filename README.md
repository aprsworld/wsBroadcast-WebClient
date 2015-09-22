# wsBroadcast-WebClient

Web-Browser JavaScript library for connecting to the wsBroadcast System with a Flash based WebSockets fall-back.  Please see the comments in 'ws/wsb-client.js' for API and usage information.

## js/wsb-client.js

The client library for Web-Browsers.  Is supports native WebSockets, 'Flash' emulation of WebSockets *(currently defunct)*, and falling back to "AJAX"-based polling.  It currently requires 'JQuery' (http://www.jquery.com/) and the Flash Emualtion of WebSockets library 'web-socket-js' (http://github.com/gimite/web-socket-js/).  Release copies of both of these libraries are contained in this repositor in the 'res' directory.  It should be ECMA3 compliant and work on all modern browsers.

### test.html

test.html is a simple example that will display the entire data available from the system into a table that is dynamically generated using 'JQuery'.  It also sets the 'DELME' configuration setting and then retrieves it for testing purposes.

### res/

Contains external third-party resources required for this library to function.

--
Copyright (C) APRS World, LLC. 2015
ALL RIGHTS RESERVED!
david@aprsworld.com
