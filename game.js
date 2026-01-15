const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// =====================================================
// GLOBALS / WORLD
// =====================================================
const gravity = 0.6;
const ringOutY = canvas.height + 140;

// Movement tuning
const ACCEL = 0.22;
const FRICTION = 0.72;
const AIR_CONTROL = 0.45;
const MAX_FALL = 18;
const SKIN = 0.01;

// Sprite tuning
const SPRITE_SIZE = 16;
const SPRITE_SCALE = 2;
const SPRITE_W = SPRITE_SIZE * SPRITE_SCALE;
const SPRITE_H = SPRITE_SIZE * SPRITE_SCALE;

// Game states
const STATE_MENU = "menu";
const STATE_GAME = "game";
const STATE_WIN = "win";
let state = STATE_MENU;

// =====================================================
// ROUND TIMER + WIN SYSTEM
// =====================================================
const FPS = 60;
let roundSeconds = 240; // default
let roundFramesLeft = roundSeconds * FPS;

let winText = "";
let winFramesLeft = 0;

function startRoundTimer() {
  // 3 to 5 minutes (180 to 300 seconds)
  roundSeconds = randInt(180, 300);
  roundFramesLeft = roundSeconds * FPS;
}

function timeLeftSeconds() {
  return Math.max(0, Math.ceil(roundFramesLeft / FPS));
}

function formatTimeMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function decideWinnerByScore() {
  if (p1.stocks > p2.stocks) return "P1 WINS!";
  if (p2.stocks > p1.stocks) return (menuMode === "bot" ? "BOT WINS!" : "P2 WINS!");

  if (p1.hp > p2.hp) return "P1 WINS!";
  if (p2.hp > p1.hp) return (menuMode === "bot" ? "BOT WINS!" : "P2 WINS!");

  return "DRAW!";
}

function endRound(text) {
  winText = text;
  winFramesLeft = 180; // 3 seconds
  state = STATE_WIN;
}

// =====================================================
// INPUT
// =====================================================
const keys = {};
const pressed = {};

canvas.setAttribute("tabindex", "0");
canvas.style.outline = "none";
canvas.addEventListener("mousedown", () => canvas.focus());

window.addEventListener("keydown", (e) => {
  let k = e.key;
  if (e.code === "Enter") k = "Enter";
  if (e.code === "Space") k = " ";
  k = (k || "").toLowerCase();
  if (!keys[k]) pressed[k] = true;
  keys[k] = true;
});

window.addEventListener("keyup", (e) => {
  let k = e.key;
  if (e.code === "Enter") k = "Enter";
  if (e.code === "Space") k = " ";
  k = (k || "").toLowerCase();
  keys[k] = false;
});

