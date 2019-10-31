'use strict';

const events = require('events');
const ApiHelper = require('../api-helper');
const Dictionary = require('../dictionary');
const AwsDistributor = require('../distributors/aws-distributor');
const LocalDistributor = require('../distributors/local-distributor');


class Distributor {
  /**
   * @param {Object} command
   */
  constructor(command) {
    this._eventEmitter = new events.EventEmitter();
    this._workCounter = -1;

    this.command = command;
    this.runId = command._runId;
    this.logger = command.logger;
    this.parameters = command.parameters;
  }

  /**
   * @return {Promise}
   */
  async run() {
    await this.command.validate();
    await this.sendLogsToApi();

    const result = await this.command.run();

    if (!Array.isArray(result)) {
      return Promise.resolve(result);
    }

    try {
      // for (const step of result) {
      const [{ actions, config, postActionFn, ...options }] = result;

      if (config) {
        this.projectConfig = config;
      }

      // eslint-disable-next-line no-await-in-loop
      const response = await this.runActions(actions, config, this.parameters, options);

      if (postActionFn) {
        return postActionFn(response);
      }
      // }
    } catch (err) {
      return Promise.reject(err);
    }

    await ApiHelper.sendMainWorkflow({ status: 'update' });

    return Promise.resolve('Done');
  }

  /**
   * @param {Number} direction
   * @return {Object}
   * @protected
   */
  buildDependencyTable(direction) {
    const keys = Object.keys(this.projectConfig);

    const result = keys.reduce((acc, key) => {
      acc[key] = {};

      return acc;
    }, {});

    switch (direction) {
      case Dictionary.DIRECTION.FORWARD:
        keys.forEach(key => {
          Object.assign(result[key], this.projectConfig[key].dependsOn);
        });
        break;

      case Dictionary.DIRECTION.REVERSE:
        keys.forEach(key => {
          Object.keys(this.projectConfig[key].dependsOn).forEach(hash => {
            result[hash][key] = null;
          });
        });
        break;
    }

    return result;
  }

  /**
   * Remove dependencies on this component
   * @param {Object} dependencyTable
   * @param {String} hash
   * @protected
   */
  removeDependencies(dependencyTable, hash) {
    Object.keys(dependencyTable).forEach(key => {
      delete dependencyTable[key][hash];
    });
  }

  /**
   * @param {String[]} actions
   * @param {Object} config
   * @param {Object} parameters
   * @param {String} format
   * @param {Boolean} planDestroy
   * @param {Boolean} stateList
   * @param {Number} dependencyDirection
   * @param {String} stateDelete
   * @param {String} importLines
   * @param {String} resourceName
   * @param {String} importId
   * @param {Boolean} input
   * @return {Promise}
   */
  async runActions(actions, config, parameters, {
    format = '',
    planDestroy = false,
    stateList = false,
    dependencyDirection = null,
    stateDelete = '',
    resourceName = '',
    importId = '',
    importLines = '',
    input = false
  } = {}) {
    const results = [];
    const errors = [];
    this._env = { format, planDestroy, resourceName, importId, importLines, stateList, stateDelete, input };
    this._dependencyTable = this.buildDependencyTable(dependencyDirection);
    this.TERRAFORM_ACTIONS = actions;

    return new Promise((resolve, reject) => {
      this.distributeConfig();

      this._eventEmitter.on('message', (data) => {
        const response = data.data || data;

        // if (response.isError) {
        //   errors.push(...(response.error || response.message)); //lambda ...
        //   return;
        // }

        if (response && !results.some(it => it.id === response.id)) {
          results.push(response);
        }
        this.removeDependencies(this._dependencyTable, response.hash);
      });

      this._eventEmitter.on('exit', (data) => {
        const { code } = data;
        this._workCounter--;

        if (code === 0 && this._workCounter < 25) {
          this.distributeConfig();
        }

        const hashes = Object.keys(this._dependencyTable);
        if (!hashes.length && this._workCounter === 1) { return resolve(results); }
        if (errors.length && !this._workCounter) { return reject(errors); }
      });
    });
  }

  /**
   * Distribute component config to Distributor execution
   * @return {void}
   */
  distributeConfig() {
    const hashes = Object.keys(this._dependencyTable);

    for (let index = 0; index < hashes.length && this._workCounter < 25; index++) {
      const hash = hashes[index];
      const dependsOn = Object.keys(this._dependencyTable[hash]);

      if (!dependsOn.length) {
        try {
          this.distributor = this.getDistributor(hash).distribute({ actions: this.TERRAFORM_ACTIONS, runId: this.runId });
        } catch (err) {
          this.logger.error(err);
        }

        this._workCounter++;
        delete this._dependencyTable[hash];
      }
    }
  }

  /**
   * @param {String} hash
   * @return {LocalDistributor|AwsDistributor}
   */
  getDistributor(hash) {
    const config = this.projectConfig[hash];
    const { distributor } = config;

    switch (distributor) {
      case 'local':
        return LocalDistributor.init(this.parameters, config, this._env, this._eventEmitter);
      case 'lambda':
        return new AwsDistributor(this.parameters, config, this._env, this._eventEmitter);
      case 'fargate':
        return new AwsDistributor(this.parameters, config, this._env, this._eventEmitter);
      default:
        return LocalDistributor.init(this.parameters, config, this._env, this._eventEmitter);
    }
  }

  /**
   * @return {Promise}
   */
  async sendLogsToApi() {
    ApiHelper.setToken(this.command._tokenIsValid);

    const environment = this.command.getOption('env') ? this.command.getOption('env') : 'default';
    const projectConfig = this.command.getProjectConfig();

    return ApiHelper.sendMainWorkflow({
      status: 'create',
      runId: this.command.runId,
      commandName: this.command._name,
      project: projectConfig,
      environment: environment
    });
  }
}

module.exports = Distributor;
