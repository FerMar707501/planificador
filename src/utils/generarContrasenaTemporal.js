const crypto = require('crypto');

module.exports = () => crypto.randomBytes(8).toString('base64url').slice(0, 10);