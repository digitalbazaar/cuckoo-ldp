/**
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
// FIXME: hack to ensure delay is set first
//mocha.setup({delay: true, ui: 'bdd'});

// jsonld compatibility
//require('core-js/fn/array/includes');
require('core-js/fn/object/assign');
require('core-js/fn/promise');
require('regenerator-runtime/runtime');

const assert = require('chai').assert;
const common = require('./test-common');
const jsigs = require(
  '../node_modules/jsonld-signatures/dist/jsonld-signatures.js');
const jsonld = require('../node_modules/jsonld/dist/jsonld.js');

const forge = require('../node_modules/node-forge');
window.forge = forge;

jsigs.promises({api: jsigs.promises});

const options = {
  assert: assert,
  jsigs: jsigs,
  jsonld: jsonld,
  nodejs: false
};

common(options).then(() => {
  //run();
}).catch(err => {
  console.error(err);
});
