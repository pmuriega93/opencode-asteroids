'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3, esFugaz = false) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    // Estrella fugaz: más rápida y desaparece con el tiempo
    this.esFugaz = esFugaz;
    this.ttl  = 5;
    this.life = 5;

    const angle = rand(0, Math.PI * 2);
    const speed = (SPEEDS[size] + rand(-15, 15)) * (esFugaz ? 3.5 : 1);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono: estrella de 5 puntas si es fugaz, irregular si no
    if (esFugaz) {
      const n = 5;
      this.verts = [];
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2;
        const r = i % 2 === 0 ? this.radius : this.radius * 0.45;
        this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    } else {
      const n = randInt(8, 13);
      this.verts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = this.radius * rand(0.6, 1.0);
        this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    if (this.esFugaz) {
      this.ttl -= dt;
      if (this.ttl <= 0) this.dead = true;
    }
  }

  split() {
    // La estrella fugaz no se divide en trozos
    if (this.esFugaz || this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    // Desvanecimiento al final de su vida
    const alpha = this.esFugaz ? Math.min(1, this.ttl / (this.life * 0.4)) : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);

    if (this.esFugaz) {
      // Cola de cometa dorada en la dirección del movimiento
      const speed = Math.hypot(this.vx, this.vy);
      if (speed > 0) {
        const tail = 48;
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-this.vx / speed * tail, -this.vy / speed * tail);
        ctx.stroke();
      }

      // Halo suave dorado
      ctx.fillStyle = 'rgba(255, 215, 0, 0.12)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.rotate(this.rot);
    // Dorado con resplandor si es fugaz, blanco clásico si no
    ctx.strokeStyle = this.esFugaz ? '#ffd700' : '#fff';
    ctx.fillStyle   = this.esFugaz ? '#ffd700' : 'transparent';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    if (this.esFugaz) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur  = 12;
    }
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    if (this.esFugaz) ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// ── PowerUp ───────────────────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y, tipo) {
    this.x = x;
    this.y = y;
    this.tipo = tipo;   // 'velocidad' | 'escudo'
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 60);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 8;
    this.ttl = 8;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const blink = this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0;
    if (blink) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    if (this.tipo === 'escudo') {
      // Escudo: rombo cian con punto central
      ctx.strokeStyle = '#4dffb3';
      ctx.beginPath();
      ctx.moveTo( 0, -7);
      ctx.lineTo( 6,  0);
      ctx.lineTo( 0,  7);
      ctx.lineTo(-6,  0);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Relámpago estilizado
      ctx.strokeStyle = '#4d9bff';
      ctx.beginPath();
      ctx.moveTo(-2, -6);
      ctx.lineTo(-5,  0);
      ctx.lineTo(-1,  0);
      ctx.lineTo(-3,  6);
      ctx.lineTo( 5, -1);
      ctx.lineTo( 1, -1);
      ctx.lineTo( 3, -6);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.shield        = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.shield        > 0) this.shield        -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;
    // Con power-up activo, el empuje se duplica
    const thrust = THRUST * (this.speedBoost > 0 ? 2 : 1);

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * thrust * dt;
      this.vy += Math.sin(this.angle) * thrust * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;

    // Burbuja del escudo: se dibuja aunque la nave parpadee por invencibilidad
    if (this.shield > 0) {
      // Parpadeo de aviso en el último segundo
      const aviso = this.shield < 1 && Math.floor(this.shield * 10) % 2 === 0;
      const pulso = 0.5 + 0.25 * Math.sin(performance.now() / 120);
      ctx.save();
      ctx.globalAlpha = aviso ? pulso * 0.4 : pulso;
      ctx.strokeStyle = '#4dffb3';
      ctx.lineWidth   = 2;
      ctx.shadowColor = '#4dffb3';
      ctx.shadowBlur  = 12;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    // Azul mientras dure el power-up de velocidad
    ctx.strokeStyle = this.speedBoost > 0 ? '#4d9bff' : '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

// Estrella fugaz: entra por un borde en línea recta y se desvanece
function spawnEstrellaFugaz() {
  const borde = randInt(0, 3);
  let x, y;
  if (borde === 0)      { x = -RADII[1]; y = rand(0, H); }        // izquierda
  else if (borde === 1) { x = W + RADII[1]; y = rand(0, H); }     // derecha
  else if (borde === 2) { x = rand(0, W); y = -RADII[1]; }       // arriba
  else                  { x = rand(0, W); y = H + RADII[1]; }     // abajo

  // Apunta hacia el interior con algo de ruido
  const angObj = Math.atan2(H / 2 - y, W / 2 - x) + rand(-0.6, 0.6);
  const f = new Asteroid(x, y, 1, true);
  const speed = Math.hypot(f.vx, f.vy);
  f.vx = Math.cos(angObj) * speed;
  f.vy = Math.sin(angObj) * speed;
  asteroids.push(f);
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    asteroids = asteroids.filter(a => !a.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Estrella fugaz ocasional (~3 % por segundo)
  if (Math.random() < 0.03 * dt) spawnEstrellaFugaz();

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        // La estrella fugaz vale más puntos
        score += a.esFugaz ? 150 : POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        // Posible power-up: velocidad o escudo (50/50)
        if (Math.random() < 0.12)
          powerups.push(new PowerUp(a.x, a.y, Math.random() < 0.5 ? 'velocidad' : 'escudo'));
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide: el escudo absorbe el impacto sin daño
  for (const a of asteroids) {
    if (dist(ship, a) >= ship.radius + a.radius * 0.82) continue;
    if (ship.shield > 0) {
      // Rebota el asteroide lejos de la nave y destella en el punto de contacto
      const ang = Math.atan2(a.y - ship.y, a.x - ship.x);
      const spd = Math.max(Math.hypot(a.vx, a.vy), 70);
      a.vx = Math.cos(ang) * spd;
      a.vy = Math.sin(ang) * spd;
      explode(ship.x + Math.cos(ang) * ship.radius,
              ship.y + Math.sin(ang) * ship.radius, 6);
    } else if (ship.invincible <= 0) {
      killShip();
      break;
    }
  }

  // Nave vs power-up: reinicia los 5 segundos si ya estaba activo
  if (!ship.dead) {
    for (const p of powerups) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        if (p.tipo === 'escudo') ship.shield = 5;
        else                     ship.speedBoost = 5;
      }
    }
    powerups = powerups.filter(p => !p.dead);
  }

  // Nivel completado (las estrellas fugazes no bloquean el cambio)
  if (asteroids.every(a => a.esFugaz)) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerups.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
