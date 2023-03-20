"use strict";

/**
 * @namespace Login
 */

const server = require("server");

const base = module.superModule;
server.extend(base);

/**
 * Login-Show : This endpoint is called to load the login page
 * @name Base/Login-Show
 * @function
 * @memberof Login
 * @param {category} - sensitive
 * @param {serverfunction} - get
 */
server.append("Show", function (req, res, next) {
    const URLUtils = require('dw/web/URLUtils');
    const Site = require("dw/system/Site");
    const currSite = Site.getCurrent();

    const RECAPTCHA_KEYS = require('~/cartridge/constants/reCaptcha');

    const reCaptchaConfig = {
        siteKey: currSite.getCustomPreferenceValue(RECAPTCHA_KEYS["site"]),
        verifyUrl: URLUtils.url("ReCaptcha-Verify")
    };

    const viewData = res.getViewData();
    viewData.reCaptcha = reCaptchaConfig;
    res.setViewData(viewData);

    next();
});

module.exports = server.exports();
