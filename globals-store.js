/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";

var globals = require('./lib/cache');

var name = "globals-store"


module.exports = function(options) {
  var seneca = this;
  var desc;

  var myData = null;

  options = seneca.util.deepextend({
    path: '',
    username: '_SYSTEM',
    password: 'SYS',
    namespace: 'USER',
  },options)

  function error(args,err,cb) {
    if( err ) {
      seneca.log.error('entity',err,{store:name})
      return true;
    }
    else return false;
  }

	function configure(params,cb) {
		myData = new globals.Cache();

		myData.open(
			{
				path: params.path + '/mgr',
				username: params.username,
				password: params.password,
				namespace: params.namespace,
			},
			function (err, result) {
				if (err) {
					cb(err);
				}
				cb(null);
			}
		);
	}

  var store = {
    name:name,

    close: function(args,cb) {
      if(myData) {
        myData.close(cb)
      }
      else return cb();
    },

    save: function(args,cb) {

      var ent = args.ent
      var collection = args.name;

      var update = !!ent.id;

    },

    load: function(args,cb) {
      var qent = args.qent
      var q    = args.q
    },

    list: function(args,cb) {
    },

    remove: function(args,cb) {
    },

    native: function(args,done) {
    }
  }

  var meta = seneca.store.init(seneca,options,store);
  desc = meta.desc;


  seneca.add({init:store.name,tag:meta.tag},function(args,done){
    configure(options,function(err){
      if( err ) return seneca.die('store',err,{store:store.name,desc:desc});
      return done();
    })
  })

  return {name:store.name,tag:meta.tag}

}
