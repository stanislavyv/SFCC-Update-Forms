const ADDRESS_TYPES = {
    private: "privateAddress",
    bussiness: "bussinessAddress",
};

/**
 * Middleware validating if addressType is passed as querystring
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next call in the middleware chain
 * @returns {void}
 */
function validateType(req, res, next) {
    const addressType = ADDRESS_TYPES[req.querystring.addressType];
    if (!addressType) {
        return res.json({ success: false });
    }

    const viewData = res.getViewData();
    viewData.addressType = addressType;
    res.setViewData(viewData);

    next();
}

module.exports = {
    validateType,
};
