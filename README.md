Sample OpenShift Node.js application and Five9 IVR Query Module
 detailing how to create a custom external IVR function.

The nodejs application need to be imported into Openshift using their
 application console located at https://openshift.redhat.com/app/console/applications.
 You will need to create a free account on OpenShift, select Do-It-Yourself custom
 cartridge, and follow the steps to set the public URL and this will setup a Git
 repository to push the application code.

Project layout:
 index.html - Documentation page listing the available string functions.
 server.js -  The main node application, string functions are located in ivrqueryHandler.
  A simnple API key is used to prevent un-authorized access to the service. The default
  token is 'secret-token' and should be replaced with a more complex value for production use.

A sample Five9 IVR script is located at /five9_ivr/openshift_test.five9ivr.
 This script can be imported into a five9 domain and details how to make
 the Query Module call. Replace 'http://your-application.rhcloud.com/ivrquery'
 with the actual name of your node server in the ivrquery module block.

The OpenShift `nodejs` cartridge documentation can be found at:
 http://openshift.github.io/documentation/oo_cartridge_guide.html#nodejs
