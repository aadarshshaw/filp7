import { test, expect } from '@playwright/test';

test('basic gameplay loop', async ({ browser }) => {
  // We'll create two contexts to simulate two different players
  const player1Context = await browser.newContext();
  const player2Context = await browser.newContext();

  const page1 = await player1Context.newPage();
  const page2 = await player2Context.newPage();

  // Player 1 creates a game
  await page1.goto('/');
  await page1.fill('input[placeholder="Your Name"]', 'PlayerOne');
  await page1.click('button:has-text("Create Room")');
  
  // Wait for lobby to appear and get the room code
  await page1.waitForSelector('#room-code-display');
  const roomCode = await page1.textContent('#room-code-display');
  expect(roomCode).toBeTruthy();

  // Player 2 joins the game
  await page2.goto('/');
  await page2.fill('input[placeholder="Your Name"]', 'PlayerTwo');
  await page2.fill('input[placeholder="Room Code"]', roomCode.trim());
  await page2.click('button:has-text("Join Room")');

  // Both should be in lobby
  await expect(page1.locator('.player-list')).toContainText('PlayerTwo');
  await expect(page2.locator('.player-list')).toContainText('PlayerOne');

  // Add a bot to reach 3 players
  await page1.click('button:has-text("Add Bot")');

  // Player 1 starts the game
  await page1.click('button:has-text("Start Game")');

  // Wait for game screen to be visible (HUD is present)
  await expect(page1.locator('.top-hud')).toBeVisible();
  await expect(page2.locator('.top-hud')).toBeVisible();

  // Wait for action buttons to be visible on either player's screen
  let p1HasButtons = false;
  let p2HasButtons = false;

  try {
    await page1.locator('.action-bar').waitFor({ state: 'visible', timeout: 5000 });
    p1HasButtons = true;
  } catch (e) {
    await page2.locator('.action-bar').waitFor({ state: 'visible', timeout: 5000 });
    p2HasButtons = true;
  }

  expect(p1HasButtons || p2HasButtons).toBe(true);

  const activePage = p1HasButtons ? page1 : page2;

  // Perform a HIT
  await activePage.click('button:has-text("HIT")');
  
  // We wait for some UI change, e.g. a card appearing in the hand or last-drawn area
  await expect(activePage.locator('.player-hand .card').first()).toBeVisible({ timeout: 5000 });
});
