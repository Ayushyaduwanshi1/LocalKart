/**
 * Abstract Base AI Provider
 */
class AIProvider {
  constructor(name) {
    this.name = name;
  }

  async processRequest(params) {
    throw new Error('processRequest must be implemented by provider');
  }
}

module.exports = AIProvider;
