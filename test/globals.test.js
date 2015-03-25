/* Copyright (c) 2010-2014 Richard Rodger, MIT License */

"use strict";


var seneca = require('seneca')

var shared = require('seneca-store-test')

var rootOfGlobalsInstall = process.env.GLOBALS_HOME;

var si = seneca({log:'silent'})
si.use(require('..'), {path:rootOfGlobalsInstall})

si.__testcount = 0
var testcount = 0


describe('globals', function(){
  it('basic', function(done){
    testcount++
    shared.basictest(si,done)
  })

  it('close', function(done){
    shared.closetest(si,testcount,done)
  })
})