// =====================================================
// HELPERS
// =====================================================
function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function centerOf(p) {
  return { x: p.x + p.width / 2, y: p.y + p.height / 2 };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function randInt(min, maxInclusive) {
  return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
}

function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function chance(p) {
  return Math.random() < p;
}

// =====================================================
// PIXEL SPRITES
// =====================================================
const SPRITES = {
  bot: [
    "....BBBBBBBB....",
    "...BBGGGGGGBB...",
    "..BGGWWWWWWGGB..",
    "..BGW..WW..WGB..",
    "..BGW..WW..WGB..",
    "..BGGWWWWWWGGB..",
    "...BBGGGGGGBB...",
    "....BBMMMMBB....",
    "...BMMMMMMMMB...",
    "..BMMMMBBMMMMB..",
    "..BMMMBBBBMMMB..",
    "..BMMMMBBMMMMB..",
    "..BMMMMMMMMMMB..",
    "...BBMMMMMMBB...",
    "....BBBBBBBB....",
    "................"
  ],
  ninja: [
    ".....NNNNNN.....",
    "....NNKKKKNN....",
    "...NNKWWWWKNN...",
    "...NNKKKKKKNN...",
    "....NNKKKKNN....",
    ".....NNNNNN.....",
    "....NN..NN......",
    "...NN...NN......",
    "...NNKKKKNN.....",
    "...NNKKKKNN.....",
    "....NNKKNN......",
    ".....NNNN.......",
    "......NN........",
    ".....NNN........",
    "....NN..........",
    "................"
  ],
  mage: [
    "....MMMMMMMM....",
    "...MCCCCCCCCM...",
    "..MCCCCWWCCCCM..",
    "..MCCCWWWWCCCM..",
    "...MCCCCCCCCM...",
    "....MMMMMMMM....",
    "...MM..MM..MM...",
    "..MM...MM...MM..",
    "..MM..CCCC..MM..",
    "..MM..CCCC..MM..",
    "..MM..CCCC..MM..",
    "..MM..CCCC..MM..",
    "...MMCCCCCCMM...",
    "....MMMMMMMM....",
    ".......W........",
    "................"
  ],
  golem: [
    "....GGGGGGGG....",
    "...GSSSSSSSSG...",
    "..GSSWWSSWWSSG..",
    "..GSSSSSSSSSSG..",
    "...GSSSSSSSSG...",
    "..GGSSSSSSSSGG..",
    ".GSSSSGGGGSSSSG.",
    ".GSSSSGGGGSSSSG.",
    "..GGSSGGGGSSGG..",
    "...GSSGGGGSSG...",
    "...GSSG..GSSG...",
    "...GSSG..GSSG...",
    "..GGSSG..GSSGG..",
    ".GSSSS....SSSSG.",
    ".GGGG......GGGG.",
    "................"
  ],
  ranger: [
    "....RRRRRRRR....",
    "...RYYYYYYYYR...",
    "..RYWYYYYYYWYR..",
    "..RYYYYYYYYYYR..",
    "...RYYYYYYYYR...",
    "....RRRRRRRR....",
    "...RR..RR..RR...",
    "..RR...RR...RR..",
    "..RRYYYYYYYYRR..",
    "..RRYYRRRRYYRR..",
    "..RRYYR..RYYRR..",
    "...RYYR..RYYR...",
    "...RYYR..RYYR...",
    "...RRRY..YRRR...",
    "....RRR..RRR....",
    "................"
  ],
  kid: [
    "....KKKKKKKK....",
    "...KPPPPPPPPK...",
    "..KPWWPPPPWWPK..",
    "..KPPPPPPPPPPK..",
    "...KPPPPPPPPK...",
    "....KKKKKKKK....",
    "...KK..KK..KK...",
    "..KK...KK...KK..",
    "..KKPPPPPPPPKK..",
    "..KKPPKKKKPPKK..",
    "..KKPPK..KPPKK..",
    "...KPPK..KPPK...",
    "...KPPPPPPPPK...",
    "...KKK....KKK...",
    ".....W..W.......",
    "................"
  ]
};

function spriteColor(letter, tint) {
  switch (letter) {
    case ".": return null;
    case "B": return "#111";
    case "W": return "#fff";
    case "G": return "#3a3a3a";
    case "N": return "#111";
    case "R": return "#111";
    case "M":
    case "K":
    case "C":
    case "S":
    case "Y":
    case "P":
      return tint;
    default:
      return tint;
  }
}

function drawSprite(spriteRows, x, y, scale, tint, facing, bob = 0) {
  const px = scale, py = scale;

  ctx.save();
  if (facing === -1) {
    ctx.translate(x + SPRITE_W / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(x + SPRITE_W / 2), 0);
  }

  for (let row = 0; row < SPRITE_SIZE; row++) {
    const line = spriteRows[row] || "................";
    for (let col = 0; col < SPRITE_SIZE; col++) {
      const ch = line[col] || ".";
      const colr = spriteColor(ch, tint);
      if (!colr) continue;
      ctx.fillStyle = colr;
      ctx.fillRect(x + col * px, y + bob + row * py, px, py);
    }
  }
  ctx.restore();
}

function spriteForName(name) {
  if (name === "BoomBot") return SPRITES.bot;
  if (name === "DashNinja") return SPRITES.ninja;
  if (name === "SparkMage") return SPRITES.mage;
  if (name === "SlamGolem") return SPRITES.golem;
  if (name === "RocketRanger") return SPRITES.ranger;
  if (name === "BoomerKid") return SPRITES.kid;
  return SPRITES.bot;
}

// =====================================================
// FX / PROJECTILES
// =====================================================
const explosions = [];
const projectiles = [];

function spawnExplosion(x, y, r, color) {
  explosions.push({ x, y, r, life: 12, maxLife: 12, color });
}

function spawnProjectile({ x, y, vx, owner, color, damage, knock, type = "bolt" }) {
  projectiles.push({
    x, y, w: 12, h: 6,
    vx, vy: 0,
    life: 90,
    owner, color,
    damage, knock,
    type,
    turned: false,
    turnAt: 45
  });
}

function updateExplosions() {
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].life--;
    if (explosions[i].life <= 0) explosions.splice(i, 1);
  }
}

