/**
 * Letter-of-transmittal salutation from contact first name.
 * Only assign Mr./Ms. when gender is high-confidence; otherwise keep Mr./Ms.
 * and flag for cyan author-review highlight.
 */

import { splitFullName } from '@/lib/person-name';

export type SalutationGender = 'male' | 'female';

export interface ResolvedSalutation {
  /** e.g. "Mr. Baiko" or "Mr./Ms. Baiko" (no trailing colon) */
  text: string;
  /** False when gender is ambiguous — author should review (cyan highlight) */
  certain: boolean;
  /** First-name gender used, when known */
  gender: SalutationGender | null;
}

/** High-confidence masculine first names (US/English common set). */
const MALE_FIRST_NAMES = new Set(
  [
    'aaron', 'adam', 'adrian', 'alan', 'albert', 'alejandro', 'alexandre', 'alfred',
    'andrew', 'anthony', 'antonio', 'arthur', 'austin', 'benjamin', 'bradley', 'brandon',
    'brendan', 'brent', 'brett', 'brian', 'bruce', 'bryan', 'caleb', 'calvin', 'carl',
    'carlos', 'chad', 'charles', 'christian', 'christopher', 'chuck', 'clark', 'clayton',
    'clifford', 'clinton', 'cody', 'colin', 'connor', 'corey', 'craig', 'curtis', 'dale',
    'dan', 'daniel', 'darrell', 'darren', 'dave', 'david', 'dean', 'dennis', 'derek',
    'derrick', 'diego', 'donald', 'douglas', 'drew', 'duane', 'dustin', 'dylan', 'earl',
    'edgar', 'edward', 'edwin', 'eli', 'elijah', 'eric', 'erik', 'ernest', 'ethan',
    'eugene', 'evan', 'felix', 'fernando', 'floyd', 'frank', 'frederick',
    'gabriel', 'gary', 'gavin', 'george', 'gerald', 'gilbert', 'glenn', 'gordon', 'greg',
    'gregory', 'harold', 'harry', 'harvey', 'hector', 'henry', 'herman', 'howard', 'hugh',
    'hunter', 'ian', 'isaac', 'ivan', 'jack', 'jackson', 'jacob', 'jake', 'james', 'jason',
    'javier', 'jay', 'jeff', 'jeffrey', 'jeremy', 'jerome', 'jerry', 'jesse', 'jesus',
    'jim', 'jimmy', 'joe', 'joel', 'john', 'johnny', 'jon', 'jonathan', 'jose', 'joseph',
    'josh', 'joshua', 'juan', 'julian', 'justin', 'keith', 'kenneth', 'kent', 'kevin',
    'kyle', 'lance', 'larry', 'lawrence', 'leo', 'leon', 'leonard', 'leroy',
    'lester', 'levi', 'lewis', 'liam', 'lloyd', 'louis', 'lucas', 'luis', 'luke',
    'malcolm', 'manuel', 'marc', 'marcus', 'mario', 'mark', 'marshall', 'martin', 'marvin',
    'mason', 'matt', 'matthew', 'maurice', 'max', 'michael', 'miguel', 'mike', 'mitchell',
    'nathan', 'nathaniel', 'neil', 'nicholas', 'nick', 'nicolas', 'noah', 'norman',
    'oliver', 'oscar', 'owen', 'patrick', 'paul', 'pedro', 'peter', 'philip', 'phillip',
    'preston', 'ralph', 'ramon', 'randall', 'randy', 'raymond', 'ricardo', 'richard',
    'rick', 'ricky', 'robert', 'roberto', 'rodney', 'roger', 'ronald', 'ronnie', 'roy',
    'ruben', 'russell', 'ryan', 'samuel', 'scott', 'sean', 'sebastian', 'sergio', 'seth',
    'shane', 'shaun', 'spencer', 'stanley', 'stephen', 'steve', 'steven', 'stuart',
    'ted', 'theodore', 'thomas', 'tim', 'timothy', 'todd', 'tom', 'tommy',
    'tony', 'travis', 'trevor', 'troy', 'tyler', 'victor', 'vincent', 'walter', 'warren',
    'wayne', 'wesley', 'william', 'willie', 'wyatt', 'zachary', 'zach',
  ].map((n) => n.toLowerCase())
);

