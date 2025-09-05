// --- Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiContainer = document.getElementById('uiContainer');
const damageNumbersContainer = document.getElementById('damageNumbersContainer');
const healthBar = document.getElementById('healthBar');
const healthText = document.getElementById('healthText');
const xpBar = document.getElementById('xpBar');
const levelText = document.getElementById('level');
const timerText = document.getElementById('timer');
const mainMenuScreen = document.getElementById('mainMenuScreen');
const guideScreen = document.getElementById('guideScreen');
const pauseScreen = document.getElementById('pauseScreen');
const startScreen = document.getElementById('startScreen');
const levelUpScreen = document.getElementById('levelUpScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const menuStartButton = document.getElementById('menuStartButton');
const menuGuideButton = document.getElementById('menuGuideButton');
const guideBackButton = document.getElementById('guideBackButton');
const pauseButton = document.getElementById('pauseButton');
const resumeButton = document.getElementById('resumeButton');
const pauseGuideButton = document.getElementById('pauseGuideButton');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const weaponIconsContainer = document.getElementById('weaponIcons');
const passiveIconsContainer = document.getElementById('passiveIcons');
const evoGuideContainer = document.getElementById('evoGuideContainer');


let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

let gameState = 'menu';
let gameTime = 0;
let enemiesKilledCount = 0;
let animationFrameId;
let selectedCharacterId = null;
let nextBossTime = 300; // 5 minutes
const RENDER_SCALE = 0.75; // Zoom out factor
let guideReturnState = 'menu';

// --- Player ---
const player = {
    x: canvasWidth / 2, y: canvasHeight / 2, radius: 15 * RENDER_SCALE,
    color: '#FFFFFF', hp: 100, maxHp: 100, xp: 0, level: 1,
    xpToNextLevel: 10, lastHitTime: 0, isInvincible: false,
    passives: [],
    stats: {
        speed: 3 * RENDER_SCALE,
        damageModifier: 1.0,
        cooldownModifier: 1.0,
        projectileSpeedModifier: 1.0,
        damageReduction: 0,
        pickupRadius: 100 * RENDER_SCALE
    }
};

// --- Master Lists ---
const WEAPONS_MASTER_LIST = {
    laser: { name: "ปืนเลเซอร์", icon: "🔫", type: 'laser_beam', damage: 15, count: 1, range: 200 * RENDER_SCALE, duration: 150, cooldown: 2500, lastAttackTime: 0, projectiles: [], maxLevel: 5 },
    lightning: { name: "พลังสายฟ้า", icon: "⚡️", type: 'orbital', damage: 12, count: 1, speed: 0.035, range: 80 * RENDER_SCALE, angle: 0, projectiles: [], maxLevel: 5 },
    axe: { name: "ขวาน", icon: "🪓", type: 'arc', damage: 25, count: 1, speed: 7 * RENDER_SCALE, range: 1.0, cooldown: 2000, lastAttackTime: 0, projectiles: [], maxLevel: 5 },
    garlic: { name: "ออร่ากระเทียม", icon: "🧄", type: 'aura', damage: 3, count: 1, range: 100 * RENDER_SCALE, cooldown: 500, lastAttackTime: 0, lastHit: new Map(), projectiles: [], maxLevel: 5 },
    missile: { name: "กระสุนเวทนำวิถี", icon: "✨", type: 'homing', damage: 20, count: 1, speed: 6 * RENDER_SCALE, cooldown: 1800, lastAttackTime: 0, projectiles: [], maxLevel: 5, pierce: 1 },
    sword: { name: "ดาบบินได้", icon: "⚔️", type: 'sword_orbital', damage: 18, count: 1, range: 90 * RENDER_SCALE, speed: 0.04, angle: 0, cooldown: 10000, lastAttackTime: 0, projectiles: [], homingProjectiles: [], pierce: 1, maxLevel: 5 }
};
const PASSIVES_MASTER_LIST = {
    spinach: { name: "ผักโขม", icon: "🥬", description: "เพิ่มพลังโจมตี 10% ต่อเลเวล", maxLevel: 5, apply: (p, level) => { p.stats.damageModifier = 1 + (0.1 * level); } },
    armor: { name: "เกราะ", icon: "🛡️", description: "ลดความเสียหายที่ได้รับ 5% ต่อเลเวล", maxLevel: 5, apply: (p, level) => { p.stats.damageReduction = 1 - Math.pow(0.95, level); } },
    wings: { name: "ปีก", icon: "🕊️", description: "เพิ่มความเร็วเคลื่อนที่ 10% ต่อเลเวล", maxLevel: 5, apply: (p, level) => { p.stats.speed = (3 * RENDER_SCALE) * (1 + (0.1 * level)); } },
    tome: { name: "ตำรา", icon: "📖", description: "ลดคูลดาวน์ 8% ต่อเลเวล", maxLevel: 5, apply: (p, level) => { p.stats.cooldownModifier = 1 - (0.08 * level); } },
    candelabrador: { name: "เชิงเทียน", icon: "🕯️", description: "เพิ่มความเร็วโปรเจคไทล์ 10%", maxLevel: 5, apply: (p, level) => { p.stats.projectileSpeedModifier = 1 + (0.1 * level); } },
    magnet: { name: "แม่เหล็ก", icon: "🧲", description: "เพิ่มระยะการเก็บไอเทม 25%", maxLevel: 5, apply: (p, level) => { p.stats.pickupRadius = (100 * RENDER_SCALE) * (1 + 0.25 * level); } },
};
const EVOLUTIONS = {
    supercharge_beam: { name: "ลำแสงซูเปอร์ชาร์จ", icon: "💥", baseWeaponId: 'laser', passiveId: 'spinach', evolvedWeapon: { name: "ลำแสงซูเปอร์ชาร์จ", type: 'laser_beam', damage: 50, count: 3, range: 300 * RENDER_SCALE, duration: 250, cooldown: 1500, lastAttackTime: 0, projectiles: [], isEvolved: true } },
    thunder_loop: { name: "วงแหวนอัสนี", icon: "🌀", baseWeaponId: 'lightning', passiveId: 'wings', evolvedWeapon: { name: "วงแหวนอัสนี", type: 'evo_orbital_ring', damage: 25, range: 150 * RENDER_SCALE, cooldown: 250, lastAttackTime: 0, lastHit: new Map(), projectiles: [], isEvolved: true } },
    death_spiral: { name: "เกลียวมรณะ", icon: "💀", baseWeaponId: 'axe', passiveId: 'candelabrador', evolvedWeapon: { name: "เกลียวมรณะ", type: 'evo_spiral', damage: 60, count: 8, speed: 6 * RENDER_SCALE, cooldown: 2500, lastAttackTime: 0, projectiles: [], isEvolved: true } },
    soul_eater: { name: "เครื่องดูดวิญญาณ", icon: "👻", baseWeaponId: 'garlic', passiveId: 'armor', evolvedWeapon: { name: "เครื่องดูดวิญญาณ", type: 'aura', damage: 15, range: 150 * RENDER_SCALE, cooldown: 300, lastAttackTime: 0, lastHit: new Map(), projectiles: [], isEvolved: true, lifestealOnKillChance: 0.05 } },
    thousand_edge: { name: "พันศาสตรา", icon: "🗡️", baseWeaponId: 'missile', passiveId: 'tome', evolvedWeapon: { name: "พันศาสตรา", type: 'evo_stream', damage: 25, speed: 8 * RENDER_SCALE, cooldown: 100, lastAttackTime: 0, projectiles: [], isEvolved: true, pierce: 5 } },
    demonic_orbit: { name: "วงโคจรดาบปีศาจ", icon: "🔥", baseWeaponId: 'sword', passiveId: 'magnet', evolvedWeapon: { name: "วงโคจรดาบปีศาจ", type: 'evo_sword_orbit', damage: 40, count: 8, speed: 7 * RENDER_SCALE, cooldown: 400, lastAttackTime: 0, projectiles: [], isEvolved: true, pierce: 999 } }
};

let weapons = [];
let difficultyManager = {};

// --- Characters ---
const CHARACTERS = [
    { id: 'mage', name: 'นักเวทย์', description: 'เริ่มต้นด้วยพลังสายฟ้า', color: '#63b3ed', startingWeaponId: 'lightning' },
    { id: 'robot', name: 'หุ่นยนต์', description: 'เริ่มต้นด้วยปืนเลเซอร์', color: '#9e9e9e', startingWeaponId: 'laser' },
    { id: 'barbarian', name: 'คนเถื่อน', description: 'เริ่มต้นด้วยขวาน', color: '#f6ad55', startingWeaponId: 'axe' }
];

let enemies = [];
let xpGems = [];
let pickups = [];
let monsterProjectiles = [];
const keys = {};
let isPointerDown = false;
let pointerPos = { x: 0, y: 0 };

// --- UI Functions ---
function updateInventoryUI() {
    weaponIconsContainer.innerHTML = '';
    passiveIconsContainer.innerHTML = '';
    weapons.forEach(w => {
        const master = w.isEvolved ? EVOLUTIONS[w.id] : WEAPONS_MASTER_LIST[w.id];
        const iconEl = document.createElement('div');
        iconEl.className = 'inventory-icon rounded-md';
        iconEl.innerHTML = `${master.icon}<div class="level-badge">${w.isEvolved ? 'MAX' : w.level}</div>`;
        weaponIconsContainer.appendChild(iconEl);
    });
    player.passives.forEach(p => {
        const master = PASSIVES_MASTER_LIST[p.id];
        const iconEl = document.createElement('div');
        iconEl.className = 'inventory-icon rounded-md';
        iconEl.innerHTML = `${master.icon}<div class="level-badge">${p.level}</div>`;
        passiveIconsContainer.appendChild(iconEl);
    });
}

function populateEvoGuide() {
    evoGuideContainer.innerHTML = '';
    for (const key in EVOLUTIONS) {
        const evo = EVOLUTIONS[key];
        const weapon = WEAPONS_MASTER_LIST[evo.baseWeaponId];
        const passive = PASSIVES_MASTER_LIST[evo.passiveId];
        const item = document.createElement('div');
        item.className = 'evo-guide-item';
        item.innerHTML = `
            <div class="inventory-icon rounded-md">${weapon.icon}</div>
            <span>+</span>
            <div class="inventory-icon rounded-md">${passive.icon}</div>
            <span>=</span>
            <div class="inventory-icon rounded-md bg-green-700 border-green-400">${evo.icon}</div>
        `;
        evoGuideContainer.appendChild(item);
    }
}

// --- Character Selection ---
function populateCharacterSelection() {
    const container = document.getElementById('characterSelection');
    container.innerHTML = '';
    CHARACTERS.forEach(char => {
        const card = document.createElement('div');
        card.className = 'card bg-gray-800 border-4 border-gray-600 p-4 rounded-lg text-center';
        card.dataset.charId = char.id;
        card.innerHTML = `<div class="w-12 h-12 sm:w-16 sm:h-16 rounded-full mx-auto mb-2 sm:mb-4" style="background-color: ${char.color};"></div><h3 class="text-xl sm:text-2xl font-bold text-yellow-300 mb-2">${char.name}</h3><p class="text-gray-300 text-sm">${char.description}</p>`;
        card.addEventListener('click', () => { selectedCharacterId = char.id; document.querySelectorAll('#characterSelection .card').forEach(c => c.classList.remove('selected')); card.classList.add('selected'); startButton.disabled = false; });
        container.appendChild(card);
    });
}

// --- Upgrade System ---
function getWeaponUpgradeDescription(weapon) {
    const nextLevel = weapon.level + 1;
    switch (weapon.id) {
         case 'laser':
            if (nextLevel === 2 || nextLevel === 4) return `เพิ่มจำนวนลำแสงเป็น ${weapon.count + 1} ลำ`;
            return `เพิ่มพลังโจมตีและความเร็ว`;
        case 'lightning':
            if (nextLevel === 2) return `เพิ่มจำนวนเป็น 2 ลูก`;
            if (nextLevel === 3) return `หมุนเร็วขึ้นและกว้างขึ้น`;
            if (nextLevel === 4) return `เพิ่มจำนวนเป็น 3 ลูก`;
            if (nextLevel === 5) return `เพิ่มจำนวนเป็น 4 ลูก, หมุนเร็วขึ้นและกว้างขึ้น`;
            return `เพิ่มพลังโจมตี`;
        case 'axe':
            if (nextLevel === 2 || nextLevel === 4) return `เพิ่มขวานเป็น ${weapon.count + 1} ชิ้น`;
            return `เพิ่มพลังโจมตีและลดคูลดาวน์`;
        case 'garlic':
            return `เพิ่มพลังโจมตีและขยายขอบเขต`;
        case 'missile':
             if (nextLevel === 2 || nextLevel === 4) return `เพิ่มจำนวนกระสุนเป็น ${weapon.count + 1} ลูก`;
             return `เพิ่มพลังโจมตีและการเจาะทะลุ`;
        case 'sword':
             if (nextLevel === 2 || nextLevel === 4) return `เพิ่มดาบเป็น ${weapon.count + 1} เล่ม`;
             return `เพิ่มความเร็วโจมตีและการเจาะทะลุ`;
        default: return `เพิ่มประสิทธิภาพของอาวุธ`;
    }
}

function upgradeWeapon(weapon) {
    weapon.level++;
    const level = weapon.level;
    switch (weapon.id) {
        case 'laser':
            weapon.damage += 5;
            if (level === 2 || level === 4) weapon.count++;
            weapon.cooldown *= 0.92;
            break;
        case 'lightning': 
            weapon.damage += 2; 
            if (level === 2) weapon.count = 2;
            if (level === 3) { weapon.speed += 0.005; weapon.range += 5 * RENDER_SCALE; }
            if (level === 4) weapon.count = 3;
            if (level === 5) { weapon.count = 4; weapon.speed += 0.005; weapon.range += 5 * RENDER_SCALE; }
            break;
        case 'axe': weapon.damage += 8; if (level === 2 || level === 4) weapon.count++; weapon.cooldown *= 0.95; break;
        case 'garlic': weapon.damage += 1; weapon.range += 12 * RENDER_SCALE; weapon.cooldown *= 0.95; break;
        case 'missile':
            weapon.damage += 5;
            if (level === 2 || level === 4) weapon.count++;
            weapon.pierce = (weapon.pierce || 1) + 1;
            break;
        case 'sword':
            if (level === 2 || level === 4) weapon.count++;
            weapon.cooldown *= 0.85;
            weapon.pierce++;
            break;
    }
}

function getUpgradeOptions() {
    const upgrades = [];
    const evolutionCandidates = [];

    // Check for possible evolutions first
    for (const evoKey in EVOLUTIONS) {
        const evo = EVOLUTIONS[evoKey];
        const weapon = weapons.find(w => w.id === evo.baseWeaponId && w.level === 5);
        const passive = player.passives.find(p => p.id === evo.passiveId && p.level === PASSIVES_MASTER_LIST[p.id].maxLevel);
        if (weapon && passive) {
            evolutionCandidates.push({
                id: `evolve_${weapon.id}`, isEvolution: true, icon: evo.icon, name: `วิวัฒนาการ: ${evo.name}`, description: `เปลี่ยนอาวุธเป็นขั้นสุดยอด`,
                apply: () => {
                    const weaponIndex = weapons.findIndex(w => w.id === evo.baseWeaponId);
                    if (weaponIndex !== -1) {
                        const oldWeapon = weapons[weaponIndex];
                        const evolved = JSON.parse(JSON.stringify(evo.evolvedWeapon));
                        evolved.id = evoKey; evolved.level = oldWeapon.level;
                        if (evolved.type === 'aura' || evolved.type === 'evo_orbital_ring') { evolved.lastHit = new Map(); }
                        weapons[weaponIndex] = evolved;
                    }
                }
            });
        }
    }
    // If an evolution is possible, return it as the only option
    if (evolutionCandidates.length > 0) {
        return [evolutionCandidates[0]];
    }

    // Add upgrades for existing weapons
    weapons.forEach((w) => {
        const master = WEAPONS_MASTER_LIST[w.id];
        if (w.level < w.maxLevel && !w.isEvolved) {
            upgrades.push({ id: `upgrade_${w.id}`, icon: master.icon, name: `อัปเกรด ${w.name} (Lv. ${w.level + 1})`, description: getWeaponUpgradeDescription(w), apply: () => upgradeWeapon(w) });
        }
    });

    // Add upgrades for existing passives
    player.passives.forEach((p) => {
        const master = PASSIVES_MASTER_LIST[p.id];
        if (p.level < master.maxLevel) {
            upgrades.push({ id: `upgrade_${p.id}`, icon: master.icon, name: `อัปเกรด ${master.name} (Lv. ${p.level + 1})`, description: master.description, apply: () => { p.level++; master.apply(player, p.level); } });
        }
    });
    
    const takenBaseWeaponIds = new Set();
    weapons.forEach(w => {
        if (w.isEvolved) {
            for (const key in EVOLUTIONS) {
                if (EVOLUTIONS[key].evolvedWeapon.name === w.name) {
                    takenBaseWeaponIds.add(EVOLUTIONS[key].baseWeaponId);
                    break;
                }
            }
        } else {
            takenBaseWeaponIds.add(w.id);
        }
    });


    // Add new weapons if slots are available
    if (weapons.length < 4) {
        const availableNewWeapons = Object.keys(WEAPONS_MASTER_LIST).filter(id => !takenBaseWeaponIds.has(id));
        availableNewWeapons.forEach(newId => {
            const master = WEAPONS_MASTER_LIST[newId];
            upgrades.push({ id: `new_${newId}`, icon: master.icon, name: `รับอาวุธ: ${master.name}`, description: 'เพิ่มอาวุธใหม่', apply: () => { const inst = JSON.parse(JSON.stringify(WEAPONS_MASTER_LIST[newId])); inst.id = newId; inst.level = 1; if(inst.type==='aura' || inst.type === 'sword_orbital') inst.lastHit=new Map(); weapons.push(inst); } });
        });
    }

    // Add new passives if slots are available
    if (player.passives.length < 4) {
         const currentPassiveIds = player.passives.map(p => p.id);
         const availableNewPassives = Object.keys(PASSIVES_MASTER_LIST).filter(id => !currentPassiveIds.includes(id));
         availableNewPassives.forEach(newId => {
             const master = PASSIVES_MASTER_LIST[newId];
             upgrades.push({ id: `new_${newId}`, icon: master.icon, name: `รับไอเทม: ${master.name}`, description: master.description, apply: () => { player.passives.push({id: newId, level: 1}); master.apply(player, 1); } });
         });
    }
    
    // Remove duplicates by ID, shuffle, and take the first 3
    const uniqueUpgrades = [...new Map(upgrades.map(item => [item.id, item])).values()];
    
    // Fisher-Yates shuffle
    for (let i = uniqueUpgrades.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniqueUpgrades[i], uniqueUpgrades[j]] = [uniqueUpgrades[j], uniqueUpgrades[i]];
    }

    return uniqueUpgrades.slice(0, 3);
}


