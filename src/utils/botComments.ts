export function getBotTransferReply(botName: string, type: 'BUY' | 'SELL' | 'SWAP', playerOutName: string | null, playerInName: string | null, otherManagerName: string): string {
  const pOut = playerOutName || 'the player';
  const pIn = playerInName || 'the player';

  if (botName === 'Jose Mourinho') {
    if (type === 'BUY') {
      // Bot sells player to someone
      return `I prefer not to speak. But honestly, ${otherManagerName}, you overpaid for ${pOut}.`;
    } else if (type === 'SELL') {
      // Bot buys player from someone
      return `Respect. Respect! Three times respect. I needed ${pIn} to park the bus. Good deal.`;
    } else {
      return `A swap? Only a manager like ${otherManagerName} would think this makes my squad weaker.`;
    }
  } else if (botName === 'Sir Alex') {
    if (type === 'BUY') {
      return `Squeaky bum time for you, ${otherManagerName}. Selling ${pOut} was best for the club.`;
    } else if (type === 'SELL') {
      return `Look at my watch, ${otherManagerName}. We got ${pIn} right at the end. Fantastic.`;
    } else {
      return `No player is bigger than the manager. I'll take ${pIn} and show you how to use him.`;
    }
  } else if (botName === 'Pep') {
    if (type === 'BUY') {
      return `I am so, so happy. More than you believe. We let ${pOut} go to play football. Good luck ${otherManagerName}.`;
    } else if (type === 'SELL') {
      return `${pIn} is a top, top player. We will find a space for him in the midfield.`;
    } else {
      return `Tactically, this makes sense. A fake nine for a false ten. Thank you ${otherManagerName}.`;
    }
  } else if (botName === 'Carlo') {
    if (type === 'BUY') {
      return `🤨 We wish ${pOut} well. The squad is relaxed, ${otherManagerName}.`;
    } else if (type === 'SELL') {
      return `🤨 ${pIn} is a good player. He will enjoy Madrid... I mean, our club.`;
    } else {
      return `🤨 A very quiet swap. Have a cigar, ${otherManagerName}.`;
    }
  } else if (botName === 'Jurgen Klopp') {
    if (type === 'BUY') {
      return `Boom! What a piece of business! ${otherManagerName} must be crazy to take ${pOut}. Haha!`;
    } else if (type === 'SELL') {
      return `Absolutely outstanding! We have ${pIn}. Pure heavy metal football!`;
    } else {
      return `Hahahaha! Fantastic swap! The boys will love ${pIn}. See you ${otherManagerName}!`;
    }
  }
  return `Pleasure doing business, ${otherManagerName}.`;
}

export function getBotRejectReply(botName: string): string {
    if (botName === 'Jose Mourinho') {
        return `This offer is a disgrace. I am the Special One, not the Stupid One.`;
    } else if (botName === 'Sir Alex') {
        return `Knock it off. I wouldn't sell a virus for that amount.`;
    } else if (botName === 'Pep') {
        return `We can't compete with this... wait, yes we can, your offer is rubbish.`;
    } else if (botName === 'Carlo') {
        return `🤨 No, thank you.`;
    } else if (botName === 'Jurgen Klopp') {
        return `Are you crazy?! That offer is absolutely ridiculous! No way!`;
    }
    return `Offer rejected. Minimum valuation not met.`;
}
