'use strict';

const processInclude = require('base/util');

// Compile addressBook/addressType.js in separate file for reusability
$(document).ready(function () {
    processInclude(require('./addressBook/addressType'));
});
