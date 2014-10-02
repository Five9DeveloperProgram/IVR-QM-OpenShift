#!/bin/env node

var express = require('express');
var fs      = require('fs');
var xml2js  = require('xml2json');

/**
 *  Define the application class
 */
var AppClass = function() {

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


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

        self.routes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('index.html') );
        };

        // define ivr query handler route
        self.routes['/ivrquery'] = ivrqueryHandler;
    };

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
                Parse the input parameters. By default the query modules
                uses param1, param2, param3, etc.
             */
            var in_param1 = req.query.param1;
            var in_param2 = req.query.param2;

            /*
                Perform module processing, return results as
                param1, param2, param3, etc.
             */
            var out_param1 = in_param1;
            var out_param2 = in_param2;

            var json = {};
            json.response = {};
            json.response.variables = [];
            json.response.variables.push({ var: { name: 'param1', expr: out_param1 }});
            json.response.variables.push({ var: { name: 'param2', expr: out_param2 }});
            json.response.error = { code: 0, description: '' };

            xml = '<?xml version="1.0"?>' + xml2js.toXml(json);

//            xml = '<?xml version="1.0"?>'
//                + '<response>'
//                + '<variables>'
//                + '<var name="param1" expr="' + out_param1 + '"/>'
//                + '<var name="param2" expr="' + out_param2 + '"/>'
//                + '</variables>'
//                + '<error code="0" description=""/>'
//                + '</response>';

        } catch (e) {
            // catch exception, return as error
            xml = '<?xml version="1.0"?>'
                + '<response>'
                + '<variables>'
                + '</variables>'
                + '<error code="-1" description="' + e.message + '"/>'
                + '</response>';
        }

        res.setHeader('Content-Type', 'text/xml');
        res.send(xml);
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
var mainapp = new AppClass();
mainapp.initialize();
mainapp.start();

