/**
 * Calls reCaptchaService to verify token
 * @param {String} token 
 * @param {Object} reCaptchaConfig
 * @returns {Boolean} service response
 */
function verifyToken(token, reCaptchaConfig) {
    const reCaptchaService = require('~/cartridge/scripts/services/reCaptchaService');
    
    const requestObject = {
        token,
        secret: reCaptchaConfig.secret
    };

    const response = reCaptchaService.call(requestObject).object;

    const minThreshold = reCaptchaConfig.threshold;
    return response.score >= minThreshold;
}

module.exports = {
    verifyToken
};