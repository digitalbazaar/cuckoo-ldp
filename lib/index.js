/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const suites = {
  GraphCycleProof2018: require('./GraphCycleProof2018')
};

module.exports = {
  suites,
  install: jsigs => {
    for(const suite in suites) {
      jsigs.suites[suite] = suites[suite];
    }
  }
};
