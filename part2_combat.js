// ===== PART 2: WEAPONS & MONSTERS =====

// ---------- WEAPONS ----------
const WEAPONS = {
  knife: { id:'knife', name:'小刀', type:'melee', damage:30, fireRate:120, magazine:0, reserveAmmo:0, range:2.5, recoilVertical:0, recoilHorizontal:0, spread:0, auto:false, adsZoom:1, pellets:1, reloadTime:0, price:0, unlocked:true },
  p92: { id:'p92', name:'P92', type:'pg', damage:18, fireRate:400, magazine:15, reserveAmmo:30, range:50, recoilVertical:1.5, recoilHorizontal:0.5, spread:2, auto:false, adsZoom:1.3, pellets:1, reloadTime:1.5, price:0, unlocked:true },
  p18c: { id:'p18c', name:'P18C', type:'pg', damage:12, fireRate:800, magazine:17, reserveAmmo:34, range:40, recoilVertical:1.2, recoilHorizontal:0.8, spread:2.5, auto:true, adsZoom:1.2, pellets:1, reloadTime:1.3, price:200, unlocked:false },
  ump45: { id:'ump45', name:'UMP45', type:'smg', damage:22, fireRate:550, magazine:25, reserveAmmo:75, range:60, recoilVertical:1.8, recoilHorizontal:0.6, spread:3, auto:true, adsZoom:1.4, pellets:1, reloadTime:2.2, price:400, unlocked:false },
  vector: { id:'vector', name:'Vector', type:'smg', damage:16, fireRate:1100, magazine:19, reserveAmmo:57, range:50, recoilVertical:0.8, recoilHorizontal:0.3, spread:2.5, auto:true, adsZoom:1.4, pellets:1, reloadTime:2.0, price:600, unlocked:false },
  m416: { id:'m416', name:'M416', type:'ar', damage:28, fireRate:700, magazine:30, reserveAmmo:90, range:120, recoilVertical:2.0, recoilHorizontal:0.8, spread:1.5, auto:true, adsZoom:1.6, pellets:1, reloadTime:2.3, price:800, unlocked:false },
  akm: { id:'akm', name:'AKM', type:'ar', damage:35, fireRate:600, magazine:30, reserveAmmo:90, range:100, recoilVertical:3.0, recoilHorizontal:1.5, spread:2, auto:true, adsZoom:1.5, pellets:1, reloadTime:2.5, price:700, unlocked:false },
  scar_l: { id:'scar_l', name:'SCAR-L', type:'ar', damage:26, fireRate:620, magazine:30, reserveAmmo:90, range:110, recoilVertical:1.5, recoilHorizontal:0.4, spread:1.2, auto:true, adsZoom:1.6, pellets:1, reloadTime:2.3, price:900, unlocked:false },
  s12k: { id:'s12k', name:'S12K', type:'sg', damage:18, fireRate:300, magazine:5, reserveAmmo:20, range:25, recoilVertical:4, recoilHorizontal:2, spread:5, auto:false, adsZoom:1.2, pellets:6, reloadTime:3.0, price:500, unlocked:false },
  s686: { id:'s686', name:'S686', type:'sg', damage:22, fireRate:150, magazine:2, reserveAmmo:12, range:20, recoilVertical:5, recoilHorizontal:2, spread:6, auto:false, adsZoom:1.1, pellets:9, reloadTime:2.5, price:450, unlocked:false },
  kar98k: { id:'kar98k', name:'Kar98k', type:'sr', damage:75, fireRate:1500, magazine:5, reserveAmmo:15, range:250, recoilVertical:6, recoilHorizontal:1, spread:0.5, auto:false, adsZoom:3.0, pellets:1, reloadTime:2.8, price:1000, unlocked:false },
  awm: { id:'awm', name:'AWM', type:'sr', damage:120, fireRate:1800, magazine:5, reserveAmmo:10, range:300, recoilVertical:8, recoilHorizontal:1.5, spread:0.3, auto:false, adsZoom:4.0, pellets:1, reloadTime:3.5, price:1500, unlocked:false }
};

