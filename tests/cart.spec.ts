import { test, expect } from '@playwright/test';
import { productDetailLocators, shopPageLocators, cartLocators } from './locators';
import {
  goToShop,
  parsePrice,
  extractProductId,
  findProductIdWithVariants,
  selectLastVariantOptionInEachGroup,
  addToCartWithRetry,
  openCart,
  removeFromCartIfPresent,
  API_BASE,
  AUTH_FILE,
} from './helpers';

test.setTimeout(120000);

// Dùng lại phiên đăng nhập đã tạo sẵn ở global-setup.ts thay vì tự đăng nhập lại từng test
test.use({ storageState: AUTH_FILE });

// Các test dùng chung một tài khoản thật nên chạy tuần tự, tránh nhiều test cùng sửa giỏ hàng
// một lúc gây xung đột dữ liệu
test.describe.configure({ mode: 'serial' });

// A01 (UI · smoke): Đúng tên, giá và trạng thái sản phẩm mẫu.
test('A01: sản phẩm mẫu hiển thị đúng tên, giá và trạng thái kho', async ({ page }) => {
  await goToShop(page);

  // Lấy sản phẩm mẫu đầu tiên trong danh sách bán chạy của shop để đối chiếu
  const cards = shopPageLocators.bestSellerProductCards(page);
  const sampleCard = cards.first();
  const expectedName = (await shopPageLocators.productCardTitle(sampleCard).innerText()).trim();
  const expectedPrice = (await shopPageLocators.productCardPrice(sampleCard).innerText()).trim();

  const productLink = shopPageLocators.productCardLink(sampleCard);
  await productLink.scrollIntoViewIfNeeded();
  await productLink.click();
  await expect(page).toHaveURL(/\/san-pham\//, { timeout: 15000 });

  // Đúng tên
  await expect(productDetailLocators.productName(page)).toHaveText(expectedName);

  // Đúng giá
  await expect(productDetailLocators.productPrice(page)).toHaveText(expectedPrice);

  // Đúng trạng thái (tình trạng kho) của sản phẩm mẫu
  await expect(productDetailLocators.stockStatus(page)).toBeVisible();
  await expect(productDetailLocators.stockStatus(page)).toContainText(/Kho:\s*\d+/);
});

// A02 (UI · smoke): Chọn đúng màu/size; giỏ lưu đúng mã biến thể và số lượng.
test('A02: chọn màu/size cụ thể, giỏ hàng lưu đúng biến thể và số lượng', async ({ page, request }) => {
  await goToShop(page);

  // Tìm một sản phẩm có phân loại (màu/size) trong danh sách bán chạy của shop, dò qua API cho nhanh
  const cards = shopPageLocators.bestSellerProductCards(page);
  const cardCount = await cards.count();
  const candidateIds: string[] = [];
  for (let i = 0; i < cardCount; i++) {
    candidateIds.push(await extractProductId(cards.nth(i)));
  }
  const productId = await findProductIdWithVariants(request, candidateIds);

  // Dọn sạch sản phẩm này khỏi giỏ nếu còn sót từ lần chạy trước, tránh số lượng bị cộng dồn
  await removeFromCartIfPresent(page, productId);

  await page.goto(`/san-pham/${productId}`);
  await expect(page).toHaveURL(/\/san-pham\//);

  // Chọn cụ thể một tuỳ chọn không phải mặc định ở từng nhóm phân loại (vd: màu khác, size khác)
  const selectedOptions = await selectLastVariantOptionInEachGroup(page);
  expect(selectedOptions.length).toBeGreaterThan(0);

  // Đặt số lượng cụ thể để cùng kiểm tra giỏ có lưu đúng số lượng
  const quantity = 2;
  await productDetailLocators.quantityIncreaseButton(page).click({ timeout: 10000 });
  await expect(productDetailLocators.quantityValue(page)).toHaveText(String(quantity));

  await addToCartWithRetry(page);
  await openCart(page);

  // Giỏ hàng phải lưu đúng mã biến thể (màu | size) đã chọn và đúng số lượng
  const itemRow = cartLocators.itemRowByProductId(page, productId);
  const cartVariantText = (await cartLocators.itemVariant(itemRow).innerText()).trim();
  for (const option of selectedOptions) {
    expect(cartVariantText).toContain(option);
  }
  await expect(cartLocators.itemQuantity(itemRow)).toHaveText(String(quantity));
});

// A03 (UI · smoke): Đổi số lượng cập nhật đúng thành tiền; giỏ riêng.
test('A03: đổi số lượng trên trang sản phẩm cập nhật đúng thành tiền trong giỏ', async ({ page }) => {
  await goToShop(page);

  const cards = shopPageLocators.bestSellerProductCards(page);
  const productId = await extractProductId(cards.first());

  // Dọn sạch sản phẩm này khỏi giỏ nếu còn sót từ lần chạy trước, tránh số lượng bị cộng dồn
  await removeFromCartIfPresent(page, productId);

  await page.goto(`/san-pham/${productId}`);
  await expect(page).toHaveURL(/\/san-pham\//);

  // Một số sản phẩm yêu cầu chọn đủ phân loại trước khi thêm vào giỏ được - chọn mặc định (tuỳ chọn đầu tiên)
  const variantGroups = productDetailLocators.variantGroups(page);
  const variantGroupCount = await variantGroups.count();
  for (let i = 0; i < variantGroupCount; i++) {
    await productDetailLocators.variantOptionButtons(variantGroups.nth(i)).first().click({ timeout: 10000 });
  }

  // Tăng số lượng từ 1 lên 3
  const quantity = 3;
  for (let i = 1; i < quantity; i++) {
    await productDetailLocators.quantityIncreaseButton(page).click({ timeout: 10000 });
  }
  await expect(productDetailLocators.quantityValue(page)).toHaveText(String(quantity));

  await addToCartWithRetry(page);
  await openCart(page);

  // "Giỏ riêng": chỉ chọn đúng sản phẩm này để tổng tiền chỉ phản ánh riêng nó, không lẫn sản phẩm khác trong giỏ
  const itemRow = cartLocators.itemRowByProductId(page, productId);
  const unitPrice = parsePrice(await cartLocators.itemUnitPrice(itemRow).innerText());
  await expect(cartLocators.itemQuantity(itemRow)).toHaveText(String(quantity));

  await cartLocators.itemCheckbox(itemRow).click({ timeout: 15000 });

  const expectedTotal = unitPrice * quantity;
  await expect(cartLocators.totalPayAmount(page)).toHaveText(expectedTotal.toLocaleString('vi-VN'));
});

// A04 (API · smoke): Đúng ID, biến thể, giá và kiểu dữ liệu theo contract.
test('A04: API chi tiết sản phẩm trả đúng ID, biến thể, giá theo contract', async ({ page, request }) => {
  await goToShop(page);

  const cards = shopPageLocators.bestSellerProductCards(page);
  const productId = await extractProductId(cards.first());

  const res = await request.get(`${API_BASE}/api/v3/buyer/product/${productId}`);
  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(body.success).toBe(true);

  const data = body.data;
  // Đúng ID
  expect(data._id).toBe(productId);
  expect(typeof data.name).toBe('string');
  expect(data.name.length).toBeGreaterThan(0);

  // Kiểu dữ liệu giá ở cấp sản phẩm: number hoặc null (khi giá nằm ở từng biến thể)
  if (data.sale_price !== null) expect(typeof data.sale_price).toBe('number');
  if (data.before_sale_price !== null) expect(typeof data.before_sale_price).toBe('number');
  expect(typeof data.quantity).toBe('number');

  // Đúng cấu trúc biến thể (option_types khai báo nhóm, variants là các tổ hợp cụ thể)
  expect(Array.isArray(data.option_types)).toBe(true);
  for (const optionType of data.option_types) {
    expect(typeof optionType.name).toBe('string');
    expect(Array.isArray(optionType.option_values)).toBe(true);
    for (const value of optionType.option_values) {
      expect(typeof value.name).toBe('string');
    }
  }

  expect(Array.isArray(data.variants)).toBe(true);
  for (const variant of data.variants) {
    expect(typeof variant._id).toBe('string');
    expect(Array.isArray(variant.option_values)).toBe(true);
    for (const value of variant.option_values) {
      expect(typeof value.name).toBe('string');
    }
    expect(typeof variant.quantity).toBe('number');
    if (variant.sale_price !== null) expect(typeof variant.sale_price).toBe('number');
    if (variant.before_sale_price !== null) expect(typeof variant.before_sale_price).toBe('number');
  }
});

// A05 (UI · smoke): Tăng/giảm số lượng sản phẩm ngay tại giỏ hàng cập nhật đúng số lượng và thành tiền.
test('A05: tăng/giảm số lượng sản phẩm ở giỏ hàng cập nhật đúng số lượng và thành tiền', async ({ page }) => {
  await goToShop(page);

  const cards = shopPageLocators.bestSellerProductCards(page);
  const productId = await extractProductId(cards.first());

  // Dọn sạch sản phẩm này khỏi giỏ nếu còn sót từ lần chạy trước, tránh số lượng bị cộng dồn
  await removeFromCartIfPresent(page, productId);

  await page.goto(`/san-pham/${productId}`);
  await expect(page).toHaveURL(/\/san-pham\//);

  // Một số sản phẩm yêu cầu chọn đủ phân loại trước khi thêm vào giỏ được - chọn mặc định (tuỳ chọn đầu tiên)
  const variantGroups = productDetailLocators.variantGroups(page);
  const variantGroupCount = await variantGroups.count();
  for (let i = 0; i < variantGroupCount; i++) {
    await productDetailLocators.variantOptionButtons(variantGroups.nth(i)).first().click({ timeout: 10000 });
  }

  await addToCartWithRetry(page);
  await openCart(page);

  const itemRow = cartLocators.itemRowByProductId(page, productId);
  const unitPrice = parsePrice(await cartLocators.itemUnitPrice(itemRow).innerText());
  await expect(cartLocators.itemQuantity(itemRow)).toHaveText('1');
  await cartLocators.itemCheckbox(itemRow).click({ timeout: 15000 });

  // Bấm nút "+" ngay tại giỏ hàng 2 lần: số lượng tăng từ 1 lên 3, thành tiền cập nhật theo
  await cartLocators.itemIncreaseQuantityButton(itemRow).click({ timeout: 10000 });
  await cartLocators.itemIncreaseQuantityButton(itemRow).click({ timeout: 10000 });
  await expect(cartLocators.itemQuantity(itemRow)).toHaveText('3', { timeout: 10000 });
  await expect(cartLocators.totalPayAmount(page)).toHaveText((unitPrice * 3).toLocaleString('vi-VN'), {
    timeout: 10000,
  });

  // Bấm nút "-" 1 lần: số lượng giảm từ 3 xuống 2, thành tiền cập nhật theo
  await cartLocators.itemDecreaseQuantityButton(itemRow).click({ timeout: 10000 });
  await expect(cartLocators.itemQuantity(itemRow)).toHaveText('2', { timeout: 10000 });
  await expect(cartLocators.totalPayAmount(page)).toHaveText((unitPrice * 2).toLocaleString('vi-VN'), {
    timeout: 10000,
  });
});