/** High-confidence feminine first names (US/English common set). */
const FEMALE_FIRST_NAMES = new Set(
  [
    'abby', 'abigail', 'adelaide', 'agnes', 'alexa', 'alexandra', 'alice', 'alicia',
    'allison', 'alyssa', 'amanda', 'amber', 'amelia', 'amy', 'ana', 'andrea', 'angela',
    'anita', 'ann', 'anna', 'anne', 'annette', 'annie', 'april', 'arlene', 'ashley',
    'audrey', 'barbara', 'beatrice', 'becky', 'belinda', 'bernice', 'beth', 'betty',
    'beverly', 'bonnie', 'brenda', 'brianna', 'bridget', 'brittany', 'brooke', 'caitlin',
    'candace', 'cara', 'carla', 'carmen', 'carol', 'carole', 'caroline', 'carolyn',
    'catherine', 'cathleen', 'cathy', 'cecilia', 'celeste', 'charlene', 'charlotte',
    'cheryl', 'christina', 'christine', 'cindy', 'claire', 'clara', 'claudia', 'colleen',
    'connie', 'constance', 'crystal', 'cynthia', 'daisy', 'danielle', 'darlene',
    'dawn', 'deanna', 'debbie', 'deborah', 'debra', 'delores', 'denise', 'diana',
    'diane', 'dianne', 'dolores', 'donna', 'dora', 'doris', 'dorothy', 'edith', 'edna',
    'eileen', 'elaine', 'eleanor', 'elena', 'elisa', 'elizabeth', 'ella', 'ellen',
    'eloise', 'elsa', 'emily', 'emma', 'erica', 'erika', 'erin', 'esther', 'ethel',
    'eva', 'evelyn', 'faith', 'faye', 'felicia', 'florence', 'frances', 'gabriela',
    'gabrielle', 'gail', 'gayle', 'genevieve', 'georgia', 'geraldine', 'gina', 'glenda',
    'gloria', 'grace', 'gwendolyn', 'hailey', 'hannah', 'harriet', 'heather', 'heidi',
    'helen', 'holly', 'ida', 'irene', 'iris', 'isabella', 'jacqueline', 'jade',
    'jane', 'janet', 'janice', 'jeanette', 'jeanne', 'jennifer', 'jenny',
    'jessica', 'jill', 'joan', 'joann', 'joanna', 'joanne', 'jocelyn', 'jodi', 'jolene',
    'josephine', 'joy', 'joyce', 'judith', 'judy', 'julia', 'julie', 'june', 'karen',
    'kari', 'kate', 'katherine', 'kathleen', 'kathryn', 'kathy', 'katie', 'kay', 'kayla',
    'kendra', 'kimberly', 'kristen', 'kristin', 'kristina', 'krystal',
    'laura', 'lauren', 'laurie', 'leah', 'lena', 'leona', 'lillian', 'linda',
    'lisa', 'lois', 'loretta', 'lori', 'lorraine', 'louise', 'lucille', 'lucy', 'lydia',
    'lynn', 'mabel', 'madison', 'marcia', 'margaret', 'maria', 'mariah', 'marian',
    'marie', 'marilyn', 'marjorie', 'marlene', 'martha', 'mary', 'maureen', 'megan',
    'melanie', 'melinda', 'melissa', 'melody', 'mercedes', 'meredith', 'mia', 'michelle',
    'mildred', 'monica', 'monique', 'nancy', 'naomi', 'natalie', 'natasha', 'nicole',
    'nina', 'nora', 'norma', 'olga', 'olivia', 'paige', 'pamela', 'patricia', 'patsy',
    'paula', 'peggy', 'penelope', 'phyllis', 'priscilla', 'rachel', 'rebecca', 'regina',
    'renee', 'rhonda', 'rita', 'roberta', 'rosa', 'rose', 'rosemary', 'ruby',
    'ruth', 'sabrina', 'sally', 'samantha', 'sandra', 'sara', 'sarah',
    'sharon', 'sheila', 'shelley', 'shelly', 'sherri', 'sherry', 'shirley', 'sofia',
    'sonia', 'sophia', 'stella', 'stephanie', 'sue', 'susan',
    'suzanne', 'sylvia', 'tamara', 'tammy', 'tanya', 'tara', 'teresa', 'terra', 'terri',
    'tiffany', 'tina', 'valerie', 'vanessa', 'vera', 'veronica',
    'vicki', 'vickie', 'victoria', 'viola', 'violet', 'virginia', 'vivian', 'wanda',
    'wendy', 'whitney', 'yvonne', 'zoe', 'shari',
  ].map((n) => n.toLowerCase())
);

