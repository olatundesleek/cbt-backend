import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { curateDemoScenario } from './curate_demo_scenario.js';

const prisma = new PrismaClient();

/*
|--------------------------------------------------------------------------
| Demo configuration
|--------------------------------------------------------------------------
*/

const DEMO_ADMIN_USERNAME = 'demo_admin';
const DEMO_ADMIN_PASSWORD = 'DemoAdmin@123';
const DEMO_TEACHER_PASSWORD = 'Teacher@123';
const DEMO_STUDENT_PASSWORD = 'Student@123';

const CLASS_NAMES = [
  'SS2 Science',
  'JSS1 Gold',
  'JSS2 Blue',
  'SS1 Science',
  'SS3 Science',
];



const COURSE_DEFINITIONS = [
  {
    title: 'Mathematics',
    description: 'Arithmetic, algebra, geometry and statistics.',
    subject: 'Mathematics',
  },
  {
    title: 'English Language',
    description: 'Grammar, vocabulary, comprehension and communication.',
    subject: 'English',
  },
  {
    title: 'Physics',
    description: 'Mechanics, electricity, waves and measurement.',
    subject: 'Physics',
  },
  {
    title: 'Chemistry',
    description: 'Atomic structure, reactions, acids and chemical bonding.',
    subject: 'Chemistry',
  },
  {
    title: 'Biology',
    description: 'Cells, organisms, genetics, ecology and human biology.',
    subject: 'Biology',
  },
  {
    title: 'Economics',
    description:
      'Microeconomics, macroeconomics and basic economic principles.',
    subject: 'Economics',
  },
  {
    title: 'Government',
    description:
      'Civic studies, democracy, constitutions and political systems.',
    subject: 'Government',
  },
  {
    title: 'Geography',
    description: 'Physical geography, population and human geography.',
    subject: 'Geography',
  },
  {
    title: 'Computer Science',
    description: 'Computing fundamentals, programming and web technologies.',
    subject: 'Computer Science',
  },
  {
    title: 'Further Mathematics',
    description: 'Functions, sequences, matrices, trigonometry and calculus.',
    subject: 'Further Mathematics',
  },
];

const TEACHER_NAMES = [
  ['Adebayo', 'Johnson'],
  ['Amaka', 'Williams'],
  ['Ibrahim', 'Musa'],
  ['Grace', 'Okafor'],
  ['Daniel', 'Adeyemi'],
  ['Fatima', 'Bello'],
  ['Samuel', 'David'],
  ['Esther', 'Ibrahim'],
  ['Michael', 'Samuel'],
  ['Hauwa', 'Abdullahi'],
];

const STUDENT_FIRST_NAMES = [
  'Chinedu',
  'Daniel',
  'Emeka',
  'Ifeoma',
  'Tunde',
  'Ada',
  'Mariam',
  'David',
  'Esther',
  'Samuel',
  'Blessing',
  'Joshua',
  'Aisha',
  'Peter',
  'Ruth',
  'Michael',
  'Grace',
  'Joseph',
];

const STUDENT_LAST_NAMES = [
  'Adebayo',
  'Okafor',
  'Adeyemi',
  'Ibrahim',
  'Bello',
  'Williams',
  'Johnson',
  'Musa',
  'David',
  'Suleiman',
];

/*
|--------------------------------------------------------------------------
| Utility helpers
|--------------------------------------------------------------------------
*/

function positiveNumber(value) {
  return Math.max(1, value);
}

function numericOptions(answer, distractors) {
  const values = [answer, ...distractors]
    .map(Number)
    .filter((value, index, array) => array.indexOf(value) === index);

  while (values.length < 4) {
    values.push(answer + values.length + 3);
  }

  return values.slice(0, 4).map(String);
}

function textOptions(answer, distractors) {
  return [answer, ...distractors].slice(0, 4);
}

function rotateOptions(options, index) {
  const position = index % options.length;
  return [...options.slice(position), ...options.slice(0, position)];
}

function numberQuestion(text, answer, distractors, index) {
  const options = rotateOptions(numericOptions(answer, distractors), index);

  return {
    text,
    options,
    answer: String(answer),
    marks: 4,
  };
}

function textQuestion(text, answer, distractors, index) {
  const options = rotateOptions(textOptions(answer, distractors), index);

  return {
    text,
    options,
    answer,
    marks: 4,
  };
}

function randomStudentName(classIndex, studentIndex) {
  const first =
    STUDENT_FIRST_NAMES[
      (classIndex * 3 + studentIndex) % STUDENT_FIRST_NAMES.length
    ];

  const last =
    STUDENT_LAST_NAMES[(classIndex + studentIndex) % STUDENT_LAST_NAMES.length];

  return [first, last];
}

/*
|--------------------------------------------------------------------------
| Question generators
|--------------------------------------------------------------------------
|
| Each question bank receives 15 questions.
| Two banks are created for every subject.
|
*/

