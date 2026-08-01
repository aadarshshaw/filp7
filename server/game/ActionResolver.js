import { ActionName } from './Deck.js';

/**
 * Resolves action cards that are drawn during gameplay.
 *
 * Action card effects:
 *   • Freeze       — Force a target player to "stay" immediately
 *   • Flip Three   — Force a target player to draw 3 consecutive cards
 *   • Second Chance — Grants the holder immunity from one bust
 */
export class ActionResolver {
  /**
   * Resolve an action card that was drawn.
   *
   * @param {object}     card       — the action card object
   * @param {Player}     drawer     — player who drew the card
   * @param {Player}     target     — target player (for Freeze / Flip Three)
   * @param {GameEngine} engine     — reference to game engine for drawing cards
   * @returns {{ events: Array, flip7: boolean }}
   *   events: array of event objects to broadcast to clients
   *   flip7: true if a Flip 7 was triggered during Flip Three resolution
   */
  static resolve(card, drawer, target, engine) {
    switch (card.action) {
      case ActionName.FREEZE:
        return ActionResolver.resolveFreeze(card, drawer, target);

      case ActionName.FLIP_THREE:
        return ActionResolver.resolveFlipThree(card, drawer, target, engine);

      case ActionName.SECOND_CHANCE:
        return ActionResolver.resolveSecondChance(card, drawer);

      default:
        console.warn(`Unknown action card: ${card.action}`);
        return { events: [], flip7: false };
    }
  }

  /**
   * FREEZE: Force target player to stay.
   * If target has already stayed or busted, no effect.
   */
  static resolveFreeze(card, drawer, target) {
    const events = [];

    if (target && target.isActive) {
      target.stay();
      events.push({
        type: 'action:freeze',
        drawerId: drawer.id,
        drawerName: drawer.name,
        targetId: target.id,
        targetName: target.name,
        card,
      });
    } else {
      // No valid target — card fizzles
      events.push({
        type: 'action:freeze:fizzle',
        drawerId: drawer.id,
        drawerName: drawer.name,
        card,
        reason: target ? `${target.name} already ${target.status}` : 'No valid target',
      });
    }

    return { events, flip7: false };
  }

  /**
   * FLIP THREE: Force target player to draw 3 cards in succession.
   * Each card is resolved normally (bust on duplicates, modifiers added, etc.)
   * If target busts during Flip Three, remaining draws are skipped.
   */
  static resolveFlipThree(card, drawer, target, engine) {
    const events = [];
    let flip7 = false;

    if (!target || !target.isActive) {
      events.push({
        type: 'action:flip_three:fizzle',
        drawerId: drawer.id,
        drawerName: drawer.name,
        card,
        reason: target ? `${target.name} already ${target.status}` : 'No valid target',
      });
      return { events, flip7 };
    }

    events.push({
      type: 'action:flip_three:start',
      drawerId: drawer.id,
      drawerName: drawer.name,
      targetId: target.id,
      targetName: target.name,
      card,
    });

    // Draw 3 cards for the target
    for (let i = 0; i < 3; i++) {
      if (!target.isActive) break; // busted during flip three

      const drawnCard = engine.deck.draw();
      if (!drawnCard) break; // deck exhausted

      const result = engine.resolveCardForPlayer(drawnCard, target);
      events.push({
        type: 'action:flip_three:card',
        targetId: target.id,
        targetName: target.name,
        card: drawnCard,
        cardIndex: i + 1,
        result,
      });

      if (result.busted) break;
      if (result.flip7) {
        flip7 = true;
        break;
      }
    }

    return { events, flip7 };
  }

  /**
   * SECOND CHANCE: Grants the drawer immunity from one bust.
   * The card is held until needed — when the player would bust,
   * the duplicate card is discarded instead.
   */
  static resolveSecondChance(card, drawer) {
    drawer.grantSecondChance();

    return {
      events: [{
        type: 'action:second_chance',
        drawerId: drawer.id,
        drawerName: drawer.name,
        card,
      }],
      flip7: false,
    };
  }

  /**
   * Determine if an action card requires a target player selection.
   */
  static requiresTarget(card) {
    return card.action === ActionName.FREEZE || card.action === ActionName.FLIP_THREE;
  }

  /**
   * Get valid targets for an action card (active players other than drawer).
   */
  static getValidTargets(drawer, players) {
    return players.filter(p =>
      p.id !== drawer.id && p.isActive
    );
  }
}
