"use strict";

var globals = require('../lib/cache');
var _       = require('lodash')

var rootOfGlobalsInstall = process.env.GLOBALS_HOME;

var myData = new globals.Cache();

myData.open(
	{
		path: rootOfGlobalsInstall + '/mgr',
		username: '_SYSTEM',
		password: 'SYS',
		namespace: 'USER',
	},
	function (err, result) {

		if (err) {
			console.log('ERROR open(): ' + JSON.stringify(result, null, '\t'));
			return;
		}

		myData.global_directory({}, function(error, result) {
          if (!error) {
             console.log("\n");
             console.log("global_directory: " + JSON.stringify(result, null, '\t'));
             result.forEach(function(table){
             	console.log('Killing ' + table + '...');
             	var kill = myData.kill(table);
             	console.log(kill);
             });

            var tables = myData.global_directory({})
			console.log("\n");
			console.log("global_directory():  " + tables);


          }
          else
             console.log("ERROR: global_directory(): " + JSON.stringify(result, null, '\t'));
		});

	}
);
