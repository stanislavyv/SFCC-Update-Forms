/**
 * Shows/ Hides bussiness form type fields (companyName and VAT)
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

            const $form = $currGroup.siblings('.js-address-form');
            console.log($form);

            const addressType = $currBtn.val();
            const $bussinessAddressFieldWrapper = $form.find('.js-bussiness-address-fields')
            console.log($bussinessAddressFieldWrapper);

            switch (addressType) {
                case "private":
                    $bussinessAddressFieldWrapper.addClass('d-none');
                    break;
                case "bussiness":
                    $bussinessAddressFieldWrapper.removeClass('d-none');
                    break;
                default:
                    break;
            }
        });
    });
}

module.exports = {
    changeFormType,
};