// ---------- WEAPON CONTROLLER ----------
const weaponController = {
  currentWeapon: null,
  currentAmmo: 0,
  currentReserve: 0,
  isReloading: false,
  reloadTimer: 0,
  isFiring: false,
  lastShotTime: 0,
  recoilOffsetX: 0,
  recoilOffsetY: 0,
  spreadRecovery: 0,
  weaponModel: null,
  muzzleFlash: null,
  tracerGroup: null,

  switchWeapon(weaponId) {
    if (!Game.player.weapons.includes(weaponId)) return;
    const wpn = WEAPONS[weaponId];
    if (!wpn) return;
    // Save current ammo
    if (this.currentWeapon) {
      this.currentWeapon._currentAmmo = this.currentAmmo;
      this.currentWeapon._currentReserve = this.currentReserve;
    }
    this.currentWeapon = wpn;
    this.currentAmmo = wpn._currentAmmo !== undefined ? wpn._currentAmmo : wpn.magazine;
    this.currentReserve = wpn._currentReserve !== undefined ? wpn._currentReserve : wpn.reserveAmmo;
    this.isReloading = false;
    this._createWeaponModel(wpn.type);
    Game.player.equippedWeapon = weaponId;
    uiSystem.showMessage(wpn.name, 1000, '#ffcc00');
  },

  fire() {
    if (!this.currentWeapon || this.isReloading) return;
    const now = performance.now();
    const wpn = this.currentWeapon;
    if (now - this.lastShotTime < 1000 / (wpn.fireRate / 60)) return;
    if (this.currentAmmo <= 0) {
      if (this.currentReserve > 0) this.reload();
      else AudioSystem.playHurt(); // click
      return;
    }
    this.lastShotTime = now;
    this.currentAmmo--;
    AudioSystem.playGunshot(wpn.type);

    // Spread calculation
    let spread = wpn.spread;
    if (Game.isADS) spread *= 0.3;
    if (Game.player.isSprinting) spread *= 2;
    if (Game.player.velocity.length() > 0.1) spread *= 1.5;

    // Fire pellets
    for (let i = 0; i < wpn.pellets; i++) {
      this._fireRay(wpn, spread);
    }

    // Recoil
    this.recoilOffsetY += wpn.recoilVertical * 0.005;
    this.recoilOffsetX += (Math.random() - 0.5) * wpn.recoilHorizontal * 0.005;
    this.spreadRecovery = 0;

    // Muzzle flash
    this._showMuzzleFlash();

    // Auto-fire
    if (wpn.auto && Game.mouse.leftDown) {
      this.isFiring = true;
    } else {
      this.isFiring = false;
    }
  },

  _fireRay(wpn, spread) {
    const raycaster = new THREE.Raycaster();
    const dir = new THREE.Vector3();
    Game.camera.getWorldDirection(dir);
    // Apply spread
    const spreadRad = spread * Math.PI / 180;
    dir.x += (Math.random() - 0.5) * Math.tan(spreadRad);
    dir.y += (Math.random() - 0.5) * Math.tan(spreadRad);
    dir.z += (Math.random() - 0.5) * Math.tan(spreadRad);
    dir.normalize();
    raycaster.set(Game.camera.position, dir);
    raycaster.far = wpn.range;

    // Check monster hits
    let hitMonster = null;
    let hitDist = wpn.range;
    let hitPoint = null;
    let isHeadshot = false;

    for (let m of Game.monsters) {
      if (m.state === 'dead') continue;
      if (!m.mesh) continue;
      const hits = raycaster.intersectObject(m.mesh, true);
      if (hits.length > 0 && hits[0].distance < hitDist) {
        hitDist = hits[0].distance;
        hitMonster = m;
        hitPoint = hits[0].point;
        // Check headshot
        if (m.headMesh && hits[0].object === m.headMesh) isHeadshot = true;
        else if (hits[0].point.y > m.position.y + m.headHeight) isHeadshot = true;
      }
    }

    // Check wall hits (for tracer endpoint)
    let wallHit = null;
    const wallObjs = Game.scene.children.filter(o => o.isMesh && !o.userData.item && !o.userData.monster);
    const wallHits = raycaster.intersectObjects(wallObjs, false);
    if (wallHits.length > 0 && wallHits[0].distance < hitDist) {
      hitDist = wallHits[0].distance;
      hitMonster = null;
      hitPoint = wallHits[0].point;
    }

    // Damage
    if (hitMonster) {
      let dmg = wpn.damage;
      // Distance falloff
      const effRange = wpn.range;
      if (hitDist > effRange * 0.7) {
        dmg *= Math.max(0.3, 1 - (hitDist - effRange * 0.7) / (effRange * 0.3));
      }
      // Headshot
      if (isHeadshot) dmg *= 2;
      // Sniper penetration
      hitMonster.takeDamage(Math.round(dmg), isHeadshot, wpn.type);
      // Blood effect
      if (hitPoint) this._showBloodEffect(hitPoint);
    }

    // Tracer
    const start = Game.camera.position.clone();
    const end = hitPoint || start.clone().add(dir.multiplyScalar(wpn.range));
    this._showTracer(start, end);
  },

  reload() {
    if (!this.currentWeapon || this.isReloading) return;
    if (this.currentAmmo >= this.currentWeapon.magazine) return;
    if (this.currentReserve <= 0) return;
    this.isReloading = true;
    this.reloadTimer = this.currentWeapon.reloadTime / (rpgSystem.reloadSpeed || 1);
    AudioSystem.playReload();
  },

  update(delta) {
    // Recover recoil
    this.recoilOffsetY *= 0.85;
    this.recoilOffsetX *= 0.85;
    PlayerController.pitch -= this.recoilOffsetY;
    PlayerController.yaw -= this.recoilOffsetX;

    // Reload progress
    if (this.isReloading) {
      this.reloadTimer -= delta;
      if (this.reloadTimer <= 0) {
        const need = this.currentWeapon.magazine - this.currentAmmo;
        const take = Math.min(need, this.currentReserve);
        this.currentAmmo += take;
        this.currentReserve -= take;
        this.isReloading = false;
      }
    }

    // Auto fire
    if (this.isFiring && Game.mouse.leftDown && this.currentWeapon && this.currentWeapon.auto) {
      this.fire();
    }
    if (!Game.mouse.leftDown) this.isFiring = false;

    // Weapon model sway
    if (this.weaponModel) {
      const t = performance.now() * 0.001;
      const sway = Game.player.velocity.length() > 0.1 ? 0.02 : 0.005;
      this.weaponModel.position.x = 0.3 + Math.sin(t * 2) * sway;
      this.weaponModel.position.y = -0.3 + Math.cos(t * 2) * sway;
      this.weaponModel.position.z = -0.6;
      if (Game.isADS) {
        this.weaponModel.position.x *= 0.1;
        this.weaponModel.position.y *= 0.1;
        this.weaponModel.position.z = -0.3;
      }
      if (this.isReloading) {
        this.weaponModel.rotation.z = Math.sin(performance.now() * 0.01) * 0.3;
      } else {
        this.weaponModel.rotation.z = 0;
      }
    }
    // Muzzle flash fade
    if (this.muzzleFlash) {
      this.muzzleFlash.material.opacity *= 0.7;
      if (this.muzzleFlash.material.opacity < 0.05) this.muzzleFlash.visible = false;
    }
  },

  _createWeaponModel(type) {
    if (this.weaponModel) { Game.camera.remove(this.weaponModel); }
    const group = new THREE.Group();
    const matBody = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const matBarrel = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const matGrip = new THREE.MeshLambertMaterial({ color: 0x1a1208 });

    if (type === 'melee') {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.3), new THREE.MeshLambertMaterial({ color: 0xaaaabb }));
      blade.position.set(0.3, -0.25, -0.3);
      group.add(blade);
    } else if (type === 'pg') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.18), matBody);
      body.position.set(0, 0, 0); group.add(body);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.06), matGrip);
      grip.position.set(0, -0.1, 0.05); group.add(grip);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 6), matBarrel);
      barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.03, -0.12); group.add(barrel);
    } else if (type === 'smg') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.25), matBody);
      body.position.set(0, 0, 0); group.add(body);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.06), matGrip);
      grip.position.set(0, -0.11, 0.06); group.add(grip);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.06), matBody);
      mag.position.set(0, -0.1, -0.02); group.add(mag);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 6), matBarrel);
      barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.02, -0.16); group.add(barrel);
    } else if (type === 'ar') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.35), matBody);
      body.position.set(0, 0, 0); group.add(body);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.06), matGrip);
      grip.position.set(0, -0.12, 0.08); group.add(grip);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.07), matBody);
      mag.position.set(0, -0.12, -0.03); group.add(mag);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), matBarrel);
      barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.03, -0.22); group.add(barrel);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.12), matBody);
      stock.position.set(0, -0.02, 0.18); group.add(stock);
    } else if (type === 'sg') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.3), new THREE.MeshLambertMaterial({ color: 0x4a2810 }));
      body.position.set(0, 0, 0); group.add(body);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.06), matGrip);
      grip.position.set(0, -0.11, 0.08); group.add(grip);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.25, 6), matBarrel);
      barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.02, -0.18); group.add(barrel);
    } else if (type === 'sr') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.4), matBody);
      body.position.set(0, 0, 0); group.add(body);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.06), matGrip);
      grip.position.set(0, -0.12, 0.1); group.add(grip);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.06), matBody);
      mag.position.set(0, -0.08, 0); group.add(mag);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 6), matBarrel);
      barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.03, -0.28); group.add(barrel);
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 8), new THREE.MeshLambertMaterial({ color: 0x000000 }));
      scope.rotation.x = Math.PI/2; scope.position.set(0, 0.06, -0.05); group.add(scope);
    }

    group.position.set(0.3, -0.3, -0.6);
    Game.camera.add(group);
    this.weaponModel = group;

    // Muzzle flash
    const flashGeo = new THREE.PlaneGeometry(0.15, 0.15);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0, side: THREE.DoubleSide });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.set(0, 0.03, -0.35);
    flash.visible = false;
    group.add(flash);
    this.muzzleFlash = flash;
  },

  _showMuzzleFlash() {
    if (!this.muzzleFlash) return;
    this.muzzleFlash.visible = true;
    this.muzzleFlash.material.opacity = 0.8;
    this.muzzleFlash.rotation.z = Math.random() * Math.PI;
  },

  _showTracer(start, end) {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.6 });
    const line = new THREE.Line(geo, mat);
    Game.scene.add(line);
    setTimeout(() => { Game.scene.remove(line); geo.dispose(); mat.dispose(); }, 50);
  },

  _showBloodEffect(pos) {
    const geo = new THREE.SphereGeometry(0.1, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0x880000, transparent: true, opacity: 0.8 });
    const blood = new THREE.Mesh(geo, mat);
    blood.position.copy(pos);
    Game.scene.add(blood);
    setTimeout(() => { Game.scene.remove(blood); geo.dispose(); mat.dispose(); }, 300);
  }
};

