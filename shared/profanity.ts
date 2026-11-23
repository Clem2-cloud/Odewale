const FOUL_PATTERNS: Array<{ pattern: RegExp; replacement: (match: string, mode: 'asterisks' | 'bleep-tag') => string }> = [];

const PROFANE_ROOTS = [
  'fuck',
  'fucker',
  'fucking',
  'motherfucker',
  'shit',
  'shitty',
  'bullshit',
  'bitch',
  'bitches',
  'asshole',
  'bastard',
  'dickhead',
  'dick',
  'cock',
  'pussy',
  'cunt',
  'slut',
  'whore',
  'retard',
  'retarded',
  'faggot',
  'fag',
  'nigger',
  'nigga',
  'chink',
  'spic',
  'kike',
  'wanker',
  'twat',
  'prick',
  'jackass',
  'dumbass',
  'shithead',
  'dipshit',
  'crap',
  'damn',
  'hell',
  'piss',
  'boob',
  'boobs',
  'tits',
  'penis',
  'vagina',
  'porn',
  'nude',
  'nudes',
  'naked',
];

function escapeLeetChar(ch: string): string {
  switch (ch) {
    case 'a':
      return '[a@4*]';
    case 'e':
      return '[e3*]';
    case 'i':
      return '[i1!|*]';
    case 'o':
      return '[o0*]';
    case 's':
      return '[s$5*]';
    case 't':
      return '[t7+*]';
    case 'u':
      return '[u*v]';
    case 'c':
      return '[ck*]';
    default:
      return `${ch}`;
  }
}

for (const word of PROFANE_ROOTS) {
  const letters = word.split('').map(escapeLeetChar).join('[\\W_]*');
  const regex = new RegExp(`\\b${letters}\\b`, 'gi');
  FOUL_PATTERNS.push({
    pattern: regex,
    replacement: (match, mode) => {
      if (mode === 'bleep-tag') {
        return '[bleep]';
      }
      const clean = match.trim();
      if (clean.length <= 2) return '*'.repeat(clean.length);
      return `${clean[0]}${'*'.repeat(Math.max(3, clean.length - 1))}`;
    },
  });
}

// Explicit phrases / mild spaced obfuscation
const EXTRA_PHRASES = [
  /\bf\s*u\s*c\s*k\b/gi,
  /\bs\s*h\s*i\s*t\b/gi,
  /\bb\s*i\s*t\s*c\s*h\b/gi,
  /\ba\s*s\s*s\s*h\s*o\s*l\s*e\b/gi,
  /\bw\s*t\s*f\b/gi,
  /\bstfu\b/gi,
  /\baf\b(?=\s+(?:bro|man|dude|hell))/gi,
];

export function bleepText(
  input: string,
  mode: 'asterisks' | 'bleep-tag' = 'asterisks'
): { text: string; wasBleeped: boolean } {
  if (!input) {
    return { text: '', wasBleeped: false };
  }

  let output = input;
  let wasBleeped = false;

  for (const entry of FOUL_PATTERNS) {
    output = output.replace(entry.pattern, (match) => {
      wasBleeped = true;
      return entry.replacement(match, mode);
    });
  }

  for (const phrase of EXTRA_PHRASES) {
    output = output.replace(phrase, (match) => {
      wasBleeped = true;
      if (mode === 'bleep-tag') return '[bleep]';
      const first = match.replace(/\s+/g, '')[0] || '*';
      return `${first}***`;
    });
  }

  return { text: output, wasBleeped };
}

export function containsBlockedKeywords(text: string, keywords: string[]): string | null {
  if (!text || !keywords.length) return null;
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    const trimmed = kw.trim().toLowerCase();
    if (trimmed && lower.includes(trimmed)) {
      return trimmed;
    }
  }
  return null;
}
