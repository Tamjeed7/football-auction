import fs from 'fs';

const playerNames = [
  "Michael Olise", "Lionel Messi", "Cristiano Ronaldo", "Kylian Mbappé", "Erling Haaland",
  "Kevin De Bruyne", "Jude Bellingham", "Rodri", "Vinícius Júnior", "Bukayo Saka",
  "Harry Kane", "Mohamed Salah", "Virgil van Dijk", "Alisson", "Ederson",
  "Thibaut Courtois", "Marc-André ter Stegen", "Antoine Griezmann", "Bernardo Silva",
  "Rúben Dias", "Declan Rice", "Martin Ødegaard", "Jamal Musiala", "Florian Wirtz",
  "Phil Foden", "Lamine Yamal", "Robert Lewandowski", "Son Heung-min", "Lautaro Martínez",
  "Victor Osimhen", "Rafael Leão", "Khvicha Kvaratskhelia", "Trent Alexander-Arnold",
  "Kyle Walker", "Achraf Hakimi", "Alphonso Davies", "Theo Hernández", "William Saliba",
  "Antonio Rüdiger", "Marquinhos", "John Stones", "Ronald Araujo", "Éder Militão",
  "Bruno Fernandes", "Nicolò Barella", "Federico Valverde", "Aurélien Tchouaméni",
  "Eduardo Camavinga", "Frenkie de Jong", "Pedri", "Gavi", "Enzo Fernández",
  "Julián Álvarez", "Cole Palmer", "Alexander Isak", "Ollie Watkins", "Dominic Solanke",
  "Bruno Guimarães", "Douglas Luiz", "Lucas Paquetá", "Alexis Mac Allister",
  "Luis Díaz", "Diogo Jota", "Darwin Núñez", "Cody Gakpo", "Leroy Sané",
  "Serge Gnabry", "Kingsley Coman", "Ousmane Dembélé", "Bradley Barcola",
  "Randal Kolo Muani", "Gonçalo Ramos", "Milan Škriniar", "Gianluigi Donnarumma",
  "Mike Maignan", "Emiliano Martínez", "Manuel Neuer", "Jan Oblak", "Yann Sommer",
  "Wojciech Szczęsny", "David Raya", "Guglielmo Vicario", "Jeremie Frimpong",
  "Álex Grimaldo", "Jonathan Tah", "Piero Hincapié", "Edmond Tapsoba", "Granit Xhaka",
  "Exequiel Palacios", "Victor Boniface", "Patrik Schick", "Xavi Simons", "Dani Olmo",
  "Loïs Openda", "Benjamin Šeško", "Serhou Guirassy", "Deniz Undav", "Maximilian Beier",
  "Chris Führich", "Waldemar Anton", "Joshua Kimmich", "Leon Goretzka",
  "Aleksandar Pavlović", "Thomas Müller", "Mathys Tel", "Dayot Upamecano",
  "Kim Min-jae", "Matthijs de Ligt", "Eric Dier", "Ian Maatsen", "Nico Schlotterbeck",
  "Mats Hummels", "Emre Can", "Julian Brandt", "Marcel Sabitzer", "Karim Adeyemi",
  "Niclas Füllkrug", "Jadon Sancho", "Donyell Malen", "Marcus Rashford",
  "Alejandro Garnacho", "Rasmus Højlund", "Kobbie Mainoo", "Scott McTominay",
  "Luke Shaw", "Lisandro Martínez", "Harry Maguire", "André Onana", "Diogo Dalot",
  "Aaron Wan-Bissaka", "Casemiro", "Christian Eriksen", "Mason Mount",
  "Raheem Sterling", "Nicolas Jackson", "Mykhailo Mudryk", "Noni Madueke",
  "Conor Gallagher", "Moisés Caicedo", "Ben Chilwell", "Reece James",
  "Thiago Silva", "Benoît Badiashile", "Axel Disasi", "Levi Colwill", "Đorđe Petrović",
  "Malo Gusto", "Pedro Porro", "Cristian Romero", "Micky van de Ven",
  "Destiny Udogie", "Yves Bissouma", "Pape Matar Sarr", "James Maddison",
  "Dejan Kulusevski", "Brennan Johnson", "Richarlison", "Rodrigo Bentancur",
  "Gabriel Martinelli", "Gabriel Jesus", "Kai Havertz", "Leandro Trossard",
  "Ethan Nwaneri", "Jorginho", "Thomas Partey", "Ben White", "Gabriel Magalhães",
  "Takehiro Tomiyasu", "Oleksandr Zinchenko", "Jurriën Timber", "João Paulo",
  "Jack Grealish", "Jérémy Doku", "Mateo Kovačić", "Matheus Nunes", "Manuel Akanji",
  "Nathan Aké", "Josko Gvardiol", "Rico Lewis", "Stefan Ortega", "Harvey Elliott",
  "Curtis Jones", "Wataru Endo", "Stefan Bajcetic", "Joe Gomez", "Ibrahima Konaté",
  "Jarell Quansah", "Kostas Tsimikas", "Caoimhín Kelleher", "João Félix",
  "João Cancelo", "İlkay Gündoğan", "Raphinha", "Ferran Torres", "Andreas Christensen",
  "Pau Cubarsí", "Héctor Fort", "Fermín López", "Marc Guiu", "Alejandro Balde",
  "Jules Koundé", "Iñigo Martínez", "Oriol Romeu", "Brahim Díaz", "Joselu",
  "Rodrygo", "Arda Güler", "Andriy Lunin", "Kepa Arrizabalaga", "Luka Modrić",
  "Toni Kroos", "Dani Ceballos", "Fran García", "Ferland Mendy", "Lucas Vázquez",
  "Nacho", "Dani Carvajal", "David Alaba", "Álvaro Morata", "Memphis Depay",
  "Ángel Correa", "Rodrigo De Paul", "Koke", "Marcos Llorente", "Saúl Ñíguez",
  "Pablo Barrios", "Samuel Lino", "Nahuel Molina", "José María Giménez",
  "Stefan Savić", "Mario Hermoso", "Axel Witsel", "César Azpilicueta",
  "Paulo Dybala", "Romelu Lukaku", "Stephan El Shaarawy", "Lorenzo Pellegrini",
  "Leandro Paredes", "Bryan Cristante", "Edoardo Bove", "Leonardo Spinazzola",
  "Gianluca Mancini", "Evan Ndicka", "Chris Smalling", "Rui Patrício", "Mile Svilar",
  "Olivier Giroud", "Christian Pulisic", "Samuel Chukwueze", "Ruben Loftus-Cheek",
  "Tijjani Reijnders", "Ismaël Bennacer", "Yacine Adli", "Fikayo Tomori",
  "Malick Thiaw", "Simon Kjær", "Davide Calabria", "Marcus Thuram",
  "Marko Arnautović", "Hakan Çalhanoğlu", "Henrikh Mkhitaryan", "Davide Frattesi",
  "Federico Dimarco", "Denzel Dumfries", "Matteo Darmian", "Benjamin Pavard",
  "Alessandro Bastoni", "Francesco Acerbi", "Stefan de Vrij", "Dusan Vlahovic",
  "Federico Chiesa", "Arkadiusz Milik", "Adrien Rabiot", "Weston McKennie",
  "Manuel Locatelli", "Fabio Miretti", "Filip Kostić", "Timothy Weah", "Bremer",
  "Danilo", "Federico Gatti", "Daniele Rugani", "Mattia Perin", "Matteo Politano",
  "Giacomo Raspadori", "Piotr Zieliński", "Stanislav Lobotka", "Frank Anguissa",
  "Jens Cajuste", "Mário Rui", "Mathías Olivera", "Amir Rrahmani", "Juan Jesus",
  "Giovanni Di Lorenzo", "Alex Meret", "Eberechi Eze", "Marc Guéhi",
  "Joachim Andersen", "Tyrick Mitchell", "Adam Wharton", "Jordan Ayew",
  "Jean-Philippe Mateta", "Dean Henderson", "Jarrad Branthwaite", "Jordan Pickford",
  "Amadou Onana", "Abdoulaye Doucouré", "Dwight McNeil", "Dominic Calvert-Lewin",
  "James Tarkowski", "Jack Harrison", "Vitaliy Mykolenko", "James Garner",
  "Simon Adingra", "Kaoru Mitoma", "Evan Ferguson", "Danny Welbeck", "João Pedro",
  "Pascal Groß", "Billy Gilmour", "Lewis Dunk", "Jan Paul van Hecke",
  "Pervis Estupiñán", "Bart Verbruggen", "Jason Steele", "Leon Bailey",
  "Moussa Diaby", "John McGinn", "Douglas Luiz", "Youri Tielemans",
  "Boubacar Kamara", "Pau Torres", "Matty Cash", "Lucas Digne", "Ezri Konsa",
  "Diego Carlos", "Morgan Gibbs-White", "Callum Hudson-Odoi", "Anthony Elanga",
  "Taiwo Awoniyi", "Chris Wood", "Murillo", "Neco Williams", "Harry Toffolo",
  "Willy Boly", "Matz Sels", "Awoniyi", "Gibbs-White", "Riyad Mahrez", "Karim Benzema",
  "N'Golo Kanté", "Sadio Mané", "Neymar", "Roberto Firmino", "Fabinho",
  "Kalidou Koulibaly", "Édouard Mendy", "Ruben Neves", "Aleksandar Mitrović",
  "Aymeric Laporte", "Seko Fofana", "Marcelo Brozović", "Franck Kessié",
  "Bono", "Sergej Milinković-Savić", "Gabri Veiga", "Yannick Carrasco", "Jota",
  "Allan Saint-Maximin", "Pelé", "Diego Maradona", "Ronaldo Nazário", "Johan Cruyff",
  "Zinedine Zidane", "Ronaldinho", "Thierry Henry", "Paolo Maldini", "Cafu", "Roberto Carlos",
  "Franz Beckenbauer", "Xavi", "Andrés Iniesta", "Ruud Gullit", "Lothar Matthäus"
];

