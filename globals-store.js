/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";

var globals = require('./lib/cache');
var _       = require('lodash')

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
      var global = args.name;

      if (args.base) {
        global = args.base + '.' + global;
      }

      var update = !!ent.id;
      seneca.log.info('entity','save start',{store:name,args:args});

      if( !update  ) {

        if (!ent.id$) {
          // generate id
          ent.id = myData.increment(global, 'counter', 1);
        } else {
          ent.id = ent.id$;
        }
      }

      var object = {
        node: {
          global: global,
          subscripts: [ent.id]
        },
        object: {}
      };
      var fields = ent.fields$()
      fields.forEach( function(field) {
        object.object[field] = ent[field]
      })
      seneca.log.info('entity','save',{store:name,object:object});
      myData.update(object, 'object', function (err, result) {
        if( !error(args,err,cb) ) {
          seneca.log.info('entity','result',{store:name,result:result});
          cb(err, ent);
        }
      });

    },

    load: function(args,cb) {
      // the entity
      var qent = args.qent

      // the query object (eg. {id:'some-id'})
      var q    = args.q

      // the entity name, that maps to GlobalsDB container (eg. a table)
      var global = args.name;

      if (args.base) {
        global = args.base + '.' + global;
      }

      var ent = null;

      seneca.log.info('entity',args,{store:name,args:args})

      myData.retrieve({
        global: global,
        subscripts: [q.id]
      }, 'object', function (err, result) {
        if (err) {
          seneca.log.error('entity',result.ErrorMessage || 'load error',{store:name,args:args})
        }
        if (_.isEmpty(result.object)) {
          cb(err, null );
        } else {
          ent = qent.make$(result.object);
          cb(err, ent ? ent : null );
        }
      });

    },

    list: function(args,cb) {
      var global = args.name;
      var qent = args.qent

      if (args.base) {
        global = args.base + '.' + global;
      }

      seneca.log.info('entity','list start',{store:name,args:args});
      myData.retrieve({
        global: global
      }, 'list', function (err, result) {

        var list = [];

        if( !err || 0 == err ) {

          result.forEach(function (item) {

            if ('counter' !== item) {
              var obj = myData.retrieve({global:global, subscripts:[item]}, 'object');
              seneca.log.info('entity','list',{store:name,result:obj});
              if (!_.isEmpty(obj)) {
                var ent = qent.make$(obj.object);
                seneca.log.info('entity','ent',{store:name,ent:ent});
                list.push(ent);
              }

            }
            cb(null, list);
          });

        }
        
      });
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
