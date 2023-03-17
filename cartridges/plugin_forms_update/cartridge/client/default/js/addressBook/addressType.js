/**
 * Allows functionality to select from different address type forms
 */
function changeFormType() {
    const $radioBtnGroups = $(".js-address-type-wrapper");

    $radioBtnGroups.each(function (i, currGroup) {
        const $currGroup = $(currGroup);
        const $radioBtns = $currGroup.find(
            '.js-address-type input[name="addressType"]'
        );

        $radioBtns.on("change", function () {
            const $currBtn = $radioBtns.filter(":checked");

            const formSelector = `.js-${$currBtn.val()}-address-form`;
            const $newActiveForm = $currGroup.siblings(formSelector);

            $newActiveForm.removeClass("d-none");
            $newActiveForm
                .siblings('[class$="address-form"]')
                .addClass("d-none");
        });
    });
}

module.exports = {
    changeFormType,
};
