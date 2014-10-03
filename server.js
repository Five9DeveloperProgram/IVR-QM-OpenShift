#!/bin/env node

var express = require('express');
var fs      = require('fs');
var xml2js  = require('xml2json');

/**
 *  Define the application class
 */
var IvrQueryServer = function() {

    var self = this;

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        }
    };

    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
    };

    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };

    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       new Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', new Date(Date.now()) );
    };

    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

        self.routes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('index.html') );
        };

        // ivr query handler route
        self.routes['/ivrquery'] = ivrqueryHandler;
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     * Handle for ivr query module requests
     *
     * @param req The request object
     * @param res The response object
     */
    function ivrqueryHandler (req, res) {

        var xml;
        try {
            /*
                Parse input parameters passed in as param1, param2, param3, etc.
             */
            var in_param1 = req.query.param1;
            var in_param2 = req.query.param2;
            var in_param3 = req.query.param3;

            // Begin module processing

            var out_param1 = in_param1;
            var out_param2 = in_param2;
            var out_param3 = in_param3;

            // End module processing

            /*
                Set return values to array. Results are returned in
                order as: param1, param2, param3, etc.
             */
            var out_variables = [ out_param1, out_param2, out_param3 ];

            var index = 0;
            var out_array = [];
            for (var i in out_variables) {
                out_array.push({ name: 'param'+(++index), expr: convert2vxml(out_variables[i]) })
            }

            var json = { response: {
                variables: { var: out_array },
                error: { code: 0, description: '' }
            }};

            xml = '<?xml version="1.0"?>' + xml2js.toXml(json);

        } catch (e) {
            // catch exception, return as '5' user-defined error
            xml = '<?xml version="1.0"?>'
                + '<response>'
                + '<variables></variables>'
                + '<error code="5" description="' + convert2vxml(e.message) + '"/>'
                + '</response>';
        }

        res.setHeader('Content-Type', 'text/xml');
        res.send(xml);
    }

    /**
     * Escapes special characters in expression values
     * to VXML format
     *
     * @param val
     */
    function convert2vxml(val) {
        if (val != null && typeof val == 'string') {
            return val.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\\/g, '\\\\')
                .replace(/'/g, '\\&apos;')
                .replace(/"/g, '\\&quot;')
                .replace(/\x08/g, '\\b')
                .replace(/\x09/g, '\\t')
                .replace(/\x0a/g, '\\n')
                .replace(/\x0b/g, '\\v')
                .replace(/\x0c/g, '\\f')
                .replace(/\x0d/g, '\\r');
        }
        return val;
    }

    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express();

        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }
    };

    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };

    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        new Date(Date.now() ), self.ipaddress, self.port);
        });
    };
};

/**
 *  main():  Main code.
 */
var ivrquery = new IvrQueryServer();
ivrquery.initialize();
ivrquery.start();

