// app.js

// NOTE: docs here: https://lodev.org/cgtutor/raycasting.html
// Coding Train Video: https://www.youtube.com/watch?v=vYgIKn7iDH8

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const KEYS = new Set([]);
const KEY_LEFT = 37;
const KEY_UP = 38;
const KEY_RIGHT = 39;
const KEY_DOWN = 40;
const KEY_W = 87;
const KEY_A = 65;
const KEY_S = 83;
const KEY_D = 68;

const MAX_RADIANS = Math.PI * 2;
const BLOCK_SIZE = 50; // pixels
const HALF_BLOCK_SIZE = BLOCK_SIZE / 2;
const PLAYER_POSITION_RADIUS = 10;
const PLAYER_VIEWING_RANGE = (Math.PI / 2); // 90 degrees in radians
const PLAYER_ROTATE_VELOCITY = (Math.PI / 30); // in radians
const PLAYER_VELOCITY = 3;
const PLAYER = {
  x: BLOCK_SIZE + HALF_BLOCK_SIZE,
  y: BLOCK_SIZE + HALF_BLOCK_SIZE,
  facing: Math.PI / 2 // angle in radians
} // start player at the center of 1, 1
const MAZE_CELL_EMPTY = ' ';
const MAZE_CELL_FULL = 'X';
const MAZE = [
  'XXXXXXXXXX',
  'X X   XXXX',
  'X X X XXXX',
  'X X X   XX',
  'X   XXX XX',
  'XXXXXXX XX',
  'X    X   X',
  'XX X X X X',
  'X  X   X X',
  'XXXXXXXXXX'
];
const BOXES = MAZE
  .map((line, yIndex) =>
    [...line].reduce((boxes, cell, xIndex) =>
      (cell === MAZE_CELL_EMPTY) ? boxes :
      [...boxes, {
        x: xIndex * BLOCK_SIZE + HALF_BLOCK_SIZE,
        y: yIndex * BLOCK_SIZE + HALF_BLOCK_SIZE
      }]
    , [])
  )
  .reduce((a, b) => [...a, ...b]) // flatten
const NUM_RAYS = 1000;
let RAY_DISTANCES = {
  // key-value pair where key = angle in radians, value being object with x, y and length
};

// calculate the length of a line segment (pythagorean theorem)
const length = (xLength, yLength) => Math.sqrt(xLength * xLength + yLength * yLength);

// returns negative numbers when inside the box
const signedDistanceToBox = (pt, center, halfSize) => {
  const offset = {
    x: Math.abs(pt.x - center.x) - halfSize,
    y: Math.abs(pt.y - center.y) - halfSize
  }
  const unsignedDst = length(Math.max(offset.x, 0), Math.max(offset.y, 0));
  const dstInsideBox = Math.min(Math.max(offset.x, offset.y), 0);
  return unsignedDst + dstInsideBox;
}

const MAX_DISTANCE = BLOCK_SIZE * 10;
const signedDistanceToScene = pt => {
  let distanceToScene = MAX_DISTANCE;
  for (box of BOXES) {
    const distanceToBox = signedDistanceToBox(pt, box, HALF_BLOCK_SIZE);
    distanceToScene = Math.min(distanceToBox, distanceToScene);
  }
  return distanceToScene;
};





const update = (tick, prevTick) => {
  if ((KEYS.has(KEY_UP) || KEYS.has(KEY_DOWN)) || (KEYS.has(KEY_W) || KEYS.has(KEY_S))) {
    const prevPlayerPos = { x: PLAYER.x, y: PLAYER.y };
    const direction = (KEYS.has(KEY_UP) || KEYS.has(KEY_W)) ? 1 : -1;
    const xDiff = direction * Math.floor(Math.cos(PLAYER.facing) * PLAYER_VELOCITY);
    const yDiff = direction * Math.floor(Math.sin(PLAYER.facing) * PLAYER_VELOCITY);
    const wallDistance =signedDistanceToScene({ x: (PLAYER.x + xDiff), y: (PLAYER.y + yDiff) });
    if (wallDistance > 1) {
      PLAYER.x += xDiff;
      PLAYER.y += yDiff;
    }
  }
  if (KEYS.has(KEY_LEFT) || KEYS.has(KEY_A)) {
    // rotate counter clockwise
    PLAYER.facing -= PLAYER_ROTATE_VELOCITY
  }
  if (KEYS.has(KEY_RIGHT) || KEYS.has(KEY_D)) {
    // rotate clockwise
    PLAYER.facing += PLAYER_ROTATE_VELOCITY
  }

  // use ray casting/marching to determine distance to walls
  RAY_DISTANCES = {}
  const startAngle = PLAYER.facing - (PLAYER_VIEWING_RANGE / 2);
  const angleIncrement = PLAYER_VIEWING_RANGE / NUM_RAYS;
  for (let ray = 0, angle = startAngle; ray < NUM_RAYS; ray++, angle += angleIncrement) {
    let nextX = PLAYER.x;
    let nextY = PLAYER.y;
    let dist;
    let totalDistance = 0;
    do {
      dist = signedDistanceToScene({ x: nextX, y: nextY });
      totalDistance += dist;
      if (dist > 0) {
        nextX += Math.cos(angle) * dist;
        nextY += Math.sin(angle) * dist;
      }
    } while (dist > 1)
    RAY_DISTANCES[angle] = { length: totalDistance, x: nextX, y: nextY };
  }
};