// ---------- MONSTER TYPES ----------
const MONSTER_TYPES = {
  hound: { type:'hound', name:'猎犬', health:80, speed:6, damage:15, attackRange:1.5, detectRange:20, attackCooldown:1.0, expReward:20, coinReward:5, color:0x1a1a1a, size:0.8, eyeColor:0xff0000, behavior:'chase', headHeight:0.6 },
  stalker: { type:'stalker', name:'跟踪者', health:150, speed:0, damage:25, attackRange:1.8, detectRange:25, attackCooldown:1.5, expReward:35, coinReward:10, color:0x0a0a0a, size:1.0, eyeColor:0xffffff, behavior:'teleport', headHeight:1.5 },
  smiler: { type:'smiler', name:'微笑者', health:100, speed:0, damage:10, attackRange:3, detectRange:5, attackCooldown:0.1, expReward:15, coinReward:3, color:0x000000, size:0.5, eyeColor:0xffff00, behavior:'static', headHeight:1.6 },
  skinstealer: { type:'skinstealer', name:'皮囊窃取者', health:200, speed:4, damage:30, attackRange:1.8, detectRange:15, attackCooldown:1.5, expReward:40, coinReward:15, color:0x3a2a1a, size:1.0, eyeColor:0x00ff00, behavior:'ambush', headHeight:1.5 },
  partygoer: { type:'partygoer', name:'派对客', health:120, speed:3, damage:20, attackRange:1.5, detectRange:18, attackCooldown:1.2, expReward:30, coinReward:8, color:0xc4a847, size:1.0, eyeColor:0x0000ff, behavior:'lure', headHeight:1.5 }
};

