# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gameplay.spec.js >> basic gameplay loop
- Location: tests\e2e\gameplay.spec.js:3:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#lobby-player-list')
Expected substring: "PlayerTwo"
Received string:    "PLPlayerOne👑 HostYou"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('#lobby-player-list')
    14 × locator resolved to <ul class="player-list" id="lobby-player-list">…</ul>
       - unexpected value "PLPlayerOne👑 HostYou"

```

```yaml
- list:
  - listitem: PL PlayerOne 👑 Host You
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('basic gameplay loop', async ({ browser }) => {
  4  |   // We'll create two contexts to simulate two different players
  5  |   const player1Context = await browser.newContext();
  6  |   const player2Context = await browser.newContext();
  7  | 
  8  |   const page1 = await player1Context.newPage();
  9  |   const page2 = await player2Context.newPage();
  10 | 
  11 |   // Player 1 creates a game
  12 |   await page1.goto('/');
  13 |   await page1.click('#btn-create-room');
  14 |   await page1.fill('#create-name', 'PlayerOne');
  15 |   await page1.click('#form-create .btn-primary');
  16 |   
  17 |   // Wait for lobby to appear and get the room code
  18 |   await page1.waitForSelector('#lobby-room-code');
  19 |   const roomCode = await page1.textContent('#lobby-room-code');
  20 |   expect(roomCode).toBeTruthy();
  21 | 
  22 |   // Player 2 joins the game
  23 |   await page2.goto('/');
  24 |   await page2.click('#btn-join-room');
  25 |   await page2.fill('#join-name', 'PlayerTwo');
  26 |   await page2.fill('#join-code', roomCode.trim());
  27 |   await page2.click('#form-join .btn-primary');
  28 | 
  29 |   // Both should be in lobby
> 30 |   await expect(page1.locator('#lobby-player-list')).toContainText('PlayerTwo');
     |                                                     ^ Error: expect(locator).toContainText(expected) failed
  31 |   await expect(page2.locator('#lobby-player-list')).toContainText('PlayerOne');
  32 | 
  33 |   // Player 1 starts the game
  34 |   await page1.click('#btn-start-game');
  35 | 
  36 |   // Wait for game screen to be visible
  37 |   await expect(page1.locator('#game-screen')).toBeVisible();
  38 |   await expect(page2.locator('#game-screen')).toBeVisible();
  39 | 
  40 |   // Verify action buttons appear for someone
  41 |   // (We don't know who is current player due to random dealer, but one of them has to have buttons)
  42 |   const p1HasButtons = await page1.locator('#action-buttons').isVisible();
  43 |   const p2HasButtons = await page2.locator('#action-buttons').isVisible();
  44 |   
  45 |   expect(p1HasButtons || p2HasButtons).toBe(true);
  46 | 
  47 |   const activePage = p1HasButtons ? page1 : page2;
  48 | 
  49 |   // Perform a HIT
  50 |   await activePage.click('#btn-hit');
  51 |   
  52 |   // We wait for some UI change, e.g. a card appearing in the hand or last-drawn area
  53 |   await expect(activePage.locator('.player-hand .card').first()).toBeVisible({ timeout: 5000 });
  54 | });
  55 | 
```