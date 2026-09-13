const {test,expect}=require("@playwright/test")

// test("Valid login", async function({page}) {
    // await page.goto("https://opensource-demo.orangehrmlive.com/web/index.php/auth/login")
    
    // await page.getByPlaceholder("Username").fill("Admin")

    // await page.locator("//input[@type='password']").fill("admin123")

    // await page.locator("//button[@type='submit']").click()

    // //await page.waitForTimeout(5000)

    // await expect(page).toHaveURL(/dashboard/);

    // await page.getByAltText("profile picture").first().click()

    // await page.getByText("Logout").click()
    
// })

//Bai 9
test("Verify Error Message", async function({page}) {
    await page.goto("https://opensource-demo.orangehrmlive.com/web/index.php/auth/login")
    
   const viewport = page.viewportSize()
   console.log(viewport ? viewport.width : "no fixed viewport (maximized window)")
   console.log(viewport ? viewport.height : "no fixed viewport (maximized window)")

    await page.getByPlaceholder("Username").fill("Admin")

    await page.locator("//input[@type='password']").fill("admin1231")

    await page.locator("//button[@type='submit']").click()

    await page.waitForTimeout(5000);

    const errorMessage = await page.locator("//p[contains(@class,'alert-content-text')]").textContent()

    console.log("Error message is "+errorMessage);

    expect(errorMessage.includes("Invalid")).toBeTruthy()
    
})