function generateMathematicsQuestion(index, bankIndex) {
  const n = bankIndex * 7 + index + 2;

  switch (index) {
    case 0: {
      const answer = n + 8;
      return numberQuestion(
        `What is ${n} + 8?`,
        answer,
        [answer - 2, answer + 2, answer + 5],
        index,
      );
    }

    case 1: {
      const answer = n * 3;
      return numberQuestion(
        `What is ${n} × 3?`,
        answer,
        [answer - 3, answer + 3, answer + 6],
        index,
      );
    }

    case 2: {
      const x = n;
      const b = 4;
      const c = 2 * x + b;

      return numberQuestion(
        `Solve for x: 2x + ${b} = ${c}.`,
        x,
        [x - 1, x + 1, x + 2],
        index,
      );
    }

    case 3: {
      const percentage = 10 + (bankIndex % 4) * 5;
      const base = 100 + index * 10 + bankIndex * 5;
      const answer = (percentage / 100) * base;

      return numberQuestion(
        `What is ${percentage}% of ${base}?`,
        answer,
        [answer + 5, answer - 5, answer + 10],
        index,
      );
    }

    case 4: {
      const a = 3 + bankIndex;
      const b = 5 + bankIndex;
      const total = a + b;
      const part = 2 * total;

      return numberQuestion(
        `If two quantities are in the ratio ${a}:${b} and their total is ${part}, what is the first quantity?`,
        2 * a,
        [a + 2, a * 2 + 2, b * 2],
        index,
      );
    }

    case 5: {
      const a = n;
      const b = n + 4;
      const c = n + 8;
      const answer = (a + b + c) / 3;

      return numberQuestion(
        `Find the average of ${a}, ${b} and ${c}.`,
        answer,
        [answer - 2, answer + 2, answer + 4],
        index,
      );
    }

    case 6: {
      const length = n;
      const width = 5;
      const answer = 2 * (length + width);

      return numberQuestion(
        `What is the perimeter of a rectangle with length ${length} cm and width ${width} cm?`,
        answer,
        [answer - 5, answer + 5, answer + 10],
        index,
      );
    }

    case 7: {
      const length = n;
      const width = 4;
      const answer = length * width;

      return numberQuestion(
        `Find the area of a rectangle measuring ${length} cm by ${width} cm.`,
        answer,
        [answer - 4, answer + 4, answer + 8],
        index,
      );
    }

    case 8: {
      const principal = 1000 + bankIndex * 100;
      const rate = 5;
      const years = 2;
      const answer = (principal * rate * years) / 100;

      return numberQuestion(
        `Calculate the simple interest on ₦${principal} at ${rate}% per annum for ${years} years.`,
        answer,
        [answer - 50, answer + 50, answer + 100],
        index,
      );
    }

    case 9:
      return textQuestion(
        'Which fraction is equivalent to 1/2?',
        '2/4',
        ['1/3', '3/5', '2/5'],
        index,
      );

    case 10: {
      const first = 2 + bankIndex;
      const difference = 3;
      const answer = first + difference * 3;

      return numberQuestion(
        `What is the next term in the sequence ${first}, ${first + 3}, ${first + 6}, ${answer}?`,
        answer + 3,
        [answer + 1, answer + 2, answer + 5],
        index,
      );
    }

    case 11:
      return numberQuestion(
        `What is the highest common factor of ${12 + bankIndex} and ${24 + bankIndex * 2}?`,
        12,
        [4, 6, 8],
        index,
      );

    case 12: {
      const base = 2 + (bankIndex % 2);
      const exponent = 3;

      return numberQuestion(
        `Evaluate ${base}³.`,
        base ** exponent,
        [base ** 2, base ** 4, base * 3],
        index,
      );
    }

    case 13: {
      const side = 4 + bankIndex;

      return numberQuestion(
        `What is the perimeter of a square with side length ${side} cm?`,
        side * 4,
        [side * 2, side * 3, side * 5],
        index,
      );
    }

    default:
      return textQuestion(
        'What is the probability of getting a head when a fair coin is tossed once?',
        '1/2',
        ['1/4', '1/3', '1'],
        index,
      );
  }
}

function generateEnglishQuestion(index) {
  const questions = [
    [
      "Choose the correct plural form of 'child'.",
      'children',
      ['childs', 'childes', 'childrens'],
    ],
    ["Choose the synonym of 'rapid'.", 'fast', ['slow', 'weak', 'late']],
    [
      "Choose the antonym of 'ancient'.",
      'modern',
      ['old', 'historic', 'former'],
    ],
    [
      'Choose the correct sentence.',
      'She goes to school every day.',
      [
        'She go to school every day.',
        'She going to school every day.',
        'She gone school every day.',
      ],
    ],
    [
      "Choose the correct past tense of 'write'.",
      'wrote',
      ['written', 'write', 'writing'],
    ],
    [
      'Which word is an adjective?',
      'beautiful',
      ['quickly', 'run', 'happiness'],
    ],
    [
      'Choose the correct preposition: The book is ___ the table.',
      'on',
      ['at', 'into', 'between'],
    ],
    [
      'Choose the correctly spelt word.',
      'necessary',
      ['neccessary', 'necessery', 'necesary'],
    ],
    [
      'Which punctuation mark is normally used to end a question?',
      'Question mark',
      ['Comma', 'Colon', 'Semicolon'],
    ],
    [
      "What does the idiom 'break the ice' mean?",
      'To make people feel more comfortable',
      ['To destroy something', 'To become angry', 'To end a friendship'],
    ],
    [
      "Choose the correct passive form: 'The teacher marked the scripts.'",
      'The scripts were marked by the teacher.',
      [
        'The scripts marked the teacher.',
        'The teacher was marked by the scripts.',
        'The scripts are marking the teacher.',
      ],
    ],
    [
      "Which conjunction correctly joins these ideas: 'I studied hard ___ I passed.'",
      'so',
      ['but', 'although', 'unless'],
    ],
    [
      'What is the collective noun for a group of birds?',
      'flock',
      ['pack', 'herd', 'swarm'],
    ],
    [
      "Choose the word closest in meaning to 'assist'.",
      'help',
      ['avoid', 'refuse', 'delay'],
    ],
    [
      "Choose the correct comparative form of 'good'.",
      'better',
      ['gooder', 'best', 'more good'],
    ],
  ];

  const [text, answer, distractors] = questions[index];

  return textQuestion(text, answer, distractors, index);
}

