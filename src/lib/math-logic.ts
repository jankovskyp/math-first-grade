import { Operation, NumberRange, Problem, DecompositionVariant } from '../types/game';

const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const shuffleArray = <T>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const pairString = (x: number, y: number) => `${x} + ${y}`;

export const generateProblem = (
  range: NumberRange,
  operations: Operation[],
  genOptions?: {
    withCarrying?: boolean;
    decompositionVariant?: DecompositionVariant;
  }
): Problem => {
  const type = operations[getRandomInt(0, operations.length - 1)];
  const id = Math.random().toString(36).substring(2, 9);
  const withCarrying = genOptions?.withCarrying ?? true;

  let a = 0;
  let b = 0;
  let result: number | string = 0;
  let displayOperator = '';
  let options: (number | string)[] = [];

  if (type === 'addition') {
    let attempts = 0;
    do {
      a = getRandomInt(0, range);
      b = getRandomInt(0, range - a);
      attempts++;
    } while (!withCarrying && range > 10 && (a % 10) + (b % 10) >= 10 && attempts < 100);
    result = a + b;
    displayOperator = '+';
  } else if (type === 'subtraction') {
    let attempts = 0;
    do {
      a = getRandomInt(0, range);
      b = getRandomInt(0, a);
      attempts++;
    } while (!withCarrying && range > 10 && (a % 10) < (b % 10) && attempts < 100);
    result = a - b;
    displayOperator = '-';
  } else if (type === 'comparison') {
    a = getRandomInt(0, range);
    b = getRandomInt(0, range);
    displayOperator = '...';
    if (a < b) result = '<';
    else if (a > b) result = '>';
    else result = '=';
  } else if (type === 'decomposition') {
    const variant = genOptions?.decompositionVariant ?? 'easy';
    const n = getRandomInt(2, range);

    let splitA: number;
    let splitB: number;
    let attempts = 0;
    do {
      splitA = getRandomInt(1, n - 1);
      splitB = n - splitA;
      attempts++;
    } while (!withCarrying && range > 10 && (splitA % 10) + (splitB % 10) >= 10 && attempts < 100);

    displayOperator = '=';

    if (variant === 'easy') {
      a = n;
      b = splitA;
      result = splitB;
      const potentialOptions = new Set<number>();
      potentialOptions.add(splitB);
      let d = 0;
      while (potentialOptions.size < 4 && d < 200) {
        const distractor = splitB + getRandomInt(-3, 3);
        if (distractor >= 0 && distractor <= range && distractor !== splitB)
          potentialOptions.add(distractor);
        d++;
      }
      options = shuffleArray(Array.from(potentialOptions));
    } else {
      a = n;
      b = 0;
      result = pairString(splitA, splitB);
      const potentialOptions = new Set<string>();
      potentialOptions.add(result as string);
      let d = 0;
      while (potentialOptions.size < 4 && d < 200) {
        const wrongSum = n + getRandomInt(-3, 3);
        if (wrongSum === n || wrongSum < 2 || wrongSum > range) { d++; continue; }
        const x = getRandomInt(1, wrongSum - 1);
        potentialOptions.add(pairString(x, wrongSum - x));
        d++;
      }
      options = shuffleArray(Array.from(potentialOptions));
    }

    return { id, type, a, b, result, options, displayOperator, decompositionVariant: variant };
  }

  // Generate options for non-decomposition types
  if (type === 'comparison') {
    options = ['<', '>', '='];
  } else {
    const correctResult = result as number;
    const potentialOptions = new Set<number>();
    potentialOptions.add(correctResult);

    while (potentialOptions.size < 4) {
      const diff = getRandomInt(-3, 3);
      const distractor = correctResult + diff;
      if (distractor >= 0 && distractor <= range) {
        potentialOptions.add(distractor);
      }
    }
    options = shuffleArray(Array.from(potentialOptions));
  }

  return { id, type, a, b, result, options, displayOperator };
};