function randomStat(base: number, max: number = 95) {
  return Math.max(40, Math.min(max, base + Math.floor(Math.random() * 15) - 5));
}

const clubs = ['Real Madrid', 'FC Barcelona', 'Atlético Madrid', 'Manchester City', 'Manchester United', 'Liverpool', 'Chelsea', 'Arsenal', 'Tottenham Hotspur', 'FC Bayern', 'Borussia Dortmund', 'Bayer Leverkusen', 'Juventus', 'AC Milan', 'Inter Milan', 'Napoli', 'AS Roma', 'PSG'];
const countries = ['Brazil', 'Argentina', 'Spain', 'Germany', 'Italy', 'France', 'England', 'Portugal', 'Netherlands', 'Belgium', 'Uruguay', 'Colombia', 'Chile', 'Mexico', 'USA', 'Sweden', 'Denmark', 'Norway', 'Finland', 'Poland', 'Croatia', 'Serbia', 'Switzerland', 'Austria', 'Japan', 'South Korea', 'Morocco', 'Senegal', 'Egypt', 'Wales', 'Scotland', 'Canada'];

async function getWikiImage(name: string) {
    try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(name)}&prop=pageimages&redirects=1&format=json&pithumbsize=300&origin=*`;
        const res = await fetch(url);
        const data = await res.json();
        const pages = data.query?.pages;
        if (pages) {
            const firstPage = Object.values(pages)[0] as any;
            if (firstPage?.thumbnail?.source) {
                return firstPage.thumbnail.source;
            }
        }
        
        const url2 = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(name + ' (footballer)')}&prop=pageimages&redirects=1&format=json&pithumbsize=300&origin=*`;
        const res2 = await fetch(url2);
        const data2 = await res2.json();
        const pages2 = data2.query?.pages;
        if (pages2) {
            const firstPage = Object.values(pages2)[0] as any;
            if (firstPage?.thumbnail?.source) {
                return firstPage.thumbnail.source;
            }
        }
    } catch(e) {}
    return null;
}

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

