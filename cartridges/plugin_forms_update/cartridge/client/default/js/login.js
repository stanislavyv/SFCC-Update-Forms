'use strict';

const processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('base/login/login'));
    processInclude(require('./login/reCaptcha'));
    processInclude(require('./login/password'));
});
