/* =========================================================
   1. BASE CLASS  – Character (Encapsulation with private #health)
   ========================================================= */
class Character {
  #currentHealth; // private: only changed via takeDamage()/restore()
  constructor(name, maxHealth, attackPower) {
    this.name = name;
    this.maxHealth = maxHealth;
    this.#currentHealth = maxHealth;
    this.attackPower = attackPower;
  }
  get currentHealth() {
    return this.#currentHealth;
  } // read-only access

  takeDamage(amount) {
    this.#currentHealth = Math.max(0, this.#currentHealth - amount); // never below 0
    return amount;
  }
  _restore(amount) {
    // protected-style helper for subclasses
    const before = this.#currentHealth;
    this.#currentHealth = Math.min(
      this.maxHealth,
      this.#currentHealth + amount,
    ); // never above max
    return this.#currentHealth - before;
  }
  isAlive() {
    return this.#currentHealth > 0;
  }

  // Polymorphic: subclasses can override how damage is calculated
  calcDamage() {
    return this.attackPower + Math.floor(Math.random() * 5);
  }

  attack(target) {
    const dmg = this.calcDamage();
    target.takeDamage(dmg.amount ?? dmg);
    return dmg;
  }
}

/* =========================================================
   2. SUBCLASSES  – Hero & Monster (Inheritance + Polymorphism)
   ========================================================= */
class Hero extends Character {
  constructor(name, maxHealth, attackPower, mana = 100) {
    super(name, maxHealth, attackPower);
    this.mana = mana;
    this.maxMana = mana;
    this.healCost = 20;
    this.healAmount = 30;
  }
  // Override: 10% critical hit (bonus feature)
  calcDamage() {
    const base = super.calcDamage();
    const crit = Math.random() < 0.1;
    return { amount: crit ? base * 2 : base, crit };
  }
  attack(target) {
    const result = this.calcDamage();
    target.takeDamage(result.amount);
    return result;
  }
  canHeal() {
    return this.mana >= this.healCost && this.currentHealth < this.maxHealth;
  }
  heal() {
    if (this.mana < this.healCost) return 0;
    this.mana -= this.healCost;
    return this._restore(this.healAmount);
  }
}

class Monster extends Character {
  constructor(name, maxHealth, attackPower) {
    super(name, maxHealth, attackPower);
    this.enraged = false;
  }
  // Doubles attackPower once, when health < 30%
  enrage() {
    if (
      !this.enraged &&
      this.isAlive() &&
      this.currentHealth < this.maxHealth * 0.3
    ) {
      this.attackPower *= 2;
      this.enraged = true;
      return true;
    }
    return false;
  }
}

/* =========================================================
   3. GAME CONTROLLER  – object interaction + DOM updates
   ========================================================= */
const $ = (id) => document.getElementById(id);
const ui = {
  heroFill: $("heroFill"),
  monFill: $("monFill"),
  heroHP: $("heroHP"),
  monHP: $("monHP"),
  heroName: $("heroName"),
  monName: $("monName"),
  heroBox: $("heroBox"),
  monBox: $("monBox"),
  power: $("heroPower"),
  mpower: $("monPower"),
  log: $("log"),
  round: $("roundNum"),
  atk: $("btnAttack"),
  heal: $("btnHeal"),
  banner: $("banner"),
  bannerText: $("bannerText"),
  arena: $("arena"),
};
for (const p of [ui.power, ui.mpower])
  for (let i = 0; i < 10; i++) {
    const c = document.createElement("i");
    c.className = "cell";
    p.appendChild(c);
  }

let hero, monsters, monIndex, round, busy;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function newGame() {
  hero = new Hero("KAZUYA", 150, 14, 100);
  monsters = [
    new Monster("JIN", 90, 9),
    new Monster("DEVIL JIN", 120, 11),
    new Monster("TRUE DEVIL", 160, 13),
  ];
  monIndex = 0;
  round = 1;
  busy = false;
  ui.log.innerHTML = "";
  ui.banner.style.display = "none";
  ui.heroBox.className = "fighter";
  ui.monBox.className = "fighter";
  log(`${hero.name} enters the beach arena!`, "s");
  log(`${monsters[0].name} appears!`, "s");
  render();
}
const mon = () => monsters[monIndex];

function log(text, cls = "") {
  const li = document.createElement("li");
  li.className = cls;
  li.textContent = text;
  ui.log.appendChild(li);
  ui.log.scrollTop = ui.log.scrollHeight;
}