function displayUpgradeOptions(options) {
    const container = document.getElementById('upgradeOptions');
    container.innerHTML = '';
    if (options.length === 0) {
        options = [{ id: 'heal_small', icon: '❤️', name: 'พักหายใจ', description: 'ฟื้นฟู HP 20 หน่วย', apply: () => { player.hp = Math.min(player.maxHp, player.hp + 20); } }];
    }
    options.forEach(upgrade => {
        const card = document.createElement('div');
        const cardClasses = 'card bg-gray-800 border-2 border-yellow-400 p-6 rounded-lg text-center flex flex-col items-center';
        card.className = upgrade.isEvolution ? `${cardClasses} evolution-card` : cardClasses;
        card.innerHTML = `
            <div class="text-5xl mb-4">${upgrade.icon}</div>
            <h3 class="text-xl sm:text-2xl font-bold text-yellow-300 mb-2">${upgrade.name}</h3>
            <p class="text-gray-300 text-sm sm:text-base">${upgrade.description}</p>
        `;
        card.onclick = () => selectUpgrade(upgrade);
        container.appendChild(card);
    });
}

function selectUpgrade(upgrade) {
    upgrade.apply();
    updateInventoryUI();
    levelUpScreen.classList.add('hidden');
    levelUpScreen.classList.remove('flex');
    gameState = 'playing';
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// --- Event Listeners and Controls ---
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

function handlePointerDown(e) { if (gameState !== 'playing') return; isPointerDown = true; const pos = e.touches ? e.touches[0] : e; pointerPos.x = pos.clientX; pointerPos.y = pos.clientY; }
function handlePointerMove(e) { if (!isPointerDown) return; const pos = e.touches ? e.touches[0] : e; pointerPos.x = pos.clientX; pointerPos.y = pos.clientY; }
function handlePointerUp(e) { isPointerDown = false; }

canvas.addEventListener('touchstart', handlePointerDown, { passive: true });
canvas.addEventListener('touchmove', handlePointerMove, { passive: true });
canvas.addEventListener('touchend', handlePointerUp);
canvas.addEventListener('mousedown', handlePointerDown);
canvas.addEventListener('mousemove', handlePointerMove);
canvas.addEventListener('mouseup', handlePointerUp);
canvas.addEventListener('mouseleave', handlePointerUp);

// --- Game Logic ---
function updatePlayer() {
    let dx = 0, dy = 0;
    if (isPointerDown) {
        dx = pointerPos.x - player.x;
        dy = pointerPos.y - player.y;
    } else {
        if (keys['KeyW'] || keys['ArrowUp']) dy = -1;
        if (keys['KeyS'] || keys['ArrowDown']) dy = 1;
        if (keys['KeyA'] || keys['ArrowLeft']) dx = -1;
        if (keys['KeyD'] || keys['ArrowRight']) dx = 1;
    }

    const dist = Math.hypot(dx, dy);
    if (dist > 1) { 
        dx /= dist; 
        dy /= dist; 
    }

    if (dx !== 0 || dy !== 0) { 
        player.x += dx * player.stats.speed; 
        player.y += dy * player.stats.speed; 
    }
    
    player.x = Math.max(player.radius, Math.min(window.innerWidth - player.radius, player.x)); 
    player.y = Math.max(player.radius, Math.min(window.innerHeight - player.radius, player.y));
    if (player.isInvincible && Date.now() - player.lastHitTime > 1000) player.isInvincible = false;
}

function getEnemyColor(timeMinutes) {
    const hue = 0; // Red
    const saturation = Math.min(100, 70 + timeMinutes * 5);
    const lightness = Math.max(30, 50 - timeMinutes * 3);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function getXPGemColor(value) {
    if (value >= 20) return '#a21caf'; // Fuchsia 700
    if (value >= 10) return '#facc15'; // Yellow 400
    if (value >= 5) return '#4ade80'; // Green 400
    return '#60a5fa'; // Blue 400
}

function spawnWatcher() {
    const side = Math.floor(Math.random() * 4); let x, y;
    if (side === 0) { x = Math.random() * canvas.width; y = -20; } else if (side === 1) { x = canvas.width + 20; y = Math.random() * canvas.height; } else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 20; } else { x = -20; y = Math.random() * canvas.height; }
    const hp = 10 * difficultyManager.enemyHpMultiplier;
    const speed = 1.0 * difficultyManager.enemySpeedMultiplier * RENDER_SCALE;
    enemies.push({ id: `r-${Date.now()}`, type: 'watcher', x, y, radius: 15 * RENDER_SCALE, hp: hp, maxHp: hp, speed: speed, color: '#805ad5', xpValue: 5 + Math.floor(gameTime / 60), cooldown: 3000, lastAttackTime: Date.now() + Math.random() * 1000 });
}

function spawnEnemy() {
    const side = Math.floor(Math.random() * 4); let x, y;
    if (side === 0) { x = Math.random() * canvas.width; y = -20; } else if (side === 1) { x = canvas.width + 20; y = Math.random() * canvas.height; } else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 20; } else { x = -20; y = Math.random() * canvas.height; }
    
    if (gameTime > 480 && Math.random() < 0.15) { // After 8 mins, 15% chance for slime
        const hp = 50 * difficultyManager.enemyHpMultiplier;
        const speed = 0.8 * difficultyManager.enemySpeedMultiplier * RENDER_SCALE;
        enemies.push({ id: `t-${Date.now()}`, type: 'tank', x, y, radius: 22 * RENDER_SCALE, hp: hp, maxHp: hp, speed: speed, color: '#48bb78', xpValue: 10 + Math.floor(gameTime / 60) });
        return;
    }
    
    const type = Math.random() > 0.8 ? 'ghost' : 'normal';
    const hp = (type==='ghost'? 8 : 12) * difficultyManager.enemyHpMultiplier;
    const speed = (type==='ghost'? 2 : 1.2) * difficultyManager.enemySpeedMultiplier * RENDER_SCALE;
    const xpValue = (type === 'ghost' ? 3 : 1) + Math.floor(gameTime / 60);
    const color = type === 'ghost' ? '#e2e8f0' : getEnemyColor(gameTime/60);
    enemies.push({ id: `e-${Date.now()}-${Math.random()}`, type: type, x, y, radius: (type==='ghost'?12:15) * RENDER_SCALE, hp: hp, maxHp: hp, speed: speed, color: color, xpValue: xpValue });
}