function updateProjectiles(p1, p2) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];

    if (p.type === "boomerang" && !p.turned && p.life <= p.turnAt) {
      p.vx *= -1;
      p.turned = true;
    }

    p.x += p.vx;
    p.y += p.vy;
    p.life--;

    const target = p.owner === p1 ? p2 : p1;
    if (aabb(p.x, p.y, p.w, p.h, target.x, target.y, target.width, target.height)) {
      target.hp = Math.max(0, target.hp - p.damage);
      target.vx += Math.sign(p.vx || 1) * p.knock;
      target.vy -= 2;
      projectiles.splice(i, 1);
      continue;
    }

    if (p.life <= 0 || p.x < -120 || p.x > canvas.width + 120) {
      projectiles.splice(i, 1);
    }
  }
}

// =====================================================
// ROSTER
// =====================================================
const CHARACTERS = [
  {
    name: "BoomBot",
    color: "#4af",
    maxHp: 110,
    speed: 3.7,
    jumpPower: 11.5,
    cooldown: 35,
    special(attacker, defender) {
      const aC = centerOf(attacker);
      const exX = aC.x + attacker.facing * 10;
      const exY = aC.y;
      const r = 48;

      spawnExplosion(exX, exY, r, attacker.color);

      const dC = centerOf(defender);
      const dx = dC.x - exX;
      const dy = dC.y - exY;
      if (Math.hypot(dx, dy) > r) return;

      defender.hp = Math.max(0, defender.hp - 14);
      const baseKB = 7;
      const bonusKB = (1 - defender.hp / defender.maxHp) * 7;
      const kb = baseKB + bonusKB;
      const dirX = dx === 0 ? attacker.facing : dx / Math.abs(dx);
      defender.vx += dirX * kb;
      defender.vy -= 5;
    }
  },
  {
    name: "DashNinja",
    color: "#fa4",
    maxHp: 95,
    speed: 4.6,
    jumpPower: 12.5,
    cooldown: 28,
    special(attacker, defender) {
      attacker.x += attacker.facing * 18;

      const hitW = 26, hitH = 20;
      const hitX = attacker.facing === 1 ? attacker.x + attacker.width : attacker.x - hitW;
      const hitY = attacker.y + 6;

      if (!aabb(hitX, hitY, hitW, hitH, defender.x, defender.y, defender.width, defender.height)) return;

      defender.hp = Math.max(0, defender.hp - 11);
      const baseKB = 6;
      const bonusKB = (1 - defender.hp / defender.maxHp) * 6;
      const kb = baseKB + bonusKB;
      defender.vx += attacker.facing * kb;
      defender.vy -= 3;
    }
  },
  {
    name: "SparkMage",
    color: "#7f7",
    maxHp: 100,
    speed: 4.0,
    jumpPower: 12.0,
    cooldown: 22,
    special(attacker) {
      const c = centerOf(attacker);
      spawnProjectile({
        x: c.x + attacker.facing * 20,
        y: c.y,
        vx: attacker.facing * 8,
        owner: attacker,
        color: attacker.color,
        damage: 8,
        knock: 6,
        type: "bolt"
      });
    }
  },
  {
    name: "SlamGolem",
    color: "#bbb",
    maxHp: 130,
    speed: 3.2,
    jumpPower: 10.8,
    cooldown: 38,
    special(attacker, defender) {
      const slamW = 120, slamH = 18;
      const slamX = attacker.x + attacker.width / 2 - slamW / 2;
      const slamY = attacker.y + attacker.height - 6;

      spawnExplosion(attacker.x + attacker.width / 2, attacker.y + attacker.height, 36, attacker.color);

      if (!aabb(slamX, slamY, slamW, slamH, defender.x, defender.y, defender.width, defender.height)) return;

      defender.hp = Math.max(0, defender.hp - 16);
      const dir = (defender.x + defender.width / 2) < (attacker.x + attacker.width / 2) ? -1 : 1;
      defender.vx += dir * 6;
      defender.vy -= 8;
    }
  },
  {
    name: "RocketRanger",
    color: "#f77",
    maxHp: 105,
    speed: 4.1,
    jumpPower: 12.2,
    cooldown: 34,
    special(attacker, defender) {
      const exX = attacker.x + attacker.width / 2;
      const exY = attacker.y + attacker.height;
      const r = 42;

      spawnExplosion(exX, exY, r, attacker.color);
      attacker.vy = -13;

      const dC = centerOf(defender);
      const dx = dC.x - exX;
      const dy = dC.y - exY;
      if (Math.hypot(dx, dy) > r) return;

      defender.hp = Math.max(0, defender.hp - 10);
      const dirX = dx === 0 ? attacker.facing : dx / Math.abs(dx);
      defender.vx += dirX * 7;
      defender.vy -= 4;
    }
  },
  {
    name: "BoomerKid",
    color: "#9af",
    maxHp: 98,
    speed: 4.4,
    jumpPower: 12.0,
    cooldown: 26,
    special(attacker) {
      const c = centerOf(attacker);
      spawnProjectile({
        x: c.x + attacker.facing * 18,
        y: c.y,
        vx: attacker.facing * 7,
        owner: attacker,
        color: attacker.color,
        damage: 9,
        knock: 5,
        type: "boomerang"
      });
    }
  }
];

