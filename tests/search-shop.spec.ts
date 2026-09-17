import { test, expect } from '@playwright/test';
import { searchLocators } from './locators';

// Từ khóa của một cửa hàng có sẵn trên hệ thống (dùng để kiểm tra kết quả tìm kiếm)
const SHOP_KEYWORD = 'AWEEK';

// Từ khóa chắc chắn không khớp cửa hàng nào trong database (dùng để kiểm tra trạng thái rỗng)
const NOT_FOUND_KEYWORD = 'xyzKhongTonTaiShop999888777';

test('đăng nhập và tìm kiếm cửa hàng theo tên, hiển thị đúng kết quả ở tab "Cửa hàng"', async ({ page }) => {
  await page.goto('/');

  // Mở form đăng nhập bằng email
  await page.locator('text=Đăng nhập').locator('visible=true').first().click();
  await page.getByText('Đăng nhập email', { exact: true }).click();

  // Nhập tài khoản và đăng nhập
  await page.locator('input[name="email"]').fill(process.env.BIDU_EMAIL!);
  await page.locator('input[name="password"]').fill(process.env.BIDU_PASSWORD!);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

  // Đăng nhập thành công khi tên người dùng xuất hiện trên header
  await expect(page.locator('.user-name')).toBeVisible({ timeout: 20000 });

  // Click vào ô tìm kiếm để mở khung gợi ý, sau đó nhập từ khóa vào ô đang hiển thị
  await page.locator('input[name="keyword"]').first().click();
  const searchInput = page.locator('input[name="keyword"]:visible');
  await searchInput.fill(SHOP_KEYWORD);

  // Trang kết quả gọi API tìm cửa hàng ngầm cho mọi tab ngay khi tìm kiếm,
  // cần đợi API này trả về trước khi chuyển tab để tránh đọc dữ liệu chưa kịp load
  const shopsResponse = page.waitForResponse(
    (res) => res.url().includes('/search/shops') && res.url().includes(SHOP_KEYWORD)
  );
  await searchInput.press('Enter');

  // Đã điều hướng sang trang kết quả tìm kiếm với đúng từ khóa
  await expect(page).toHaveURL(new RegExp(`/tim-kiem\\?keyword=${SHOP_KEYWORD}`));
  await shopsResponse;

  // Chuyển sang tab "Cửa hàng" trong kết quả tìm kiếm
  await page.locator('.search-result-tabbar__label', { hasText: 'Cửa hàng' }).click();

  // Cửa hàng mong muốn phải xuất hiện trong danh sách kết quả
  const shopResult = page.locator('.brand-row__name', { hasText: SHOP_KEYWORD });
  await expect(shopResult.first()).toBeVisible({ timeout: 10000 });

  // Có thể đi tới trang chi tiết cửa hàng từ kết quả tìm kiếm
  await page.locator('.brand-row__more').first().click();
  await expect(page).toHaveURL(/\/nguoi-ban\//);
});

test('tìm kiếm cửa hàng không tồn tại trong database hiển thị đúng trạng thái không có kết quả', async ({ page }) => {
  await page.goto('/');

  // Không cần đăng nhập - tìm kiếm hoạt động cho cả khách chưa đăng nhập
  await page.locator('input[name="keyword"]').first().click();
  const searchInput = page.locator('input[name="keyword"]:visible');
  await searchInput.fill(NOT_FOUND_KEYWORD);

  const shopsResponse = page.waitForResponse(
    (res) => res.url().includes('/search/shops') && res.url().toLowerCase().includes(NOT_FOUND_KEYWORD.toLowerCase())
  );
  await searchInput.press('Enter');

  await expect(page).toHaveURL(/\/tim-kiem\?keyword=/);
  await shopsResponse;

  await page.locator('.search-result-tabbar__label', { hasText: 'Cửa hàng' }).click();

  // Không có cửa hàng nào khớp -> hiển thị đúng thông báo rỗng, không có dòng kết quả nào
  await expect(searchLocators.shopsEmptyState(page)).toBeVisible({ timeout: 10000 });
  await expect(searchLocators.shopsEmptyState(page)).toHaveText('Không tìm thấy cửa hàng');
  await expect(searchLocators.brandRows(page)).toHaveCount(0);
});
