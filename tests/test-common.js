/**
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

module.exports = async function(options) {
  const {assert, jsigs, jsonld} = options;
  // setup
  jsigs.use('jsonld', jsonld);
  // run tests
  describe('Example', function() {
    context('common', function() {
      it('should pass', function(done) {
        done();
      });
    });
  });
};
