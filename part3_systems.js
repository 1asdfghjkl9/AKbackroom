// ===== PART 3: SKILLS, ITEMS, RPG, HORROR, UI =====

// ---------- SKILL SYSTEM ----------
const SKILLS = {
  dash: { name:'疾风冲刺', cooldown:15, duration:0.3, icon:'⚡', desc:'向前冲刺8米' },
  smoke: { name:'暗影烟幕', cooldown:25, duration:8, icon:'💨', desc:'投放烟雾弹阻挡视野' },
  flash: { name:'闪光弹', cooldown:20, duration:4, icon:'✨', desc:'致盲范围内怪物4秒' },
  heal: { name:'治愈领域', cooldown:30, duration:0, icon:'💚', desc:'恢复50生命值' },
  recon: { name:'侦察飞镖', cooldown:18, duration:5, icon:'🎯', desc:'标记范围内怪物' },
  ultimate: { name:'时间凝滞', cooldown:120, duration:5, icon:'⏰', desc:'全图减速所有怪物5秒' }
};

const skillSystem = {
  activeSkills: ['dash', 'heal', 'smoke'],
  ultimateSkill: 'ultimate',
  cooldowns: {},
  ultimateCharge: 0,
  smokeMesh: null,
  smokeTimer: 0,
  flashLight: null,
  reconMeshes: [],

  useSkill(slot) {
    if (slot < 3) {
      const skillId = this.activeSkills[slot];
      if (!skillId) return;
      const def = SKILLS[skillId];
      if (this.cooldowns[skillId] > 0) return;
      this._executeSkill(skillId);
      this.cooldowns[skillId] = def.cooldown * (rpgSystem.cooldownReduction || 1);
    } else if (slot === 3) {
      if (this.ultimateCharge < 100) {
        uiSystem.showMessage('大招未充能', 1000, '#ff4444');
        return;
      }
      const def = SKILLS[this.ultimateSkill];
      this._executeSkill(this.ultimateSkill);
      this.ultimateCharge = 0;
    }
  },

  _executeSkill(skillId) {
    const def = SKILLS[skillId];
    AudioSystem.playLevelUp(); // reuse as skill sound
    switch (skillId) {
      case 'dash': this._skillDash(); break;
      case 'smoke': this._skillSmoke(); break;
      case 'flash': this._skillFlash(); break;
      case 'heal': this._skillHeal(); break;
      case 'recon': this._skillRecon(); break;
      case 'ultimate': this._skillUltimate(); break;
    }
    uiSystem.showMessage(def.name + '!', 1000, '#44ddff');
  },

  _skillDash() {
    const dir = new THREE.Vector3();
    Game.camera.getWorldDirection(dir);
    dir.y = 0; dir.normalize();
    const dist = 8;
    let stepX = dir.x * dist;
    let stepZ = dir.z * dist;
    // Check collision in steps
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const tx = Game.player.position.x + stepX / steps;
      const tz = Game.player.position.z + stepZ / steps;
      if (!PlayerController._checkCollision(tx, tz, CONFIG.playerRadius)) {
        Game.player.position.x = tx;
        Game.player.position.z = tz;
      }
    }
    // Dash trail
    const geo = new THREE.BufferGeometry().setFromPoints([
      Game.player.position.clone(),
      Game.player.position.clone().sub(dir.multiplyScalar(dist))
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x44ddff, transparent: true, opacity: 0.5 });
    const line = new THREE.Line(geo, mat);
    Game.scene.add(line);
    setTimeout(() => { Game.scene.remove(line); geo.dispose(); mat.dispose(); }, 200);
  },

  _skillSmoke() {
    const dir = new THREE.Vector3();
    Game.camera.getWorldDirection(dir);
    dir.y = 0; dir.normalize();
    const pos = Game.player.position.clone().add(dir.multiplyScalar(5));
    pos.y = 1;
    // Smoke particles
    const count = 100;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i*3] = pos.x + (Math.random()-0.5)*4;
      positions[i*3+1] = pos.y + Math.random()*2;
      positions[i*3+2] = pos.z + (Math.random()-0.5)*4;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0x666666, size: 0.5, transparent: true, opacity: 0.7 });
    const smoke = new THREE.Points(geo, mat);
    Game.scene.add(smoke);
    this.smokeMesh = smoke;
    this.smokeTimer = SKILLS.smoke.duration;
  },

  _skillFlash() {
    const flash = new THREE.PointLight(0xffffff, 5, 30);
    flash.position.copy(Game.camera.position);
    Game.scene.add(flash);
    setTimeout(() => { Game.scene.remove(flash); }, 200);
    // Stun monsters in range
    for (let m of Game.monsters) {
      if (m.state === 'dead') continue;
      const dist = m.position.distanceTo(Game.player.position);
      if (dist < 15) {
        m.stunTimer = SKILLS.flash.duration;
        m.state = 'stunned';
      }
    }
  },

  _skillHeal() {
    PlayerController.heal(50);
    uiSystem.showMessage('+50 HP', 1500, '#00ff00');
  },

  _skillRecon() {
    const dir = new THREE.Vector3();
    Game.camera.getWorldDirection(dir);
    dir.y = 0; dir.normalize();
    // Flying dart
    const geo = new THREE.SphereGeometry(0.1, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const dart = new THREE.Mesh(geo, mat);
    dart.position.copy(Game.camera.position);
    Game.scene.add(dart);
    const velocity = dir.multiplyScalar(20);
    let life = 1.0;
    const anim = () => {
      life -= 0.016;
      dart.position.add(velocity.clone().multiplyScalar(0.016));
      if (life > 0) {
        requestAnimationFrame(anim);
      } else {
        Game.scene.remove(dart); geo.dispose(); mat.dispose();
        // Mark monsters in range
        for (let m of Game.monsters) {
          if (m.state === 'dead') continue;
          const d = m.position.distanceTo(dart.position);
          if (d < 15) {
            // Add glow outline
            if (m.mesh) {
              m.mesh.traverse(o => {
                if (o.isMesh && o.material) {
                  o.material.emissive = new THREE.Color(0x00ffff);
                  o.material.emissiveIntensity = 0.5;
                }
              });
              setTimeout(() => {
                if (m.mesh && m.state !== 'dead') {
                  m.mesh.traverse(o => { if (o.isMesh && o.material) o.material.emissiveIntensity = 0; });
                }
              }, SKILLS.recon.duration * 1000);
            }
          }
        }
      }
    };
    anim();
  },

  _skillUltimate() {
    for (let m of Game.monsters) {
      if (m.state === 'dead') continue;
      m.stunTimer = SKILLS.ultimate.duration;
      m.state = 'stunned';
      // Visual: blue tint
      if (m.mesh) {
        m.mesh.traverse(o => { if (o.isMesh && o.material) o.material.emissive = new THREE.Color(0x0044ff); });
      }
    }
    setTimeout(() => {
      for (let m of Game.monsters) {
        if (m.state === 'dead') continue;
        if (m.mesh) {
          m.mesh.traverse(o => { if (o.isMesh && o.material) o.material.emissive = new THREE.Color(0x000000); });
        }
      }
    }, SKILLS.ultimate.duration * 1000);
  },

  update(delta) {
    // Cooldowns
    for (let key in this.cooldowns) {
      if (this.cooldowns[key] > 0) {
        this.cooldowns[key] -= delta;
        if (this.cooldowns[key] < 0) this.cooldowns[key] = 0;
      }
    }
    // Ultimate charge
    if (this.ultimateCharge < 100) {
      this.ultimateCharge += delta * (rpgSystem.ultimateChargeRate || 1) * 0.5;
      if (this.ultimateCharge > 100) this.ultimateCharge = 100;
    }
    // Smoke timer
    if (this.smokeMesh && this.smokeTimer > 0) {
      this.smokeTimer -= delta;
      if (this.smokeTimer <= 0) {
        Game.scene.remove(this.smokeMesh);
        this.smokeMesh.geometry.dispose();
        this.smokeMesh.material.dispose();
        this.smokeMesh = null;
      } else {
        // Animate smoke
        const positions = this.smokeMesh.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i] += (Math.random()-0.5) * 0.02;
          positions[i+1] += 0.01;
        }
        this.smokeMesh.geometry.attributes.position.needsUpdate = true;
      }
    }
  }
};

