const {test,expect} = require('@playwright/test')

// test("Valid Login", function({page}){
//   await page.goto("https://opensource-demo.orangehrmlive.com/web/index.php/auth/login")
//   await page.getByPlaceholder("Username").type("Admin")
//   await page.locator("//input[@type='password']").type("Admin123")
//   await page.locator("//button[@type='submit']")
//   await expect(page).toHaveTitle(/dashboard/)
// })

test("Valid Login", async ({page}) => {
  await page.goto("https://opensource-demo.orangehrmlive.com/web/index.php/auth/login")
  await page.getByPlaceholder("Username").fill("Admin")
  await page.getByPlaceholder("Password").fill("admin123")
  await page.locator("role=button[name='Login']").click()
  await page.waitForTimeout(5000)
  await expect(page).toHaveURL(/dashboard/);

  await page.getAllText("profile picture").first().click()

  await page.getByText("Logout").click()

  await page.waitForTimeout(3000)

  await expect(page).toHaveURL(/login/)
})

// test("Verify Application Title", async function({page}) {
//   await page.goto("http://google.com")
//   const url = await page.url()
//   console.log("Title is " +url)

//   const title=await page.title()
//   console.log("Title is" +title)
//   await expect(page).toHaveTitle("Google")
  
// })

// test ("My first Test", async function({page}){
//   expect(100).toBe(12)
// })

// test ("My Second Test", async function({page}){
//   expect(100).toBe(100)
// })

// test ("My third Test", async function({page}){
//   expect(100).toBe(125)
// })

// test ("My four Test", async function({page}){
//   expect("Mukesh Otwani").toContain("Mukesh")
//   expect(true).tobeTrythy()
// })

// test ("My fifth Test", async function({page}){
//   expect("Mukesh Otwani").toContain("Mukesh")
//   expect(true).tobeFalsy()
// })


// test ("My sixth Test", async function({page}){
//   expect("Mukesh Otwani").includes("Mukesh").tobeTruthy()
// })