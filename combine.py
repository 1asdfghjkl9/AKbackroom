#!/usr/bin/env python3
"""
Combine all JS parts + HTML template into a single index.html
Usage: python3 combine.py
"""
import os

BASE = os.path.dirname(os.path.abspath(__file__))

def read_part(name):
    path = os.path.join(BASE, name)
    if os.path.exists(path):
        with open(path, 'r') as f:
            return f.read()
    return f'// {name} NOT FOUND'

# === Part 4: Main Game Loop ===
PART4 = r"""
// ===== PART 4: MAIN GAME LOOP =====

let gameClock = null;
let gameRunning = false;

function initGame() {
  Game.scene = new THREE.Scene();
  Game.camera = new THREE.PerspectiveCamera(CONFIG.fov, window.innerWidth/window.innerHeight, CONFIG.near, CONFIG.far);
  Game.renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
  Game.renderer.setSize(window.innerWidth, window.innerHeight);
  Game.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  Game.renderer.shadowMap.enabled = true;
  Game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(Game.renderer.domElement);
  Game.renderer.domElement.id = 'gameCanvas';
  
  AudioSystem.init();
  setupInputs();
  uiSystem.showMainMenu();
  
  gameClock = new THREE.Clock();
  gameRunning = true;
  animate();
}

function setupInputs() {
  document.addEventListener('keydown', e => {
    if (Game.keys[e.code] === undefined) Game.keys[e.code] = false;
    Game.keys[e.code] = true;
    if (Game.state === 'playing') handleGameKey(e.code);
  });
  document.addEventListener('keyup', e => { Game.keys[e.code] = false; });
  
  document.addEventListener('mousemove', e => {
    if (Game.isPointerLocked) {
      Game.mouse.dx += e.movementX * Game.sensitivity || e.movementX * 0.002;
      Game.mouse.dy += e.movementY * Game.sensitivity || e.movementY * 0.002;
    }
  });
  
  document.addEventListener('mousedown', e => {
    if (Game.state === 'playing' && Game.isPointerLocked) {
      if (e.button === 0) Game.mouse.leftDown = true;
      if (e.button === 2) { Game.mouse.rightDown = true; Game.isADS = true; }
    }
  });
  document.addEventListener('mouseup', e => {
    if (e.button === 0) Game.mouse.leftDown = false;
    if (e.button === 2) { Game.mouse.rightDown = false; Game.isADS = false; }
  });
  
  document.addEventListener('pointerlockchange', () => {
    Game.isPointerLocked = (document.pointerLockElement === document.getElementById('gameCanvas'));
    if (!Game.isPointerLocked && Game.state === 'playing') {
      uiSystem.showPauseMenu();
    }
  });
  
  window.addEventListener('resize', () => {
    if (!Game.camera) return;
    Game.camera.aspect = window.innerWidth/window.innerHeight;
    Game.camera.updateProjectionMatrix();
    Game.renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  document.addEventListener('contextmenu', e => e.preventDefault());
}

function handleGameKey(code) {
  switch(code) {
    case 'KeyR': weaponController.reload(); break;
    case 'KeyE': tryInteract(); break;
    case 'KeyT': itemSystem.toggleFlashlight(); break;
    case 'KeyQ': skillSystem.useSkill(0); break;
    case 'KeyF': skillSystem.useSkill(1); break;
    case 'KeyG': skillSystem.useSkill(2); break;
    case 'KeyX': skillSystem.useSkill(3); break;
    case 'Tab': e => { e.preventDefault(); uiSystem.showInventory(); }; break;
    case 'KeyM': uiSystem.toggleMap(); break;
    case 'Escape': uiSystem.showPauseMenu(); break;
    case 'Digit1': weaponController.switchWeapon(0); break;
    case 'Digit2': weaponController.switchWeapon(1); break;
    case 'Digit3': weaponController.switchWeapon(2); break;
    case 'Digit4': weaponController.switchWeapon(3); break;
    case 'Digit5': weaponController.switchWeapon(4); break;
    case 'KeyV': useQuickSlot(0); break;
    case 'KeyB': useQuickSlot(1); break;
    case 'KeyN': useQuickSlot(2); break;
  }
}

function useQuickSlot(slot) {
  if (itemSystem.inventory[slot]) {
    itemSystem.useItem(itemSystem.inventory[slot].id);
  }
}

function startGame() {
  Game.state = 'loading';
  Game.currentLevel = 0;
  Game.player.health = 100;
  Game.player.maxHealth = 100;
  Game.player.san = 100;
  Game.player.maxSan = 100;
  Game.player.coins = 0;
  Game.player.exp = 0;
  Game.player.level = 1;
  Game.player.expToNext = 100;
  Game.player.skillPoints = 0;
  Game.killCount = 0;
  Game.lootValue = 0;
  Game.extractActive = false;
  Game.extractTimer = 0;
  
  // Give starting weapon
  Game.player.weapons = ['p92', 'knife'];
  Game.player.equippedWeapon = 'p92';
  weaponController.switchWeapon('p92');
  
  // Default skills
  skillSystem.activeSkills = ['dash', 'heal', 'smoke'];
  skillSystem.ultimateSkill = 'ultimate';
  skillSystem.cooldowns = {};
  skillSystem.ultimateCharge = 0;
  
  // Starting items
  itemSystem.inventory = [
    {id: 'flashlight', count: 1},
    {id: 'syringe', count: 2},
    {id: 'radio', count: 1}
  ];
  
  loadLevel(0);
}

function loadLevel(levelIndex) {
  Game.state = 'loading';
  Game.currentLevel = levelIndex;
  
  uiSystem.showLoading(levelIndex);
  
  setTimeout(() => {
    // Clear scene
    while(Game.scene.children.length > 0) {
      let obj = Game.scene.children[0];
      Game.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }
    
    Game.monsters = [];
    Game.items = [];
    Game.lootBoxes = [];
    Game.extractPoints = [];
    Game.walls = [];
    Game.lights = [];
    Game.particles = [];
    
    // Generate map
    let mapData = MapGenerator.generate(levelIndex);
    Game.mapData = mapData;
    Game.walls = mapData.walls;
    
    // Build scene
    SceneBuilder.buildScene(mapData, levelIndex);
    
    // Set spawn point
    if (mapData.spawnPoint) {
      Game.player.position.copy(mapData.spawnPoint);
      Game.player.position.y = CONFIG.playerHeight;
    }
    
    // Spawn monsters
    spawnMonsters(levelIndex, mapData, Game.player.position);
    
    // Play ambient
    AudioSystem.playAmbient(levelIndex);
    
    // Start playing
    Game.state = 'playing';
    Game.camera.position.copy(Game.player.position);
    
    // Request pointer lock
    document.getElementById('gameCanvas').requestPointerLock();
    
    uiSystem.hideLoading();
    uiSystem.showMessage('Level ' + levelIndex + ': ' + CONFIG.levels[levelIndex].name, 3000, '#ff4444');
  }, 1500);
}

function tryInteract() {
  if (!Game.mapData) return;
  let playerPos = Game.player.position;
  
  // Check extract points
  for (let ep of Game.extractPoints) {
    if (ep.activated) continue;
    let dist = playerPos.distanceTo(ep.position);
    if (dist < 3) {
      startExtract(ep);
      return;
    }
  }
  
  // Check active extract (to cancel)
  if (Game.extractActive) {
    let dist = playerPos.distanceTo(Game.extractPosition);
    if (dist > 5) {
      Game.extractActive = false;
      Game.extractTimer = 0;
      uiSystem.showMessage('撤离已取消', 2000, '#ff4444');
    }
    return;
  }
  
  // Check loot boxes
  for (let lb of Game.lootBoxes) {
    if (lb.opened) continue;
    let dist = playerPos.distanceTo(lb.position);
    if (dist < 2.5) {
      openLootBox(lb);
      return;
    }
  }
  
  // Check items on ground
  for (let item of Game.items) {
    if (item.pickedUp) continue;
    let dist = playerPos.distanceTo(item.position);
    if (dist < 2) {
      pickupItem(item);
      return;
    }
  }
  
  // Check hidden room doors
  if (Game.mapData.hiddenDoors) {
    for (let door of Game.mapData.hiddenDoors) {
      let dist = playerPos.distanceTo(door.position);
      if (dist < 3 && !door.opened) {
        if (itemSystem.inventory.some(i => i.id === 'key')) {
          door.opened = true;
          door.mesh.visible = false;
          let keyIdx = itemSystem.inventory.findIndex(i => i.id === 'key');
          itemSystem.inventory.splice(keyIdx, 1);
          uiSystem.showMessage('隐藏房间已开启！', 2000, '#00ff00');
          AudioSystem.playPickup();
        } else {
          uiSystem.showMessage('需要生锈钥匙', 2000, '#ff4444');
        }
        return;
      }
    }
  }
  
  // Check safe house
  if (Game.mapData.safeHouse) {
    let dist = playerPos.distanceTo(Game.mapData.safeHouse);
    if (dist < 4) {
      Game.player.health = Math.min(Game.player.maxHealth, Game.player.health + 50);
      horrorSystem.addSan(30);
      weaponController.currentReserve = Math.min(weaponController.currentReserve + 30, 120);
      uiSystem.showMessage('安全屋：恢复生命/SAN/弹药', 2000, '#00ff00');
      AudioSystem.playPickup();
    }
  }
}

function openLootBox(box) {
  box.opened = true;
  if (box.mesh) {
    box.mesh.rotation.x = -Math.PI / 4;
  }
  
  // Generate loot
  let loot = generateLoot(box.rarity || 'common');
  for (let item of loot) {
    if (item.type === 'weapon') {
      if (!Game.player.weapons.includes(item.id)) {
        Game.player.weapons.push(item.id);
        uiSystem.showMessage('获得武器: ' + item.name, 3000, '#ffaa00');
      }
    } else if (item.type === 'ammo') {
      weaponController.currentReserve += item.amount;
      uiSystem.showMessage('获得弹药 x' + item.amount, 2000, '#ffffff');
    } else if (item.type === 'coin') {
      Game.player.coins += item.amount;
      Game.lootValue += item.amount;
      uiSystem.showMessage('获得后室币 x' + item.amount, 2000, '#ffdd00');
    } else if (item.type === 'item') {
      itemSystem.pickupItem(item.id);
      uiSystem.showMessage('获得道具: ' + item.name, 2000, '#00ff00');
    } else if (item.type === 'exp') {
      rpgSystem.addExp(item.amount);
    }
  }
  
  rpgSystem.addExp(20);
  AudioSystem.playPickup();
}

function generateLoot(rarity) {
  let loot = [];
  let rolls = rarity === 'rare' ? 3 : rarity === 'epic' ? 5 : 1;
  
  for (let i = 0; i < rolls; i++) {
    let roll = Math.random();
    if (roll < 0.3) {
      let weapons = ['m416', 'akm', 'scar_l', 'ump45', 'vector', 's12k', 's686', 'kar98k', 'awm'];
      let wid = weapons[Math.floor(Math.random() * weapons.length)];
      loot.push({type: 'weapon', id: wid, name: WEAPONS[wid] ? WEAPONS[wid].name : wid});
    } else if (roll < 0.5) {
      loot.push({type: 'ammo', amount: 15 + Math.floor(Math.random() * 30)});
    } else if (roll < 0.7) {
      let amount = rarity === 'rare' ? 50 : rarity === 'epic' ? 100 : 20;
      amount += Math.floor(Math.random() * 30);
      loot.push({type: 'coin', amount: amount});
    } else if (roll < 0.85) {
      let items = ['syringe', 'molotov', 'signal_gun', 'radio', 'relic'];
      let iid = items[Math.floor(Math.random() * items.length)];
      loot.push({type: 'item', id: iid, name: ITEMS[iid] ? ITEMS[iid].name : iid});
    } else {
      loot.push({type: 'exp', amount: 30 + Math.floor(Math.random() * 50)});
    }
  }
  
  return loot;
}

function pickupItem(item) {
  item.pickedUp = true;
  if (item.mesh) Game.scene.remove(item.mesh);
  
  if (item.kind === 'weapon') {
    if (!Game.player.weapons.includes(item.weaponId)) {
      Game.player.weapons.push(item.weaponId);
      uiSystem.showMessage('捡起武器: ' + item.name, 2000, '#ffaa00');
    }
  } else if (item.kind === 'ammo') {
    weaponController.currentReserve += item.amount;
    uiSystem.showMessage('弹药 +' + item.amount, 1500, '#ffffff');
  } else if (item.kind === 'coin') {
    Game.player.coins += item.amount;
    Game.lootValue += item.amount;
    uiSystem.showMessage('后室币 +' + item.amount, 1500, '#ffdd00');
  } else if (item.kind === 'item') {
    itemSystem.pickupItem(item.itemId);
    uiSystem.showMessage('获得: ' + item.name, 1500, '#00ff00');
  }
  
  rpgSystem.addExp(10);
  AudioSystem.playPickup();
}

function startExtract(ep) {
  ep.activated = true;
  Game.extractActive = true;
  Game.extractTimer = 30;
  Game.extractPosition = ep.position.clone();
  uiSystem.showMessage('撤离启动！坚守30秒！', 3000, '#ff4444');
  AudioSystem.playExtractAlarm();
  
  // Spawn extra monsters during extract
  setTimeout(() => {
    if (Game.extractActive) {
      spawnMonsters(Game.currentLevel, Game.mapData, Game.player.position);
    }
  }, 5000);
  setTimeout(() => {
    if (Game.extractActive) {
      spawnMonsters(Game.currentLevel, Game.mapData, Game.player.position);
    }
  }, 15000);
}

function completeExtract() {
  Game.extractActive = false;
  Game.extractTimer = 0;
  Game.state = 'extracting';
  
  let expReward = 50 + Game.killCount * 10 + Math.floor(Game.lootValue / 2);
  let coinReward = Game.lootValue + Game.killCount * 5;
  
  rpgSystem.addExp(expReward);
  Game.player.coins += coinReward;
  
  uiSystem.showExtractScreen({
    kills: Game.killCount,
    lootValue: Game.lootValue,
    expGained: expReward,
    coinsGained: coinReward,
    level: Game.currentLevel
  });
  
  document.exitPointerLock();
}

function nextLevel() {
  if (Game.currentLevel < 4) {
    Game.killCount = 0;
    Game.lootValue = 0;
    loadLevel(Game.currentLevel + 1);
  } else {
    Game.state = 'victory';
    uiSystem.showVictoryScreen();
    document.exitPointerLock();
  }
}

function playerDeath() {
  Game.state = 'dead';
  document.exitPointerLock();
  AudioSystem.playHurt();
  uiSystem.showDeathScreen({
    kills: Game.killCount,
    lootValue: Game.lootValue,
    level: Game.currentLevel
  });
}

function restartGame() {
  Game.monsters = [];
  Game.items = [];
  Game.lootBoxes = [];
  Game.state = 'menu';
  startGame();
}

function backToMenu() {
  Game.state = 'menu';
  Game.monsters = [];
  Game.items = [];
  Game.lootBoxes = [];
  while(Game.scene.children.length > 0) {
    let obj = Game.scene.children[0];
    Game.scene.remove(obj);
  }
  uiSystem.showMainMenu();
}

function animate() {
  if (!gameRunning) return;
  requestAnimationFrame(animate);
  
  let delta = Math.min(gameClock.getDelta(), 0.1);
  
  if (Game.state === 'playing') {
    update(delta);
  }
  
  if (Game.renderer && Game.scene && Game.camera) {
    Game.renderer.render(Game.scene, Game.camera);
  }
}

function update(delta) {
  // Process mouse look
  if (Game.mouse.dx !== 0 || Game.mouse.dy !== 0) {
    PlayerController.handleMouseMove(Game.mouse.dx, Game.mouse.dy);
    Game.mouse.dx = 0;
    Game.mouse.dy = 0;
  }
  
  // Update player
  PlayerController.update(delta);
  
  // Handle shooting
  if (Game.mouse.leftDown) {
    weaponController.fire();
  }
  
  // Update weapon
  weaponController.update(delta);
  
  // Update monsters
  for (let i = Game.monsters.length - 1; i >= 0; i--) {
    let m = Game.monsters[i];
    m.update(delta, Game.player.position, Game.walls);
    if (m.state === 'dead' && m.deathTimer > 2) {
      if (m.mesh) Game.scene.remove(m.mesh);
      Game.monsters.splice(i, 1);
    }
  }
  
  // Update skills
  skillSystem.update(delta);
  
  // Update items
  itemSystem.update(delta);
  
  // Update horror
  horrorSystem.update(delta);
  
  // Update extract timer
  if (Game.extractActive) {
    Game.extractTimer -= delta;
    if (Game.extractTimer <= 0) {
      completeExtract();
    }
    // Check if player left extract zone
    let dist = Game.player.position.distanceTo(Game.extractPosition);
    if (dist > 8) {
      Game.extractActive = false;
      Game.extractTimer = 0;
      uiSystem.showMessage('离开撤离区域！撤离取消！', 2000, '#ff4444');
    }
  }
  
  // Check player death
  if (Game.player.health <= 0 && Game.state === 'playing') {
    playerDeath();
  }
  
  // Update UI
  uiSystem.updateHUD();
  
  // Check level 4 chase logic
  if (Game.currentLevel === 4 && Game.state === 'playing') {
    // Continuous monster spawning in chase level
    Game.chaseTimer = (Game.chaseTimer || 0) + delta;
    if (Game.chaseTimer > 3) {
      Game.chaseTimer = 0;
      if (Game.monsters.length < 8) {
        spawnMonsters(4, Game.mapData, Game.player.position);
      }
    }
    
    // Check if reached end
    if (Game.mapData.exitPoint) {
      let dist = Game.player.position.distanceTo(Game.mapData.exitPoint);
      if (dist < 5) {
        completeExtract();
      }
    }
  }
}

// Save/Load
function saveGame() {
  let save = {
    level: Game.player.level,
    exp: Game.player.exp,
    coins: Game.player.coins,
    weapons: Game.player.weapons,
    skillPoints: Game.player.skillPoints,
    skillTree: rpgSystem.skillTree || {}
  };
  try {
    localStorage.setItem('akbackroom_save', JSON.stringify(save));
  } catch(e) {}
}

function loadSave() {
  try {
    let data = localStorage.getItem('akbackroom_save');
    if (data) {
      let save = JSON.parse(data);
      Game.player.level = save.level || 1;
      Game.player.exp = save.exp || 0;
      Game.player.coins = save.coins || 0;
      Game.player.weapons = save.weapons || ['p92', 'knife'];
      Game.player.skillPoints = save.skillPoints || 0;
      rpgSystem.skillTree = save.skillTree || {};
      return true;
    }
  } catch(e) {}
  return false;
}

// Start
window.addEventListener('load', () => {
  initGame();
});
"""

