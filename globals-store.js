/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";

var globals = require('./lib/cache');
var _       = require('lodash');

var name = "globals-store";


module.exports = function(options) {

  var seneca = this;
  var desc;

  var myData = null;

  options = seneca.util.deepextend({
    path: '',
    username: '_SYSTEM',
    password: 'SYS',
    namespace: 'USER',
  }, options);

  function error(args, err, cb) {
    if( err ) {
      seneca.log.error('entity', err, {store:name});
      return true;
    }
    else return false;
  }

	function configure(params, cb) {
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

  function getGlobalName(ent) {
    var canon = ent.canon$({object:true});

    var global = (canon.base ? canon.base + '.' : '') + canon.name;

    return global;
  }

  function removeById(global, id, cb) {
    myData.get({
      global: global,
      subscripts: [id]
    }, function (err, result) {
      if (err) {
        seneca.log.error('entity',result.ErrorMessage || 'remove error',{id:id});
      }
      if (_.isEmpty(result.data) || 0 === result.defined) {
        cb(err, null );
      } else {

        myData.kill({global: global, subscripts: [id]}, function(err, result){
          cb(err);
        });

      }
    });
  }

  function removeByQuery(global, q, cb) {

      myData.retrieve({
        global: global
      }, 'list', function (err, result) {
        if( !err || 0 === err ) {

          result.forEach(function (item) {
            if ('counter' !== item) {
              var result = myData.get({global:global, subscripts:[item]});
              if (!_.isEmpty(result.data)) {
                var data = JSON.parse(result.data);
                if (Object.keys(q).length > 0) {
                  var matches = false;
                  for(var key in q) { 
                     if (data.hasOwnProperty(key) && data[key] == q[key]) {
                      matches = true;
                     } else {
                      matches = false;
                     }
                  }
                  if (true === matches) {
                      // remove the first item and exit with callback
                      var res = myData.kill(global, data.id);
                      if (0 === res) {
                        cb(null, null);
                      }
                  }
                }
              }
            }
          });          
        }
        cb(err);
      });
  }

  var store = {
    name:name,

    close: function(args, cb) {
      if(myData) {
        myData.close(cb);
      }
      else return cb();
    },

    save: function(args, cb) {

      var ent = args.ent;

      var global = getGlobalName(ent);

      var update = !!ent.id;

      if( !update  ) {

        if (!ent.id$) {
          // generate id
          ent.id = myData.increment(global, 'counter', 1);
        } else {
          ent.id = ent.id$;
        }
      }

      var object = {};
      var fields = ent.fields$()
      fields.forEach( function(field) {
        object[field] = ent[field];
      })

      myData.set({
        global: global,
        subscripts: [ent.id],
        data: JSON.stringify(object)
      }, function (err, result) {
        if( !error(args,err,cb) ) {
          cb(err, ent);
        }
      });

    },

    load: function(args,cb) {
      // the entity
      var qent = args.qent;

      // the query object (eg. {id:'some-id'})
      var q    = args.q;

      // the entity name, that maps to GlobalsDB container (eg. a table)
      var global = getGlobalName(qent);

      var ent = null;

      if (q.id) {
        myData.get({
          global: global,
          subscripts: [q.id]
        }, function (err, result) {
          if (err) {
            seneca.log.error('entity',result.ErrorMessage || 'load error',{store:name,args:args});
          }
          if (_.isEmpty(result.data) || 0 === result.defined) {
            cb(err, null );
          } else {
            ent = qent.make$(JSON.parse(result.data));
            cb(err, ent ? ent : null );
          }
        });
      } else {
        // Call list method and return the first of the list to callback, if not error
        store.list(args, error(cb, function(list){
          cb(null, list[0])
        }));
      }

    },

    list: function(args,cb) {
      var qent = args.qent;
      var global = getGlobalName(qent);
      var q = args.q;

      myData.retrieve({
        global: global
      }, 'list', function (err, result) {

        var list = [];

        if( !err || 0 === err ) {

          result.forEach(function (item) {

            if ('counter' !== item) {
              var result = myData.get({global:global, subscripts:[item]});
              if (!_.isEmpty(result.data)) {
                var ent = qent.make$(JSON.parse(result.data));
                if (Object.keys(q).length > 0) {
                  var matches = false;
                  for(var key in q) { 
                      console.log(key);
                     if (ent.hasOwnProperty(key) && ent[key] === q[key]) {
                      matches = true;
                     } else {
                      matches = false;
                     }
                  }
                  if (true === matches) {
                      list.push(ent);
                  }
                } else {
                  // no query, retrieving all objects
                  list.push(ent);
                }
              }

            }

          });
          cb(null, list);
        }

      });
    },

    remove: function(args, cb) {
      var qent = args.qent
      var q    = args.q

      var all  = q.all$ // default false
      var load  = _.isUndefined(q.load$) ? true : q.load$ // default true

      var global = getGlobalName(qent);

      if (all) {
        myData.kill({global: global}, function(err, result){
          cb(err);
        });
      } else {
        // List and delete
        if (q.id) {
          removeById(global, q.id, function(err){
            if (!err || 0 == err) {
              cb(null, null);
            } else {
              cb(err);
            }
          });
        } else {
          removeByQuery(global, q, function(err){
            if (!err || 0 == err) {
              cb(null, null);
            } else {
              cb(err);
            }
          });
        }
      }
    },

    native: function(args, done) {
      done(null, myData);
    }
  }

  var meta = seneca.store.init(seneca,options,store);
  desc = meta.desc;


  seneca.add({init:store.name, tag:meta.tag}, function(args, done){
    configure(options, function(err){
      if( err ) return seneca.die('store', err, {store:store.name, desc:desc});
      return done();
    })
  })

  return {name:store.name, tag:meta.tag};

}