function generatePhysicsQuestion(index, bankIndex) {
  const n = 10 + bankIndex * 2 + index;

  switch (index) {
    case 0:
      return numberQuestion(
        `A car travels ${n * 10} m in ${n} seconds. What is its average speed?`,
        10,
        [5, 20, 25],
        index,
      );

    case 1:
      return numberQuestion(
        `An object has a mass of ${n * 2} kg and a volume of ${n} m³. What is its density?`,
        2,
        [1, 4, 6],
        index,
      );

    case 2:
      return numberQuestion(
        `What force is produced when a ${n} kg object accelerates at 2 m/s²?`,
        n * 2,
        [n, n + 2, n * 3],
        index,
      );

    case 3:
      return numberQuestion(
        `How much work is done when a force of ${n} N moves an object ${2} m in the direction of the force?`,
        n * 2,
        [n, n * 3, n + 2],
        index,
      );

    case 4:
      return numberQuestion(
        `A machine does ${n * 100} J of work in ${n} seconds. What is its power?`,
        100,
        [50, 200, 500],
        index,
      );

    case 5:
      return numberQuestion(
        `What is the kinetic energy of a ${n} kg object moving at 2 m/s?`,
        2 * n,
        [n, 4 * n, n / 2],
        index,
      );

    case 6:
      return numberQuestion(
        `What is the weight of a ${n} kg object if g = 10 m/s²?`,
        n * 10,
        [n, n * 5, n * 20],
        index,
      );

    case 7:
      return numberQuestion(
        `If current is 2 A and resistance is ${n} Ω, what is the voltage?`,
        2 * n,
        [n, n + 2, n * 3],
        index,
      );

    case 8:
      return textQuestion(
        'What is the SI unit of electric current?',
        'ampere',
        ['volt', 'ohm', 'watt'],
        index,
      );

    case 9:
      return numberQuestion(
        `A wave has a speed of 300 m/s and a frequency of 10 Hz. What is its wavelength?`,
        30,
        [3, 20, 300],
        index,
      );

    case 10:
      return textQuestion(
        'Which instrument is used to measure temperature?',
        'Thermometer',
        ['Barometer', 'Ammeter', 'Voltmeter'],
        index,
      );

    case 11:
      return textQuestion(
        'Which force attracts objects towards the Earth?',
        'Gravitational force',
        ['Magnetic force', 'Frictional force', 'Buoyant force'],
        index,
      );

    case 12:
      return numberQuestion(
        `What is the momentum of a ${n} kg object travelling at 2 m/s?`,
        n * 2,
        [n, n * 3, n * 4],
        index,
      );

    case 13:
      return textQuestion(
        'Which device converts electrical energy into light?',
        'Electric lamp',
        ['Generator', 'Transformer', 'Motor'],
        index,
      );

    default:
      return textQuestion(
        'Which of these is a renewable source of energy?',
        'Solar energy',
        ['Coal', 'Natural gas', 'Petrol'],
        index,
      );
  }
}

function generateChemistryQuestion(index) {
  const questions = [
    [
      'What does the atomic number of an element represent?',
      'Number of protons',
      ['Number of neutrons', 'Number of shells', 'Number of compounds'],
    ],
    [
      'Which particle has a negative charge?',
      'Electron',
      ['Proton', 'Neutron', 'Nucleus'],
    ],
    ['What is the chemical symbol for sodium?', 'Na', ['So', 'Sd', 'S']],
    [
      'Which substance has a pH below 7?',
      'Acid',
      ['Base', 'Neutral solution', 'Salt only'],
    ],
    [
      'What is H₂O commonly called?',
      'Water',
      ['Hydrogen peroxide', 'Oxygen', 'Hydrochloric acid'],
    ],
    [
      'Which gas is required for combustion?',
      'Oxygen',
      ['Nitrogen', 'Carbon dioxide', 'Hydrogen'],
    ],
    [
      'Which process involves a loss of electrons?',
      'Oxidation',
      ['Reduction', 'Neutralisation', 'Distillation'],
    ],
    [
      'Which process separates a soluble solid from a solution by removing the solvent?',
      'Evaporation',
      ['Filtration', 'Decantation', 'Chromatography'],
    ],
    [
      'What is the main gas in the atmosphere?',
      'Nitrogen',
      ['Oxygen', 'Carbon dioxide', 'Hydrogen'],
    ],
    [
      'What type of reaction produces a salt and water from an acid and a base?',
      'Neutralisation',
      ['Combustion', 'Oxidation', 'Polymerisation'],
    ],
    [
      'Which element has the symbol O?',
      'Oxygen',
      ['Gold', 'Osmium only', 'Iron'],
    ],
    [
      'Which of the following is a noble gas?',
      'Neon',
      ['Sodium', 'Chlorine', 'Calcium'],
    ],
    [
      'What is a substance that speeds up a reaction without being used up?',
      'Catalyst',
      ['Solvent', 'Reactant', 'Indicator'],
    ],
    [
      'Which state of matter has a fixed volume but no fixed shape?',
      'Liquid',
      ['Solid', 'Gas', 'Plasma only'],
    ],
    [
      'Which separation method is commonly used to separate coloured substances?',
      'Chromatography',
      ['Filtration', 'Sublimation', 'Crystallisation'],
    ],
  ];

  const [text, answer, distractors] = questions[index];

  return textQuestion(text, answer, distractors, index);
}

function generateBiologyQuestion(index) {
  const questions = [
    [
      'Which organelle is known as the powerhouse of the cell?',
      'Mitochondrion',
      ['Nucleus', 'Ribosome', 'Cell wall'],
    ],
    [
      'What process do green plants use to make food?',
      'Photosynthesis',
      ['Respiration', 'Transpiration', 'Digestion'],
    ],
    [
      'Which pigment absorbs light during photosynthesis?',
      'Chlorophyll',
      ['Haemoglobin', 'Melanin', 'Keratin'],
    ],
    [
      'Which organ pumps blood around the human body?',
      'Heart',
      ['Liver', 'Lung', 'Kidney'],
    ],
    [
      'Which blood cells fight infection?',
      'White blood cells',
      ['Red blood cells', 'Platelets', 'Plasma cells only'],
    ],
    [
      'Which blood cells transport oxygen?',
      'Red blood cells',
      ['White blood cells', 'Platelets', 'Neurons'],
    ],
    [
      'What is the basic unit of life?',
      'Cell',
      ['Tissue', 'Organ', 'Organ system'],
    ],
    [
      'Which gas do plants take in for photosynthesis?',
      'Carbon dioxide',
      ['Oxygen', 'Nitrogen', 'Hydrogen'],
    ],
    [
      'Which organ is mainly responsible for filtering blood and producing urine?',
      'Kidney',
      ['Heart', 'Lung', 'Stomach'],
    ],
    [
      'Which part of a plant absorbs water and minerals?',
      'Root',
      ['Flower', 'Fruit', 'Leaf only'],
    ],
    [
      'What is the passing of traits from parents to offspring called?',
      'Heredity',
      ['Respiration', 'Variation only', 'Digestion'],
    ],
    [
      'Which system controls and coordinates body activities?',
      'Nervous system',
      ['Digestive system', 'Skeletal system', 'Respiratory system'],
    ],
    [
      'Which microorganism is commonly used in baking bread?',
      'Yeast',
      ['Algae', 'Protozoa', 'Virus'],
    ],
    [
      'What is the process by which cells obtain usable energy from food?',
      'Respiration',
      ['Photosynthesis', 'Excretion', 'Osmosis'],
    ],
    [
      'Which structure controls what enters and leaves a cell?',
      'Cell membrane',
      ['Cell wall', 'Nucleus', 'Vacuole'],
    ],
  ];

  const [text, answer, distractors] = questions[index];

  return textQuestion(text, answer, distractors, index);
}