// ---------- ITEM SYSTEM ----------
const ITEMS = {
  signal_gun: { name:'信号枪', stack:1, icon:'🔫', desc:'照亮区域+吓退怪物10秒' },
  syringe: { name:'注射器', stack:3, icon:'💉', desc:'恢复30生命值' },
  radio: { name:'对讲机', stack:1, icon:'📻', desc:'发出decoy声音吸引怪物' },
  flashlight: { name:'手电筒', stack:1, icon:'🔦', desc:'照明，克制微笑者和跟踪者' },
  key: { name:'生锈钥匙', stack:1, icon:'🔑', desc:'开启隐藏房间' },
  molotov: { name:'燃烧瓶', stack:2, icon:'🔥', desc:'投掷产生火焰区域' },
  relic: { name:'圣物', stack:1, icon:'🏺', desc:'10秒内怪物无法感知玩家' }
};

const itemSystem = {
  inventory: [],
  flashlightOn: false,
  flashlight: null,
  fireZones: [],
  relicActive: false,
  relicTimer: 0,

  init() {
    this.flashlight = new THREE.SpotLight(0xffffaa, 0, 20, Math.PI/5, 0.5, 2);
    this.flashlight.position.copy(Game.camera.position);
    Game.scene.add(this.flashlight);
    Game.scene.add(this.flashlight.target);
  },

  toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;
    if (this.flashlight) {
      this.flashlight.intensity = this.flashlightOn ? 2 : 0;
    }
    uiSystem.showMessage(this.flashlightOn ? '手电筒: 开' : '手电筒: 关', 1000, '#ffff00');
  },

  useItem(itemId) {
    const def = ITEMS[itemId];
    if (!def) return;
    const idx = this.inventory.findIndex(i => i.id === itemId);
    if (idx === -1) return;

    switch (itemId) {
      case 'syringe':
        PlayerController.heal(30);
        uiSystem.showMessage('+30 HP', 1500, '#00ff00');
        AudioSystem.playPickup();
        this._consume(idx);
        break;
      case 'signal_gun':
        this._useSignalGun();
        this._consume(idx);
        break;
      case 'radio':
        this._useRadio();
        this._consume(idx);
        break;
      case 'molotov':
        this._useMolotov();
        this._consume(idx);
        break;
      case 'relic':
        this.relicActive = true;
        this.relicTimer = 10;
        uiSystem.showMessage('圣物激活！怪物无法感知你', 2000, '#ffdd00');
        this._consume(idx);
        break;
      default:
        uiSystem.showMessage('无法使用: ' + def.name, 1500, '#ff4444');
    }
  },

  _useSignalGun() {
    const dir = new THREE.Vector3();
    Game.camera.getWorldDirection(dir);
    const pos = Game.player.position.clone().add(dir.multiplyScalar(5));
    pos.y = 5;
    const light = new THREE.PointLight(0xff4400, 5, 40);
    light.position.copy(pos);
    Game.scene.add(light);
    // Scare monsters
    for (let m of Game.monsters) {
      if (m.state === 'dead') continue;
      const d = m.position.distanceTo(pos);
      if (d < 30) {
        m.state = 'fleeing';
        m.stunTimer = 10;
        // Move away from signal
        const dx = m.position.x - pos.x;
        const dz = m.position.z - pos.z;
        const len = Math.sqrt(dx*dx + dz*dz);
        if (len > 0.1) {
          m.position.x += (dx/len) * 5;
          m.position.z += (dz/len) * 5;
        }
      }
    }
    setTimeout(() => { Game.scene.remove(light); }, 10000);
  },

  _useRadio() {
    const pos = Game.player.position.clone();
    // Attract monsters to this position
    for (let m of Game.monsters) {
      if (m.state === 'dead') continue;
      m.target = pos.clone();
      m.state = 'lure';
      setTimeout(() => { if (m.state === 'lure') m.state = 'idle'; }, 15000);
    }
    uiSystem.showMessage('对讲机已投放，怪物被吸引', 2000, '#ffaa00');
  },

  _useMolotov() {
    const dir = new THREE.Vector3();
    Game.camera.getWorldDirection(dir);
    dir.y = 0; dir.normalize();
    const pos = Game.player.position.clone().add(dir.multiplyScalar(8));
    pos.y = 0;
    // Fire zone
    const geo = new THREE.CylinderGeometry(2, 2, 0.05, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.6 });
    const fire = new THREE.Mesh(geo, mat);
    fire.position.copy(pos); fire.position.y = 0.025;
    Game.scene.add(fire);
    const light = new THREE.PointLight(0xff4400, 2, 10);
    light.position.copy(pos); light.position.y = 1;
    Game.scene.add(light);
    this.fireZones.push({ mesh: fire, light, timer: 10, position: pos.clone() });
    AudioSystem.playHurt();
  },

  pickupItem(itemId) {
    const def = ITEMS[itemId];
    if (!def) return;
    const existing = this.inventory.find(i => i.id === itemId);
    if (existing) {
      if (existing.count < def.stack) {
        existing.count++;
        return true;
      }
      return false;
    }
    this.inventory.push({ id: itemId, count: 1 });
    return true;
  },

  _consume(idx) {
    this.inventory[idx].count--;
    if (this.inventory[idx].count <= 0) {
      this.inventory.splice(idx, 1);
    }
  },

  update(delta) {
    // Update flashlight position
    if (this.flashlight && this.flashlightOn) {
      this.flashlight.position.copy(Game.camera.position);
      const dir = new THREE.Vector3();
      Game.camera.getWorldDirection(dir);
      this.flashlight.target.position.copy(Game.camera.position).add(dir);
    }
    // Update fire zones
    for (let i = this.fireZones.length - 1; i >= 0; i--) {
      const fz = this.fireZones[i];
      fz.timer -= delta;
      // Damage monsters in zone
      for (let m of Game.monsters) {
        if (m.state === 'dead') continue;
        const d = m.position.distanceTo(fz.position);
        if (d < 2.5) {
          m.takeDamage(20 * delta, false, 'fire');
        }
      }
      // Flicker
      fz.mesh.material.opacity = 0.4 + Math.random() * 0.3;
      if (fz.timer <= 0) {
        Game.scene.remove(fz.mesh);
        Game.scene.remove(fz.light);
        this.fireZones.splice(i, 1);
      }
    }
    // Relic
    if (this.relicActive) {
      this.relicTimer -= delta;
      if (this.relicTimer <= 0) {
        this.relicActive = false;
      }
      // Monsters can't detect
      for (let m of Game.monsters) {
        if (m.state === 'chase' || m.state === 'attack') {
          m.state = 'idle';
        }
      }
    }
  }
};

