/**
 * Gets site's reCAPTCHA configuration data from custom preferences and attaches it to view data
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next call in the middleware chain
 * @returns {void}
 */
function attachReCaptchaData(req, res, next) {
    const URLUtils = require("dw/web/URLUtils");
    const Site = require("dw/system/Site");
    const RECAPTCHA_KEYS = require("~/cartridge/constants/reCaptcha");

    const currSite = Site.getCurrent();

    const reCaptchaConfig = {
        siteKey: currSite.getCustomPreferenceValue(RECAPTCHA_KEYS["site"]),
        threshold: currSite.getCustomPreferenceValue(
            RECAPTCHA_KEYS["threshold"]
        ),
        secret: currSite.getCustomPreferenceValue(RECAPTCHA_KEYS["secret"]),
        verifyUrl: URLUtils.url("ReCaptcha-Verify"),
    };

    const viewData = res.getViewData();
    viewData.reCaptcha = reCaptchaConfig;
    res.setViewData(viewData);

    next();
}

module.exports = { attachReCaptchaData };