// =====================================================
// MAPS
// =====================================================
function withWorldBounds(solids) {
  const wallW = 24;
  return [
    ...solids,
    { x: -wallW, y: -200, w: wallW, h: canvas.height + 500, oneWay: false, color: "#00000000" },
    { x: canvas.width, y: -200, w: wallW, h: canvas.height + 500, oneWay: false, color: "#00000000" }
  ];
}

const MAPS = [
  {
    name: "Neon Trio",
    bgTop: "#0a0f2a",
    bgBottom: "#2a0a3a",
    solids: withWorldBounds([
      { x: 120, y: 360, w: 560, h: 20, oneWay: false, color: "#5ef" },
      { x: 200, y: 270, w: 140, h: 16, oneWay: true, color: "#f5f" },
      { x: 460, y: 270, w: 140, h: 16, oneWay: true, color: "#ff5" }
    ])
  },
  {
    name: "Candy Floor",
    bgTop: "#1a093a",
    bgBottom: "#ff4fb3",
    solids: withWorldBounds([
      { x: 60, y: 370, w: 680, h: 20, oneWay: false, color: "#ffffff" },
      { x: 120, y: 285, w: 160, h: 16, oneWay: true, color: "#7ff" },
      { x: 520, y: 285, w: 160, h: 16, oneWay: true, color: "#ffd27f" }
    ])
  },
  {
    name: "Sky Temple",
    bgTop: "#0b2b66",
    bgBottom: "#72d3ff",
    solids: withWorldBounds([
      { x: 140, y: 365, w: 520, h: 20, oneWay: false, color: "#ffe8a0" },
      { x: 330, y: 250, w: 140, h: 16, oneWay: true, color: "#ffffff" },
      { x: 170, y: 290, w: 120, h: 16, oneWay: true, color: "#d0ffb0" },
      { x: 510, y: 290, w: 120, h: 16, oneWay: true, color: "#ffd0f0" }
    ])
  },
  {
    name: "Box Arena",
    bgTop: "#0f1b2a",
    bgBottom: "#2aa7ff",
    solids: withWorldBounds([
      { x: 120, y: 370, w: 560, h: 20, oneWay: false, color: "#ffffff" },
      { x: 110, y: 250, w: 20, h: 140, oneWay: false, color: "#ffd27f" },
      { x: 670, y: 250, w: 20, h: 140, oneWay: false, color: "#ffd27f" },
      { x: 260, y: 240, w: 320, h: 16, oneWay: true, color: "#7fffd1" }
    ])
  }
];

