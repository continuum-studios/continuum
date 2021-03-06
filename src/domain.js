'use strict';

/***********************************************************************************************************************************************
 * CONTINUUM - DOMAIN
 ***********************************************************************************************************************************************
 * @description
 */
const Resource = require('./resource');
const Store = require('./store');
const Model = require('./model');
const Service = require('./service');
const uuid = require('uuid/v4');
const joi = require('joi');

/**
 * Domain Class
 */
module.exports = class Domain {
  constructor(name='', members={}, config={}) {
    if(!name) {
      throw new Error(`System Domain - please provide a name for your domain`);
    }

    // Domains Constructs
    this.Service = members.Service instanceof Service && members.Service || new Service(config);
    this.Resource = members.Resource instanceof Resource && members.Resource || new Resource(name, config);
    this.Store = members.Store instanceof Store && members.Store || new Store(config);
    this.Model = members.Model || new Model('Model', {}, {});
    this.Components = members.Components || {};
    this.Constants = members.Constants || {};

    // Domain Event management.
    this.subscribe = this.Store.subscribe;
    this.dispatch = this.Store.dispatch;
  }

  /**
   * Retrieval Orchestrator
   * @param  {[type]} config [description]
   * @return {[type]}        [description]
   */
  get(config={}) {
    return new Promise((resolve, reject) => {
      // See if the Store has it first
      this.Store.get()
        .then(resolve, (err) => {
          // If store doesn't have, try the API
          this.Resource.get(config)
            // Validate incoming data
            .then(response => this.Model.validate(response.data, config))
            // Process incoming data
            .then(data => this.Service.inbound.get(data))
            // Write it to the store
            .then(data => this.Store.set(data))
            // Dispatch change events
            .then(this.dispatch)
            // Resolve to direct callers
            .then(resolve);
        }).catch(reject); // add system-wide custom class
    });
  }

  /**
   * Update orchestrator
   * @param  {Object} [data={}]   [description]
   * @param  {Object} [config={}] [description]
   * @return {[type]}             [description]
   */
  update(data={}, config={}) {
    return new Promise((resolve, reject) => {
      this.Resource.put(this.Service.outbound.update(data), config)
        .then(response => this.Store.set(this.Service.inbound.update(response, data), config))
        .then(this.dispatch)
        .then(resolve)
        .catch(reject)
    });
  }

  create(data={}, config={}) {
    return new Promise((resolve, reject) => {
      this.Resource.post(this.Service.outbound.create(data), config)
        .then(response => this.Store.set(this.Service.inbound.create(response, data), config))
        .then(this.dispatch)
        .then(resolve)
        .catch(reject)
    });
  }
  /**
   * Delete Orchestrator
   * @param  {Object} [data={}]   [description]
   * @param  {Object} [config={}] [description]
   * @return {[type]}             [description]
   */
  delete(data={}, config={}) {
    return new Promise((resolve, reject) => {
      this.Resource.delete(data, config)
        .then(response => this.Store.remove(data))
        .then(this.dispatch)
        .then(resolve)
        .catch(reject)
    });
  }
}