function generateEconomicsQuestion(index) {
  const questions = [
    [
      'What is the basic economic problem?',
      'Scarcity',
      ['Inflation', 'Taxation', 'Trade'],
    ],
    [
      'What is demand?',
      'The quantity consumers are willing and able to buy',
      [
        'The amount producers manufacture',
        'Government spending',
        'Total population',
      ],
    ],
    [
      'What is supply?',
      'The quantity producers are willing and able to sell',
      ['Consumer income', 'Population growth', 'Total demand only'],
    ],
    [
      'What is opportunity cost?',
      'The next best alternative forgone',
      ['The total money spent', 'The selling price', 'The profit earned'],
    ],
    [
      'What does GDP measure?',
      'The value of final goods and services produced',
      ['Only imports', 'Only government spending', 'Population size'],
    ],
    [
      'What is inflation?',
      'A sustained rise in the general price level',
      [
        'A fall in population',
        'A rise in exports only',
        'A fall in production only',
      ],
    ],
    [
      'What is a monopoly?',
      'A market dominated by a single seller',
      [
        'A market with many sellers',
        'A government department',
        'A consumer group',
      ],
    ],
    [
      'What is fiscal policy mainly concerned with?',
      'Government revenue and expenditure',
      ['Interest only', 'Population movement', 'Weather conditions'],
    ],
    [
      'Which institution commonly controls monetary policy?',
      'Central bank',
      ['Local school', 'Trade union', 'Court'],
    ],
    [
      'What is unemployment?',
      'A situation where people willing to work cannot find jobs',
      ['People on holiday', 'Retired people only', 'Students only'],
    ],
    [
      'What happens to demand when price generally falls, all else equal?',
      'It tends to increase',
      ['It always becomes zero', 'It always decreases', 'It becomes fixed'],
    ],
    [
      'What is a consumer?',
      'A person who uses goods and services',
      ['A producer only', 'A regulator only', 'A wholesaler only'],
    ],
    [
      'What is an entrepreneur?',
      'A person who organizes resources and takes business risk',
      ['A consumer only', 'A tax collector', 'A judge'],
    ],
    [
      'What is capital in economics?',
      'Man-made resources used in production',
      ['Natural rainfall', 'Population', 'Consumer preference'],
    ],
    [
      'What is a subsidy?',
      'Financial support provided to reduce production costs or encourage activity',
      ['A private loan only', 'A tax penalty', 'A market failure'],
    ],
  ];

  const [text, answer, distractors] = questions[index];

  return textQuestion(text, answer, distractors, index);
}

function generateGovernmentQuestion(index) {
  const questions = [
    [
      'Which arm of government makes laws?',
      'Legislature',
      ['Executive', 'Judiciary', 'Civil service'],
    ],
    [
      'Which arm interprets laws?',
      'Judiciary',
      ['Legislature', 'Executive', 'Media'],
    ],
    [
      'Which arm implements government policies?',
      'Executive',
      ['Judiciary', 'Legislature', 'Electoral commission'],
    ],
    [
      'What is democracy?',
      'Government by the people',
      [
        'Government by the military only',
        'Government by judges',
        'Government by businesses',
      ],
    ],
    [
      'What is a constitution?',
      'The fundamental law and framework of a state',
      ['A tax receipt', 'A court case', 'A political speech'],
    ],
    [
      'What is the separation of powers?',
      'Division of government powers among different organs',
      [
        'Division of citizens by age',
        'Division of territory only',
        'Division of markets',
      ],
    ],
    [
      'What is federalism?',
      'A system in which powers are shared between levels of government',
      ['Rule by one person', 'Military rule', 'Rule without laws'],
    ],
    [
      'What is citizenship?',
      'Legal membership of a state',
      [
        'Employment by government',
        'Ownership of land',
        'Membership of a company',
      ],
    ],
    [
      'What is franchise in politics?',
      'The right to vote',
      [
        'The right to own a car',
        'The right to own a company',
        'The right to travel',
      ],
    ],
    [
      'What is a referendum?',
      'A direct vote by citizens on a specific issue',
      ['A court judgment', 'A military order', 'A budget document'],
    ],
    [
      'What is political participation?',
      'Taking part in political activities',
      ['Avoiding public affairs', 'Only paying taxes', 'Travelling abroad'],
    ],
    [
      'What is public opinion?',
      'The views held by people on public issues',
      ['A court judgment', 'A private contract', 'A government building'],
    ],
    [
      'What is an opposition party?',
      'A party not currently controlling government',
      ['A civil service agency', 'A court', 'An electoral commission'],
    ],
    [
      'What is rule of law?',
      'The principle that everyone is subject to the law',
      ['Rule by wealth', 'Rule by force', 'Rule by popularity'],
    ],
    [
      'What is an election?',
      'A process for choosing representatives or leaders',
      ['A court hearing', 'A tax collection', 'A school examination'],
    ],
  ];

  const [text, answer, distractors] = questions[index];

  return textQuestion(text, answer, distractors, index);
}