let currentMap = MAPS[0];
let solids = currentMap.solids;

// =====================================================
// PLAYERS
// =====================================================
function makePlayer({ x, controls, side }) {
  return {
    x, y: 0,
    width: SPRITE_W,
    height: SPRITE_H,
    vx: 0, vy: 0,
    onGround: false,
    facing: side === "left" ? 1 : -1,
    controls, side,
    desiredMove: 0,

    stocks: 3,

    charIndex: 0,
    charName: "BoomBot",
    color: "#4af",
    maxHp: 100,
    hp: 100,
    speed: 4,
    jumpPower: 12,
    specialCooldown: 0,
    specialCooldownFrames: 30,

    animT: 0,

    ai: { mode: "approach", timer: 0, strafeDir: 1, jumpCD: 0, specialCD: 0, aggression: 0.6 }
  };
}

const p1 = makePlayer({ x: 180, side: "left", controls: { left: "a", right: "d", jump: "w", special: "s" } });
const p2 = makePlayer({ x: 600, side: "right", controls: { left: "arrowleft", right: "arrowright", jump: "arrowup", special: "arrowdown" } });

function setCharacter(p, idx) {
  const c = CHARACTERS[idx];
  p.charIndex = idx;
  p.charName = c.name;
  p.color = c.color;
  p.maxHp = c.maxHp;
  p.hp = c.maxHp;
  p.speed = c.speed;
  p.jumpPower = c.jumpPower;
  p.specialCooldownFrames = c.cooldown;
}

function respawnWithReset(p, side) {
  p.x = side === "left" ? 180 : 600;
  p.y = 0;
  p.vx = 0;
  p.vy = 0;
  p.onGround = false;
  p.desiredMove = 0;
  p.hp = p.maxHp;
  p.animT = 0;
  if (p.ai) {
    p.ai.mode = "approach";
    p.ai.timer = 0;
    p.ai.strafeDir = 1;
    p.ai.jumpCD = 0;
    p.ai.specialCD = 0;
    p.ai.aggression = 0.6;
  }
}

// =====================================================
// COLLISION
// =====================================================
function resolveX(player) {
  for (const s of solids) {
    if (s.oneWay) continue; // oneWay shouldn't block from the side
    if (!aabb(player.x, player.y, player.width, player.height, s.x, s.y, s.w, s.h)) continue;

    if (player.vx > 0) { player.x = s.x - player.width - SKIN; player.vx = 0; }
    else if (player.vx < 0) { player.x = s.x + s.w + SKIN; player.vx = 0; }
  }
}

function resolveY(player, prevY) {
  for (const s of solids) {
    if (!aabb(player.x, player.y, player.width, player.height, s.x, s.y, s.w, s.h)) continue;

    const prevBottom = prevY + player.height;

    if (player.vy > 0) {
      if (s.oneWay) {
        if (prevBottom <= s.y + 1) {
          player.y = s.y - player.height - SKIN;
          player.vy = 0;
          player.onGround = true;
        }
      } else {
        player.y = s.y - player.height - SKIN;
        player.vy = 0;
        player.onGround = true;
      }
    } else if (player.vy < 0) {
      if (!s.oneWay) {
        player.y = s.y + s.h + SKIN;
        player.vy = 0;
      }
    }
  }
}