// ---------- RPG SYSTEM ----------
const rpgSystem = {
  playerLevel: 1,
  exp: 0,
  expToNext: 100,
  skillPoints: 0,
  coins: 0,
  skillTree: {
    combat: [false, false, false, false, false],
    survival: [false, false, false, false, false],
    tactical: [false, false, false, false, false]
  },
  // Derived stats
  damageMult: 1,
  recoilMult: 1,
  reloadSpeed: 1,
  maxHealth: 100,
  maxSan: 100,
  moveSpeedMult: 1,
  cooldownReduction: 1,
  ultimateChargeRate: 1,
  extraSkillSlot: false,

  addExp(amount) {
    this.exp += amount;
    while (this.exp >= this.expToNext) {
      this.exp -= this.expToNext;
      this.levelUp();
    }
  },

  levelUp() {
    this.playerLevel++;
    this.expToNext = 100 * this.playerLevel * this.playerLevel;
    this.skillPoints++;
    this.maxHealth += 10;
    this.maxSan += 5;
    Game.player.maxHealth = this.maxHealth;
    Game.player.maxSan = this.maxSan;
    Game.player.health = this.maxHealth;
    Game.player.san = this.maxSan;
    Game.player.level = this.playerLevel;
    Game.player.expToNext = this.expToNext;
    AudioSystem.playLevelUp();
    uiSystem.showMessage('升级！Lv.' + this.playerLevel + ' (技能点+1)', 3000, '#00ff00');
    saveGame();
  },

  spendSkillPoint(branch, node) {
    if (this.skillPoints <= 0) return false;
    if (this.skillTree[branch][node]) return false;
    // Check prerequisite
    if (node > 0 && !this.skillTree[branch][node - 1]) return false;
    this.skillTree[branch][node] = true;
    this.skillPoints--;
    this._applySkillEffect(branch, node);
    saveGame();
    return true;
  },

  _applySkillEffect(branch, node) {
    const effects = {
      combat: [
        () => { this.damageMult += 0.1; },
        () => { this.recoilMult -= 0.15; },
        () => { this.reloadSpeed += 0.2; },
        () => { /* headshot bonus applied in weapon */ },
        () => { /* dual wield unlock */ }
      ],
      survival: [
        () => { this.maxHealth += 30; Game.player.maxHealth = this.maxHealth; },
        () => { /* san regen +50% */ },
        () => { /* item effect +30% */ },
        () => { /* hp regen 1/s */ },
        () => { /* death immunity */ }
      ],
      tactical: [
        () => { this.cooldownReduction -= 0.1; },
        () => { this.moveSpeedMult += 0.1; },
        () => { /* skill duration +20% */ },
        () => { this.ultimateChargeRate += 0.5; },
        () => { this.extraSkillSlot = true; }
      ]
    };
    if (effects[branch] && effects[branch][node]) effects[branch][node]();
  }
};

