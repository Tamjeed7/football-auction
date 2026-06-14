import fs from 'fs';

let code = fs.readFileSync('src/data/players.ts', 'utf8');

const positionMap: Record<string, string> = {
  // DEF
  'P. Maldini': 'CB', 'Cafu': 'RB', 'R. Carlos': 'LB', 'F. Beckenbauer': 'CB', 'C. Puyol': 'CB',
  'F. Cannavaro': 'CB', 'S. Ramos': 'CB', 'V. van Dijk': 'CB', 'G. Piqué': 'CB', 'D. Alves': 'RB',
  'Marcelo': 'LB', 'N. Vidić': 'CB', 'R. Ferdinand': 'CB', 'J. Terry': 'CB', 'Thiago Silva': 'CB',
  'Marquinhos': 'CB', 'R. Dias': 'CB', 'A. Robertson': 'LB', 'T. Alexander-Arnold': 'RB',
  'A. Hakimi': 'RB', 'J. Cancelo': 'LB', 'A. Cole': 'LB', 'K. Walker': 'RB', 'A. Davies': 'LB',

  // MID
  'Z. Zidane': 'CAM', 'A. Iniesta': 'CM', 'R. Gullit': 'CM', 'Xavi': 'CM', 'L. Matthäus': 'CDM',
  'P. Vieira': 'CDM', 'A. Pirlo': 'CM', 'S. Gerrard': 'CM', 'F. Lampard': 'CM', 'P. Scholes': 'CM',
  'K. De Bruyne': 'CAM', 'L. Modrić': 'CM', 'T. Kroos': 'CM', 'N. Kanté': 'CDM', 'Casemiro': 'CDM',
  'Rodri': 'CDM', 'J. Bellingham': 'CAM', 'F. Valverde': 'CM', 'M. Ødegaard': 'CAM', 'P. Foden': 'CAM',
  'B. Fernandes': 'CAM', 'B. Silva': 'CM', 'J. Kimmich': 'CDM', 'F. de Jong': 'CM',

  // ATT
  'Pelé': 'CF', 'D. Maradona': 'CAM', 'Ronaldo': 'ST', 'J. Cruyff': 'CF', 'Ronaldinho': 'LW',
  'T. Henry': 'ST', 'L. Messi': 'RW', 'C. Ronaldo': 'ST', 'K. Mbappé': 'ST', 'Neymar Jr': 'LW',
  'E. Haaland': 'ST', 'R. Lewandowski': 'ST', 'Vinícius Jr.': 'LW', 'M. Salah': 'RW', 'G. Bale': 'RW',
  'K. Benzema': 'ST', 'A. Di María': 'RW', 'L. Suarez': 'ST', 'H. Kane': 'ST', 'B. Saka': 'RW',
  'S. Mané': 'LW', 'S. Agüero': 'ST', 'W. Rooney': 'ST', 'E. Hazard': 'LW'
};

const mapRegex = new RegExp("name: '(" + Object.keys(positionMap).join('|').replace(/\./g, '\\\\.') + ")', overall: (\\d+), position: '([^']+)'", 'g');

code = code.replace(mapRegex, (match, name, overall, currentPos) => {
  const newPos = positionMap[name] || currentPos;
  return `name: '${name}', overall: ${overall}, position: '${newPos}'`;
});

fs.writeFileSync('src/data/players.ts', code);
