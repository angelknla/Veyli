type Title = readonly [slug: string, title: string, year: number];

export const catalogue: Record<string, Title[]> = {
  movies: [
    ['nosferatu-1922', 'Nosferatu', 1922],
    ['trip-to-the-moon-1902', 'A Trip to the Moon', 1902],
    ['caligari-1920', 'The Cabinet of Dr. Caligari', 1920],
    ['metropolis-1927', 'Metropolis', 1927],
    ['inception-2010', 'Inception', 2010],
    ['matrix-1999', 'The Matrix', 1999],
    ['interstellar-2014', 'Interstellar', 2014],
    ['arrival-2016', 'Arrival', 2016],
    ['dune-2021', 'Dune', 2021],
    ['nosferatu-2024', 'Nosferatu', 2024],
  ],
  television: [
    ['bonanza-1959', 'Bonanza', 1959],
    ['lucy-show-1962', 'The Lucy Show', 1962],
  ],
  games: [
    ['supertuxkart-2006', 'SuperTuxKart', 2006],
    ['zero-ad-2010', '0 A.D.', 2010],
    ['portal-2007', 'Portal', 2007],
  ],
  music: [
    ['taylor-swift-2006', 'Taylor Swift', 2006],
    ['lady-gaga-2008', 'Lady Gaga', 2008],
    ['beyonce-2003', 'Beyoncé', 2003],
  ],
  'pop-culture': [
    ['sherlock-holmes-1887', 'Sherlock Holmes', 1887],
    ['alice-1865', 'Alice', 1865],
  ],
};

// The first two titles in each category are its Classic and One Frame answers.
export const frameMedia: Record<string, string> = {
  'nosferatu-1922': 'nosferatu',
  'trip-to-the-moon-1902': 'trip-moon',
  'bonanza-1959': 'bonanza',
  'lucy-show-1962': 'lucy-show',
  'supertuxkart-2006': 'supertuxkart',
  'zero-ad-2010': 'zero-ad',
  'taylor-swift-2006': 'taylor-swift',
  'lady-gaga-2008': 'lady-gaga',
  'sherlock-holmes-1887': 'sherlock-holmes',
  'alice-1865': 'alice',
};

export const aliases: Record<string, string[]> = {
  'nosferatu-1922': ['Nosferatu: A Symphony of Horror'],
  'trip-to-the-moon-1902': ['Le Voyage dans la Lune', 'Trip to the Moon'],
  'matrix-1999': ['Matrix'],
};

export const movieFacts = [
  'Year: 1922',
  'Genre: Gothic horror',
  'Director: F. W. Murnau',
  'Country: Germany',
  'Lead actor: Max Schreck',
  'Format: Silent film',
  'Based on: Bram Stoker’s Dracula',
];
