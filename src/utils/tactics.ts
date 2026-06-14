export function getDefaultTacticForManager(name: string): string {
  if (name.includes('Sir Alex')) return 'Direct Passing';
  if (name.includes('Pep')) return 'Tiki-Taka';
  if (name.includes('Carlo')) return 'Balanced';
  if (name.includes('Jurgen Klopp')) return 'Gegenpressing';
  if (name.includes('Jose Mourinho')) return 'Park the Bus';
  return 'Balanced';
}

export function getDefaultFormationForManager(name: string): string {
  if (name.includes('Sir Alex')) return '4-4-2';
  if (name.includes('Pep')) return '4-3-3';
  if (name.includes('Carlo')) return '4-2-3-1';
  if (name.includes('Jurgen Klopp')) return '4-3-3';
  if (name.includes('Jose Mourinho')) return '5-3-2';
  return '4-3-3';
}

export function adaptTacticAndFormation(
  managerName: string, 
  myOvr: number, 
  opponentName: string, 
  oppOvr: number, 
  currentTactic: string, 
  currentFormation: string
): { adaptedTactic: string, adaptedFormation: string } {
  const isOpponentStronger = oppOvr > myOvr + 2; // if opponent is way stronger
  const isOpponentWeaker = myOvr > oppOvr + 2;

  let newTactic = currentTactic;
  let newFormation = currentFormation;

  if (managerName.includes('Jose Mourinho')) {
     if (isOpponentStronger) { newTactic = 'Park the Bus'; newFormation = '5-3-2'; }
     else { newTactic = 'Counter Attack'; newFormation = '4-2-3-1'; }
  } else if (managerName.includes('Pep')) {
     if (isOpponentWeaker) { newTactic = 'Possession'; newFormation = '4-3-3 Attack'; }
     else { newTactic = 'Tiki-Taka'; newFormation = '4-3-3 Holding'; }
  } else if (managerName.includes('Jurgen')) {
     newTactic = 'Gegenpressing';
     newFormation = '4-3-3';
  } else if (managerName.includes('Sir Alex')) {
     if (isOpponentStronger) { newTactic = 'Direct Passing'; newFormation = '4-4-2 Holding'; }
     else { newTactic = 'Direct Passing'; newFormation = '4-4-2'; }
  } else if (managerName.includes('Carlo')) {
     if (isOpponentStronger) { newTactic = 'Counter Attack'; newFormation = '4-2-3-1'; }
     else { newTactic = 'Balanced'; newFormation = '4-3-2-1'; }
  } else {
     // User logic for 'Adaptive'
     if (isOpponentStronger) {
        newTactic = 'Balanced';
        newFormation = '4-2-3-1'; // changed from 5-3-2 to something defensive but standard
     } else if (isOpponentWeaker) {
        newTactic = 'Balanced';
        newFormation = '4-3-3 Attack';
     } else {
        newTactic = 'Balanced';
        newFormation = '4-3-3';
     }
  }

  // Override if Adaptive was explicitly chosen for User manager
  if (currentTactic === 'Adaptive') {
     if (isOpponentStronger) {
        newTactic = 'Counter Attack';
        newFormation = '4-3-3 Defend';
     } else if (isOpponentWeaker) {
        newTactic = 'Possession';
        newFormation = '4-3-3 Attack';
     } else {
        newTactic = 'Balanced';
        newFormation = '4-3-3';
     }
  }

  return { adaptedTactic: newTactic, adaptedFormation: newFormation };
}