# === HTML Template ===
HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AK BACKROOM</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif;user-select:none}
body{overflow:hidden;background:#000;color:#fff;cursor:default}
canvas{display:block}
#gameCanvas{position:fixed;top:0;left:0;z-index:1}

/* HUD */
#hud{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;display:none}
#hud.active{display:block}

/* Health & SAN */
#statsContainer{position:absolute;bottom:20px;left:20px;width:220px}
.barWrap{margin-bottom:8px}
.barLabel{font-size:11px;color:#aaa;margin-bottom:2px;display:flex;justify-content:space-between}
.barBg{height:14px;background:rgba(0,0,0,0.6);border:1px solid #333;border-radius:7px;overflow:hidden}
.barFill{height:100%;transition:width 0.3s;border-radius:6px}
#healthBar{background:linear-gradient(90deg,#ff0000,#ff5555)}
#sanBar{background:linear-gradient(90deg,#6a0dad,#9932cc)}
#expBar{background:linear-gradient(90deg,#006400,#32cd32);height:6px}
.barFill.low{animation:pulse 0.5s infinite alternate}
@keyframes pulse{from{opacity:0.6}to{opacity:1}}

/* Weapon */
#weaponInfo{position:absolute;bottom:20px;right:20px;text-align:right}
#weaponName{font-size:16px;font-weight:bold;color:#fff;text-shadow:0 0 4px #000}
#ammoDisplay{font-size:28px;font-weight:bold;color:#ffcc00;text-shadow:0 0 4px #000}
#ammoDisplay .reserve{font-size:16px;color:#aaa}
#weaponList{font-size:11px;color:#888;margin-top:4px}

/* Skills */
#skillBar{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:10px}
.skillSlot{width:48px;height:48px;background:rgba(0,0,0,0.6);border:2px solid #444;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative}
.skillSlot.ready{border-color:#4a9;border-color:rgba(68,170,153,0.8)}
.skillSlot.onCooldown{opacity:0.5}
.skillIcon{font-size:22px}
.skillKey{font-size:9px;color:#888;position:absolute;bottom:1px}
.skillCD{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;color:#fff;background:rgba(0,0,0,0.7);border-radius:6px;display:none}
#ultimateSlot{width:56px;height:56px;border-color:#a44}
#ultimateSlot.ready{border-color:#f44;box-shadow:0 0 10px #f44}

/* Crosshair */
#crosshair{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none}
.cross-dot{width:4px;height:4px;background:#0f0;border-radius:50%;box-shadow:0 0 2px #000}
.cross-line{position:absolute;background:#0f0;box-shadow:0 0 2px #000}
#crossTop{top:-12px;left:-1px;width:2px;height:8px}
#crossBot{top:4px;left:-1px;width:2px;height:8px}
#crossLeft{top:-1px;left:-12px;width:8px;height:2px}
#crossRight{top:-1px;left:4px;width:8px;height:2px}

/* Minimap */
#minimap{position:absolute;top:15px;left:15px;width:150px;height:150px;background:rgba(0,0,0,0.6);border:1px solid #333;border-radius:4px}
#minimapCanvas{width:100%;height:100%}

/* Extract info */
#extractInfo{position:absolute;top:15px;right:15px;text-align:right;font-size:13px}
#extractStatus{color:#aaa}
#extractTimer{font-size:24px;font-weight:bold;color:#f44}
#killCount{color:#f80;font-size:14px;margin-top:4px}
#lootValue{color:#fd0;font-size:14px}

/* Interaction prompt */
#interactPrompt{position:absolute;top:55%;left:50%;transform:translateX(-50%);font-size:16px;color:#fff;text-shadow:0 0 6px #000;background:rgba(0,0,0,0.5);padding:4px 12px;border-radius:4px;display:none}

/* Damage indicator */
#damageVignette{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9;box-shadow:inset 0 0 100px rgba(255,0,0,0);transition:box-shadow 0.1s}

/* Message */
#messageBox{position:absolute;top:30%;left:50%;transform:translateX(-50%);font-size:20px;font-weight:bold;text-shadow:0 0 8px #000;text-align:center;z-index:15;opacity:0;transition:opacity 0.3s}
#messageBox.show{opacity:1}

/* Menu */
#menuOverlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center}
#menuOverlay.hidden{display:none}
#gameTitle{font-size:64px;font-weight:bold;color:#c4a847;text-shadow:0 0 20px #c4a84780;letter-spacing:8px;margin-bottom:10px}
#gameSubtitle{font-size:16px;color:#888;margin-bottom:40px}
.menuBtn{width:240px;padding:12px;margin:5px;background:rgba(255,255,255,0.05);border:1px solid #444;color:#fff;font-size:16px;cursor:pointer;transition:all 0.2s;border-radius:4px}
.menuBtn:hover{background:rgba(255,255,255,0.15);border-color:#888}
.menuBtn.primary{background:rgba(196,168,71,0.2);border-color:#c4a847}
.menuBtn.primary:hover{background:rgba(196,168,71,0.3)}

/* Loading */
#loadingOverlay{position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:200;display:none;flex-direction:column;align-items:center;justify-content:center}
#loadingOverlay.show{display:flex}
#loadingLevel{font-size:32px;color:#c4a847;margin-bottom:10px}
#loadingDesc{font-size:14px;color:#888;margin-bottom:30px;max-width:400px;text-align:center}
#loadingBar{width:300px;height:4px;background:#222;border-radius:2px;overflow:hidden}
#loadingBarFill{height:100%;background:#c4a847;animation:loadPulse 1.5s ease-in-out}
@keyframes loadPulse{0%{width:0}50%{width:70%}100%{width:100%}}

/* Pause */
#pauseOverlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:150;display:none;flex-direction:column;align-items:center;justify-content:center}
#pauseOverlay.show{display:flex}
#pauseTitle{font-size:36px;color:#fff;margin-bottom:30px}

/* Death */
#deathOverlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(20,0,0,0.9);z-index:150;display:none;flex-direction:column;align-items:center;justify-content:center}
#deathOverlay.show{display:flex}
#deathTitle{font-size:48px;color:#f00;margin-bottom:20px;text-shadow:0 0 20px #f0080}
#deathStats{font-size:14px;color:#888;margin-bottom:30px;text-align:center}

/* Extract screen */
#extractOverlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,20,0,0.9);z-index:150;display:none;flex-direction:column;align-items:center;justify-content:center}
#extractOverlay.show{display:flex}
#extractTitle{font-size:42px;color:#0f0;margin-bottom:20px}
#extractStats{font-size:16px;color:#ccc;margin-bottom:30px;text-align:center}

/* Inventory */
#inventoryOverlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:140;display:none;flex-direction:column;align-items:center;justify-content:center}
#inventoryOverlay.show{display:flex}
#invTitle{font-size:28px;color:#fff;margin-bottom:20px}
#invGrid{display:grid;grid-template-columns:repeat(4,80px);gap:8px;margin-bottom:20px}
.invSlot{width:80px;height:80px;background:rgba(255,255,255,0.05);border:1px solid #444;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;position:relative}
.invSlot:hover{border-color:#888;background:rgba(255,255,255,0.1)}
.invSlot.empty{opacity:0.3}
.invIcon{font-size:32px}
.invName{font-size:9px;color:#aaa;text-align:center;margin-top:2px}
.invCount{position:absolute;top:2px;right:4px;font-size:11px;color:#ff0}

/* Skill tree */
#skillTreeOverlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:140;display:none;flex-direction:column;align-items:center;justify-content:center}
#skillTreeOverlay.show{display:flex}

/* Shop */
#shopOverlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:140;display:none;flex-direction:column;align-items:center;justify-content:center}
#shopOverlay.show{display:flex}

/* Settings */
#settingsOverlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:140;display:none;flex-direction:column;align-items:center;justify-content:center}
#settingsOverlay.show{display:flex}

/* Jumpscare */
#jumpscare{position:fixed;top:0;left:0;width:100%;height:100%;z-index:300;display:none;align-items:center;justify-content:center}
#jumpscare.show{display:flex}
#jumpscare canvas{max-width:100%;max-height:100%}

/* SAN effects */
#sanOverlay{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:8}
#sanVignette{position:absolute;top:0;left:0;width:100%;height:100%;box-shadow:inset 0 0 200px rgba(0,0,0,0);transition:box-shadow 0.5s}
#sanDistort{position:absolute;top:0;left:0;width:100%;height:100%;filter:blur(0) hue-rotate(0deg);transition:filter 0.5s}

/* Damage direction */
#damageDir{position:absolute;top:50%;left:50%;width:60px;height:60px;transform:translate(-50%,-50%);display:none}
</style>
</head>
<body>

<div id="hud">
  <div id="damageVignette"></div>
  <canvas id="minimapCanvas" width="150" height="150" style="position:absolute;top:15px;left:15px;background:rgba(0,0,0,0.6);border:1px solid #333;border-radius:4px"></canvas>
  
  <div id="statsContainer">
    <div class="barWrap">
      <div class="barLabel"><span>HP</span><span id="hpText">100/100</span></div>
      <div class="barBg"><div class="barFill" id="healthBar" style="width:100%"></div></div>
    </div>
    <div class="barWrap">
      <div class="barLabel"><span>SAN</span><span id="sanText">100/100</span></div>
      <div class="barBg"><div class="barFill" id="sanBar" style="width:100%"></div></div>
    </div>
    <div class="barWrap">
      <div class="barLabel"><span>LV <span id="levelText">1</span></span><span id="expText">0/100</span></div>
      <div class="barBg"><div class="barFill" id="expBar" style="width:0%"></div></div>
    </div>
  </div>
  
  <div id="weaponInfo">
    <div id="weaponName">P92</div>
    <div id="ammoDisplay"><span id="ammoCur">15</span> <span class="reserve">/ <span id="ammoRes">30</span></span></div>
    <div id="weaponList"></div>
  </div>
  
  <div id="skillBar">
    <div class="skillSlot" id="skill0"><div class="skillIcon">⚡</div><div class="skillKey">Q</div><div class="skillCD" id="cd0">0</div></div>
    <div class="skillSlot" id="skill1"><div class="skillIcon">💨</div><div class="skillKey">F</div><div class="skillCD" id="cd1">0</div></div>
    <div class="skillSlot" id="skill2"><div class="skillIcon">✨</div><div class="skillKey">G</div><div class="skillCD" id="cd2">0</div></div>
    <div class="skillSlot" id="ultimateSlot"><div class="skillIcon">⏰</div><div class="skillKey">X</div><div class="skillCD" id="cd3">0</div></div>
  </div>
  
  <div id="crosshair">
    <div class="cross-dot"></div>
    <div class="cross-line" id="crossTop"></div>
    <div class="cross-line" id="crossBot"></div>
    <div class="cross-line" id="crossLeft"></div>
    <div class="cross-line" id="crossRight"></div>
  </div>
  
  <div id="extractInfo">
    <div id="extractStatus"></div>
    <div id="extractTimer"></div>
    <div id="killCount">击杀: 0</div>
    <div id="lootValue">价值: 0</div>
  </div>
  
  <div id="interactPrompt">按 E 交互</div>
  <div id="messageBox"></div>
</div>

<div id="sanOverlay"><div id="sanVignette"></div><div id="sanDistort"></div></div>

<div id="menuOverlay">
  <div id="gameTitle">AK BACKROOM</div>
  <div id="gameSubtitle">搜打撤 × 后室 × 无畏契约技能 × 恐怖生存</div>
  <button class="menuBtn primary" onclick="startGame()">开始游戏</button>
  <button class="menuBtn" onclick="uiSystem.showShop()">商店</button>
  <button class="menuBtn" onclick="uiSystem.showSkillTree()">技能树</button>
  <button class="menuBtn" onclick="uiSystem.showSettings()">设置</button>
  <div id="menuStats" style="margin-top:20px;font-size:13px;color:#666"></div>
</div>

<div id="loadingOverlay">
  <div id="loadingLevel">Loading...</div>
  <div id="loadingDesc"></div>
  <div id="loadingBar"><div id="loadingBarFill"></div></div>
</div>

<div id="pauseOverlay">
  <div id="pauseTitle">已暂停</div>
  <button class="menuBtn primary" onclick="uiSystem.resume()">继续游戏</button>
  <button class="menuBtn" onclick="uiSystem.showSettings()">设置</button>
  <button class="menuBtn" onclick="backToMenu()">返回主菜单</button>
</div>

<div id="deathOverlay">
  <div id="deathTitle">你被后室吞噬了</div>
  <div id="deathStats"></div>
  <button class="menuBtn primary" onclick="restartGame()">重新开始</button>
  <button class="menuBtn" onclick="backToMenu()">返回主菜单</button>
</div>

<div id="extractOverlay">
  <div id="extractTitle">撤离成功</div>
  <div id="extractStats"></div>
  <button class="menuBtn primary" id="nextLevelBtn" onclick="nextLevel()">进入下一层</button>
  <button class="menuBtn" onclick="backToMenu()">返回主菜单</button>
</div>

<div id="inventoryOverlay">
  <div id="invTitle">背包</div>
  <div id="invGrid"></div>
  <button class="menuBtn" onclick="uiSystem.closeInventory()">关闭 (Tab)</button>
</div>

<div id="skillTreeOverlay">
  <div style="font-size:28px;color:#fff;margin-bottom:20px">技能树</div>
  <div id="skillTreeContent"></div>
  <button class="menuBtn" onclick="uiSystem.closeSkillTree()">关闭</button>
</div>

<div id="shopOverlay">
  <div style="font-size:28px;color:#fff;margin-bottom:20px">商店 <span id="shopCoins" style="color:#fd0"></span></div>
  <div id="shopContent"></div>
  <button class="menuBtn" onclick="uiSystem.closeShop()">关闭</button>
</div>

<div id="settingsOverlay">
  <div style="font-size:28px;color:#fff;margin-bottom:20px">设置</div>
  <div style="margin:10px 0">
    <label style="display:inline-block;width:120px">鼠标灵敏度</label>
    <input type="range" id="sensSlider" min="0.5" max="3" step="0.1" value="1" onchange="Game.sensitivity=this.value*0.002">
    <span id="sensVal">1.0</span>
  </div>
  <div style="margin:10px 0">
    <label style="display:inline-block;width:120px">音量</label>
    <input type="range" id="volSlider" min="0" max="1" step="0.1" value="0.5" onchange="AudioSystem.setVolume(this.value)">
  </div>
  <button class="menuBtn" onclick="uiSystem.closeSettings()">关闭</button>
</div>

<div id="jumpscare"><canvas id="jumpscareCanvas" width="800" height="600"></canvas></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
// ===== GAME STATE =====
const Game = {
  state: 'menu',
  currentLevel: 0,
  scene: null, camera: null, renderer: null,
  player: {
    health: 100, maxHealth: 100,
    san: 100, maxSan: 100,
    position: new THREE.Vector3(0, 1.7, 0),
    velocity: new THREE.Vector3(),
    onGround: true, isCrouching: false, isSprinting: false,
    level: 1, exp: 0, expToNext: 100, skillPoints: 0, coins: 0,
    weapons: ['p92'], equippedWeapon: 'p92',
    inventory: [], stamina: 100
  },
  monsters: [], items: [], walls: [], lights: [],
  extractPoints: [], lootBoxes: [], particles: [],
  keys: {}, mouse: {dx:0, dy:0, leftDown:false, rightDown:false},
  isPointerLocked: false, isADS: false,
  sensitivity: 0.002,
  extractActive: false, extractTimer: 0, extractPosition: null,
  killCount: 0, lootValue: 0,
  mapData: null, chaseTimer: 0
};
</script>

<script>
__PART1__
</script>
<script>
__PART2__
</script>
<script>
__PART3__
</script>
<script>
__PART4__
</script>

</body>
</html>
"""

def main():
    p1 = read_part('part1_engine.js')
    p2 = read_part('part2_combat.js')
    p3 = read_part('part3_systems.js')
    p4 = PART4
    
    html = HTML_TEMPLATE.replace('__PART1__', p1)
    html = html.replace('__PART2__', p2)
    html = html.replace('__PART3__', p3)
    html = html.replace('__PART4__', p4)
    
    out_path = os.path.join(BASE, 'index.html')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html)
    
    size = len(html)
    print(f'Generated index.html: {size} bytes ({size//1024} KB)')

if __name__ == '__main__':
    main()
