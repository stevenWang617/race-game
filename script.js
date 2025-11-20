const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const coinEl = document.getElementById('coins');
const speedEl = document.getElementById('speed');
const startBtn = document.getElementById('start');
const leaderboardEl = document.getElementById('leaderboard');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const LANE_COUNT = 5;
const laneWidth = WIDTH / LANE_COUNT;

let player;
let obstacles = [];
let coins = [];
let boosts = [];
let score = 0;
let coinCount = 0;
let speed = 4;
let baseSpeed = 4;
let gameOver = false;
let tick = 0;
let boostTimer = 0;
let animationId = null;

function resetGame() {
  player = {
    lane: 2,
    y: HEIGHT - 120,
    width: laneWidth * 0.6,
    height: 40,
    color: '#35e85d'
  };
  obstacles = [];
  coins = [];
  boosts = [];
  score = 0;
  coinCount = 0;
  speed = baseSpeed;
  boostTimer = 0;
  gameOver = false;
  tick = 0;
}

function drawRoad() {
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let i = 0; i < LANE_COUNT; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#131313' : '#161616';
    ctx.fillRect(i * laneWidth, 0, laneWidth, HEIGHT);
  }

  ctx.strokeStyle = '#333';
  ctx.lineWidth = 4;
  for (let i = 1; i < LANE_COUNT; i++) {
    const x = i * laneWidth;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawCar(p) {
  const x = p.lane * laneWidth + (laneWidth - p.width) / 2;
  const y = p.y;

  ctx.fillStyle = p.color;
  ctx.fillRect(x, y, p.width, p.height);
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(x + 4, y + 6, p.width - 8, 6);
  ctx.fillRect(x + 4, y + p.height - 12, p.width - 8, 6);
}

function drawSprite(entity) {
  const x = entity.lane * laneWidth + (laneWidth - entity.size) / 2;
  ctx.fillStyle = entity.color;
  ctx.fillRect(x, entity.y, entity.size, entity.size);
  if (entity.kind === 'coin') {
    ctx.strokeStyle = '#ffdf6e';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, entity.y + 4, entity.size - 8, entity.size - 8);
  }
  if (entity.kind === 'boost') {
    ctx.fillStyle = '#0c3b3b';
    ctx.fillRect(x + 4, entity.y + 4, entity.size - 8, entity.size - 8);
  }
}

function spawnEntities() {
  if (tick % 70 === 0) {
    obstacles.push({ lane: randLane(), y: -40, size: 40, color: '#e84545', kind: 'obstacle' });
  }
  if (tick % 120 === 0) {
    coins.push({ lane: randLane(), y: -32, size: 32, color: '#ffea73', kind: 'coin' });
  }
  if (tick % 300 === 0) {
    boosts.push({ lane: randLane(), y: -32, size: 32, color: '#25c2c2', kind: 'boost' });
  }
}

function updateEntities(list) {
  for (const e of list) {
    e.y += speed;
  }
  return list.filter((e) => e.y < HEIGHT + 40);
}

function detectCollisions() {
  const px = player.lane * laneWidth + (laneWidth - player.width) / 2;
  const py = player.y;
  const pw = player.width;
  const ph = player.height;

  const overlap = (entity) => {
    const ex = entity.lane * laneWidth + (laneWidth - entity.size) / 2;
    const ew = entity.size;
    const eh = entity.size;
    return (
      px < ex + ew &&
      px + pw > ex &&
      py < entity.y + eh &&
      py + ph > entity.y
    );
  };

  for (const o of obstacles) {
    if (overlap(o)) {
      gameOver = true;
      saveScore();
      return;
    }
  }

  coins = coins.filter((c) => {
    if (overlap(c)) {
      coinCount += 1;
      score += 100;
      return false;
    }
    return true;
  });

  boosts = boosts.filter((b) => {
    if (overlap(b)) {
      boostTimer = 240;
      speed = baseSpeed + 3;
      return false;
    }
    return true;
  });
}

function randLane() {
  return Math.floor(Math.random() * LANE_COUNT);
}

function update() {
  if (gameOver) {
    return;
  }
  tick += 1;
  score += Math.floor(speed);

  spawnEntities();
  obstacles = updateEntities(obstacles);
  coins = updateEntities(coins);
  boosts = updateEntities(boosts);
  detectCollisions();

  if (boostTimer > 0) {
    boostTimer -= 1;
    if (boostTimer === 0) {
      speed = baseSpeed;
    }
  }

  speed += 0.0008; // gentle ramp up

  render();
  animationId = requestAnimationFrame(update);
}

function render() {
  drawRoad();
  drawCar(player);
  obstacles.forEach(drawSprite);
  coins.forEach(drawSprite);
  boosts.forEach(drawSprite);

  scoreEl.textContent = score;
  coinEl.textContent = coinCount;
  speedEl.textContent = speed.toFixed(1);

  if (gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = '24px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', WIDTH / 2, HEIGHT / 2 - 20);
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillText('Press Start to retry', WIDTH / 2, HEIGHT / 2 + 16);
  }
}

function saveScore() {
  const scores = JSON.parse(localStorage.getItem('scores') || '[]');
  scores.push(score);
  scores.sort((a, b) => b - a);
  const top = scores.slice(0, 5);
  localStorage.setItem('scores', JSON.stringify(top));
  renderLeaderboard(top);
}

function renderLeaderboard(scores = null) {
  const data = scores || JSON.parse(localStorage.getItem('scores') || '[]');
  leaderboardEl.innerHTML = '';
  if (!data.length) {
    const li = document.createElement('li');
    li.textContent = 'No scores yet';
    leaderboardEl.appendChild(li);
    return;
  }

  data.forEach((val) => {
    const li = document.createElement('li');
    li.textContent = `${val} pts`;
    leaderboardEl.appendChild(li);
  });
}

function handleInput(event) {
  if (gameOver) return;
  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
    player.lane = Math.max(0, player.lane - 1);
  }
  if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
    player.lane = Math.min(LANE_COUNT - 1, player.lane + 1);
  }
}

function startGame() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  resetGame();
  renderLeaderboard();
  render();
  animationId = requestAnimationFrame(update);
}

startBtn.addEventListener('click', startGame);

document.addEventListener('keydown', handleInput);

// boot
renderLeaderboard();
resetGame();
render();