// ---------- HORROR SYSTEM ----------
const horrorSystem = {
  san: 100,
  lightCheckTimer: 0,
  ambientSoundTimer: 0,
  heartbeatTimer: 0,
  hallucinationTimer: 0,
  hpRegenTimer: 0,

  update(delta) {
    // SAN changes
    this.lightCheckTimer += delta;
    if (this.lightCheckTimer > 0.5) {
      this.lightCheckTimer = 0;
      // Check if in darkness
      let inLight = false;
      for (let lt of Game.lights) {
        const d = Game.player.position.distanceTo(lt.light.position);
        if (d < 10 && lt.light.intensity > 0.1) { inLight = true; break; }
      }
      if (itemSystem.flashlightOn) inLight = true;
      if (Game.mapData && Game.mapData.safeHouse) {
        if (Game.player.position.distanceTo(Game.mapData.safeHouse) < 5) inLight = true;
      }
      if (!inLight) {
        this.reduceSan(1);
      } else {
        this.addSan(0.5);
      }
    }

    // SAN effects
    const san = Game.player.san;
    const sanVig = document.getElementById('sanVignette');
    const sanDist = document.getElementById('sanDistort');
    if (sanVig) {
      const darkness = Math.max(0, (70 - san) / 70);
      sanVig.style.boxShadow = `inset 0 0 ${100 + darkness * 200}px rgba(0,0,0,${darkness * 0.8})`;
    }
    if (sanDist) {
      if (san < 40) {
        const blur = (40 - san) / 40 * 1.5;
        const hue = (40 - san) / 40 * 30;
        sanDist.style.filter = `blur(${blur}px) hue-rotate(${hue}deg)`;
      } else {
        sanDist.style.filter = 'blur(0) hue-rotate(0deg)';
      }
    }
    // SAN < 20: continuous damage
    if (san < 20) {
      this.hpRegenTimer += delta;
      if (this.hpRegenTimer > 1) {
        this.hpRegenTimer = 0;
        PlayerController.takeDamage(1);
      }
    }

    // Heartbeat when SAN is low
    if (san < 50) {
      this.heartbeatTimer += delta;
      const interval = san < 20 ? 0.4 : san < 40 ? 0.7 : 1.2;
      if (this.heartbeatTimer > interval) {
        this.heartbeatTimer = 0;
        AudioSystem._tone(60, 0.1, 'sine', 0.1);
        setTimeout(() => AudioSystem._tone(50, 0.1, 'sine', 0.1), 150);
      }
    }

    // Ambient sounds
    this.ambientSoundTimer += delta;
    if (this.ambientSoundTimer > 10 + Math.random() * 15) {
      this.ambientSoundTimer = 0;
      // Random ambient sound
      const r = Math.random();
      if (r < 0.3) AudioSystem._noise(0.3, 0.05, 300); // distant noise
      else if (r < 0.6) AudioSystem._tone(30 + Math.random()*20, 0.5, 'sine', 0.03); // low hum
    }

    // Hallucinations when SAN < 40
    if (san < 40) {
      this.hallucinationTimer += delta;
      if (this.hallucinationTimer > 8 + Math.random() * 10) {
        this.hallucinationTimer = 0;
        AudioSystem.playMonsterGrowl(Math.random() < 0.5 ? 'hound' : 'stalker');
      }
    }

    // Update flickering lights
    for (let lt of Game.lights) {
      if (lt.data.flicker) {
        lt.data.flickerTimer += delta;
        if (lt.data.flickerTimer > 0.1 + Math.random() * 0.5) {
          lt.data.flickerTimer = 0;
          lt.light.intensity = lt.data.intensity * (Math.random() < 0.3 ? 0.1 : 1);
          if (Math.random() < 0.1) AudioSystem._noise(0.05, 0.03, 2000); // electrical buzz
        }
      }
    }

    // HP regen skill
    if (rpgSystem.skillTree.survival[3]) {
      this.hpRegenTimer += delta;
      if (this.hpRegenTimer > 1) {
        this.hpRegenTimer = 0;
        PlayerController.heal(1);
      }
    }
  },

  reduceSan(amount) {
    Game.player.san = Math.max(0, Game.player.san - amount);
  },

  addSan(amount) {
    Game.player.san = Math.min(Game.player.maxSan, Game.player.san + amount);
  },

  triggerJumpScare() {
    const js = document.getElementById('jumpscare');
    const canvas = document.getElementById('jumpscareCanvas');
    const ctx = canvas.getContext('2d');
    const tex = TextureFactory.monsterFaceTexture();
    const img = tex.image;
    ctx.drawImage(img, 0, 0, 800, 600);
    js.classList.add('show');
    AudioSystem.playJumpScare();
    this.reduceSan(15);
    PlayerController.hurtFlash = 1;
    setTimeout(() => { js.classList.remove('show'); }, 300);
  }
};