function generateGeographyQuestion(index) {
  const questions = [
    [
      'Which layer of the atmosphere contains most clouds and weather?',
      'Troposphere',
      ['Stratosphere', 'Mesosphere', 'Thermosphere'],
    ],
    [
      'What instrument measures atmospheric pressure?',
      'Barometer',
      ['Thermometer', 'Rain gauge', 'Anemometer'],
    ],
    [
      'What instrument measures wind speed?',
      'Anemometer',
      ['Barometer', 'Hygrometer', 'Thermometer'],
    ],
    [
      'What is erosion?',
      'The wearing away and removal of soil or rock',
      [
        'The formation of clouds',
        'The movement of planets',
        'The growth of cities',
      ],
    ],
    [
      'What is weather?',
      'The short-term condition of the atmosphere',
      [
        'Long-term population change',
        'Movement of tectonic plates',
        'Soil formation',
      ],
    ],
    [
      'What is climate?',
      'The long-term pattern of weather in an area',
      ['A single storm', 'Daily temperature only', 'A river system'],
    ],
    [
      'What is the Equator?',
      'A line of latitude at 0 degrees',
      [
        'A line at 90 degrees longitude',
        'The Prime Meridian',
        'The Tropic of Cancer',
      ],
    ],
    [
      'What is longitude?',
      'Angular distance east or west of the Prime Meridian',
      [
        'Distance north of the Equator',
        'Elevation above sea level',
        'Distance from a river',
      ],
    ],
    [
      'What is population density?',
      'Population per unit area',
      ['Total births only', 'Migration only', 'Total land area only'],
    ],
    [
      'What is urbanisation?',
      'The growth of towns and cities',
      [
        'Movement from city to village',
        'Growth of forests',
        'Increase in rainfall',
      ],
    ],
    [
      'What causes many earthquakes?',
      'Movement of tectonic plates',
      ['Ocean tides only', 'Rainfall only', 'Cloud formation'],
    ],
    [
      'Which process turns water vapour into liquid?',
      'Condensation',
      ['Evaporation', 'Sublimation', 'Infiltration'],
    ],
    [
      'Which process changes liquid water into vapour?',
      'Evaporation',
      ['Condensation', 'Precipitation', 'Deposition'],
    ],
    [
      'What is a delta?',
      'A depositional feature often formed at a river mouth',
      ['A mountain peak', 'A desert dune', 'A glacier'],
    ],
    [
      'What is migration?',
      'Movement of people from one place to another',
      [
        'Movement of clouds',
        'Movement of tectonic plates',
        'Growth of vegetation',
      ],
    ],
  ];

  const [text, answer, distractors] = questions[index];

  return textQuestion(text, answer, distractors, index);
}

function generateComputerScienceQuestion(index) {
  const questions = [
    [
      'What does CPU stand for?',
      'Central Processing Unit',
      [
        'Computer Power Unit',
        'Central Program Utility',
        'Core Processing User',
      ],
    ],
    ['Which memory is volatile?', 'RAM', ['ROM', 'SSD', 'Hard disk']],
    [
      'What does HTML mainly describe?',
      'The structure of web pages',
      ['Database tables', 'Network cables', 'Operating system kernels'],
    ],
    [
      'What does CSS mainly control?',
      'Presentation and styling',
      ['Database queries', 'CPU speed', 'File compression'],
    ],
    [
      'Which language is commonly used to add interactivity to web pages?',
      'JavaScript',
      ['SQL', 'HTML', 'CSS only'],
    ],
    [
      'What is an algorithm?',
      'A step-by-step procedure for solving a problem',
      ['A computer virus', 'A storage device', 'A browser'],
    ],
    [
      'What is a database?',
      'An organized collection of data',
      ['A network cable', 'A computer screen', 'A keyboard'],
    ],
    [
      'Which protocol is commonly used to transfer web pages?',
      'HTTP',
      ['FTP only', 'SMTP', 'SSH only'],
    ],
    [
      'What is binary based on?',
      'Base 2',
      ['Base 10', 'Base 8', 'Base 16 only'],
    ],
    [
      'Which is an input device?',
      'Keyboard',
      ['Monitor', 'Speaker', 'Projector'],
    ],
    ['Which is an output device?', 'Monitor', ['Keyboard', 'Mouse', 'Scanner']],
    [
      'What is a variable in programming?',
      'A named storage location for a value',
      ['A physical wire', 'A database server', 'A monitor'],
    ],
    [
      'What does SQL commonly query?',
      'Relational databases',
      ['Image editors', 'Operating system drivers', 'Video files'],
    ],
    [
      'What is debugging?',
      'Finding and fixing errors in software',
      ['Installing hardware', 'Designing logos', 'Deleting all files'],
    ],
    [
      'What is version control used for?',
      'Tracking changes to files and code',
      ['Measuring CPU temperature', 'Scanning documents', 'Playing media'],
    ],
  ];

  const [text, answer, distractors] = questions[index];

  return textQuestion(text, answer, distractors, index);
}

function generateFurtherMathematicsQuestion(index, bankIndex) {
  switch (index) {
    case 0:
      return numberQuestion(
        'If f(x) = 2x + 3, what is f(4)?',
        11,
        [8, 10, 14],
        index,
      );

    case 1:
      return numberQuestion(
        'What is the gradient of the line y = 3x + 5?',
        3,
        [5, 2, 8],
        index,
      );

    case 2:
      return numberQuestion(
        'Find the next term in the sequence 3, 6, 9, 12, ...',
        15,
        [13, 14, 18],
        index,
      );

    case 3:
      return numberQuestion(
        'What is the determinant of [[2,0],[0,3]]?',
        6,
        [5, 4, 8],
        index,
      );

    case 4:
      return textQuestion('What is sin(90°)?', '1', ['0', '-1', '1/2'], index);

    case 5:
      return textQuestion('What is cos(0°)?', '1', ['0', '-1', '1/2'], index);

    case 6:
      return numberQuestion(
        'Differentiate x² with respect to x.',
        2,
        [1, 3, 4],
        index,
      );

    case 7:
      return textQuestion(
        'Which expression is an antiderivative of 2x?',
        'x² + C',
        ['2x + C', 'x + C', '2x² + C'],
        index,
      );

    case 8:
      return numberQuestion('What is log₁₀(100)?', 2, [1, 3, 10], index);

    case 9:
      return textQuestion(
        'Which expression represents the modulus of a complex number?',
        'Its distance from the origin',
        ['Its real part only', 'Its imaginary part only', 'Its argument only'],
        index,
      );

    case 10:
      return numberQuestion(
        'If a vector has components (3,4), what is its magnitude?',
        5,
        [4, 6, 7],
        index,
      );

    case 11:
      return numberQuestion(
        'What is the value of 5P2?',
        20,
        [10, 15, 25],
        index,
      );

    case 12:
      return numberQuestion(
        'What is the value of 5C2?',
        10,
        [5, 15, 20],
        index,
      );

    case 13:
      return numberQuestion(
        `If x + ${bankIndex + 3} = ${bankIndex + 10}, find x.`,
        7,
        [5, 6, 8],
        index,
      );

    default:
      return textQuestion(
        'Which type of function has the form y = ax + b?',
        'Linear function',
        ['Quadratic function', 'Exponential function', 'Logarithmic function'],
        index,
      );
  }
}

