import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { login, AUTH_FILE } from './helpers';

// Đăng nhập 1 lần duy nhất trước khi chạy toàn bộ suite, lưu lại phiên đăng nhập để các test
// cần tài khoản (product-detail, checkout đã đăng nhập...) dùng lại qua storageState thay vì
// tự đăng nhập lại từ đầu mỗi test - nguồn gây flaky lớn nhất khi test trên tài khoản thật dùng chung
export default async function globalSetup(config: FullConfig) {
  const projectUse = config.projects[0].use;
  const browser = await chromium.launch({
    headless: projectUse.headless,
    ...(projectUse.launchOptions ?? {}),
  });
  const context = await browser.newContext({ baseURL: projectUse.baseURL });
  const page = await context.newPage();

  await login(page);

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await context.storageState({ path: AUTH_FILE });

  await browser.close();
}