// =====================================================
// COMBAT
// =====================================================
function trySpecial(attacker, defender) {
  if (attacker.specialCooldown > 0) return;
  attacker.specialCooldown = attacker.specialCooldownFrames;
  CHARACTERS[attacker.charIndex].special(attacker, defender);
}

// =====================================================
// BOT AI
// =====================================================
function botThink(bot, target) {
  const ai = bot.ai;
  if (ai.timer > 0) ai.timer--;
  if (ai.jumpCD > 0) ai.jumpCD--;
  if (ai.specialCD > 0) ai.specialCD--;

  ai.aggression += (Math.random() - 0.5) * 0.02;
  ai.aggression = clamp(ai.aggression, 0.2, 0.9);

  const bx = bot.x + bot.width / 2;
  const tx = target.x + target.width / 2;
  const dx = tx - bx;
  const adx = Math.abs(dx);

  bot.facing = dx >= 0 ? 1 : -1;

  if (ai.timer === 0) {
    const roll = Math.random();
    ai.mode = (roll < ai.aggression) ? "approach" : "idle";
    if (roll > 0.75) ai.mode = "strafe";
    ai.timer = randInt(18, 55);
    ai.strafeDir = chance(0.5) ? -1 : 1;
  }

  let moveDir = 0;
  if (ai.mode === "approach") moveDir = (adx > 20) ? (dx > 0 ? 1 : -1) : 0;
  else if (ai.mode === "strafe") moveDir = ai.strafeDir;
  else moveDir = 0;

  bot.desiredMove = moveDir;

  if (bot.onGround && ai.jumpCD === 0 && adx < 90 && chance(0.04 + 0.08 * ai.aggression)) {
    bot.vy = -bot.jumpPower;
    ai.jumpCD = randInt(25, 55);
  }

  if (bot.specialCooldown <= 0 && ai.specialCD === 0 && adx < 120 && chance(0.08 + 0.18 * ai.aggression)) {
    trySpecial(bot, target);
    ai.specialCD = randInt(12, 30);
  }
}

// =====================================================
// UPDATE PLAYER
// =====================================================
function updatePlayer(p, useHumanInput = true, enemy = null, isBot = false) {
  const c = p.controls;
  const wasOnGround = p.onGround;

  p.desiredMove = 0;
  p.onGround = false;

  if (p.specialCooldown > 0) p.specialCooldown--;

  if (useHumanInput) {
    if (keys[c.left]) { p.desiredMove = -1; p.facing = -1; }
    if (keys[c.right]) { p.desiredMove = 1; p.facing = 1; }
    if (keys[c.jump] && wasOnGround) p.vy = -p.jumpPower;
    if (keys[c.special] && enemy) trySpecial(p, enemy);
  }

  if (isBot && enemy) {
    p.onGround = wasOnGround;
    botThink(p, enemy);
    p.onGround = false;
  }

  const control = wasOnGround ? 1 : AIR_CONTROL;
  const targetVx = p.desiredMove * p.speed;
  p.vx += (targetVx - p.vx) * (ACCEL * control);

  if (p.desiredMove === 0) {
    p.vx *= wasOnGround ? FRICTION : 0.92;
    if (Math.abs(p.vx) < 0.02) p.vx = 0;
  }

  if (Math.abs(p.vx) > 0.2 && wasOnGround) p.animT += 1;
  else p.animT += 0.4;

  const prevY = p.y;

  p.vy += gravity;
  p.vy = Math.min(p.vy, MAX_FALL);

  p.x += p.vx;
  resolveX(p);

  p.y += p.vy;
  resolveY(p, prevY);

  p.x = clamp(p.x, -50, canvas.width + 50);

  if (p.y > ringOutY || p.hp <= 0) {
    p.stocks = Math.max(0, p.stocks - 1);
    respawnWithReset(p, p.side === "left" ? "left" : "right");
  }
}

