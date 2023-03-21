"use strict";

/**
 * @namespace Login
 */

const server = require("server");
const reCaptchaData = require("~/cartridge/scripts/middleware/reCaptchaData");

const base = module.superModule;
server.extend(base);

/**
 * Login-Show : This endpoint is called to load the login page
 * @name Base/Login-Show
 * @function
 * @memberof Login
 * @param {middleware} - reCaptchaData.attachReCaptchaData
 * @param {category} - sensitive
 * @param {serverfunction} - get
 */
server.append("Show", reCaptchaData.attachReCaptchaData);

module.exports = server.exports();