// ---------- UI SYSTEM ----------
const uiSystem = {
  updateHUD() {
    if (Game.state !== 'playing') return;
    // Health
    const hpPct = (Game.player.health / Game.player.maxHealth) * 100;
    document.getElementById('healthBar').style.width = hpPct + '%';
    document.getElementById('hpText').textContent = Math.ceil(Game.player.health) + '/' + Game.player.maxHealth;
    if (hpPct < 30) document.getElementById('healthBar').classList.add('low');
    else document.getElementById('healthBar').classList.remove('low');
    // SAN
    const sanPct = (Game.player.san / Game.player.maxSan) * 100;
    document.getElementById('sanBar').style.width = sanPct + '%';
    document.getElementById('sanText').textContent = Math.ceil(Game.player.san) + '/' + Game.player.maxSan;
    // Level / EXP
    document.getElementById('levelText').textContent = Game.player.level;
    document.getElementById('expText').textContent = Math.floor(Game.player.exp) + '/' + Game.player.expToNext;
    document.getElementById('expBar').style.width = (Game.player.exp / Game.player.expToNext * 100) + '%';
    // Weapon
    if (weaponController.currentWeapon) {
      document.getElementById('weaponName').textContent = weaponController.currentWeapon.name;
      document.getElementById('ammoCur').textContent = weaponController.currentAmmo;
      document.getElementById('ammoRes').textContent = weaponController.currentReserve;
    }
    // Weapon list
    let wlist = '';
    for (let i = 0; i < Game.player.weapons.length; i++) {
      const w = WEAPONS[Game.player.weapons[i]];
      if (w) wlist += `[${i+1}] ${w.name} `;
    }
    document.getElementById('weaponList').textContent = wlist;
    // Skills
    for (let i = 0; i < 3; i++) {
      const slot = document.getElementById('skill' + i);
      const cdEl = document.getElementById('cd' + i);
      const skillId = skillSystem.activeSkills[i];
      if (!skillId) continue;
      const def = SKILLS[skillId];
      slot.querySelector('.skillIcon').textContent = def.icon;
      const cd = skillSystem.cooldowns[skillId] || 0;
      if (cd > 0) {
        slot.classList.add('onCooldown');
        slot.classList.remove('ready');
        cdEl.textContent = Math.ceil(cd);
        cdEl.style.display = 'flex';
      } else {
        slot.classList.remove('onCooldown');
        slot.classList.add('ready');
        cdEl.style.display = 'none';
      }
    }
    // Ultimate
    const ultSlot = document.getElementById('ultimateSlot');
    const ultCD = document.getElementById('cd3');
    if (skillSystem.ultimateCharge >= 100) {
      ultSlot.classList.add('ready');
      ultCD.style.display = 'none';
    } else {
      ultSlot.classList.remove('ready');
      ultCD.textContent = Math.ceil(skillSystem.ultimateCharge) + '%';
      ultCD.style.display = 'flex';
    }
    // Extract info
    if (Game.extractActive) {
      document.getElementById('extractStatus').textContent = '撤离中...';
      document.getElementById('extractTimer').textContent = Math.ceil(Game.extractTimer) + 's';
    } else {
      document.getElementById('extractStatus').textContent = '';
      document.getElementById('extractTimer').textContent = '';
    }
    document.getElementById('killCount').textContent = '击杀: ' + Game.killCount;
    document.getElementById('lootValue').textContent = '价值: ' + Game.lootValue;
    // Crosshair spread
    this._updateCrosshair();
    // Interaction prompt
    this._updateInteractPrompt();
    // Minimap
    this._drawMinimap();
  },

  _updateCrosshair() {
    if (!weaponController.currentWeapon) return;
    let spread = weaponController.currentWeapon.spread;
    if (Game.isADS) spread *= 0.3;
    if (Game.player.isSprinting) spread *= 2;
    const offset = Math.min(spread * 1.5, 15);
    document.getElementById('crossTop').style.top = (-offset) + 'px';
    document.getElementById('crossBot').style.top = (offset/2) + 'px';
    document.getElementById('crossLeft').style.left = (-offset) + 'px';
    document.getElementById('crossRight').style.left = (offset/2) + 'px';
  },

  _updateInteractPrompt() {
    const prompt = document.getElementById('interactPrompt');
    let text = '';
    if (Game.mapData) {
      const pos = Game.player.position;
      // Check extract
      for (let ep of Game.extractPoints) {
        if (pos.distanceTo(ep.position) < 3) {
          text = Game.extractActive ? '坚守阵地！' : '按 E 撤离';
          break;
        }
      }
      if (!text) {
        for (let lb of Game.lootBoxes) {
          if (!lb.opened && pos.distanceTo(lb.position) < 2.5) {
            text = '按 E 拾取宝箱';
            break;
          }
        }
      }
      if (!text) {
        for (let item of Game.items) {
          if (!item.pickedUp && pos.distanceTo(item.position) < 2) {
            text = '按 E 拾取';
            break;
          }
        }
      }
      if (!text && Game.mapData.safeHouse && pos.distanceTo(Game.mapData.safeHouse) < 4) {
        text = '安全屋 (按 E 恢复)';
      }
    }
    if (text) { prompt.textContent = text; prompt.style.display = 'block'; }
    else prompt.style.display = 'none';
  },

  _drawMinimap() {
    const canvas = document.getElementById('minimapCanvas');
    if (!canvas || !Game.mapData) return;
    const ctx = canvas.getContext('2d');
    const size = 150, scale = 1.5;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, size, size);
    // Center on player
    const px = Game.player.position.x, pz = Game.player.position.z;
    ctx.save();
    ctx.translate(size/2, size/2);
    // Rooms
    if (Game.mapData.rooms) {
      for (let room of Game.mapData.rooms) {
        const rx = (room.x - px) * scale, rz = (room.z - pz) * scale;
        if (Math.abs(rx) > size/2 || Math.abs(rz) > size/2) continue;
        ctx.fillStyle = room.type === 'extract' ? 'rgba(255,0,0,0.3)' :
                       room.type === 'safe' ? 'rgba(0,255,0,0.3)' :
                       room.type === 'treasure' ? 'rgba(0,255,255,0.3)' :
                       'rgba(100,100,100,0.3)';
        ctx.fillRect(rx - room.width*scale/2, rz - room.depth*scale/2, room.width*scale, room.depth*scale);
      }
    }
    // Monsters
    for (let m of Game.monsters) {
      if (m.state === 'dead') continue;
      const mx = (m.position.x - px) * scale, mz = (m.position.z - pz) * scale;
      if (Math.abs(mx) > size/2 || Math.abs(mz) > size/2) continue;
      ctx.fillStyle = '#ff0000';
      ctx.beginPath(); ctx.arc(mx, mz, 2, 0, Math.PI*2); ctx.fill();
    }
    // Player (center)
    ctx.fillStyle = '#00ff00';
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
    // Player direction
    ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const dx = Math.sin(PlayerController.yaw) * 6;
    const dy = -Math.cos(PlayerController.yaw) * 6;
    ctx.lineTo(dx, dy); ctx.stroke();
    ctx.restore();
  },

  showMainMenu() {
    Game.state = 'menu';
    document.getElementById('menuOverlay').classList.remove('hidden');
    document.getElementById('hud').classList.remove('active');
    let stats = '';
    if (loadSave()) {
      stats = `等级: ${Game.player.level} | 金币: ${Game.player.coins} | 武器: ${Game.player.weapons.length}`;
    }
    document.getElementById('menuStats').textContent = stats;
  },

  hideMainMenu() {
    document.getElementById('menuOverlay').classList.add('hidden');
    document.getElementById('hud').classList.add('active');
  },

  showLoading(levelIndex) {
    const cfg = CONFIG.levels[levelIndex];
    document.getElementById('loadingLevel').textContent = 'Level ' + levelIndex + ': ' + cfg.name;
    document.getElementById('loadingDesc').textContent = cfg.desc;
    document.getElementById('loadingOverlay').classList.add('show');
  },

  hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
    this.hideMainMenu();
  },

  showPauseMenu() {
    if (Game.state !== 'playing') return;
    Game.state = 'paused';
    document.getElementById('pauseOverlay').classList.add('show');
    document.exitPointerLock();
  },

  resume() {
    Game.state = 'playing';
    document.getElementById('pauseOverlay').classList.remove('show');
    document.getElementById('gameCanvas').requestPointerLock();
  },

  showDeathScreen(stats) {
    document.getElementById('deathStats').innerHTML =
      `楼层: ${stats.level}<br>击杀: ${stats.kills}<br>搜集价值: ${stats.lootValue}`;
    document.getElementById('deathOverlay').classList.add('show');
  },

  showExtractScreen(data) {
    document.getElementById('extractStats').innerHTML =
      `楼层: Level ${data.level}<br>击杀: ${data.kills}<br>搜集价值: ${data.lootValue}<br><br>` +
      `经验 +${data.expGained}<br>后室币 +${data.coinsGained}`;
    const btn = document.getElementById('nextLevelBtn');
    if (data.level >= 4) {
      btn.textContent = '通关！返回菜单';
      btn.onclick = backToMenu;
      document.getElementById('extractTitle').textContent = '恭喜通关！';
    } else {
      btn.textContent = '进入下一层';
      btn.onclick = nextLevel;
      document.getElementById('extractTitle').textContent = '撤离成功';
    }
    document.getElementById('extractOverlay').classList.add('show');
    saveGame();
  },

  showVictoryScreen() {
    document.getElementById('extractTitle').textContent = '恭喜通关全部楼层！';
    document.getElementById('extractStats').innerHTML = '你成功逃离了后室...';
    document.getElementById('nextLevelBtn').textContent = '返回菜单';
    document.getElementById('nextLevelBtn').onclick = backToMenu;
    document.getElementById('extractOverlay').classList.add('show');
  },

  showInventory() {
    const grid = document.getElementById('invGrid');
    grid.innerHTML = '';
    const maxSlots = 6 + (Game.player.level - 1);
    for (let i = 0; i < maxSlots; i++) {
      const slot = document.createElement('div');
      slot.className = 'invSlot';
      const item = itemSystem.inventory[i];
      if (item) {
        const def = ITEMS[item.id];
        if (def) {
          slot.innerHTML = `<div class="invIcon">${def.icon}</div><div class="invName">${def.name}</div>`;
          if (item.count > 1) {
            const cnt = document.createElement('div');
            cnt.className = 'invCount'; cnt.textContent = item.count;
            slot.appendChild(cnt);
          }
          slot.onclick = () => { itemSystem.useItem(item.id); this.showInventory(); };
        }
      } else {
        slot.classList.add('empty');
      }
      grid.appendChild(slot);
    }
    document.getElementById('inventoryOverlay').classList.add('show');
  },

  closeInventory() {
    document.getElementById('inventoryOverlay').classList.remove('show');
    if (Game.state === 'paused') document.getElementById('gameCanvas').requestPointerLock();
  },

  showSkillTree() {
    const content = document.getElementById('skillTreeContent');
    const branches = {
      combat: { name: '战斗', nodes: ['伤害+10%', '后坐力-15%', '换弹+20%', '爆头+50%', '双持手枪'] },
      survival: { name: '生存', nodes: ['生命+30', 'SAN恢复+50%', '道具+30%', '生命恢复', '免死一次'] },
      tactical: { name: '战术', nodes: ['CD-10%', '移速+10%', '技能持续+20%', '大招充能+50%', '额外技能槽'] }
    };
    let html = `<div style="margin-bottom:10px;color:#fd0">技能点: ${rpgSystem.skillPoints}</div>`;
    html += '<div style="display:flex;gap:30px">';
    for (let branch in branches) {
      html += `<div style="text-align:center"><div style="color:#4af;margin-bottom:10px">${branches[branch].name}</div>`;
      for (let i = 0; i < 5; i++) {
        const learned = rpgSystem.skillTree[branch][i];
        const canLearn = !learned && rpgSystem.skillPoints > 0 && (i === 0 || rpgSystem.skillTree[branch][i-1]);
        const color = learned ? '#0f0' : canLearn ? '#ff0' : '#444';
        html += `<div style="margin:5px;padding:8px;border:1px solid ${color};border-radius:4px;cursor:${canLearn?'pointer':'default'};color:${color}"`;
        if (canLearn) html += ` onclick="rpgSystem.spendSkillPoint('${branch}',${i});uiSystem.showSkillTree()"`;
        html += `>${branches[branch].nodes[i]}</div>`;
      }
      html += '</div>';
    }
    html += '</div>';
    content.innerHTML = html;
    document.getElementById('skillTreeOverlay').classList.add('show');
  },

  closeSkillTree() { document.getElementById('skillTreeOverlay').classList.remove('show'); },

  showShop() {
    const content = document.getElementById('shopContent');
    document.getElementById('shopCoins').textContent = '金币: ' + Game.player.coins;
    let html = '<div style="max-width:500px">';
    html += '<div style="color:#4af;margin-bottom:8px">武器解锁</div>';
    for (let wid in WEAPONS) {
      const w = WEAPONS[wid];
      if (w.unlocked || Game.player.weapons.includes(wid)) continue;
      const canBuy = Game.player.coins >= w.price;
      html += `<div style="display:flex;justify-content:space-between;padding:6px;border:1px solid #444;margin:3px;border-radius:4px">
        <span>${w.name} (${w.type})</span>
        <button class="menuBtn" style="width:auto;padding:2px 10px;font-size:12px;${canBuy?'':'opacity:0.5'}" 
          onclick="if(Game.player.coins>=${w.price}){Game.player.coins-=${w.price};Game.player.weapons.push('${wid}');uiSystem.showShop()}">${w.price}币</button>
      </div>`;
    }
    html += '<div style="color:#4af;margin:8px 0">消耗品</div>';
    const consumables = [['syringe', 50], ['molotov', 80], ['signal_gun', 150], ['relic', 300]];
    for (let [id, price] of consumables) {
      const canBuy = Game.player.coins >= price;
      html += `<div style="display:flex;justify-content:space-between;padding:6px;border:1px solid #444;margin:3px;border-radius:4px">
        <span>${ITEMS[id].name}</span>
        <button class="menuBtn" style="width:auto;padding:2px 10px;font-size:12px;${canBuy?'':'opacity:0.5'}"
          onclick="if(Game.player.coins>=${price}){Game.player.coins-=${price};itemSystem.pickupItem('${id}');uiSystem.showShop()}">${price}币</button>
      </div>`;
    }
    html += '</div>';
    content.innerHTML = html;
    document.getElementById('shopOverlay').classList.add('show');
  },

  closeShop() { document.getElementById('shopOverlay').classList.remove('show'); },

  showSettings() {
    document.getElementById('settingsOverlay').classList.add('show');
  },

  closeSettings() { document.getElementById('settingsOverlay').classList.remove('show'); },

  showMessage(text, duration, color) {
    const box = document.getElementById('messageBox');
    box.textContent = text;
    box.style.color = color || '#fff';
    box.classList.add('show');
    clearTimeout(this._msgTimer);
    this._msgTimer = setTimeout(() => { box.classList.remove('show'); }, duration || 2000);
  },

  showDamageIndicator(direction) {
    // Brief red flash
    const vig = document.getElementById('damageVignette');
    if (vig) vig.style.boxShadow = 'inset 0 0 150px rgba(255,0,0,0.5)';
  },

  toggleMap() {
    // Toggle minimap size
    const canvas = document.getElementById('minimapCanvas');
    if (canvas.style.width === '300px') {
      canvas.style.width = '150px'; canvas.style.height = '150px';
    } else {
      canvas.style.width = '300px'; canvas.style.height = '300px';
    }
  }
};