function render() {
  const m = mon();
  setBar(ui.heroFill, hero);
  setBar(ui.monFill, m);
  ui.heroHP.textContent = `${hero.currentHealth} / ${hero.maxHealth}`;
  ui.monHP.textContent = `${m.currentHealth} / ${m.maxHealth}`;
  ui.heroName.textContent = hero.name;
  ui.monName.textContent = m.name;
  ui.round.textContent = round;
  const rage = Math.round((1 - m.currentHealth / m.maxHealth) * 10);
  [...ui.mpower.children].forEach((c, i) =>
    c.classList.toggle("on", i >= 10 - rage),
  );
  [...ui.power.children].forEach((c, i) =>
    c.classList.toggle("on", i < Math.round((hero.mana / hero.maxMana) * 10)),
  );
  ui.heal.disabled = busy || !hero.canHeal();
  ui.atk.disabled = busy;
  ui.monBox.classList.toggle("enraged", m.enraged);
}
function setBar(el, ch) {
  const pct = (ch.currentHealth / ch.maxHealth) * 100;
  el.style.width = pct + "%";
  el.classList.toggle("low", pct < 30);
}
function popup(text, box) {
  const p = document.createElement("div");
  p.className = "pop";
  p.textContent = text;
  p.style.left = box === ui.heroBox ? "12%" : "76%";
  ui.arena.appendChild(p);
  setTimeout(() => p.remove(), 900);
}
async function lunge(box, target) {
  const s = document.createElement("div");
  s.className = "slash " + (box === ui.heroBox ? "ltr" : "rtl");
  ui.arena.appendChild(s);
  await wait(220);
  target.classList.add("hit");
  ui.arena.classList.add("shake");
  await wait(220);
  target.classList.remove("hit");
  ui.arena.classList.remove("shake");
  s.remove();
}

async function playerAttack() {
  if (busy) return;
  busy = true;
  render();
  const m = mon();

  // Hero attacks Monster
  const res = hero.attack(m);
  await lunge(ui.heroBox, ui.monBox);
  popup((res.crit ? "CRIT! " : "") + "-" + res.amount, ui.monBox);
  log(
    `${hero.name} attacked ${m.name} for ${res.amount} damage!${res.crit ? " CRITICAL HIT!" : ""}`,
    "p",
  );
  render();

  if (!m.isAlive()) return monsterDefeated();

  if (m.enrage()) {
    log(`${m.name} is ENRAGED! Attack power doubled to ${m.attackPower}!`, "s");
    render();
  }
  await wait(450);

  // Monster counter-attacks Hero
  const dmg = m.attack(hero);
  await lunge(ui.monBox, ui.heroBox);
  popup("-" + dmg, ui.heroBox);
  log(`${m.name} counter-attacked ${hero.name} for ${dmg} damage!`, "m");
  round++;
  busy = false;
  render();
  if (!hero.isAlive()) gameOver(false);
}

async function playerHeal() {
  if (busy || !hero.canHeal()) return;
  busy = true;
  const healed = hero.heal();
  ui.heroBox.classList.add("healing");
  popup("+" + healed, ui.heroBox);
  log(`${hero.name} healed ${healed} HP (mana: ${hero.mana}).`, "h");
  render();
  await wait(500);
  ui.heroBox.classList.remove("healing");

  const m = mon();
  const dmg = m.attack(hero);
  await lunge(ui.monBox, ui.heroBox);
  popup("-" + dmg, ui.heroBox);
  log(`${m.name} attacked ${hero.name} for ${dmg} damage!`, "m");
  round++;
  busy = false;
  render();
  if (!hero.isAlive()) gameOver(false);
}

async function monsterDefeated() {
  const m = mon();
  ui.monBox.classList.add("ko");
  log(`${m.name} was defeated!`, "s");
  await wait(900);
  if (monIndex === monsters.length - 1) return gameOver(true);
  monIndex++;
  ui.monBox.classList.remove("ko");
  log(`${mon().name} steps into the arena!`, "s");
  busy = false;
  render();
}

function gameOver(win) {
  busy = true;
  if (!win) ui.heroBox.classList.add("ko");
  log(
    win ? "All enemies defeated. You win!" : `${hero.name} has fallen...`,
    "s",
  );
  ui.bannerText.textContent = win ? "YOU WIN!" : "K.O.";
  ui.banner.style.display = "flex";
  render();
}

ui.atk.addEventListener("click", playerAttack);
ui.heal.addEventListener("click", playerHeal);
$("btnRestart").addEventListener("click", newGame);
newGame();
