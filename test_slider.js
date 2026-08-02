import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  
  // Click "Create Room"
  await page.click('button:has-text("Create Room")');
  
  // Wait for modal
  await page.waitForSelector('#modal-create', { state: 'visible' });
  
  // Check initial text
  const initialText = await page.textContent('#max-value');
  console.log('Initial Max Players:', initialText);
  
  // Evaluate setting the value of the slider to test if JS event fires
  await page.evaluate(() => {
    const slider = document.getElementById('create-max');
    slider.value = 12;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  });
  
  // Check text after event
  const updatedText = await page.textContent('#max-value');
  console.log('Updated Max Players (after programmatic event):', updatedText);

  // Now let's try actual mouse dragging using playwright
  const sliderBounds = await page.locator('#create-max').boundingBox();
  console.log('Slider Bounds:', sliderBounds);
  
  if (sliderBounds) {
    // Click near the right edge of the slider to simulate drag/click
    await page.mouse.click(sliderBounds.x + sliderBounds.width * 0.8, sliderBounds.y + sliderBounds.height / 2);
  }
  
  // Check text after click
  const clickText = await page.textContent('#max-value');
  console.log('Max Players after mouse click:', clickText);

  await browser.close();
})();
