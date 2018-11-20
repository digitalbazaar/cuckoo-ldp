/**
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const cuckoo = require('cuckoo-cycle');
const jsigs = require('jsonld-signatures');

const CHAIN_LENGTH = 10;
const CYCLE_LENGTH = 8;
const LITTLE_ENDIAN = true;
const POW_SIZE = (CYCLE_LENGTH + 1) * 4 * CHAIN_LENGTH;
const POW_SIZE_BYTES = POW_SIZE * 4;

// TODO: define and validate cycle lengths: 8, 24, 42
// TODO: define and validate chain lengths: 1-1000
// TODO: define and validate graph sizes: 28, 30, 32

/* Chained Cuckatoo Cycle Proof of Work = C3P-ow! */
module.exports = class GraphCycleProof2018
  extends jsigs.suites.LinkedDataSignature {
  constructor(injector, algorithm = 'GraphCycleProof2018') {
    super(injector, algorithm);
  }

  async createVerifyData(input, options) {
    const proof = options.proof;
    // FIXME: make everything but `powDifficulty` have a default here
    if(!('powChainLength' in proof && 'powDifficulty' in proof &&
      'powGraphCycleLength' in proof && 'powGraphSize' in proof)) {
      if(!('pow' in options)) {
        throw new Error('"options.pow" must be given.');
      }
      const {chainLength, cycleLength, difficulty, graphSize} = options.pow;
      proof.powChainLength = chainLength;
      proof.powDifficulty = difficulty;
      proof.powGraphCycleLength = cycleLength;
      proof.powGraphSize = graphSize;
    }
    return super.createVerifyData(input, options);
  }

  async createProofNode(verifyData, options) {
    // FIXME: only `powDifficulty` should be required here, other parameters
    // have defaults per GraphCycleProof2018
    if(!('pow' in options)) {
      throw new Error('"options.pow" must be given.');
    }
    const {chainLength, cycleLength, difficulty, graphSize} = options.pow;

    if(this.injector.env.nodejs) {
      const result = await cuckoo.solveChain({
        engine: 'tromp',
        input: _hash(verifyData),
        chainLength,
        cycleLength,
        difficulty,
        graphSize
      });

      // convert solution to buffer of 32 bit little endian integers
      // TODO: use POW_SIZE?
      const ab = new ArrayBuffer((cycleLength + 1) * 4 * chainLength);
      const dv = new DataView(ab);
      let idx = 0;
      for(const solution of result) {
        dv.set(idx++ * 4, solution.nonce, LITTLE_ENDIAN);
        for(const edge of solution.edges) {
          dv.set(idx++ * 4, edge, LITTLE_ENDIAN);
        }
      }

      const proof = options.proof;
      Object.assign(proof, {
        powDifficulty: difficulty,
        proofValue: Buffer.from(ab).toString('base64'),
      });
      return proof;
    }

    throw new Error('Not implemented');
  }

  async verify(framed, options) {
    options = Object.assign({}, options || {});

    // TODO: in future, inherit from LinkedDataProof and avoid unnecessary
    // overrides

    // make fetching and checking public keys and checking nonces a no-op
    // because they aren't used in the default way by this scheme
    options.publicKey = {};
    options.checkNonce = () => true;
    options.checkKey = () => true;

    return super.verify(framed, options);
  }

  async sanitizeProofNode(proof, options) {
    proof = await super.sanitizeProofNode(proof, options);
    // nonce is an output value of the proof, so remove it here
    delete proof.nonce;
    return proof;
  }

  async verifyProofNode(verifyData, proof, options) {
    if(!proof.proofValue) {
      throw new Error('Missing proof value.');
    }
    if(typeof proof.proofValue !== 'string') {
      throw new TypeError('"proofValue" must be a string.');
    }

    if(this.injector.env.nodejs) {
      // convert buffer of 32 bit little endian ints to solution array
      const b = Buffer.from(proof.proofValue, 'base64');
      if(b.byteLength !== POW_SIZE_BYTES) {
        throw new Error(
          '"proofValue" must be ${POW_SIZE_BYTES} bytes in length.');
      }
      const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
      const chain = new Array(POW_SIZE);
      for(let si = 0; si < CHAIN_LENGTH; ++si) {
        let idx = si * (CYCLE_LENGTH + 1);
        const link = {
          nonce: dv.getUint32(idx++ * 4, LITTLE_ENDIAN),
          edges: []
        };
        for(let i = 0; i < CYCLE_LENGTH; ++i) {
          link.edges.push(dv.getUint32(idx++ * 4, LITTLE_ENDIAN));
        }
        chain.push(link);
      }

      const difficultyBuffer = Buffer.from(proof.powDifficulty, 'base64');
      const difficulty = difficultyBuffer.readUInt32LE(0);

      const cuckooOptions = {
        chainLength: CHAIN_LENGTH,
        cycleLength: CYCLE_LENGTH,
        difficulty,
        input: _hash(verifyData),
        solution: chain
      };
      return await cuckoo.verifyChain(cuckooOptions);
    }

    throw new Error('Not implemented.');
  }

  async validateKey(key, options) { /* not used */ }
};

function _hash(verifyData) {
  const crypto = require('crypto');
  return crypto.createHash('sha256')
    .update(verifyData.data, verifyData.encoding).digest();
}
