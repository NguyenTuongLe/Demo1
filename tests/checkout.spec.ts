import { test, expect, Page } from '@playwright/test';
import { cartLocators, checkoutLocators, productDetailLocators, shopPageLocators } from './locators';
import { login, goToShop, dismissAuthPromoModal, findCheapestCard, addToCartWithRetry, openCart } from './helpers';

test.setTimeout(240000);

// Chọn sản phẩm rẻ nhất trong shop và thêm vào giỏ hàng, trả về tên sản phẩm
async function addCheapestProductToCart(page: Page): Promise<string> {
  const cards = shopPageLocators.bestSellerProductCards(page);
  const cheapestCard = await findCheapestCard(cards);
  const productName = (await shopPageLocators.productCardTitle(cheapestCard).innerText()).trim();

  const productLink = shopPageLocators.productCardLink(cheapestCard);
  await productLink.scrollIntoViewIfNeeded();
  await productLink.click();
  await expect(page).toHaveURL(/\/san-pham\//, { timeout: 15000 });

  // Một số sản phẩm yêu cầu chọn đủ phân loại (màu/kích thước...) trước khi thêm vào giỏ được
  const variantGroups = productDetailLocators.variantGroups(page);
  const variantGroupCount = await variantGroups.count();
  for (let i = 0; i < variantGroupCount; i++) {
    await productDetailLocators.variantOptionButtons(variantGroups.nth(i)).first().click({ timeout: 10000 });
  }

  await addToCartWithRetry(page);
  return productName;
}

// Từ trang sản phẩm, mở giỏ hàng, chọn đúng sản phẩm rồi bấm "Mua hàng"
async function checkoutFromCart(page: Page, productName: string) {
  await openCart(page);

  const itemRow = cartLocators.itemRow(page, productName);
  await cartLocators.itemCheckbox(itemRow).click({ timeout: 15000 });
  await cartLocators.checkoutButton(page).click({ timeout: 15000 });
}

test('Checkout - đã đăng nhập: mua sản phẩm rẻ nhất ở shop Le Nguyen và đặt hàng thành công', async ({ page }) => {
  // Đăng nhập
  await login(page);

  // Vào shop Le Nguyen, chọn sản phẩm rẻ nhất, thêm vào giỏ hàng
  await goToShop(page);
  const productName = await addCheapestProductToCart(page);

  // Vào giỏ hàng, chọn sản phẩm, bấm "Mua hàng"
  await checkoutFromCart(page, productName);
  await expect(page).toHaveURL(/\/thanh-toan/, { timeout: 20000 });

  // Trang thanh toán tải xong khi nút đặt hàng xuất hiện
  await expect(checkoutLocators.readyMarker(page)).toBeVisible({ timeout: 60000 });

  // Chọn đơn vị vận chuyển Giao hàng tiết kiệm - overlay loading đôi khi che nút nên thử lại vài lần
  const shippingRadio = checkoutLocators.shippingMethodRadio(page, 'Giao hàng tiết kiệm');
  let shippingSelected = false;
  for (let attempt = 0; attempt < 3 && !shippingSelected; attempt++) {
    await page.locator('.loading-checkout').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await checkoutLocators
      .shippingMethodLabel(page, 'Giao hàng tiết kiệm')
      .click({ timeout: 10000 })
      .catch(() => {});
    shippingSelected = await shippingRadio.isChecked().catch(() => false);
  }
  await expect(shippingRadio).toBeChecked();

  // Trang hiện overlay loading khi tính lại phí vận chuyển, đợi nó biến mất trước khi bấm tiếp
  await page.locator('.loading-checkout').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  // Đồng ý điều khoản và đặt hàng
  await checkoutLocators.termsCheckbox(page).click({ timeout: 15000 });
  await checkoutLocators.placeOrderButton(page).click({ timeout: 15000 });

  // Đặt hàng thành công
  await expect(checkoutLocators.orderSuccessTitle(page)).toBeVisible({ timeout: 30000 });
});

test('Checkout - chưa đăng nhập: mua sản phẩm rẻ nhất ở shop Le Nguyen và nhập thông tin giao hàng hợp lệ', async ({
  page,
}) => {
  // Vào shop Le Nguyen (không đăng nhập), chọn sản phẩm rẻ nhất, thêm vào giỏ hàng
  await goToShop(page);
  const productName = await addCheapestProductToCart(page);

  // Vào giỏ hàng, chọn sản phẩm, bấm "Mua hàng"
  await checkoutFromCart(page, productName);
  await expect(page).toHaveURL(/\/thanh-toan-2/, { timeout: 20000 });
  await dismissAuthPromoModal(page);

  // Nhập thông tin giao hàng hợp lệ
  await checkoutLocators.guestNameInput(page).fill('Nguyen Van Test');
  await checkoutLocators.guestPhoneInput(page).fill('0912345678');
  await checkoutLocators.guestEmailInput(page).fill('nguyenvantest@example.com');
  await checkoutLocators.guestStreetInput(page).fill('123 Tran Phu');

  // Popup quảng cáo đăng nhập có thể tự bật lên sau vài giây, kiểm tra lại trước khi thao tác tiếp
  await dismissAuthPromoModal(page);
  await checkoutLocators.guestProvinceControl(page).click({ timeout: 15000 });
  await checkoutLocators.guestProvinceFirstOption(page).click({ timeout: 15000 });

  await dismissAuthPromoModal(page);
  await checkoutLocators.guestWardControl(page).click({ timeout: 15000 });
  await checkoutLocators.guestWardFirstOption(page).click({ timeout: 15000 });

  await dismissAuthPromoModal(page);
  await checkoutLocators.guestConfirmInfoButton(page).click({ timeout: 15000 });

  // Toàn bộ thông tin hợp lệ -> nút "Thanh toán" được kích hoạt
  await expect(checkoutLocators.placeOrderButton(page)).toBeEnabled({ timeout: 10000 });
});
