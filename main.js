import { readFile, writeFile } from 'node:fs/promises';

const OUTPUT_FILE_NAME = 'result.life';
const LIFE_HEADER = '#Life 1.06';
const N = 10;

function getInputFilePath(args) {
  if (args.length !== 1) {
    throw new Error('Usage: `node main.js input.life`');
  }

  return args[0];
}

function encodeCoordinate(x, y) {
  return `${x},${y}`;
}

function decodeCoordinate(encodedCoordinate) {
  const [x, y] = encodedCoordinate.split(',');
  return { x: BigInt(x), y: BigInt(y) };
}

// The board is effectively unbounded, so we only store the cells that are alive.
function parseLiveCells(input) {
  const liveCells = new Set();
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines.slice(1)) {
    const [x, y] = line.split(/\s+/);
    liveCells.add(encodeCoordinate(BigInt(x), BigInt(y)));
  }

  return liveCells;
}

function serializeLiveCells(liveCells) {
  const coordinateLines = [...liveCells]
    .map(decodeCoordinate)
    .map(({ x, y }) => `${x} ${y}`);

  return [LIFE_HEADER, ...coordinateLines].join('\n');
}

/**
 * 8 neighboring cells
 * @type {BigInt[][]}
 * */
const NEIGHBOR_OFFSETS = [
  [-1n, -1n],
  [0n, -1n],
  [1n, -1n],
  [-1n, 0n],
  [1n, 0n],
  [-1n, 1n],
  [0n, 1n],
  [1n, 1n],
];

/**
 * Run a single generation.
 * @param {Set<string>} liveCells
 *
 * @returns {Set<string>}
 */
function runGeneration(liveCells) {
  /** @type {Map<string, number>} */
  const neighborCounts = new Map();

  for (const encodedCell of liveCells) {
    const { x, y } = decodeCoordinate(encodedCell);

    for (const [dx, dy] of NEIGHBOR_OFFSETS) {
      const neighborKey = encodeCoordinate(x + dx, y + dy);

      const currentCount = neighborCounts.get(neighborKey) ?? 0;

      neighborCounts.set(neighborKey, currentCount + 1);
    }
  }

  /** @type {Set<string>} */
  const nextLiveCells = new Set();

  for (const [cellKey, neighbors] of neighborCounts) {
    let alive = liveCells.has(cellKey);

    // If an "alive" cell had less than 2 or more than 3 alive neighbors (in any of the 8 surrounding cells), it becomes dead.
    if (alive && (neighbors === 2 || neighbors === 3)) {
      nextLiveCells.add(cellKey);
    }

    // If a "dead" cell had *exactly* 3 alive neighbors, it becomes alive.
    if (!alive && neighbors === 3) {
      nextLiveCells.add(cellKey);
    }
  }

  return nextLiveCells;
}

/**
 * Runs the CLI entrypoint.
 *
 * Usage:
 * `node main.js input.life`
 *
 * Reads the Life 1.06 input file and writes the result to `result.life`.
 *
 * @returns {Promise<void>}
 */
async function run() {
  const inputFilePath = getInputFilePath(process.argv.slice(2));
  const input = await readFile(inputFilePath, 'utf8');

  /** @type {Set<string>} */
  let liveCells = parseLiveCells(input);

  for (let i = 0; i < N; i++) {
    liveCells = runGeneration(liveCells);
  }

  const output = serializeLiveCells(liveCells);

  await writeFile(OUTPUT_FILE_NAME, `${output}\n`, 'utf8');
  console.log(`✅ success! result is in ${OUTPUT_FILE_NAME}`);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ error encountered: ${message}`);
  process.exitCode = 1;
});