function spawnHealthEnemy() {
    const side = Math.floor(Math.random() * 4); let x, y;
    if (side === 0) { x = Math.random() * canvas.width; y = -30; } else if (side === 1) { x = canvas.width + 30; y = Math.random() * canvas.height; } else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 30; } else { x = -30; y = Math.random() * canvas.height; }
    const hp = 25 * difficultyManager.enemyHpMultiplier;
    const speed = 1.5 * difficultyManager.enemySpeedMultiplier * RENDER_SCALE;
    enemies.push({ id: `h-${Date.now()}`, type: 'health', x, y, radius: 18 * RENDER_SCALE, hp: hp, maxHp: hp, speed: speed, color: '#2dd4bf', xpValue: 5, isHealthDropper: true });
}

function spawnBoss() {
    const side = Math.floor(Math.random() * 4); let x, y;
    if (side === 0) { x = Math.random() * canvas.width; y = -50; } else if (side === 1) { x = canvas.width + 50; y = Math.random() * canvas.height; } else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 50; } else { x = -50; y = Math.random() * canvas.height; }
    const bossLevel = Math.floor(gameTime / 300) + 1;
    const hp = 500 * bossLevel * difficultyManager.enemyHpMultiplier;
    enemies.push({ id: `b-${Date.now()}`, type: 'boss', x, y, radius: 40 * RENDER_SCALE, hp: hp, maxHp: hp, speed: 1.5 * difficultyManager.enemySpeedMultiplier * RENDER_SCALE, color: '#44337a', xpValue: 100, isBoss: true });
}