// =====================================================
// PLAYER vs PLAYER collision
// =====================================================
function resolvePlayerCollision(a, b) {
  if (!aabb(a.x, a.y, a.width, a.height, b.x, b.y, b.width, b.height)) return;

  const overlapX = Math.min(a.x + a.width - b.x, b.x + b.width - a.x);
  const overlapY = Math.min(a.y + a.height - b.y, b.y + b.height - a.y);

  if (overlapY < overlapX) {
    const aAboveB = (a.y + a.height) <= (b.y + b.height / 2);
    if (aAboveB && a.vy >= 0) {
      a.y -= overlapY;
      a.vy = 0;
      a.onGround = true;
    } else {
      a.y += overlapY;
      if (a.vy < 0) a.vy = 0;
    }
  } else {
    if (a.x < b.x) { a.x -= overlapX / 2; b.x += overlapX / 2; }
    else { a.x += overlapX / 2; b.x -= overlapX / 2; }
    a.vx *= 0.5;
    b.vx *= 0.5;
  }
}

// =====================================================
// DRAW
// =====================================================
function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, currentMap.bgTop || "#101020");
  g.addColorStop(1, currentMap.bgBottom || "#202040");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 55; i++) {
    const x = (i * 73) % canvas.width;
    const y = (i * 41) % canvas.height;
    ctx.fillStyle = i % 3 === 0 ? "#fff" : (i % 3 === 1 ? "#fffd7a" : "#7affff");
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawHpBar(p, x, y) {
  const w = 190, h = 14;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = p.color;
  ctx.fillRect(x, y, w * (p.hp / p.maxHp), h);
}

function drawFighter(p) {
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = p.color;
  ctx.fillRect(p.x - 2, p.y - 2, p.width + 4, p.height + 4);
  ctx.restore();

  const sprite = spriteForName(p.charName);
  const bob = p.onGround ? Math.sin(p.animT * 0.25) * 1.2 : 0;
  drawSprite(sprite, p.x, p.y, SPRITE_SCALE, p.color, p.facing, bob);
}

function drawHUD() {
  // Left HUD
  ctx.fillStyle = "#fff";
  ctx.font = "14px monospace";
  ctx.fillText(`Map: ${currentMap.name}`, 10, 20);
  ctx.fillText(`P1: ${p1.charName}  stocks: ${p1.stocks}`, 10, 40);
  ctx.fillText(`P2: ${p2.charName}  stocks: ${p2.stocks}  (${menuMode === "bot" ? "BOT" : "P2"})`, 10, 60);

  drawHpBar(p1, 10, 75);
  drawHpBar(p2, 10, 95);

  // BIG CENTER TIMER (top middle)
  const t = formatTimeMMSS(timeLeftSeconds());
  ctx.save();
  ctx.font = "52px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillText(t, canvas.width / 2 + 3, 8 + 3);
  ctx.fillStyle = "#fff";
  ctx.fillText(t, canvas.width / 2, 8);

  ctx.restore();

  ctx.fillText(`ENTER/SPACE start | ESC menu`, 10, 145);
}

function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  for (const s of solids) {
    if (!s.color || s.color === "#00000000") continue;
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x, s.y, s.w, s.h);
  }

  for (const ex of explosions) {
    const t = ex.life / ex.maxLife;
    ctx.save();
    ctx.globalAlpha = 0.22 + 0.45 * t;
    ctx.fillStyle = ex.color;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.r * (1.15 - 0.15 * t), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const pr of projectiles) {
    ctx.fillStyle = pr.color;
    ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
  }

  drawFighter(p1);
  drawFighter(p2);
  drawHUD();
}

