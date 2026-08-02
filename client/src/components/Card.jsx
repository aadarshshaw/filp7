import React, { memo } from 'react';
import clsx from 'clsx';
import { Shield, Zap, RefreshCw, Hand, Target } from 'lucide-react';

export const Card = memo(({ card, isFlipped = false }) => {
  if (!card) return null;

  const isNumber = card.type === 'number';
  const isModifier = card.type === 'modifier';
  const isAction = card.type === 'action';
  
  // Icon mapping for non-number cards
  const renderIcon = () => {
    switch(card.action || card.modifierType) {
      case 'x2': return <span className="card-icon" style={{fontSize:'3rem', fontWeight:'900', fontStyle:'italic'}}>x2</span>;
      case 'plus2': return <span className="card-icon" style={{fontSize:'3rem', fontWeight:'900'}}>+2</span>;
      case 'plus4': return <span className="card-icon" style={{fontSize:'3rem', fontWeight:'900'}}>+4</span>;
      case 'plus6': return <span className="card-icon" style={{fontSize:'3rem', fontWeight:'900'}}>+6</span>;
      case 'minus2': return <span className="card-icon" style={{fontSize:'3rem', fontWeight:'900'}}>-2</span>;
      case 'minus4': return <span className="card-icon" style={{fontSize:'3rem', fontWeight:'900'}}>-4</span>;
      case 'secondChance': return <RefreshCw className="card-icon" size={64} />;
      case 'freeze': return <span className="card-icon" style={{fontSize:'4rem'}}>❄️</span>;
      case 'flip3': return <span className="card-icon" style={{fontSize:'3rem', fontWeight:'900'}}>FLIP 3</span>;
      case 'steal': return <Hand className="card-icon" size={64} />;
      case 'swap': return <RefreshCw className="card-icon" size={64} />;
      case 'shield': return <Shield className="card-icon" size={64} />;
      case 'target': return <Target className="card-icon" size={64} />;
      default: return <Zap className="card-icon" size={64} />;
    }
  };

  return (
    <div className={clsx('card', isFlipped && 'flipped')}>
      <div className="card-inner">
        <div className="card-back"></div>
        <div className={clsx('card-front', {
          'type-number': isNumber,
          'type-modifier': isModifier,
          'type-action': isAction,
          'modifier-negative': isModifier && String(card.modifierType).startsWith('minus'),
        })}>
          {/* Top Left */}
          <div className="card-corner top-left">
            <span className="corner-value">
              {isNumber ? card.value : (card.label?.substring(0,2) || '*')}
            </span>
            {isNumber && <span className="corner-suit">♦</span>}
          </div>
          
          {/* Bottom Right */}
          <div className="card-corner bottom-right">
            <span className="corner-value">
              {isNumber ? card.value : (card.label?.substring(0,2) || '*')}
            </span>
            {isNumber && <span className="corner-suit">♦</span>}
          </div>
          
          {/* Center Content */}
          <div className="card-center">
            {isNumber ? (
              <span className="center-value">{card.value}</span>
            ) : (
              renderIcon()
            )}
            {!isNumber && <span className="center-label">{card.label}</span>}
          </div>
        </div>
      </div>
    </div>
  );
});