function updateEnemies() {
    enemies.forEach(enemy => {
        const dx = player.x - enemy.x; const dy = player.y - enemy.y; const dist = Math.hypot(dx, dy);
        
        // Watcher enemy behavior
        if (enemy.type === 'watcher' && dist < 400 * RENDER_SCALE) {
             if (Date.now() - enemy.lastAttackTime > enemy.cooldown) {
                enemy.lastAttackTime = Date.now();
                monsterProjectiles.push({ x: enemy.x, y: enemy.y, vx: (dx / dist) * 4 * RENDER_SCALE, vy: (dy / dist) * 4 * RENDER_SCALE, radius: 5 * RENDER_SCALE, spawnTime: Date.now() });
            }
        } else {
             if (dist > 0) { enemy.x += (dx / dist) * enemy.speed; enemy.y += (dy / dist) * enemy.speed; }
        }

        if (!player.isInvincible && dist < player.radius + enemy.radius) {
            const damageTaken = (enemy.isBoss ? 25 : (enemy.isHealthDropper ? 15 : (enemy.type === 'tank' ? 20 : 10))) * (1 - player.stats.damageReduction);
            player.hp -= damageTaken; player.isInvincible = true; player.lastHitTime = Date.now();
            uiContainer.classList.add('screen-shake');
            setTimeout(() => uiContainer.classList.remove('screen-shake'), 300);
            if (player.hp <= 0) gameOver();
        }
    });
}

