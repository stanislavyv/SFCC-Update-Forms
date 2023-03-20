/**
 * Calls reCaptchaService to verify token
 * @param {String} token 
 * @returns {Boolean} service response
 */
function verifyToken(token) {
    const Site = require("dw/system/Site");
    const currSite = Site.getCurrent();
    
    const reCaptchaService = require('~/cartridge/scripts/services/reCaptchaService');
    const RECAPTCHA_KEYS = require("~/cartridge/constants/reCaptcha");
    
    const requestObject = {
        token,
        secret: currSite.getCustomPreferenceValue(RECAPTCHA_KEYS.secret)
    };

    const response = reCaptchaService.call(requestObject).object;

    const minThreshold = currSite.getCustomPreferenceValue(RECAPTCHA_KEYS.threshold);
    return response.score >= minThreshold;
}

module.exports = {
    verifyToken
};