async function run() {
    const validPlayers = [];
    let idCounter = 1;
    for (let i = 0; i < playerNames.length; i++) {
        if (validPlayers.length >= 210 && playerNames[i] !== "Michael Olise") continue;
        const name = playerNames[i];
        
        const img = await getWikiImage(name);
        if (img) {
            const isGK = Math.random() < 0.1;
            const isDEF = !isGK && Math.random() < 0.35;
            const isMID = !isGK && !isDEF && Math.random() < 0.5;
            let pos = 'CM';
            let pac, sho, pas, dri, def, phy;
            
            if (isGK) {
                pos = 'GK';
                pac = randomStat(80, 85); sho = randomStat(80, 85); pas = randomStat(80, 85); dri = randomStat(80, 85); def = randomStat(45, 60); phy = randomStat(80, 88);
            } else if (isDEF) {
                pos = ['CB', 'LB', 'RB'][Math.floor(Math.random() * 3)];
                def = randomStat(82, 88); phy = randomStat(80, 88);
                if (pos === 'CB') { pac = randomStat(68, 80); sho = randomStat(40, 60); pas = randomStat(65, 75); dri = randomStat(60, 75); }
                else { pac = randomStat(82, 90); sho = randomStat(55, 70); pas = randomStat(75, 85); dri = randomStat(75, 85); }
            } else if (isMID) {
                pos = ['CDM', 'CM', 'CAM', 'RM', 'LM'][Math.floor(Math.random() * 5)];
                pas = randomStat(80, 88); dri = randomStat(80, 88);
                if (pos === 'CDM') { def = randomStat(80, 88); pac = randomStat(70, 82); sho = randomStat(65, 80); phy = randomStat(80, 88); }
                else { def = randomStat(55, 75); pac = randomStat(78, 88); sho = randomStat(75, 88); phy = randomStat(65, 80); }
            } else {
                pos = ['RW', 'LW', 'ST', 'CF'][Math.floor(Math.random() * 4)];
                sho = randomStat(82, 90); pac = randomStat(82, 92); dri = randomStat(82, 88); 
                pas = randomStat(75, 85); def = randomStat(35, 55); phy = randomStat(70, 85);
            }
            
            const stats = [pac, sho, pas, dri, def, phy];
            stats.sort((a,b) => b - a);
            let overall = Math.floor((stats[0]*0.4 + stats[1]*0.3 + stats[2]*0.2 + stats[3]*0.1));
            overall = Math.min(96, Math.max(76, overall));

            validPlayers.push({
                id: `gen_${idCounter++}`,
                name,
                overall,
                position: pos,
                country: countries[Math.floor(Math.random() * countries.length)],
                club: clubs[Math.floor(Math.random() * clubs.length)],
                pac, sho, pas, dri, def, phy,
                image: img
            });
            console.log(`+ ${name}`);
        } else {
            console.log(`- ${name} (no image)`);
        }
        await wait(50); // limit rate
    }
    
    console.log(`Found ${validPlayers.length} valid players with images.`);
    
    fs.writeFileSync('src/data/players.ts', `import { Player } from '../types';\n\nexport const PLAYERS: Player[] = ${JSON.stringify(validPlayers, null, 2)};\n\nexport const INITIAL_BUDGET = 500_000_000;\n`);
}

run();
