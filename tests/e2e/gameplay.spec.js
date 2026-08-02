import { test, expect } from '@playwright/test';

test('basic gameplay loop', async ({ browser }) => {
  // We'll create two contexts to simulate two different players
  const player1Context = await browser.newContext();
  const player2Context = await browser.newContext();

  const page1 = await player1Context.newPage();
  const page2 = await player2Context.newPage();

  // Player 1 creates a game
  await page1.goto('/');
  await page1.click('#btn-create-room');
  await page1.fill('#create-name', 'PlayerOne');
  await page1.click('#form-create .btn-primary');
  
  // Wait for lobby to appear and get the room code
  await page1.waitForSelector('#lobby-room-code');
  const roomCode = await page1.textContent('#lobby-room-code');
  expect(roomCode).toBeTruthy();

  // Player 2 joins the game
  await page2.goto('/');
  await page2.click('#btn-join-room');
  await page2.fill('#join-name', 'PlayerTwo');
  await page2.fill('#join-code', roomCode.trim());
  await page2.click('#form-join .btn-primary');

  // Both should be in lobby
  await expect(page1.locator('#lobby-player-list')).toContainText('PlayerTwo');
  await expect(page2.locator('#lobby-player-list')).toContainText('PlayerOne');

  // Player 1 starts the game
  await page1.click('#btn-start-game');

  // Wait for game screen to be visible
  await expect(page1.locator('#game-screen')).toBeVisible();
  await expect(page2.locator('#game-screen')).toBeVisible();

  // Wait for action buttons to be visible on either player's screen
  // (We don't know who is current player due to random dealer)
  let p1HasButtons = false;
  let p2HasButtons = false;

  try {
    await page1.locator('#action-buttons').waitFor({ state: 'visible', timeout: 5000 });
    p1HasButtons = true;
  } catch (e) {
    await page2.locator('#action-buttons').waitFor({ state: 'visible', timeout: 5000 });
    p2HasButtons = true;
  }

  expect(p1HasButtons || p2HasButtons).toBe(true);

  const activePage = p1HasButtons ? page1 : page2;

  // Perform a HIT
  await activePage.click('#btn-hit');
  
  // We wait for some UI change, e.g. a card appearing in the hand or last-drawn area
  await expect(activePage.locator('.player-hand .card').first()).toBeVisible({ timeout: 5000 });
});