// ---------- MONSTER CLASS ----------
class Monster {
  constructor(type, x, z, level) {
    const def = MONSTER_TYPES[type];
    if (!def) return;
    this.type = type;
    this.def = def;
    this.health = def.health + level * 10;
    this.maxHealth = this.health;
    this.position = new THREE.Vector3(x, 0, z);
    this.velocity = new THREE.Vector3();
    this.state = 'idle';
    this.target = null;
    this.lastAttack = 0;
    this.pathTimer = 0;
    this.moveDir = new THREE.Vector3();
    this.deathTimer = 0;
    this.hitFlash = 0;
    this.stunTimer = 0;
    this.isRaging = false;
    this.teleportTimer = 5 + Math.random() * 5;
    this.disguiseActive = (type === 'skinstealer');
    this.musicTimer = 0;
    this.headHeight = def.headHeight;
    this.headMesh = null;
    this.mesh = this._createModel();
    this.mesh.userData.monster = this;
    this.mesh.position.copy(this.position);
    Game.scene.add(this.mesh);
  }

  _createModel() {
    const def = this.def;
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: def.color });
    const eyeMat = new THREE.MeshBasicMaterial({ color: def.eyeColor });

    if (this.type === 'hound') {
      // Four-legged creature
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.9), bodyMat);
      body.position.y = 0.5; group.add(body);
      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), bodyMat);
      head.position.set(0, 0.65, -0.5); group.add(head);
      this.headMesh = head;
      // Eyes
      const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
      const eL = new THREE.Mesh(eyeGeo, eyeMat); eL.position.set(-0.1, 0.7, -0.65); group.add(eL);
      const eR = new THREE.Mesh(eyeGeo, eyeMat); eR.position.set(0.1, 0.7, -0.65); group.add(eR);
      // Legs
      for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), bodyMat);
        leg.position.set(i < 2 ? -0.15 : 0.15, 0.2, i % 2 ? -0.3 : 0.3); group.add(leg);
      }
    } else if (this.type === 'stalker') {
      // Tall thin humanoid
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.0, 8), bodyMat);
      body.position.y = 1.0; group.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), bodyMat);
      head.position.set(0, 2.1, 0); group.add(head);
      this.headMesh = head;
      // No face, just white eyes
      const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
      const eL = new THREE.Mesh(eyeGeo, eyeMat); eL.position.set(-0.08, 2.15, -0.2); group.add(eL);
      const eR = new THREE.Mesh(eyeGeo, eyeMat); eR.position.set(0.08, 2.15, -0.2); group.add(eR);
      // Long arms
      const armGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.2, 6);
      const aL = new THREE.Mesh(armGeo, bodyMat); aL.position.set(-0.3, 1.2, 0); aL.rotation.z = 0.2; group.add(aL);
      const aR = new THREE.Mesh(armGeo, bodyMat); aR.position.set(0.3, 1.2, 0); aR.rotation.z = -0.2; group.add(aR);
    } else if (this.type === 'smiler') {
      // Dark cloud with smile
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), bodyMat);
      body.position.y = 1.6; group.add(body);
      this.headMesh = body;
      // Glowing smile (curve)
      const smileGeo = new THREE.TorusGeometry(0.2, 0.03, 4, 8, Math.PI);
      const smile = new THREE.Mesh(smileGeo, eyeMat);
      smile.position.set(0, 1.5, -0.4); smile.rotation.x = Math.PI; group.add(smile);
      // Eyes
      const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6);
      const eL = new THREE.Mesh(eyeGeo, eyeMat); eL.position.set(-0.12, 1.7, -0.4); group.add(eL);
      const eR = new THREE.Mesh(eyeGeo, eyeMat); eR.position.set(0.12, 1.7, -0.4); group.add(eR);
    } else if (this.type === 'skinstealer') {
      // Disguised as crate or humanoid
      if (this.disguiseActive) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), new THREE.MeshLambertMaterial({ map: TextureFactory.crateTexture() }));
        crate.position.y = 0.3; group.add(crate);
      } else {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.4), bodyMat);
        body.position.y = 0.75; group.add(body);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), bodyMat);
        head.position.set(0, 1.6, 0); group.add(head);
        this.headMesh = head;
        const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
        const eL = new THREE.Mesh(eyeGeo, eyeMat); eL.position.set(-0.08, 1.65, -0.18); group.add(eL);
        const eR = new THREE.Mesh(eyeGeo, eyeMat); eR.position.set(0.08, 1.65, -0.18); group.add(eR);
      }
    } else if (this.type === 'partygoer') {
      // Yellow humanoid with party mask
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.3, 8), bodyMat);
      body.position.y = 0.65; group.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), bodyMat);
      head.position.set(0, 1.5, 0); group.add(head);
      this.headMesh = head;
      // Party hat
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 6), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      hat.position.set(0, 1.85, 0); group.add(hat);
      // Mask eyes (happy)
      const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
      const eL = new THREE.Mesh(eyeGeo, eyeMat); eL.position.set(-0.1, 1.55, -0.25); group.add(eL);
      const eR = new THREE.Mesh(eyeGeo, eyeMat); eR.position.set(0.1, 1.55, -0.25); group.add(eR);
    }

    // Health bar sprite (hidden, shown on hit)
    return group;
  }

  update(delta, playerPos, walls) {
    if (this.state === 'dead') {
      this.deathTimer += delta;
      if (this.mesh) {
        this.mesh.rotation.z += delta * 2;
        this.mesh.position.y -= delta * 0.5;
        this.mesh.scale.multiplyScalar(1 - delta * 0.5);
      }
      return;
    }

    if (this.stunTimer > 0) {
      this.stunTimer -= delta;
      return;
    }

    const dist = this.position.distanceTo(playerPos);
    const def = this.def;

    // Hit flash recovery
    if (this.hitFlash > 0) {
      this.hitFlash -= delta * 5;
      this.mesh.traverse(o => { if (o.isMesh && o.material && o.material.emissive) o.material.emissive.setRGB(this.hitFlash, 0, 0); });
    }

    // Behavior
    switch (def.behavior) {
      case 'chase': this._behaviorChase(delta, playerPos, dist, walls); break;
      case 'teleport': this._behaviorTeleport(delta, playerPos, dist); break;
      case 'static': this._behaviorStatic(delta, playerPos, dist); break;
      case 'ambush': this._behaviorAmbush(delta, playerPos, dist, walls); break;
      case 'lure': this._behaviorLure(delta, playerPos, dist, walls); break;
    }

    // Update mesh position
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      // Face player
      if (this.state === 'chase' || this.state === 'attack') {
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        this.mesh.rotation.y = Math.atan2(dx, dz);
      }
    }

    // Partygoer SAN drain
    if (this.type === 'partygoer' && dist < 15) {
      horrorSystem.reduceSan(delta * 3);
      this.musicTimer += delta;
      if (this.musicTimer > 5) { this.musicTimer = 0; AudioSystem.playMonsterGrowl('partygoer'); }
    }

    // Smiler SAN drain
    if (this.type === 'smiler' && dist < 3 && !itemSystem.flashlightOn) {
      PlayerController.takeDamage(def.damage * delta);
    }
  }

  _behaviorChase(delta, playerPos, dist, walls) {
    const speed = this.isRaging ? this.def.speed * 1.5 : this.def.speed;
    if (dist < this.def.detectRange) {
      this.state = dist < this.def.attackRange ? 'attack' : 'chase';
      if (this.state === 'chase') {
        // Move toward player
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        const len = Math.sqrt(dx*dx + dz*dz);
        if (len > 0.1) {
          const mx = (dx / len) * speed * delta;
          const mz = (dz / len) * speed * delta;
          // Simple collision
          if (!this._checkWall(this.position.x + mx, this.position.z, walls))
            this.position.x += mx;
          if (!this._checkWall(this.position.x, this.position.z + mz, walls))
            this.position.z += mz;
        }
      } else if (this.state === 'attack') {
        const now = performance.now() / 1000;
        if (now - this.lastAttack > this.def.attackCooldown) {
          this.lastAttack = now;
          PlayerController.takeDamage(this.def.damage);
          AudioSystem.playMonsterGrowl(this.type);
        }
      }
    } else {
      this.state = 'idle';
    }
  }

  _behaviorTeleport(delta, playerPos, dist) {
    // Weeping Angel: don't move when player looks at it
    const camDir = new THREE.Vector3();
    Game.camera.getWorldDirection(camDir);
    const toMonster = new THREE.Vector3().subVectors(this.position, Game.camera.position).normalize();
    const dot = camDir.dot(toMonster);
    const lookingAt = dot > 0.7 && dist < this.def.detectRange;

    // Flashlight check
    if (itemSystem.flashlightOn && dist < 10) {
      // Slowed
      this.stunTimer = 0.2;
    }

    if (lookingAt) {
      this.state = 'frozen';
      return;
    }

    // Teleport logic
    this.teleportTimer -= delta;
    if (this.teleportTimer <= 0 || dist < this.def.attackRange) {
      this.teleportTimer = 4 + Math.random() * 4;
      // Teleport behind or beside player
      const angle = Math.random() * Math.PI * 2;
      const teleDist = 5 + Math.random() * 5;
      const tx = playerPos.x + Math.cos(angle) * teleDist;
      const tz = playerPos.z + Math.sin(angle) * teleDist;
      this.position.set(tx, 0, tz);
      AudioSystem.playMonsterGrowl('stalker');
      this.state = 'chase';
    }

    if (dist < this.def.attackRange) {
      const now = performance.now() / 1000;
      if (now - this.lastAttack > this.def.attackCooldown) {
        this.lastAttack = now;
        PlayerController.takeDamage(this.def.damage);
        // Teleport away after attack
        this.teleportTimer = 2;
        const angle = Math.random() * Math.PI * 2;
        const teleDist = 8 + Math.random() * 5;
        this.position.set(playerPos.x + Math.cos(angle) * teleDist, 0, playerPos.z + Math.sin(angle) * teleDist);
      }
    }
  }

  _behaviorStatic(delta, playerPos, dist) {
    if (dist < this.def.detectRange) {
      // Check if flashlight is on and pointing at it
      if (itemSystem.flashlightOn && dist < 8) {
        const camDir = new THREE.Vector3();
        Game.camera.getWorldDirection(camDir);
        const toMonster = new THREE.Vector3().subVectors(this.position, Game.camera.position).normalize();
        if (camDir.dot(toMonster) > 0.5) {
          // Disappear
          this.state = 'stunned';
          this.stunTimer = 3;
          if (this.mesh) this.mesh.visible = false;
          setTimeout(() => { if (this.mesh && this.state !== 'dead') this.mesh.visible = true; }, 3000);
          return;
        }
      }
      // Damage player in range
      if (dist < 3 && !itemSystem.flashlightOn) {
        PlayerController.takeDamage(this.def.damage * delta);
        this.state = 'attack';
      }
    } else {
      this.state = 'idle';
    }
  }

  _behaviorAmbush(delta, playerPos, dist, walls) {
    if (this.disguiseActive && dist < 2.5) {
      // Reveal!
      this.disguiseActive = false;
      // Replace model
      Game.scene.remove(this.mesh);
      this.mesh = this._createModel();
      this.mesh.userData.monster = this;
      this.mesh.position.copy(this.position);
      Game.scene.add(this.mesh);
      AudioSystem.playMonsterGrowl('skinstealer');
      this.state = 'chase';
      uiSystem.showMessage('那不是箱子！', 2000, '#ff0000');
    }
    if (!this.disguiseActive) {
      this._behaviorChase(delta, playerPos, dist, walls);
    }
  }

  _behaviorLure(delta, playerPos, dist, walls) {
    // Always chase, but slower
    if (dist < this.def.detectRange) {
      this.state = 'chase';
      const speed = this.def.speed;
      const dx = playerPos.x - this.position.x;
      const dz = playerPos.z - this.position.z;
      const len = Math.sqrt(dx*dx + dz*dz);
      if (len > 0.1) {
        const mx = (dx / len) * speed * delta;
        const mz = (dz / len) * speed * delta;
        if (!this._checkWall(this.position.x + mx, this.position.z, walls))
          this.position.x += mx;
        if (!this._checkWall(this.position.x, this.position.z + mz, walls))
          this.position.z += mz;
      }
      if (dist < this.def.attackRange) {
        const now = performance.now() / 1000;
        if (now - this.lastAttack > this.def.attackCooldown) {
          this.lastAttack = now;
          PlayerController.takeDamage(this.def.damage);
        }
      }
    }
  }

  _checkWall(x, z, walls) {
    if (!walls) return false;
    for (let w of walls) {
      if (!w.isCollision) continue;
      const dx = Math.abs(x - w.x) - w.width/2 - 0.4;
      const dz = Math.abs(z - w.z) - w.depth/2 - 0.4;
      if (dx < 0 && dz < 0) return true;
    }
    return false;
  }

  takeDamage(amount, isHeadshot, damageType) {
    let dmg = amount;
    // Weakness checks
    if (this.type === 'skinstealer' && damageType === 'fire') dmg *= 2;
    if (isHeadshot) dmg *= 1.5;
    this.health -= dmg;
    this.hitFlash = 1;
    // Rage for hounds when nearby hound dies
    if (this.type === 'hound' && this.health <= 0) {
      for (let m of Game.monsters) {
        if (m.type === 'hound' && m !== this && m.state !== 'dead') {
          m.isRaging = true;
        }
      }
    }
    if (this.health <= 0) {
      this.die();
    } else {
      // Reveal skinstealer if hit
      if (this.type === 'skinstealer' && this.disguiseActive) {
        this.disguiseActive = false;
        Game.scene.remove(this.mesh);
        this.mesh = this._createModel();
        this.mesh.userData.monster = this;
        this.mesh.position.copy(this.position);
        Game.scene.add(this.mesh);
      }
    }
  }

  die() {
    this.state = 'dead';
    this.deathTimer = 0;
    Game.killCount++;
    rpgSystem.addExp(this.def.expReward);
    Game.player.coins += this.def.coinReward;
    Game.lootValue += this.def.coinReward;
    AudioSystem.playMonsterGrowl(this.type);
    // Death particle effect
    this._deathEffect();
  }

  _deathEffect() {
    if (!this.mesh) return;
    const pos = this.position.clone();
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.SphereGeometry(0.08, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: this.def.color, transparent: true, opacity: 0.8 });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(pos); p.position.y += 0.5;
      Game.scene.add(p);
      const vx = (Math.random() - 0.5) * 3;
      const vy = Math.random() * 3;
      const vz = (Math.random() - 0.5) * 3;
      let t = 0;
      const anim = () => {
        t += 0.016;
        p.position.x += vx * 0.016;
        p.position.y += vy * 0.016 - 10 * t * t;
        p.position.z += vz * 0.016;
        mat.opacity -= 0.02;
        if (mat.opacity > 0) requestAnimationFrame(anim);
        else { Game.scene.remove(p); geo.dispose(); mat.dispose(); }
      };
      anim();
    }
  }
}

// ---------- MONSTER SPAWNER ----------
function spawnMonsters(level, mapData, playerPos) {
  const cfg = CONFIG.levels[level];
  if (!cfg) return;
  const baseCount = [4, 6, 8, 10, 3][level] || 5;
  const count = baseCount + Math.floor(Math.random() * 3);

  for (let i = 0; i < count; i++) {
    const type = cfg.monsterTypes[Math.floor(Math.random() * cfg.monsterTypes.length)];
    // Find spawn position away from player
    let sx, sz, tries = 0;
    do {
      if (mapData.rooms && mapData.rooms.length > 0) {
        const room = mapData.rooms[Math.floor(Math.random() * mapData.rooms.length)];
        sx = room.x + (Math.random() - 0.5) * (room.width - 2);
        sz = room.z + (Math.random() - 0.5) * (room.depth - 2);
      } else {
        sx = (Math.random() - 0.5) * 40;
        sz = (Math.random() - 0.5) * 40;
      }
      tries++;
    } while (Math.abs(sx - playerPos.x) + Math.abs(sz - playerPos.z) < 15 && tries < 20);

    const monster = new Monster(type, sx, sz, level);
    Game.monsters.push(monster);
  }
}