function generateQuestion(subject, index, bankIndex) {
  switch (subject) {
    case 'Mathematics':
      return generateMathematicsQuestion(index, bankIndex);

    case 'English':
      return generateEnglishQuestion(index);

    case 'Physics':
      return generatePhysicsQuestion(index, bankIndex);

    case 'Chemistry':
      return generateChemistryQuestion(index);

    case 'Biology':
      return generateBiologyQuestion(index);

    case 'Economics':
      return generateEconomicsQuestion(index);

    case 'Government':
      return generateGovernmentQuestion(index);

    case 'Geography':
      return generateGeographyQuestion(index);

    case 'Computer Science':
      return generateComputerScienceQuestion(index);

    case 'Further Mathematics':
      return generateFurtherMathematicsQuestion(index, bankIndex);

    default:
      return textQuestion(
        'Which statement best describes learning?',
        'Acquiring knowledge or skills',
        ['Ignoring information', 'Avoiding practice', 'Removing memory'],
        index,
      );
  }
}

/*
|--------------------------------------------------------------------------
| Demo cleanup
|--------------------------------------------------------------------------
*/

async function resetDemoData() {
  console.log('🧹 Resetting demo data...');

  const demoUsers = await prisma.user.findMany({
    where: {
      isDemoUser: true,
    },
    select: {
      id: true,
    },
  });

  const demoUserIds = demoUsers.map((user) => user.id);

  const demoClasses = await prisma.class.findMany({
    where: {
      OR: [
        {
          className: {
            in: CLASS_NAMES,
          },
        },
        ...(demoUserIds.length
          ? [
              {
                teacherId: {
                  in: demoUserIds,
                },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
    },
  });

  const demoClassIds = demoClasses.map((item) => item.id);

  const courseTitles = COURSE_DEFINITIONS.map((course) => course.title);

  const demoCourses = await prisma.course.findMany({
    where: {
      OR: [
        {
          title: {
            in: courseTitles,
          },
        },
        ...(demoUserIds.length
          ? [
              {
                teacherId: {
                  in: demoUserIds,
                },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
    },
  });

  const demoCourseIds = demoCourses.map((item) => item.id);

  /*
   * Get banks/tests before deleting their parent users.
   */
  const demoBanks = await prisma.questionBank.findMany({
    where: demoUserIds.length
      ? {
          OR: [
            {
              createdBy: {
                in: demoUserIds,
              },
            },
            {
              questionBankName: {
                startsWith: 'Demo ',
              },
            },
          ],
        }
      : {
          questionBankName: {
            startsWith: 'Demo ',
          },
        },
    select: {
      id: true,
    },
  });

  const demoBankIds = demoBanks.map((item) => item.id);

  const demoTests = await prisma.test.findMany({
    where: demoUserIds.length
      ? {
          OR: [
            {
              createdBy: {
                in: demoUserIds,
              },
            },
            {
              title: {
                startsWith: 'Demo ',
              },
            },
          ],
        }
      : {
          title: {
            startsWith: 'Demo ',
          },
        },
    select: {
      id: true,
    },
  });

  const demoTestIds = demoTests.map((item) => item.id);

  /*
   * Find sessions belonging to demo users or demo tests.
   */
  const demoSessions = await prisma.testSession.findMany({
    where: {
      OR: [
        ...(demoUserIds.length
          ? [
              {
                studentId: {
                  in: demoUserIds,
                },
              },
            ]
          : []),
        ...(demoTestIds.length
          ? [
              {
                testId: {
                  in: demoTestIds,
                },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
    },
  });

  const demoSessionIds = demoSessions.map((item) => item.id);

  /*
   * Notifications can belong to demo users, classes or courses.
   */
  const notificationConditions = [
    ...(demoUserIds.length ? [{ createdById: { in: demoUserIds } }] : []),
    ...(demoClassIds.length ? [{ classId: { in: demoClassIds } }] : []),
    ...(demoCourseIds.length ? [{ courseId: { in: demoCourseIds } }] : []),
  ];

  if (notificationConditions.length) {
    await prisma.notification.deleteMany({
      where: {
        OR: notificationConditions,
      },
    });
  }

  if (demoSessionIds.length) {
    await prisma.answer.deleteMany({
      where: {
        testSessionId: {
          in: demoSessionIds,
        },
      },
    });

    await prisma.testSession.deleteMany({
      where: {
        id: {
          in: demoSessionIds,
        },
      },
    });
  }

  /*
   * Tests must disappear before question banks/courses/users.
   */
  if (demoTestIds.length) {
    await prisma.test.deleteMany({
      where: {
        id: {
          in: demoTestIds,
        },
      },
    });
  }

  /*
   * Question banks cascade their questions/images/comprehensions.
   */
  if (demoBankIds.length) {
    await prisma.questionBank.deleteMany({
      where: {
        id: {
          in: demoBankIds,
        },
      },
    });
  }

  /*
   * Courses disappear before teachers.
   */
  if (demoCourseIds.length) {
    await prisma.course.deleteMany({
      where: {
        id: {
          in: demoCourseIds,
        },
      },
    });
  }

  /*
   * Demo students must disappear before their classes.
   */
  if (demoUserIds.length) {
    await prisma.user.deleteMany({
      where: {
        isDemoUser: true,
        role: 'STUDENT',
      },
    });
  }

  /*
   * Classes disappear before their demo teachers.
   */
  if (demoClassIds.length) {
    await prisma.class.deleteMany({
      where: {
        id: {
          in: demoClassIds,
        },
      },
    });
  }

  /*
   * Finally remove demo teachers/admin.
   */
  if (demoUserIds.length) {
    await prisma.user.deleteMany({
      where: {
        isDemoUser: true,
      },
    });
  }

  console.log('✅ Demo data removed.');
}

/*
|--------------------------------------------------------------------------
| Seed demo data
|--------------------------------------------------------------------------
*/

async function seedDemoData() {
  console.log('🌱 Creating demo data...');

  const adminPassword = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10);

  const teacherPassword = await bcrypt.hash(DEMO_TEACHER_PASSWORD, 10);

  const studentPassword = await bcrypt.hash(DEMO_STUDENT_PASSWORD, 10);

  /*
   * Demo administrator
   */
  const demoAdmin = await prisma.user.create({
    data: {
      firstname: 'Demo',
      lastname: 'Administrator',
      username: DEMO_ADMIN_USERNAME,
      password: adminPassword,
      role: 'ADMIN',
      isDemoUser: true,
    },
  });

  /*
   * Demo teachers
   */
  const teachers = [];

  for (let i = 0; i < TEACHER_NAMES.length; i++) {
    const [firstname, lastname] = TEACHER_NAMES[i];

    const teacher = await prisma.user.create({
      data: {
        firstname,
        lastname,
        username:
          i === 0
            ? 'demo_teacher'
            : `demo_teacher_${String(i + 1).padStart(2, '0')}`,
        password: teacherPassword,
        role: 'TEACHER',
        isDemoUser: true,
      },
    });

    teachers.push(teacher);
  }

  /*
   * Demo classes
   *
   * One teacher is assigned to each class.
   * Remaining teachers still teach courses below.
   */
  const classes = [];

  for (let i = 0; i < CLASS_NAMES.length; i++) {
    const item = await prisma.class.create({
      data: {
        className: CLASS_NAMES[i],
        teacherId: teachers[i].id,
      },
    });

    classes.push(item);
  }

  /*
   * Demo students
   *
   * 15 students per class = 75 students.
   */
  const studentsByClass = new Map();

  for (let classIndex = 0; classIndex < classes.length; classIndex++) {
    const classStudents = [];

    for (let studentIndex = 0; studentIndex < 15; studentIndex++) {
      const [firstname, lastname] = randomStudentName(classIndex, studentIndex);

      const student = await prisma.user.create({
        data: {
          firstname,
          lastname,
          username:
            classIndex === 0 && studentIndex === 0
              ? 'demo_student'
              : `demo_student_${classIndex + 1}_${String(
                  studentIndex + 1,
                ).padStart(2, '0')}`,
          password: studentPassword,
          role: 'STUDENT',
          classId: classes[classIndex].id,
          isDemoUser: true,
        },
      });

      classStudents.push(student);
    }

    studentsByClass.set(classes[classIndex].id, classStudents);
  }

  /*
   * Demo courses
   *
   * Each course is attached to two classes.
   * Teachers are distributed across all courses.
   */
  const courses = [];

  for (let i = 0; i < COURSE_DEFINITIONS.length; i++) {
    const definition = COURSE_DEFINITIONS[i];

    const classOne = classes[i % classes.length];
    const classTwo = classes[(i + 1) % classes.length];

    const teacher = teachers[i % teachers.length];

    const course = await prisma.course.create({
      data: {
        title: definition.title,
        description: definition.description,
        teacherId: teacher.id,
        classes: {
          connect: [{ id: classOne.id }, { id: classTwo.id }],
        },
      },
    });

    courses.push({
      ...course,
      subject: definition.subject,
      classIds: [classOne.id, classTwo.id],
      teacher,
    });
  }

  /*
   * Two banks per course = 20 question banks.
   */
  const questionBanks = [];

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];

    for (let bankNumber = 1; bankNumber <= 2; bankNumber++) {
      const bank = await prisma.questionBank.create({
        data: {
          questionBankName: `Demo ${course.title} - Question Bank ${bankNumber}`,
          description:
            bankNumber === 1
              ? `${course.title} fundamentals and core concepts.`
              : `${course.title} revision and examination questions.`,
          courseId: course.id,
          createdBy: course.teacher.id,
        },
      });

      questionBanks.push({
        ...bank,
        course,
        bankIndex: questionBanks.length,
      });
    }
  }

  /*
   * 15 questions per bank = 300 questions.
   */
  const questionsByBank = new Map();

  for (const bank of questionBanks) {
    // const questions = [];
    // for (let questionIndex = 0; questionIndex < 15; questionIndex++) {
    //   const generated = generateQuestion(
    //     bank.course.subject,
    //     questionIndex,
    //     bank.bankIndex,
    //   );
    //   const question = await prisma.question.create({
    //     data: {
    //       text: generated.text,
    //       options: generated.options,
    //       answer: generated.answer,
    //       marks: generated.marks,
    //       bankId: bank.id,
    //     },
    //   });
    //   questions.push(question);
    // }
    // questionsByBank.set(bank.id, questions);

    const questionData = [];

    for (let questionIndex = 0; questionIndex < 15; questionIndex++) {
      const generated = generateQuestion(
        bank.course.subject,
        questionIndex,
        bank.bankIndex,
      );

      questionData.push({
        text: generated.text,
        options: generated.options,
        answer: generated.answer,
        marks: generated.marks,
        bankId: bank.id,
      });
    }

    await prisma.question.createMany({
      data: questionData,
    });

    const questions = await prisma.question.findMany({
      where: {
        bankId: bank.id,
      },
      orderBy: {
        id: 'asc',
      },
    });

    questionsByBank.set(bank.id, questions);
  }

  /*
   * Add comprehension data to the English banks.
   */
  const englishBanks = questionBanks.filter(
    (bank) => bank.course.subject === 'English',
  );

  const comprehensionText = `
Reading is an important part of effective learning. Students who read regularly
develop stronger vocabulary, improve their understanding of written information,
and become more confident when communicating their ideas. Reading also exposes
learners to different perspectives and helps them build the ability to analyse
information before making decisions.

A good learner does not simply read quickly. The learner pays attention to the
main idea, supporting details, unfamiliar words and the purpose of the writer.
These habits make reading useful in academic work and in everyday life.
  `.trim();

  for (const bank of englishBanks) {
    await prisma.comprehension.create({
      data: {
        questionBankId: bank.id,
        title: 'The Importance of Reading',
        content: comprehensionText,
      },
    });

    const bankQuestions = questionsByBank.get(bank.id) || [];

    for (const question of bankQuestions.slice(0, 5)) {
      await prisma.question.update({
        where: { id: question.id },
        data: {
          comprehensionText,
        },
      });
    }
  }

  /*
   * Create 20 tests: one test per question bank.
   */
  const tests = [];

  for (let i = 0; i < questionBanks.length; i++) {
    const bank = questionBanks[i];
    const questions = questionsByBank.get(bank.id) || [];

    let testType;
    let testState;
    let startTime;
    let endTime;

    if (i % 4 === 0) {
      testType = 'EXAM';
      testState = 'scheduled';

      startTime = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    } else if (i % 4 === 1) {
      testType = 'TEST';
      testState = 'active';

      startTime = new Date(Date.now() - 60 * 60 * 1000);
      endTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    } else if (i % 4 === 2) {
      testType = 'PRACTICE';
      testState = 'completed';

      startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    } else {
      testType = 'TEST';
      testState = 'active';

      startTime = new Date(Date.now() - 30 * 60 * 1000);
      endTime = new Date(Date.now() + 90 * 60 * 1000);
    }

    const test = await prisma.test.create({
      data: {
        title: `Demo ${bank.course.title} ${bank.bankIndex % 2 === 0 ? 'Assessment' : 'Revision Test'}`,
        type: testType,
        testState,
        showResult: testType !== 'EXAM',
        startTime,
        endTime,
        duration: 60,
        attemptsAllowed: testType === 'PRACTICE' ? 3 : 1,
        passMark: 30,
        courseId: bank.course.id,
        bankId: bank.id,
        createdBy: bank.course.teacher.id,
      },
    });

    tests.push({
      ...test,
      bank,
      questions,
    });
  }

  /*
   * Create sample completed/in-progress sessions.
   *
   * This makes the results/dashboard sections look populated.
   */
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];

    /*
     * Use the first class attached to this course.
     */
    const classId = test.bank.course.classIds[0];

    const classStudents = studentsByClass.get(classId) || [];

    if (!classStudents.length) {
      continue;
    }

    const student = classStudents[i % classStudents.length];

    /*
     * Completed sessions for every third test.
     */
    if (i % 3 === 2) {
      const questions = test.questions;

      let score = 0;

      const session = await prisma.testSession.create({
        data: {
          studentId: student.id,
          testId: test.id,
          attemptNo: 1,
          status: 'COMPLETED',
          startedAt: new Date(Date.now() - (i + 2) * 60 * 60 * 1000),
          endedAt: new Date(Date.now() - (i + 1) * 60 * 60 * 1000),
          score: 0,
        },
      });

      for (
        let questionIndex = 0;
        questionIndex < questions.length;
        questionIndex++
      ) {
        const question = questions[questionIndex];

        const shouldBeCorrect = questionIndex % 4 !== 0;

        const selectedOption = shouldBeCorrect
          ? question.answer
          : question.options[0] === question.answer
            ? question.options[1]
            : question.options[0];

        const isCorrect = selectedOption === question.answer;

        if (isCorrect) {
          score += question.marks;
        }

        await prisma.answer.create({
          data: {
            testSessionId: session.id,
            questionId: question.id,
            selectedOption: String(selectedOption),
            isCorrect,
          },
        });
      }

      await prisma.testSession.update({
        where: { id: session.id },
        data: {
          score: Math.round(score),
        },
      });
    }

    /*
     * A few active sessions.
     */
    if (i % 5 === 1) {
      await prisma.testSession.create({
        data: {
          studentId: student.id,
          testId: test.id,
          attemptNo: 1,
          status: 'IN_PROGRESS',
          startedAt: new Date(Date.now() - 15 * 60 * 1000),
          score: 0,
        },
      });
    }
  }

  /*
   * Demo notifications
   */
  await prisma.notification.create({
    data: {
      title: 'Welcome to the CBT Demo',
      message:
        'This is a demonstration environment. You can create teachers, students, classes, courses and tests.',
      type: 'GENERAL',
      createdById: demoAdmin.id,
    },
  });

  await prisma.notification.create({
    data: {
      title: 'Upcoming Examination',
      message:
        'Check the scheduled examination timetable before the test begins.',
      type: 'STUDENT',
      createdById: demoAdmin.id,
    },
  });

  await prisma.notification.create({
    data: {
      title: 'Teacher Reminder',
      message:
        'Remember to review your question banks before publishing an assessment.',
      type: 'TEACHER',
      createdById: demoAdmin.id,
    },
  });

  for (const classItem of classes) {
    await prisma.notification.create({
      data: {
        title: `${classItem.className} Notice`,
        message: `Important academic information for ${classItem.className}.`,
        type: 'CLASS',
        classId: classItem.id,
        createdById: demoAdmin.id,
      },
    });
  }

  for (const course of courses.slice(0, 5)) {
    await prisma.notification.create({
      data: {
        title: `${course.title} Update`,
        message: `There is a new update related to ${course.title}.`,
        type: 'COURSE',
        courseId: course.id,
        createdById: demoAdmin.id,
      },
    });
  }

  /*
   * Only create system settings if they don't already exist.
   *
   * This deliberately does NOT overwrite your real admin's settings
   * every time the demo seed runs.
   */
  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      appName: 'CBT Demo',
      institutionName: 'Florintech Computer College',
      shortName: 'FCC CBT',
      primaryColor: '#2563EB',
      supportEmail: 'support@example.com',
      systemStatus: 'ACTIVE',
    },
  });

  await curateDemoScenario(prisma);

  console.log('');
  console.log('✅ Demo dataset created successfully.');
  console.log('');
  console.log('Demo Admin');
  console.log(`Username: ${DEMO_ADMIN_USERNAME}`);
  console.log(`Password: ${DEMO_ADMIN_PASSWORD}`);
  console.log('');
  console.log('Demo Teachers:');
  console.log('demo_teacher_01 ... demo_teacher_10');
  console.log(`Password: ${DEMO_TEACHER_PASSWORD}`);
  console.log('');
  console.log('Demo Students:');
  console.log('demo_student_1_01 ... demo_student_5_15');
  console.log(`Password: ${DEMO_STUDENT_PASSWORD}`);
  console.log('');
  console.log('Dataset:');
  console.log('10 teachers');
  console.log('5 classes');
  console.log('75 students');
  console.log('10 courses');
  console.log('20 question banks');
  console.log('300 questions');
  console.log('20 tests');
  console.log('Sample test sessions and notifications');
}

/*
|--------------------------------------------------------------------------
| Main
|--------------------------------------------------------------------------
*/

async function connectWithRetry(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(
        `🔌 Connecting to database (attempt ${attempt}/${retries})...`,
      );

      await prisma.$connect();

      console.log('✅ Database connected.');

      return;
    } catch (error) {
      console.error(`❌ Database connection failed on attempt ${attempt}.`);

      if (attempt === retries) {
        throw error;
      }

      const delay = attempt * 5000;

      console.log(`⏳ Retrying in ${delay / 1000}s...`);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function main() {
  try {
    await connectWithRetry();
    
    await resetDemoData();
    await seedDemoData();

    console.log('');
    console.log('🌱 Demo seed completed.');
  } catch (error) {
    console.error('');
    console.error('❌ Demo seed failed:');
    console.error(error);

    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
