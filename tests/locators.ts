import { Page, Locator } from '@playwright/test';

// Đăng nhập
export const loginLocators = {
  loginMenuTrigger: (page: Page) => page.locator('text=Đăng nhập').locator('visible=true').first(),
  loginWithEmailOption: (page: Page) => page.getByText('Đăng nhập email', { exact: true }),
  emailInput: (page: Page) => page.locator('input[name="email"]'),
  passwordInput: (page: Page) => page.locator('input[name="password"]'),
  submitButton: (page: Page) => page.getByRole('button', { name: 'Đăng nhập', exact: true }),
  userName: (page: Page) => page.locator('.user-name'),
};

// Tìm kiếm & kết quả tìm kiếm
export const searchLocators = {
  keywordInput: (page: Page) => page.locator('input[name="keyword"]').first(),
  keywordInputVisible: (page: Page) => page.locator('input[name="keyword"]:visible'),
  shopTab: (page: Page) => page.locator('.search-result-tabbar__label', { hasText: 'Cửa hàng' }),
  brandRows: (page: Page) => page.locator('.brand-row'),
  shopsEmptyState: (page: Page) => page.locator('.shops-tab__empty'),
  brandRowName: (row: Locator) => row.locator('.brand-row__name'),
  brandRowMore: (row: Locator) => row.locator('.brand-row__more'),
  productCardsInRow: (row: Locator) => row.locator('.homepage_product_suggestion_product--product-card'),
  productCardLink: (card: Locator) => card.locator('a').first(),
  productCardTitle: (card: Locator) => card.locator('.title'),
  productCardPrice: (card: Locator) => card.locator('.money').first(),
};

// Trang chi tiết sản phẩm
export const productDetailLocators = {
  productName: (page: Page) => page.locator('.product-name'),
  productPrice: (page: Page) => page.locator('.product-price').first(),
  stockStatus: (page: Page) => page.locator('.store-quantity'),
  addToCartButton: (page: Page) => page.locator('.btn-add-to-cart'),
  // .radio-btn-component chỉ xuất hiện ở các nhóm phân loại thật (màu/kích thước...),
  // không dùng .variant-ctn vì nhóm "Số lượng" cũng mang class đó
  variantGroups: (page: Page) => page.locator('.radio-btn-component'),
  variantOptionButtons: (group: Locator) => group.locator('button'),
  quantityValue: (page: Page) => page.locator('.count-btn-component h4'),
  quantityIncreaseButton: (page: Page) => page.locator('#btn_plus'),
  quantityDecreaseButton: (page: Page) => page.locator('#btn_minus'),
};

// Trang cửa hàng (vd: /nguoi-ban/...)
export const shopPageLocators = {
  bestSellerProductCards: (page: Page) =>
    page
      .locator('.newproduct_bidu')
      .filter({ hasText: 'Sản phẩm bán chạy' })
      .locator('.d-none.d-sm-block .homepage_product_suggestion_product--product-card'),
  productCardLink: (card: Locator) => card.locator('a').first(),
  productCardTitle: (card: Locator) => card.locator('.title'),
  productCardPrice: (card: Locator) => card.locator('.money').first(),
};

// Giỏ hàng
export const cartLocators = {
  cartHeadIcon: (page: Page) => page.locator('.cart-head:visible').first(),
  viewCartLink: (page: Page) => page.locator('.see-all:visible', { hasText: 'Xem giỏ hàng' }).first(),
  itemRow: (page: Page, productName: string) =>
    page.locator('.cart-item-in-shop').filter({ hasText: productName }).first(),
  // Xác định theo product id trong href sẽ chính xác hơn theo tên khi có nhiều biến thể cùng sản phẩm
  itemRowByProductId: (page: Page, productId: string) =>
    page
      .locator('.cart-item-in-shop')
      .filter({ has: page.locator(`a[href*="/san-pham/${productId}"]`) })
      .first(),
  itemCheckbox: (row: Locator) => row.locator('.checkbox-product .checkbox-custom'),
  itemVariant: (row: Locator) => row.locator('.item-variant__name'),
  itemQuantity: (row: Locator) => row.locator('.current-quantity'),
  itemIncreaseQuantityButton: (row: Locator) => row.locator('.btn-incree-quantity'),
  itemDecreaseQuantityButton: (row: Locator) => row.locator('.btn-degree-quantity'),
  itemUnitPrice: (row: Locator) => row.locator('.item-price .price-dng'),
  itemDeleteButton: (row: Locator) => row.locator('.btn-delete-cart-item'),
  checkoutButton: (page: Page) => page.locator('.btn-checkout'),
  totalPayAmount: (page: Page) => page.locator('.total-pay-money'),
};

// Thanh toán (đã đăng nhập /thanh-toan và khách /thanh-toan-2)
export const checkoutLocators = {
  authPromoModalCloseButton: (page: Page) => page.locator('.auth-modal .close-button').first(),
  readyMarker: (page: Page) => page.locator('.btn-create-order'),
  shippingMethodLabel: (page: Page, label: string) => page.locator('.form-check-label', { hasText: label }),
  shippingMethodRadio: (page: Page, label: string) =>
    page.locator('.form-check', { hasText: label }).locator('input[type="radio"]'),
  termsCheckbox: (page: Page) => page.locator('.checkbox-custom-black'),
  placeOrderButton: (page: Page) => page.locator('.btn-create-order'),
  orderSuccessTitle: (page: Page) => page.getByText('Đơn hàng thành công'),

  // Chỉ dùng ở luồng khách (chưa đăng nhập) - /thanh-toan-2
  guestNameInput: (page: Page) => page.locator('input[name="name"]'),
  guestPhoneInput: (page: Page) => page.locator('input[name="phone"]'),
  guestEmailInput: (page: Page) => page.locator('input[name="email"]'),
  guestStreetInput: (page: Page) => page.locator('input[name="street"]'),
  guestProvinceControl: (page: Page) => page.locator('.css-yk16xz-control').filter({ hasText: 'Tỉnh/thành phố' }),
  guestProvinceFirstOption: (page: Page) => page.locator('[id^="react-select-2-option"]').first(),
  guestWardControl: (page: Page) => page.locator('.css-yk16xz-control').filter({ hasText: 'Phường/Xã' }),
  guestWardFirstOption: (page: Page) => page.locator('[id^="react-select-3-option"]').first(),
  guestConfirmInfoButton: (page: Page) => page.locator('.btn-confirm-info'),
};