function drawMenu() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  currentMap = choice(MAPS);
  solids = currentMap.solids;
  drawBackground();

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);

  ctx.fillStyle = "#fff";
  ctx.font = "26px monospace";
  ctx.fillText("PIXEL BRAWL - CHARACTER SELECT", 70, 80);

  ctx.font = "14px monospace";
  ctx.fillText("Click the game once to focus keyboard.", 70, 120);
  ctx.fillText("P1: A/D to pick character", 70, 145);
  ctx.fillText("Mode: W/S to toggle P2 or BOT", 70, 170);
  ctx.fillText("P2/BOT: Left/Right Arrow to pick character", 70, 195);
  ctx.fillText("Press ENTER or SPACE to PLAY (random map)", 70, 225);

  const p1Char = CHARACTERS[menuP1Index];
  const p2Char = CHARACTERS[menuP2Index];

  ctx.font = "18px monospace";
  ctx.fillStyle = p1Char.color;
  ctx.fillText(`P1: ${p1Char.name}`, 70, 280);

  ctx.fillStyle = "#fff";
  ctx.fillText(`Mode: ${menuMode === "bot" ? "BOT" : "P2"}`, 70, 310);

  ctx.fillStyle = p2Char.color;
  ctx.fillText(`${menuMode === "bot" ? "BOT" : "P2"}: ${p2Char.name}`, 70, 340);

  ctx.fillStyle = "#fff";
  ctx.font = "12px monospace";
  ctx.fillText("Preview:", 70, 380);

  drawSprite(spriteForName(p1Char.name), 70, 400, SPRITE_SCALE, p1Char.color, 1, 0);
  drawSprite(spriteForName(p2Char.name), 140, 400, SPRITE_SCALE, p2Char.color, -1, 0);
}

function drawWinScreen() {
  drawGame();
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "40px monospace";
  ctx.fillText(winText, 240, 250);
  ctx.font = "16px monospace";
  ctx.fillText("Returning to menu...", 300, 290);
  ctx.restore();
}

// =====================================================
// MENU / START
// =====================================================
let menuP1Index = 0;
let menuP2Index = 1;
let menuMode = "bot";

function startGame() {
  currentMap = choice(MAPS);
  solids = currentMap.solids;

  explosions.length = 0;
  projectiles.length = 0;

  setCharacter(p1, menuP1Index);
  setCharacter(p2, menuP2Index);

  p1.stocks = 3;
  p2.stocks = 3;
  p1.specialCooldown = 0;
  p2.specialCooldown = 0;

  respawnWithReset(p1, "left");
  respawnWithReset(p2, "right");

  startRoundTimer();
  state = STATE_GAME;
}

function updateMenu() {
  if (pressed["a"]) menuP1Index = (menuP1Index - 1 + CHARACTERS.length) % CHARACTERS.length;
  if (pressed["d"]) menuP1Index = (menuP1Index + 1) % CHARACTERS.length;

  if (pressed["w"] || pressed["s"]) menuMode = menuMode === "p2" ? "bot" : "p2";

  if (pressed["arrowleft"]) menuP2Index = (menuP2Index - 1 + CHARACTERS.length) % CHARACTERS.length;
  if (pressed["arrowright"]) menuP2Index = (menuP2Index + 1) % CHARACTERS.length;

  if (pressed["enter"] || pressed[" "]) startGame();
}

function updateGame() {
  if (pressed["escape"]) { state = STATE_MENU; return; }

  roundFramesLeft--;
  if (roundFramesLeft <= 0) {
    endRound(decideWinnerByScore());
    return;
  }

  updatePlayer(p1, true, p2, false);
  if (menuMode === "bot") updatePlayer(p2, false, p1, true);
  else updatePlayer(p2, true, p1, false);

  resolvePlayerCollision(p1, p2);
  resolvePlayerCollision(p2, p1);

  updateExplosions();
  updateProjectiles(p1, p2);

  if (p1.stocks <= 0) endRound(menuMode === "bot" ? "BOT WINS!" : "P2 WINS!");
  else if (p2.stocks <= 0) endRound("P1 WINS!");
}

function updateWin() {
  winFramesLeft--;
  if (winFramesLeft <= 0) state = STATE_MENU;
}

// =====================================================
// MAIN LOOP
// =====================================================
function loop() {
  if (state === STATE_MENU) {
    updateMenu();
    drawMenu();
  } else if (state === STATE_GAME) {
    updateGame();
    drawGame();
  } else {
    updateWin();
    drawWinScreen();
  }

  for (const k in pressed) delete pressed[k];
  requestAnimationFrame(loop);
}

loop();
