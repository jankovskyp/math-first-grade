import { Operation, NumberRange, Problem } from '../types/game';

const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const shuffleArray = <T>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

export const generateProblem = (range: NumberRange, operations: Operation[]): Problem => {
  const type = operations[getRandomInt(0, operations.length - 1)];
  const id = Math.random().toString(36).substring(2, 9);
  
  let a = 0;
  let b = 0;
  let result: number | string = 0;
  let displayOperator = '';
  let options: (number | string)[] = [];

  if (type === 'addition') {
    a = getRandomInt(0, range);
    b = getRandomInt(0, range - a); // Ensure total <= range
    result = a + b;
    displayOperator = '+';
  } else if (type === 'subtraction') {
    a = getRandomInt(0, range);
    b = getRandomInt(0, a); // Ensure a >= b
    result = a - b;
    displayOperator = '-';
  } else if (type === 'comparison') {
    a = getRandomInt(0, range);
    b = getRandomInt(0, range);
    displayOperator = '...';
    if (a < b) result = '<';
    else if (a > b) result = '>';
    else result = '=';
  }

  // Generate options
  if (type === 'comparison') {
    options = ['<', '>', '='];
  } else {
    const correctResult = result as number;
    const potentialOptions = new Set<number>();
    potentialOptions.add(correctResult);
    
    while (potentialOptions.size < 4) {
      // Generate distractors near the result
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
