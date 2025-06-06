import { test, expect, chromium } from '@playwright/test'

let page, browser, context;

// Before each test, launch the browser, create a new context and page
test.beforeEach(async () => {
    // Launch Chromium browser in headed mode (not headless) so we can see the actions
    browser = await chromium.launch({ headless: false });
    // Create a new browser context - isolated session
    context = await browser.newContext();
    // Open a new tab/page in the browser context
    page = await context.newPage();
});

// After each test, close the browser to clean up resources
test.afterEach(async () => {
    await browser.close();
});

// Main test: Adding an iPhone product to cart on Flipkart
test('Add to Cart!', async () => {

    // Navigate to Flipkart homepage
    await page.goto('https://www.flipkart.com');

    // Close the initial login popup that appears on Flipkart homepage
    // Retry reloading page until the popup becomes visible (sometimes popup can be delayed)
    let i = 0;
    let popupVisible = await page.locator('span[class="_30XB9F"]').isVisible();
    while (!popupVisible) {
        await page.reload();
        popupVisible = await page.locator('span[class="_30XB9F"]').isVisible();
        i++;
        console.log(`Page Reloaded ${i} times waiting for login popup to appear.`);
    }
    // Click the 'X' button to close the login popup
    await page.locator('span[class="_30XB9F"]').click();
    console.log('Login popup closed.');

    // Locate the search input box
    const searchLocator = await page.locator('input[class="Pke_EE"]');

    // Clear any existing text in search box (defensive)
    searchLocator.fill('');

    // Search term to look for
    const searchTerm = 'iPhone';

    // Type 'iPhone' slowly with 100ms delay between keystrokes for realism
    await searchLocator.type(searchTerm, { delay: 100 });

    // Wait for the auto-suggestion dropdown to appear
    await page.waitForSelector('//a[@class="oleBil"]', { timeout: 5000 });

    // Get all suggestion elements inside auto-suggestion dropdown
    const suggCount = await page.locator('//div[@class="YGcVZO _2VHNef"]');
    const count = await suggCount.count();
    console.log('Number of auto-suggestions shown: ' + count);

    // Loop through suggestions and click the one containing 'iphone 15' (case-insensitive)
    for (let i = 0; i < count; i++) {
        let suggestion = await suggCount.nth(i);
        let suggestionText = await suggestion.innerText();
        if (suggestionText && suggestionText.toLowerCase().includes('iphone 15')) {
            await suggestion.click();
            break;
        }
    }
    console.log('Clicked on suggestion containing "iphone 15".');

    // Wait for network requests to finish (page to load results)
    await page.waitForLoadState('networkidle');
    console.log('Search results page loaded.');

    // Wait for the line showing number of results to be visible
    await page.waitForSelector('span[class="BUOuZu"]', { timeout: 10_000 });
    const resultText = await page.locator('span[class="BUOuZu"]').textContent();

    // Verify the results page text contains the search term to confirm correct search
    expect(resultText).toContain(`"iphone 15"`);
    console.log(`Search results page correctly shows results for: ${searchTerm}`);

    // Locate the brand filter checkboxes on the sidebar
    const brandFilters = await page.locator('label[class="tJjCVx _3DvUAf"]');
    const brandCount = await brandFilters.count();
    console.log('Number of brand filters available: ' + brandCount);

    // Loop through brand filters to find and click on 'Apple' brand filter
    for (let i = 0; i < brandCount; i++) {
        let brand = await brandFilters.nth(i);
        let brandText = await brand.innerText();
        console.log('Brand filter found: ' + brandText);
        if (brandText && brandText.toLowerCase().includes('apple')) {
            await brand.click();
            // Wait for network requests or page spinner to disappear after filter applied
            await page.waitForLoadState('networkidle');
            console.log('Apple brand filter applied.');
            break;
        }
    }

    // Click on the "Price: Low to High" filter option to sort results by ascending price
    await page.locator('//div[@class="sHCOk2"]//div[3]').click();
    await page.waitForTimeout(3000); // Wait 3 seconds for sorting to reflect on UI
    await page.waitForLoadState('networkidle');
    console.log('Applied "Price: Low to High" sorting filter.');

    // Collect the list of product prices displayed on the page
    const priceList = await page.locator('div[class="Nx9bqj _4b5DiR"]');
    const priceCount = await priceList.count();
    console.log('Number of product prices found on the page: ' + priceCount);

    // Array to store cleaned and parsed prices as integers
    let priceArray = [];

    // Loop over all prices, clean up currency symbols and commas, parse to int and store in array
    for (let i = 0; i < priceCount; i++) {
        let price = await priceList.nth(i).textContent();
        if (price) {
            // Remove rupee symbol
            price = price.replace("₹", "");
            // Remove commas from the price string (e.g., 64,900 -> 64900)
            price = price.replace(/,/g, "");
            // Trim whitespace
            price = price.trim();
            // Convert to integer
            price = parseInt(price);
            // Add to array
            priceArray.push(price);
        }
    }

    // Validate the price array is sorted in ascending order after applying the filter
    for (let i = 0; i < priceArray.length - 1; i++) {
        let currentPrice = priceArray[i];
        let nextPrice = priceArray[i + 1];
        if (currentPrice > nextPrice) {
            // If prices are not sorted ascending, log failure and throw error to fail test
            console.log('Price Filter failed! Found prices out of order:', currentPrice, nextPrice);
            throw new Error('Price not in ascending order!');
        }
    }

    console.log('Price filter validation passed: prices are sorted low to high.');

    // End of test. You can optionally add more steps to add product to cart.

}, 90_000); // Timeout set to 90 seconds for the test to complete
