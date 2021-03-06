'use strict';

/***********************************************************************************************************************************************
 * CONTINUUM - MODEL
 ***********************************************************************************************************************************************
 * @description
 */
const joi = require('joi');
const Utils = require('./utils');
const _ = require('lodash');

/**
 * Model Class
 */
module.exports = class Model {
  constructor(name='Model', schema={}, config={}) {
    this.name = name;
    this.config = Object.assign({type: Array}, config);
    this.schema = joi.object().keys(schema);
    this.failed = [];

    // Function wrapper for dynamic naming of factory instance.
    const instance = Utils.fn(`${this.name}`, Instance);

    /**
     * Dynamic Factory instance
     * @param  {Object} [data={}] [description]
     * @return {[type]}           [description]
     */
    let factory = (function Factory(data={}) {
      let {error, value} = joi.validate(data, this.schema);

      return new instance(value, error);
    }).bind(this);

    Object.defineProperty(factory, 'schema', {value: this.schema, writable: false});
    Object.defineProperty(factory, 'config', {value: this.config, writable: false});
    Object.defineProperty(factory, 'failed', {get: () => [].concat(this.failed)});
    Object.defineProperty(factory, 'reset', {value: this.reset.bind(this), writable: false});
    Object.defineProperty(factory, 'validate', {value: this.validate.bind(this, instance), writable: false});

    return factory;
  }

  reset() {
    this.failed.length = 0;
  }

  validate(instance, data, config={}) {
    let spec = Object.assign(this.config, config);

    if(spec.validate === false) return data;

    return this.validators[spec.type](data, instance);
  }

  get validators() {
    let types = {};
        types[Array] = validateArrayModel.bind(this);
        types[Object] = validateObjectModel.bind(this);

    return types;
  }
}

/**
 * Dynamic Instance wrapper.
 * @param       {Object} [data={}] [description]
 * @param       {[type]} error     [description]
 * @constructor
 */
function Instance(data={}, error) {
  Object.assign(this, data);

  Object.defineProperty(this, '__failed', {
    enumerable: false,
    configurable: false,
    get: () => { return error; }
  })
}

//
// VALIDATORS
//------------------------------------------------------------------------------------------//
// @description
//

/**
 * Validates Schemas in an array body.
 * @param  {Array}  [data=[]] [description]
 * @param  {[type]} instance  [description]
 * @return {[type]}           [description]
 */
function validateArrayModel(data=[], instance) {
  if(data.constructor !== Array) {
    return console.error(`Continuum:Model - Model:${this.name} was specified as type: [${this.config.type}] but got: [${data}] of type: [${data.constructor}]`);
  }

  return data.map(n => joi.validate(n, this.schema)).map(n => new instance(n.value, n.error));
}

/**
 * Validates schema against a single object
 * @param  {[type]} data     [description]
 * @param  {[type]} instance [description]
 * @return {[type]}          [description]
 */
function validateObjectModel(data={}, instance) {
  if(data.constructor !== Object) {
    return console.error(`Continuum:Model - Model:${this.name} was specified as type: [${this.config.type}] but got: [${data}] of type: [${data.constructor}]`);
  }

  let {error, value} = joi.validate(data, this.schema);
  return new instance(value, error);
}