const drawMaze = () => {
  ctx.fillStyle = '#888';
  for (let y = 0; y < MAZE.length; y++) {
    for (let x = 0; x < MAZE[0].length; x++) {
      const block = MAZE[y][x];
      if (block === ' ') {
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
  }
};

const drawCastedRays = () => {
  ctx.strokeStyle = 'pink';
  ctx.lineWidth = 1;

  ctx.beginPath();
  Object.values(RAY_DISTANCES).forEach(({ x, y }) => {
    ctx.moveTo(PLAYER.x, PLAYER.y);
    ctx.lineTo(x, y);
  });
  ctx.stroke();
};

const drawPlayerPosition = () => {
  ctx.fillStyle = '#55f';
  ctx.beginPath();
  ctx.arc(PLAYER.x, PLAYER.y, PLAYER_POSITION_RADIUS, 0, MAX_RADIANS);
  ctx.fill();
};

const draw3DView = (xOffset, yOffset, width, height) => {
  const angles = Object.keys(RAY_DISTANCES);
  const barWidth = width / angles.length;
  const lengths = Object.values(RAY_DISTANCES).map(({length}) => length);
  const maxLength = Math.max(...lengths);
  const shadePerAngle = (255 / 400);
  angles.forEach((angle, index) => {
    // value can be between 0 and maxLength
    // need a value between 0 and 255
    const color = 255 - Math.floor(shadePerAngle * RAY_DISTANCES[angle].length);

    // normalize value to rgb range
    ctx.fillStyle = `rgb(${color}, ${color}, ${color})`;
    // height of the bar is proportionate to distance
    // distance of 10 or less should be full height
    const relativeHeadingAngle = (PLAYER.facing - angle);
    const distance = RAY_DISTANCES[angle].length * Math.cos(relativeHeadingAngle);
    let barHeight = .5*height - distance;
    const startY = yOffset + ((height - barHeight) / 2);
    ctx.fillRect(xOffset + index * barWidth, startY, barWidth, barHeight);
  });
};

const draw = (tick, prevTick) => {
  const frameTime = tick - prevTick;
  const fps = ~~(1000 / frameTime);

  // clear background
  ctx.fillStyle = '#666';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#fff'
  ctx.strokeRect(0, 0, 10 * BLOCK_SIZE, 10 * BLOCK_SIZE)

  drawMaze();
  drawCastedRays();
  drawPlayerPosition();
  draw3DView(BLOCK_SIZE * 11, 0, BLOCK_SIZE * 10, BLOCK_SIZE * 10);

  ctx.font = '20px Arial';
  ctx.textBaseline = 'top'
  ctx.fillStyle = 'white';
  ctx.fillText(`FPS: ${fps}`, 20, 20)
};

let prevTick = 0;
const loop = (tick) => {
  update(tick, prevTick);
  draw(tick, prevTick);
  prevTick = tick;
  requestAnimationFrame(loop);
};

const resize = (e) => {
  canvas.width = document.body.clientWidth;
  canvas.height = document.body.clientHeight;
};

const keydown = (e) => { KEYS.add(e.which); };
const keyup = (e) => { KEYS.delete(e.which); }

const init = () => {
  console.log('Maze Runner');
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  resize();
  requestAnimationFrame(loop);
};
init();