function updateWeapons() {
    weapons.forEach(w => {
        const cooldown = w.cooldown * player.stats.cooldownModifier;
        const speed = (w.speed || 0) * player.stats.projectileSpeedModifier;

        // --- PROJECTILE CREATION & ORBITING LOGIC ---
        if (w.type === 'orbital') {
            w.angle = (w.angle + w.speed) % (Math.PI * 2);
            w.projectiles = [];
            const angleInc = (2 * Math.PI) / w.count;
            for (let i = 0; i < w.count; i++) {
                const angle = w.angle + i * angleInc;
                w.projectiles.push({ x: player.x + Math.cos(angle) * w.range, y: player.y + Math.sin(angle) * w.range, radius: 10 * RENDER_SCALE, lastHit: new Map() });
            }
        } else if (w.type === 'laser_beam' && Date.now() - w.lastAttackTime > cooldown) {
            w.lastAttackTime = Date.now(); w.projectiles = [];
            let targets = [...enemies].sort((a,b) => Math.hypot(player.x-a.x, player.y-a.y) - Math.hypot(player.x-b.x, player.y-b.y));
            for (let i = 0; i < w.count && i < targets.length; i++) {
                const target = targets[i];
                if (target) {
                    const dx = target.x - player.x; const dy = target.y - player.y; const angle = Math.atan2(dy, dx);
                    const endX = player.x + Math.cos(angle) * w.range; const endY = player.y + Math.sin(angle) * w.range;
                    w.projectiles.push({ startX: player.x, startY: player.y, endX: endX, endY: endY, angle: angle, width: (w.isEvolved ? 12 : 8) * RENDER_SCALE, spawnTime: Date.now(), lastHit: new Map() });
                }
            }
        } else if (w.type === 'sword_orbital') {
            w.angle = (w.angle + w.speed) % (Math.PI * 2);
            // Ensure projectile array has the correct number of swords
            while (w.projectiles.length < w.count) { w.projectiles.push({ angle: 0, lastHit: new Map() }); }
            while (w.projectiles.length > w.count) { w.projectiles.pop(); }
            // Update positions of orbiting swords
            const angleInc = (2 * Math.PI) / w.count;
            w.projectiles.forEach((p, i) => {
                p.angle = w.angle + i * angleInc;
                p.x = player.x + Math.cos(p.angle) * w.range;
                p.y = player.y + Math.sin(p.angle) * w.range;
            });

            if (Date.now() - w.lastAttackTime > cooldown) {
                w.lastAttackTime = Date.now();
                let targets = [...enemies].sort((a, b) => Math.hypot(player.x - a.x, player.y - a.y) - Math.hypot(player.x - b.x, player.y - b.y));
                for (let i = 0; i < w.count && i < targets.length; i++) {
                    const orbitingSword = w.projectiles[i % w.projectiles.length];
                    if (orbitingSword) {
                         w.homingProjectiles.push({ x: orbitingSword.x, y: orbitingSword.y, speed: 7 * RENDER_SCALE, target: targets[i], lastHit: new Map(), pierceLeft: w.pierce, spawnTime: Date.now() });
                    }
                }
            }
        } else if (w.type === 'arc' && Date.now() - w.lastAttackTime > cooldown) {
             w.lastAttackTime = Date.now();
             for (let i = 0; i < w.count; i++) w.projectiles.push({ x: player.x, y: player.y, vy: -speed, vx: (i * 2 + (Math.random()-0.5)) * (Math.random() > 0.5 ? 1 : -1) * 2 * RENDER_SCALE, gravity: 0.15 * RENDER_SCALE, angle: 0, rotationSpeed: 0.2 * (Math.random() > 0.5 ? 1 : -1), lastHit: new Map() });
        } else if (w.type === 'homing' && Date.now() - w.lastAttackTime > cooldown) {
            w.lastAttackTime = Date.now();
            let targets = [...enemies].sort((a,b) => Math.hypot(player.x-a.x, player.y-a.y) - Math.hypot(player.x-b.x, player.y-b.y));
            for(let i=0; i < w.count && i < targets.length; i++){ w.projectiles.push({x:player.x, y:player.y, speed: speed, target: targets[i], lastHit: new Map(), pierceLeft: w.pierce || 1 }); }
        } else if (w.type === 'evo_spiral' && Date.now() - w.lastAttackTime > cooldown) {
            w.lastAttackTime = Date.now();
            for (let i = 0; i < w.count; i++) {
                const angle = (i / w.count) * Math.PI * 2;
                w.projectiles.push({ x: player.x, y: player.y, vy: Math.sin(angle) * speed, vx: Math.cos(angle) * speed, gravity: 0, angle: 0, rotationSpeed: 0.3, lastHit: new Map(), spawnTime: Date.now() });
            }
        } else if (w.type === 'evo_stream' && Date.now() - w.lastAttackTime > cooldown) {
            w.lastAttackTime = Date.now();
            let target = enemies.sort((a,b) => Math.hypot(player.x-a.x, player.y-a.y) - Math.hypot(player.x-b.x, player.y-b.y))[0];
            if(target) w.projectiles.push({x:player.x, y:player.y, speed: speed, target: target, lastHit: new Map(), pierceLeft: w.pierce || 5 });
        } else if (w.type === 'evo_sword_orbit' && Date.now() - w.lastAttackTime > cooldown) {
            w.lastAttackTime = Date.now();
            let targets = [...enemies].sort((a,b) => Math.hypot(player.x-a.x, player.y-a.y) - Math.hypot(player.x-b.x, player.y-b.y));
            if (targets.length > 0) {
                for(let i = 0; i < w.count; i++) {
                    w.projectiles.push({x: player.x, y: player.y, speed: w.speed, target: targets[i % targets.length], lastHit: new Map(), pierceLeft: w.pierce});
                }
            }
        }

        // --- PROJECTILE MOVEMENT & DELETION ---
        (w.projectiles || []).forEach((p, index) => {
            if (w.type === 'laser_beam' && Date.now() - p.spawnTime > w.duration) { w.projectiles.splice(index, 1); return; }
            if (w.type === 'arc') { p.vy += p.gravity; p.y += p.vy; p.x += p.vx; p.angle += p.rotationSpeed; if (p.y > canvas.height + 50) { w.projectiles.splice(index, 1); return; } }
            if (w.type === 'homing' || w.type === 'evo_stream' || w.type === 'evo_sword_orbit') {
                if (p.target && p.target.hp > 0) {
                    const dx = p.target.x - p.x; const dy = p.target.y - p.y; const dist = Math.hypot(dx,dy);
                    if(dist > 0) {p.x += (dx/dist)*p.speed; p.y += (dy/dist)*p.speed;}
                } else {
                    // --- START OF FIX ---
                    // Re-target if the original target is dead
                    const newTarget = enemies
                        .filter(e => e.hp > 0)
                        .sort((a, b) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - b.x, p.y - b.y))[0];
                    if (newTarget) {
                        p.target = newTarget;
                    } else {
                        p.y -= p.speed; // Fallback if no enemies are left
                    }
                    // --- END OF FIX ---
                }
                if (p.y < -20 || p.x < -20 || p.x > canvas.width + 20) { w.projectiles.splice(index, 1); return; }
            }
            if (w.type === 'evo_spiral') { p.y += p.vy; p.x += p.vx; p.angle += p.rotationSpeed; if (Date.now() - p.spawnTime > 3000) { w.projectiles.splice(index, 1); return; } }
        });

        (w.homingProjectiles || []).forEach((p, index) => {
            if (Date.now() - p.spawnTime > 4000) { w.homingProjectiles.splice(index, 1); return; }
            if (p.target && p.target.hp > 0) {
                const dx = p.target.x - p.x; const dy = p.target.y - p.y; const dist = Math.hypot(dx,dy);
                if(dist > 0) {p.x += (dx/dist)*p.speed; p.y += (dy/dist)*p.speed;}
            } else {
                // --- START OF FIX ---
                // Re-target if the original target is dead
                const newTarget = enemies
                    .filter(e => e.hp > 0)
                    .sort((a, b) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - b.x, p.y - b.y))[0];
                if (newTarget) {
                    p.target = newTarget;
                } else {
                    p.y -= p.speed; // Fallback if no enemies are left
                }
                // --- END OF FIX ---
            }
            if (p.y < -20 || p.x < -20 || p.x > canvas.width + 20) { w.homingProjectiles.splice(index, 1); return; }
        });
    });
}
    
    function updateMonsterProjectiles() {
        for (let i = monsterProjectiles.length - 1; i >= 0; i--) {
            const p = monsterProjectiles[i];
            p.x += p.vx;
            p.y += p.vy;
            if (!player.isInvincible && Math.hypot(p.x - player.x, p.y - player.y) < player.radius + p.radius) {
                player.hp -= 12 * (1 - player.stats.damageReduction);
                player.isInvincible = true;
                player.lastHitTime = Date.now();
                uiContainer.classList.add('screen-shake');
                setTimeout(() => uiContainer.classList.remove('screen-shake'), 300);
                if (player.hp <= 0) gameOver();
                monsterProjectiles.splice(i, 1);
                continue;
            }
            if (Date.now() - p.spawnTime > 5000 || p.x < 0 || p.x > canvasWidth || p.y < 0 || p.y > canvasHeight) {
                monsterProjectiles.splice(i, 1);
            }
        }
    }

    function updatePickups() {
        for (let index = pickups.length - 1; index >= 0; index--) {
            const pickup = pickups[index];
            const dx = player.x - pickup.x; const dy = player.y - pickup.y; const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < player.radius + pickup.radius) {
                if (pickup.type === 'health') { player.hp = Math.min(player.maxHp, player.hp + 20); }
                pickups.splice(index, 1);
            }
        }
    }

    function updateXPGems() {
        for (let index = xpGems.length - 1; index >= 0; index--) {
            const gem = xpGems[index];
            const dx = player.x - gem.x; const dy = player.y - gem.y; const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < player.radius + gem.radius) { player.xp += gem.value; checkLevelUp(); xpGems.splice(index, 1); } 
            else if (dist < player.stats.pickupRadius) { gem.x += (dx / dist) * 5 * RENDER_SCALE; gem.y += (dy / dist) * 5 * RENDER_SCALE; }
        }
    }
    
    function checkCollisions() {
        weapons.forEach(w => {
            const damage = w.damage * player.stats.damageModifier;

            if((w.type === 'aura' || w.type === 'evo_orbital_ring')) {
                const cooldown = w.cooldown * player.stats.cooldownModifier;
                if (Date.now() - w.lastAttackTime > cooldown) {
                    w.lastAttackTime = Date.now();
                    enemies.forEach(enemy => {
                        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
                        if (dist < w.range + enemy.radius && (!w.lastHit.has(enemy.id) || Date.now() - w.lastHit.get(enemy.id) > cooldown)) {
                            w.lastHit.set(enemy.id, Date.now()); enemy.hp -= damage; createDamageNumber(enemy.x, enemy.y, damage);
                        }
                    });
                }
            }
            
            // Separate collision checks for different projectile types
            (w.projectiles || []).forEach((p, pIndex) => {
                for (let i = enemies.length - 1; i >= 0; i--) {
                    const enemy = enemies[i];
                    if (!enemy) continue;
                    let hit = false;
                    if (w.type === 'orbital' || w.type === 'sword_orbital') {
                         if (Math.hypot(p.x - enemy.x, p.y - enemy.y) < (w.type === 'sword_orbital' ? 15 : 12) * RENDER_SCALE + enemy.radius) hit = true;
                    } else if (w.type === 'laser_beam') {
                        const dx = p.endX - p.startX; const dy = p.endY - p.startY; const len = Math.hypot(dx, dy);
                        if (len > 0) {
                            const dot = (((enemy.x - p.startX) * dx) + ((enemy.y - p.startY) * dy)) / (len * len);
                            const closestX = p.startX + dot * dx; const closestY = p.startY + dot * dy;
                            if (dot >= 0 && dot <= 1) {
                                if (Math.hypot(enemy.x - closestX, enemy.y - closestY) < enemy.radius + p.width / 2) hit = true;
                            }
                        }
                    } else { // homing, arc, etc.
                         if (Math.hypot(p.x - enemy.x, p.y - enemy.y) < (15 * RENDER_SCALE) + enemy.radius) hit = true;
                    }

                    if (hit && (!p.lastHit.has(enemy.id) || Date.now() - p.lastHit.get(enemy.id) > 500)) {
                        p.lastHit.set(enemy.id, Date.now());
                        enemy.hp -= damage;
                        createDamageNumber(enemy.x, enemy.y, damage);
                        if (w.lifestealChance && Math.random() < w.lifestealChance) { player.hp = Math.min(player.maxHp, player.hp + 1); }
                        
                        if (p.pierceLeft !== undefined) {
                            if (p.pierceLeft > 1) {
                                p.pierceLeft--;
                                const newTarget = enemies
                                    .filter(e => e.id !== enemy.id && e.hp > 0)
                                    .sort((a, b) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - b.x, p.y - b.y))[0];
                                p.target = newTarget;
                            } else {
                                w.projectiles.splice(pIndex, 1);
                                break;
                            }
                        }
                    }
                }
            });

            (w.homingProjectiles || []).forEach((p, pIndex) => {
                 for (let i = enemies.length - 1; i >= 0; i--) {
                    const enemy = enemies[i];
                    if (!enemy) continue;
                    let hit = false;
                     if (Math.hypot(p.x - enemy.x, p.y - enemy.y) < (15 * RENDER_SCALE) + enemy.radius) hit = true;

                    if (hit && (!p.lastHit.has(enemy.id) || Date.now() - p.lastHit.get(enemy.id) > 500)) {
                        p.lastHit.set(enemy.id, Date.now());
                        enemy.hp -= damage;
                        createDamageNumber(enemy.x, enemy.y, damage);
                        
                        if (p.pierceLeft > 1) {
                            p.pierceLeft--;
                            const newTarget = enemies
                                .filter(e => e.id !== enemy.id && e.hp > 0)
                                .sort((a, b) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - b.x, p.y - b.y))[0];
                            p.target = newTarget;
                        } else {
                            w.homingProjectiles.splice(pIndex, 1);
                            break;
                        }
                    }
                 }
            });
        });

        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (enemy.hp <= 0) {
                if (enemy.isHealthDropper) {
                    pickups.push({type: 'health', x: enemy.x, y: enemy.y, radius: 10 * RENDER_SCALE});
                } else if (enemy.isBoss) { 
                    for(let j = 0; j < 20; j++) { const angle = (j / 20) * Math.PI * 2; xpGems.push({x: enemy.x + Math.cos(angle)*30*RENDER_SCALE, y: enemy.y + Math.sin(angle)*30*RENDER_SCALE, radius: 8*RENDER_SCALE, value: 50, color: getXPGemColor(50)}); }
                } else {
                    const soulEater = weapons.find(w => w.id === 'soul_eater');
                    if(soulEater && Math.hypot(player.x - enemy.x, player.y - enemy.y) < soulEater.range && soulEater.lifestealOnKillChance && Math.random() < soulEater.lifestealOnKillChance) {
                        player.hp = Math.min(player.maxHp, player.hp + 1);
                    }
                    xpGems.push({x: enemy.x, y: enemy.y, radius: 5 * RENDER_SCALE, value: enemy.xpValue, color: getXPGemColor(enemy.xpValue)});
                }
                enemies.splice(i, 1); enemiesKilledCount++;
            }
        }
    }
    
    function createDamageNumber(x, y, amount) { const el = document.createElement('div'); el.className = 'damage-number'; el.textContent = Math.round(amount); el.style.left = `${x}px`; el.style.top = `${y}px`; damageNumbersContainer.appendChild(el); setTimeout(() => el.remove(), 700); }

    function checkLevelUp() {
        while (player.xp >= player.xpToNextLevel) {
            player.level++;
            player.xp -= player.xpToNextLevel;
            player.xpToNextLevel = Math.floor(player.xpToNextLevel * 1.2 + 20);
            player.maxHp += 5;
            player.hp = Math.min(player.maxHp, player.hp + 5);
            gameState = 'levelUp';
            const options = getUpgradeOptions();
            displayUpgradeOptions(options);
            levelUpScreen.classList.remove('hidden');
            levelUpScreen.classList.add('flex');
            cancelAnimationFrame(animationFrameId);
        }
    }
    
    // --- Drawing ---
    function drawPlayer(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, p.radius, p.radius, p.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.isInvincible ? 'rgba(255, 255, 255, 0.5)' : p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, Math.PI, 0);
        ctx.rect(-p.radius, 0, p.radius * 2, p.radius * 0.8);
        ctx.fill();
        ctx.beginPath();
        const feetWidth = p.radius * 0.4;
        ctx.rect(-p.radius * 0.8, p.radius * 0.8, feetWidth, p.radius * 0.4);
        ctx.rect(p.radius * 0.4, p.radius * 0.8, feetWidth, p.radius * 0.4);
        ctx.fill();
        ctx.fillStyle = '#ADD8E6';
        ctx.beginPath();
        ctx.ellipse(0, -p.radius * 0.1, p.radius * 0.7, p.radius * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(-p.radius * 0.1, -p.radius * 0.2, p.radius * 0.2, p.radius * 0.1, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }

    function drawEnemy(e) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(0, e.radius, e.radius * 0.9, e.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        if (e.type === 'tank') {
            const bodyWobble = Math.sin(Date.now() / 200) * (e.radius * 0.05);
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, e.radius + bodyWobble, e.radius - bodyWobble, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.ellipse(-e.radius * 0.3, -e.radius * 0.3, e.radius * 0.3, e.radius * 0.2, -Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (e.type === 'ghost') {
            const bob = Math.sin(Date.now() / 150) * (e.radius * 0.1);
            ctx.fillStyle = e.color;
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.arc(0, bob, e.radius, Math.PI, 0);
            ctx.rect(-e.radius, bob, e.radius * 2, e.radius);
            const waveCount = 4;
            for (let i = 0; i < waveCount; i++) {
                const startX = -e.radius + (e.radius * 2 * i / waveCount);
                const endX = -e.radius + (e.radius * 2 * (i + 1) / waveCount);
                const controlX = (startX + endX) / 2;
                const controlY = e.radius + bob + (i % 2 === 0 ? e.radius * 0.3 : -e.radius * 0.3);
                if (i === 0) { ctx.lineTo(startX, e.radius + bob); }
                ctx.quadraticCurveTo(controlX, controlY, endX, e.radius + bob);
            }
            ctx.lineTo(e.radius, bob);
            ctx.fill();
            ctx.globalAlpha = 1;
        } else { // Bat / Watcher
            const wingFlap = Math.sin(Date.now() / 100) * (e.radius * 0.3);
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, e.radius * 0.7, e.radius, 0, 0, Math.PI * 2); // Body
            ctx.fill();
            if (e.type !== 'watcher') { // Wings for bats
                ctx.beginPath();
                ctx.moveTo(0, -e.radius * 0.5);
                ctx.quadraticCurveTo(-e.radius * 1.5, -e.radius * 0.5 + wingFlap, -e.radius * 0.8, e.radius * 0.5);
                ctx.quadraticCurveTo(-e.radius * 0.5, e.radius * 0.2, 0, -e.radius * 0.5);
                ctx.moveTo(0, -e.radius * 0.5);
                ctx.quadraticCurveTo(e.radius * 1.5, -e.radius * 0.5 + wingFlap, e.radius * 0.8, e.radius * 0.5);
                ctx.quadraticCurveTo(e.radius * 0.5, e.radius * 0.2, 0, -e.radius * 0.5);
                ctx.fill();
            }
        }
        
        let eyeColor = e.isHealthDropper ? '#ef4444' : 'white';
        if (e.type === 'watcher') eyeColor = '#ECC94B';
        if (e.type === 'tank') eyeColor = 'black';
        if (e.type !== 'ghost') {
            ctx.fillStyle = eyeColor;
            ctx.beginPath();
            const eyeRadius = e.type === 'watcher' ? e.radius * 0.4 : 2 * RENDER_SCALE;
            const eyeY = e.type === 'watcher' ? 0 : -e.radius * 0.1;
            const eyeXOffset = e.type === 'watcher' ? 0 : e.radius * 0.2;
            ctx.arc(-eyeXOffset, eyeY, eyeRadius, 0, Math.PI * 2);
            if (e.type !== 'watcher') {
                ctx.arc(eyeXOffset, eyeY, eyeRadius, 0, Math.PI * 2);
            }
            ctx.fill();
            if (e.type === 'watcher') {
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(0, 0, eyeRadius * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
       
        if (e.isBoss) { ctx.fillStyle = 'yellow'; ctx.font = `${20 * RENDER_SCALE}px Kanit`; ctx.textAlign = 'center'; ctx.fillText('👑', 0, -e.radius - 10); }
        if (e.isHealthDropper) { ctx.fillStyle = 'white'; ctx.font = `bold ${14 * RENDER_SCALE}px Kanit`; ctx.textAlign = 'center'; ctx.fillText('❤️', 0, e.radius * 0.4); }
        if (e.hp < e.maxHp) {
            ctx.fillStyle = '#7f1d1d'; ctx.fillRect(-e.radius, -e.radius - (8 * RENDER_SCALE), e.radius * 2, 4 * RENDER_SCALE);
            ctx.fillStyle = '#16a34a'; ctx.fillRect(-e.radius, -e.radius - (8 * RENDER_SCALE), (e.radius * 2) * (e.hp / e.maxHp), 4 * RENDER_SCALE);
        }
        ctx.restore();
    }
    
    function drawMonsterProjectiles() {
        monsterProjectiles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.fillStyle = '#f56565';
            ctx.shadowColor = '#c53030';
            ctx.shadowBlur = 8 * RENDER_SCALE;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPlayer(player);
        xpGems.forEach(g => { ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(Math.PI / 4); ctx.fillStyle = g.color; ctx.fillRect(-g.radius, -g.radius, g.radius*2, g.radius*2); ctx.restore(); });
        pickups.forEach(p => { if (p.type === 'health') { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(p.x, p.y - 3*RENDER_SCALE); ctx.bezierCurveTo(p.x, p.y - 7*RENDER_SCALE, p.x - 6*RENDER_SCALE, p.y - 7*RENDER_SCALE, p.x - 6*RENDER_SCALE, p.y); ctx.bezierCurveTo(p.x - 6*RENDER_SCALE, p.y + 5*RENDER_SCALE, p.x, p.y + 9*RENDER_SCALE, p.x, p.y + 12*RENDER_SCALE); ctx.bezierCurveTo(p.x, p.y + 9*RENDER_SCALE, p.x + 6*RENDER_SCALE, p.y + 5*RENDER_SCALE, p.x + 6*RENDER_SCALE, p.y); ctx.bezierCurveTo(p.x + 6*RENDER_SCALE, p.y - 7*RENDER_SCALE, p.x, p.y - 7*RENDER_SCALE, p.x, p.y - 3*RENDER_SCALE); ctx.fill(); }});
        enemies.forEach(e => drawEnemy(e));
        drawMonsterProjectiles();

        weapons.forEach(w => {
            // Draw Auras and Rings
            if (w.type === 'aura') { const auraTime = Date.now() / 200; const radius = w.range * (0.95 + Math.sin(auraTime * 0.5) * 0.05); const isEvolved = w.id === 'soul_eater'; let gradient = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, radius); if (isEvolved) { gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)'); gradient.addColorStop(0.7, 'rgba(6, 95, 70, 0.2)'); gradient.addColorStop(1, 'rgba(5, 46, 22, 0)'); } else { gradient.addColorStop(0, 'rgba(253, 224, 71, 0.3)'); gradient.addColorStop(0.7, 'rgba(250, 204, 21, 0.1)'); gradient.addColorStop(1, 'rgba(252, 165, 165, 0)'); } ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(player.x, player.y, radius, 0, Math.PI*2); ctx.fill(); }
            if (w.type === 'evo_orbital_ring') {
                const ringTime = Date.now();
                const alpha = 0.6 + Math.sin(ringTime / 150) * 0.3;
                ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
                ctx.lineWidth = 15 * RENDER_SCALE;
                ctx.shadowColor = '#a78bfa';
                ctx.shadowBlur = 20 * RENDER_SCALE;
                ctx.beginPath();
                ctx.arc(player.x, player.y, w.range, 0, Math.PI * 2);
                ctx.stroke();
                const baseAngle = (ringTime / 1500) * Math.PI * 2;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.lineWidth = 3 * RENDER_SCALE;
                for (let i = 0; i < 5; i++) {
                    const arcAngle = baseAngle + (i / 5) * Math.PI * 2;
                    const startAngle = arcAngle - 0.3;
                    const endAngle = arcAngle + 0.3;
                    ctx.beginPath();
                    ctx.arc(player.x, player.y, w.range, startAngle, endAngle);
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
            }

            // Draw standard projectiles (orbiting, arcing, homing missiles, etc.) from the 'projectiles' array
            (w.projectiles || []).forEach(p => {
                ctx.save();
                if (w.type === 'laser_beam') {
                    const life = (Date.now() - p.spawnTime) / w.duration;
                    const alpha = life < 0.5 ? (life * 2) : (1 - (life - 0.5) * 2);
                    ctx.globalAlpha = alpha;
                    const isEvolved = w.isEvolved;
                    ctx.lineWidth = p.width; ctx.lineCap = 'round'; ctx.shadowBlur = 15 * RENDER_SCALE;
                    const gradient = ctx.createLinearGradient(p.startX, p.startY, p.endX, p.endY);
                    if(isEvolved) {
                        ctx.shadowColor = '#fef08a';
                        gradient.addColorStop(0, "rgba(253, 230, 138, 0)"); gradient.addColorStop(0.5, "#fde047"); gradient.addColorStop(1, "rgba(253, 230, 138, 0)");
                    } else {
                        ctx.shadowColor = '#f87171';
                        gradient.addColorStop(0, "rgba(239, 68, 68, 0)"); gradient.addColorStop(0.5, "#ef4444"); gradient.addColorStop(1, "rgba(239, 68, 68, 0)");
                    }
                    ctx.strokeStyle = gradient;
                    ctx.beginPath(); ctx.moveTo(p.startX, p.startY); ctx.lineTo(p.endX, p.endY); ctx.stroke();
                } else {
                    ctx.translate(p.x, p.y);
                }

                if (w.type === 'orbital' || w.type === 'sword_orbital') {
                    const isSword = w.type === 'sword_orbital';
                    ctx.rotate(p.angle + Math.PI / (isSword ? 2 : 1));
                    const s = RENDER_SCALE;
                    if (isSword) {
                        // Draw Orbiting Sword
                        ctx.shadowColor = '#a78bfa';
                        ctx.shadowBlur = 10 * s;
                        const bladeGradient = ctx.createLinearGradient(0, -18 * s, 0, 15 * s);
                        bladeGradient.addColorStop(0, '#f8fafc'); bladeGradient.addColorStop(0.5, '#94a3b8'); bladeGradient.addColorStop(1, '#64748b');
                        ctx.fillStyle = bladeGradient;
                        ctx.beginPath(); ctx.moveTo(0, -18 * s); ctx.lineTo(4 * s, 15 * s); ctx.lineTo(-4 * s, 15 * s); ctx.closePath(); ctx.fill();
                        ctx.fillStyle = '#64748b'; ctx.fillRect(-8 * s, 12 * s, 16 * s, 4 * s);
                        ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, 18 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
                    } else { // Lightning
                        ctx.shadowColor = '#00BFFF'; ctx.shadowBlur = 15 * s; const gradient = ctx.createRadialGradient(0, 0, 2*s, 0, 0, 12*s); gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); gradient.addColorStop(0.4, 'rgba(173, 216, 230, 0.8)'); gradient.addColorStop(1, 'rgba(0, 191, 255, 0)'); ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(0, 0, 12 * s, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 2 * s; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(0, 0); const angle = Math.random() * Math.PI * 2; const length = (10 + Math.random() * 5) * s; ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length); ctx.stroke(); } ctx.shadowBlur = 0;
                    }
                }
                else if (w.type === 'arc' || w.type === 'evo_spiral') { ctx.rotate(p.angle); const s = RENDER_SCALE; ctx.fillStyle = '#8B4513'; ctx.fillRect(-4*s, -20*s, 8*s, 40*s); ctx.beginPath(); ctx.moveTo(0, -22*s); ctx.lineTo(18*s, -15*s); ctx.lineTo(18*s, 15*s); ctx.lineTo(0, 22*s); ctx.lineTo(-18*s, 15*s); ctx.lineTo(-18*s, -15*s); ctx.closePath(); const gradient = ctx.createLinearGradient(-18*s, 0, 18*s, 0); gradient.addColorStop(0, '#A0AEC0'); gradient.addColorStop(0.5, '#E2E8F0'); gradient.addColorStop(1, '#A0AEC0'); ctx.fillStyle = gradient; ctx.fill(); ctx.strokeStyle = '#4A5568'; ctx.lineWidth = 2*s; ctx.stroke(); }
                else if (w.type === 'homing' || w.type === 'evo_stream' || w.type === 'evo_sword_orbit') {
                    const isEvolvedMissile = w.id === 'thousand_edge';
                    const isSword = w.type === 'evo_sword_orbit';
                    const s = RENDER_SCALE;
                    const angle = p.target && p.target.hp > 0 ? Math.atan2(p.target.y - p.y, p.target.x - p.x) + Math.PI / 2 : (p.angle || 0);
                    p.angle = angle;
                    ctx.rotate(angle);
                    ctx.shadowBlur = 10 * s;

                    if (isEvolvedMissile || isSword) {
                        ctx.shadowColor = isSword ? '#fca5a5' : '#fde047';
                        let grad = ctx.createLinearGradient(0, -12 * s, 0, 8 * s);
                        grad.addColorStop(0, isSword ? '#fecaca' : '#fef9c3'); grad.addColorStop(1, isSword ? '#ef4444' : '#facc15');
                        ctx.fillStyle = grad;
                        ctx.beginPath(); ctx.moveTo(0, -12 * s); ctx.lineTo(5 * s, 8 * s); ctx.lineTo(-5 * s, 8 * s); ctx.closePath(); ctx.fill();
                    } else {
                        ctx.shadowColor = '#c4b5fd';
                        let grad = ctx.createRadialGradient(0, 0, 1 * s, 0, 0, 6 * s);
                        grad.addColorStop(0, '#fff'); grad.addColorStop(0.4, '#ddd6fe'); grad.addColorStop(1, 'rgba(167, 139, 250, 0)');
                        ctx.fillStyle = grad;
                        ctx.beginPath(); ctx.arc(0, 0, 6 * s, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = 'rgba(196, 181, 253, 0.5)';
                        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(4 * s, 12 * s); ctx.lineTo(-4 * s, 12 * s); ctx.closePath(); ctx.fill();
                    }
                }
                ctx.restore();
            });

            // Draw special homing projectiles (like the sword's) from the 'homingProjectiles' array
            (w.homingProjectiles || []).forEach(p => {
                ctx.save();
                ctx.translate(p.x, p.y);

                const s = RENDER_SCALE;
                const angle = p.target && p.target.hp > 0 ? Math.atan2(p.target.y - p.y, p.target.x - p.x) + Math.PI / 2 : (p.angle || 0);
                p.angle = angle;
                ctx.rotate(angle);
                
                // Drawing logic for a homing sword
                ctx.shadowColor = '#a78bfa';
                ctx.shadowBlur = 10 * s;
                const bladeGradient = ctx.createLinearGradient(0, -18 * s, 0, 15 * s);
                bladeGradient.addColorStop(0, '#f8fafc'); bladeGradient.addColorStop(0.5, '#94a3b8'); bladeGradient.addColorStop(1, '#64748b');
                ctx.fillStyle = bladeGradient;
                ctx.beginPath(); ctx.moveTo(0, -18 * s); ctx.lineTo(4 * s, 15 * s); ctx.lineTo(-4 * s, 15 * s); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#64748b'; ctx.fillRect(-8 * s, 12 * s, 16 * s, 4 * s);
                ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, 18 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
                
                ctx.restore();
            });
        });
        
        healthBar.style.width = `${(player.hp/player.maxHp)*100}%`; 
        healthText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
        xpBar.style.width = `${(player.xp/player.xpToNextLevel)*100}%`; 
        levelText.textContent = `เลเวล: ${player.level}`;
        const min = Math.floor(gameTime/60).toString().padStart(2,'0'); const sec = (gameTime%60).toString().padStart(2,'0');
        timerText.textContent = `เวลา: ${min}:${sec}`;
    }

    // --- Game Loop and State ---
    let lastTime = 0, spawnTimer = 0, gameClockTimer = 0, healthSpawnTimer = 0, watcherSpawnTimer = 0;
    function gameLoop(timestamp) {
        if (gameState !== 'playing') return;
        const deltaTime = (timestamp - lastTime) / 1000; lastTime = timestamp;
        spawnTimer += deltaTime; gameClockTimer += deltaTime; healthSpawnTimer += deltaTime; watcherSpawnTimer += deltaTime;

        if (gameClockTimer >= 1) { gameTime++; gameClockTimer = 0; }
        
        const RAMP_UP_DURATION = 360; // 6 minutes
        const progress = Math.min(1.0, gameTime / RAMP_UP_DURATION);
        const easedProgress = progress * progress; // Quadratic easing (slow start)

        const INITIAL_SPAWN_MULT = 4.0; const RAMP_END_SPAWN_MULT = 1.0;
        const INITIAL_HP_MULT = 0.4; const RAMP_END_HP_MULT = 1.0;
        const INITIAL_SPEED_MULT = 0.8; const RAMP_END_SPEED_MULT = 1.0;
        
        difficultyManager.enemyHpMultiplier = INITIAL_HP_MULT * (1 - easedProgress) + RAMP_END_HP_MULT * easedProgress;
        difficultyManager.enemySpeedMultiplier = INITIAL_SPEED_MULT * (1 - easedProgress) + RAMP_END_SPEED_MULT * easedProgress;
        const currentSpawnRateMultiplier = INITIAL_SPAWN_MULT * (1 - easedProgress) + RAMP_END_SPAWN_MULT * easedProgress;
        
        // After ramp-up, continue scaling difficulty
        if (gameTime > RAMP_UP_DURATION) {
            const postRampMinutes = (gameTime - RAMP_UP_DURATION) / 60;
            difficultyManager.enemyHpMultiplier += postRampMinutes * 0.5;
            difficultyManager.enemySpeedMultiplier += postRampMinutes * 0.08;
        }

        if (healthSpawnTimer > 30) { spawnHealthEnemy(); healthSpawnTimer = 0; }
        if (gameTime >= nextBossTime) { spawnBoss(); nextBossTime += 300; }
        if (gameTime > 360 && watcherSpawnTimer > 20) {
             for(let i=0; i<3; i++) spawnWatcher();
             watcherSpawnTimer = 0;
        }
        
        const spawnRate = Math.max(0.08, 0.5 * currentSpawnRateMultiplier);
        if (spawnTimer > spawnRate) { 
            const waveSize = 1 + Math.floor(easedProgress * 4 + (gameTime / 60)); 
            for(let i=0; i<waveSize; i++) spawnEnemy(); 
            spawnTimer = 0; 
        }
        updatePlayer(); updateEnemies(); updateMonsterProjectiles(); updateWeapons(); updateXPGems(); updatePickups(); checkCollisions(); draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    function resetGame() {
        player.hp = 100; player.maxHp = 100; player.xp = 0; player.level = 1;
        player.xpToNextLevel = 10;
        player.x = canvas.width / 2; player.y = canvas.height / 2;
        player.passives = [];
        player.stats = { speed: 3 * RENDER_SCALE, damageModifier: 1.0, cooldownModifier: 1.0, projectileSpeedModifier: 1.0, damageReduction: 0, pickupRadius: 100 * RENDER_SCALE };
        weapons = []; enemies = []; xpGems = []; pickups = []; monsterProjectiles = [];
        gameTime = 0; enemiesKilledCount = 0; spawnTimer = 0; gameClockTimer = 0; healthSpawnTimer = 0; watcherSpawnTimer = 0; nextBossTime = 300;
        difficultyManager = { enemyHpMultiplier: 1.0, enemySpeedMultiplier: 1.0 };
        updateInventoryUI();
    }
    
    function startGame() {
        if (!selectedCharacterId) return; resetGame();
        const character = CHARACTERS.find(c => c.id === selectedCharacterId);
        player.color = character.color;
        const weaponId = character.startingWeaponId;
        const weaponInstance = JSON.parse(JSON.stringify(WEAPONS_MASTER_LIST[weaponId]));
        weaponInstance.id = weaponId; weaponInstance.level = 1; weapons.push(weaponInstance);
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        gameOverScreen.classList.remove('flex');
        gameState = 'playing'; lastTime = performance.now(); gameLoop(lastTime);
    }

    function gameOver() {
        gameState = 'gameOver'; cancelAnimationFrame(animationFrameId);
        const min = Math.floor(gameTime/60).toString().padStart(2,'0'); const sec = (gameTime%60).toString().padStart(2,'0');
        document.getElementById('survivalTime').textContent = `${min}:${sec}`;
        document.getElementById('enemiesKilled').textContent = enemiesKilledCount;
        gameOverScreen.classList.remove('hidden');
        gameOverScreen.classList.add('flex');
    }

    // Menu Navigation
    menuStartButton.addEventListener('click', () => {
        mainMenuScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        startScreen.classList.add('flex');
    });

    menuGuideButton.addEventListener('click', () => {
        guideReturnState = 'menu';
        mainMenuScreen.classList.add('hidden');
        guideScreen.classList.remove('hidden');
        guideScreen.classList.add('flex');
        populateEvoGuide();
    });
    
    pauseButton.addEventListener('click', () => {
        if(gameState === 'playing') {
            gameState = 'paused';
            cancelAnimationFrame(animationFrameId);
            pauseScreen.classList.remove('hidden');
            pauseScreen.classList.add('flex');
        }
    });

    resumeButton.addEventListener('click', () => {
        pauseScreen.classList.add('hidden');
        pauseScreen.classList.remove('flex');
        gameState = 'playing';
        lastTime = performance.now();
        gameLoop(lastTime);
    });
    
    pauseGuideButton.addEventListener('click', () => {
        guideReturnState = 'pause';
        pauseScreen.classList.add('hidden');
        pauseScreen.classList.remove('flex');
        guideScreen.classList.remove('hidden');
        guideScreen.classList.add('flex');
        populateEvoGuide();
    });

    guideBackButton.addEventListener('click', () => {
        guideScreen.classList.add('hidden');
        guideScreen.classList.remove('flex');
        if (guideReturnState === 'pause') {
            pauseScreen.classList.remove('hidden');
            pauseScreen.classList.add('flex');
        } else {
            mainMenuScreen.classList.remove('hidden');
        }
    });

    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', () => {
        gameOverScreen.classList.add('hidden');
        gameOverScreen.classList.remove('flex');
        mainMenuScreen.classList.remove('hidden');
        startButton.disabled = true;
        document.querySelectorAll('#characterSelection .card').forEach(c => c.classList.remove('selected'));
    });
    
    // Initial call
    populateCharacterSelection();