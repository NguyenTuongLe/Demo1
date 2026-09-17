import { APIRequestContext, Page, Locator, expect } from '@playwright/test';
import {
  loginLocators,
  searchLocators,
  shopPageLocators,
  productDetailLocators,
  cartLocators,
  checkoutLocators,
} from './locators';

// Tên cửa hàng dùng chung cho các test cần tìm kiếm/mở shop này
export const SHOP_KEYWORD = 'Le Nguyen';

// Domain API backend, dùng cho các test kiểm tra API/contract
export const API_BASE = 'https://dev-commerce.bidu.vn';

// Đăng nhập bằng email/mật khẩu lấy từ biến môi trường BIDU_EMAIL / BIDU_PASSWORD
export async function login(page: Page) {
  await page.goto('/');
  await loginLocators.loginMenuTrigger(page).click();
  await loginLocators.loginWithEmailOption(page).click();
  await loginLocators.emailInput(page).fill(process.env.BIDU_EMAIL!);
  await loginLocators.passwordInput(page).fill(process.env.BIDU_PASSWORD!);
  await loginLocators.submitButton(page).click();
  await expect(loginLocators.userName(page)).toBeVisible({ timeout: 20000 });
}

// Tìm kiếm và mở trang cửa hàng SHOP_KEYWORD (không yêu cầu đăng nhập)
export async function goToShop(page: Page) {
  await page.goto('/');
  await searchLocators.keywordInput(page).click();
  const searchInput = searchLocators.keywordInputVisible(page);
  await searchInput.fill(SHOP_KEYWORD);
  await searchInput.press('Enter');
  await expect(page).toHaveURL(/\/tim-kiem\?keyword=/);

  await searchLocators.shopTab(page).click();
  const shopRow = searchLocators.brandRows(page).filter({ hasText: SHOP_KEYWORD }).first();
  await searchLocators.brandRowMore(shopRow).click();
  await expect(page).toHaveURL(/\/nguoi-ban\//);

  // Danh sách "Sản phẩm bán chạy" tải bằng một API riêng sau khi trang đã chuyển URL,
  // đợi ít nhất 1 thẻ sản phẩm xuất hiện để tránh đọc danh sách rỗng do đọc quá sớm
  await shopPageLocators.bestSellerProductCards(page).first().waitFor({ state: 'visible', timeout: 20000 });
}

// Đóng popup quảng cáo đăng nhập nếu nó xuất hiện (thường gặp với người dùng chưa đăng nhập)
export async function dismissAuthPromoModal(page: Page) {
  const authPromoModal = checkoutLocators.authPromoModalCloseButton(page);
  if (await authPromoModal.isVisible({ timeout: 1500 }).catch(() => false)) {
    await authPromoModal.click({ timeout: 5000 }).catch(() => {});
  }
}

// Chuyển text giá (vd "165.000₫") thành số (165000)
export function parsePrice(text: string): number {
  return Number(text.replace(/[^\d]/g, ''));
}

// Tìm ô sản phẩm có giá thấp nhất trong một danh sách thẻ sản phẩm
export async function findCheapestCard(cards: Locator): Promise<Locator> {
  const count = await cards.count();
  let minPrice = Infinity;
  let minIndex = 0;
  for (let i = 0; i < count; i++) {
    const priceText = await shopPageLocators.productCardPrice(cards.nth(i)).innerText();
    const price = parsePrice(priceText);
    if (price < minPrice) {
      minPrice = price;
      minIndex = i;
    }
  }
  return cards.nth(minIndex);
}

// Lấy product id từ href của thẻ sản phẩm (vd: /san-pham/6a505a71a23d9b0019054641 -> 6a505a71a23d9b0019054641)
export async function extractProductId(card: Locator): Promise<string> {
  const href = await shopPageLocators.productCardLink(card).getAttribute('href');
  const match = href?.match(/\/san-pham\/([a-zA-Z0-9]+)/);
  if (!match) throw new Error(`Không lấy được product id từ href: ${href}`);
  return match[1];
}

// Dò trong danh sách id sản phẩm, trả về id đầu tiên có phân loại (màu/size...) theo API,
// để test chọn biến thể (A02/A03) không phụ thuộc vào một sản phẩm cố định
export async function findProductIdWithVariants(request: APIRequestContext, productIds: string[]): Promise<string> {
  for (const id of productIds) {
    const res = await request.get(`${API_BASE}/api/v3/buyer/product/${id}`);
    if (!res.ok()) continue;
    const body = await res.json();
    if (body?.data?.option_types?.length > 0) return id;
  }
  throw new Error('Không tìm thấy sản phẩm nào có phân loại (màu/size) trong danh sách đã kiểm tra');
}

// Trên trang chi tiết sản phẩm, chọn tuỳ chọn cuối cùng (không phải mặc định) ở mỗi nhóm phân loại,
// trả về danh sách tên ĐANG thực sự được chọn (đọc lại sau khi bấm hết các nhóm, vì chọn nhóm sau
// có thể khiến UI tự điều chỉnh lại nhóm trước nếu tổ hợp không còn hàng)
export async function selectLastVariantOptionInEachGroup(page: Page): Promise<string[]> {
  const groups = productDetailLocators.variantGroups(page);
  const groupCount = await groups.count();

  for (let i = 0; i < groupCount; i++) {
    const options = productDetailLocators.variantOptionButtons(groups.nth(i));
    const optionCount = await options.count();
    await options.nth(optionCount - 1).click({ timeout: 10000 });
  }

  const selected: string[] = [];
  for (let i = 0; i < groupCount; i++) {
    const activeOption = groups.nth(i).locator('button.border-dark').first();
    selected.push((await activeOption.innerText()).trim());
  }
  return selected;
}

// Bấm "Thêm vào giỏ" trên trang chi tiết sản phẩm, thử lại vài lần vì thao tác này
// đôi khi không phản hồi ngay trên môi trường dev, rồi dọn toast/popup che màn hình
export async function addToCartWithRetry(page: Page, attempts = 3): Promise<void> {
  const toast = page.locator('.Toastify__toast-body').first();
  let added = false;
  for (let attempt = 0; attempt < attempts && !added; attempt++) {
    await productDetailLocators.addToCartButton(page).click({ timeout: 15000 });
    added = await toast
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false);
  }
  expect(added, 'Thêm vào giỏ hàng thất bại sau nhiều lần thử').toBe(true);

  await toast.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  await dismissAuthPromoModal(page);
}

// Mở giỏ hàng từ icon trên header
export async function openCart(page: Page) {
  await dismissAuthPromoModal(page);
  await cartLocators.cartHeadIcon(page).click({ timeout: 15000 });
  await cartLocators.viewCartLink(page).click({ timeout: 15000 });
  await expect(page).toHaveURL(/\/gio-hang/, { timeout: 15000 });
}

// Xoá sản phẩm khỏi giỏ nếu đã có sẵn (vd: còn sót lại từ lần chạy test trước), để số lượng
// kiểm tra sau khi thêm mới không bị cộng dồn với dữ liệu cũ trong giỏ dùng chung của tài khoản
export async function removeFromCartIfPresent(page: Page, productId: string) {
  await openCart(page);
  await page.waitForTimeout(2000);
  const itemRow = cartLocators.itemRowByProductId(page, productId);
  if (await itemRow.isVisible({ timeout: 5000 }).catch(() => false)) {
    await cartLocators.itemDeleteButton(itemRow).click({ timeout: 10000 });
    await itemRow.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }
}