function normalizeFirstName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z'-]/g, '')
    .replace(/'/g, '');
}

/**
 * Infer gender only when the first name is on a high-confidence list.
 * Ambiguous / unisex / unknown names return null (author must review).
 */
export function inferGenderFromFirstName(firstName: string): SalutationGender | null {
  const key = normalizeFirstName(firstName);
  if (!key) return null;
  // Conflicting lists → treat as uncertain
  const male = MALE_FIRST_NAMES.has(key);
  const female = FEMALE_FIRST_NAMES.has(key);
  if (male && female) return null;
  if (male) return 'male';
  if (female) return 'female';
  return null;
}

function stripExistingHonorific(fullName: string): {
  honorific: 'Mr.' | 'Ms.' | 'Mrs.' | 'Miss' | 'Dr.' | null;
  remainder: string;
} {
  const m = fullName
    .trim()
    .match(/^(mr\.?|ms\.?|mrs\.?|miss|dr\.?)\s+(.+)$/i);
  if (!m) return { honorific: null, remainder: fullName.trim() };
  const raw = m[1].toLowerCase().replace(/\.$/, '');
  const honorific =
    raw === 'mr'
      ? 'Mr.'
      : raw === 'ms'
        ? 'Ms.'
        : raw === 'mrs'
          ? 'Mrs.'
          : raw === 'miss'
            ? 'Miss'
            : 'Dr.';
  return { honorific, remainder: m[2].trim() };
}

/**
 * Build LoT salutation from intake contact name.
 * - Explicit `client_salutation` → used as-is (certain).
 * - Existing honorific on the name → used (certain).
 * - High-confidence first name → Mr./Ms. Last (certain).
 * - Otherwise → Mr./Ms. Last (uncertain → cyan author mark).
 */
export function resolveClientSalutation(input: {
  client_salutation?: string;
  client_contact_name?: string;
  client_entity?: string;
}): ResolvedSalutation {
  const explicit = input.client_salutation?.trim();
  if (explicit) {
    return {
      text: explicit.replace(/:$/, ''),
      certain: true,
      gender: /^\s*mr\b/i.test(explicit)
        ? 'male'
        : /^\s*ms\b|^\s*mrs\b|^\s*miss\b/i.test(explicit)
          ? 'female'
          : null,
    };
  }

  const contact =
    input.client_contact_name?.trim() ||
    input.client_entity?.trim() ||
    'Client';

  const { honorific, remainder } = stripExistingHonorific(contact);
  if (honorific && honorific !== 'Dr.') {
    const { last_name } = splitFullName(remainder);
    const last = last_name || remainder.split(/\s+/).pop() || remainder;
    return {
      text: `${honorific} ${last}`,
      certain: true,
      gender: honorific === 'Mr.' ? 'male' : 'female',
    };
  }
  if (honorific === 'Dr.') {
    const { last_name } = splitFullName(remainder);
    const last = last_name || remainder.split(/\s+/).pop() || remainder;
    return { text: `Dr. ${last}`, certain: true, gender: null };
  }

  const { first_name, last_name } = splitFullName(contact);
  const last = last_name || first_name || contact;
  if (!first_name || !last_name) {
    return { text: `Mr./Ms. ${last}`, certain: false, gender: null };
  }

  const gender = inferGenderFromFirstName(first_name);
  if (gender === 'male') {
    return { text: `Mr. ${last}`, certain: true, gender };
  }
  if (gender === 'female') {
    return { text: `Ms. ${last}`, certain: true, gender };
  }
  return { text: `Mr./Ms. ${last}`, certain: false, gender: null };
}
