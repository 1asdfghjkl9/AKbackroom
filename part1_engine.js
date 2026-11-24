// ===== PART 1: ENGINE CORE & MAP SYSTEM =====

// ---------- CONFIG ----------
const CONFIG = {
  fov: 75, near: 0.1, far: 100, fogDensity: 0.045,
  playerHeight: 1.7, playerRadius: 0.35, walkSpeed: 5, sprintSpeed: 8, crouchSpeed: 2.5,
  jumpForce: 6, gravity: 20, mouseSensitivity: 0.002,
  levels: [
    { name: "The Lobby", desc: "黄色壁纸的房间永无止境。荧光灯嗡嗡作响，空气中弥漫着潮味。", wallColor: 0xc4a847, floorColor: 0x8a7a2e, ceilColor: 0xc4a847, fogColor: 0x2a2410, ambientIntensity: 0.35, lightColor: 0xfff4d0, monsterTypes: ['hound','smiler'], roomCount: 15 },
    { name: "Habitable Zone", desc: "混凝土仓库。冷光灯下，每个角落都可能藏着东西。", wallColor: 0x888888, floorColor: 0x555555, ceilColor: 0x666666, fogColor: 0x1a1a1a, ambientIntensity: 0.28, lightColor: 0xffffff, monsterTypes: ['stalker','hound'], roomCount: 18 },
    { name: "Pipe Dreams", desc: "管道隧道错综复杂，应急灯勉强照亮前方几米。", wallColor: 0x6b3a1a, floorColor: 0x3a2010, ceilColor: 0x4a2818, fogColor: 0x1a0a05, ambientIntensity: 0.18, lightColor: 0xff6644, monsterTypes: ['skinstealer','stalker'], roomCount: 22 },
    { name: "Electrical Station", desc: "电气机房。火花四溅，不自然的笑声在远处回荡。", wallColor: 0x2a4a6a, floorColor: 0x1a2a3a, ceilColor: 0x223348, fogColor: 0x05101a, ambientIntensity: 0.22, lightColor: 0x44aaff, monsterTypes: ['partygoer','skinstealer'], roomCount: 20 },
    { name: "Run For Your Life", desc: "跑。不要回头。不要停下。", wallColor: 0x4a0000, floorColor: 0x2a0000, ceilColor: 0x3a0000, fogColor: 0x1a0000, ambientIntensity: 0.12, lightColor: 0xff0000, monsterTypes: ['hound','stalker','smiler','skinstealer','partygoer'], roomCount: 1, isChase: true }
  ]
};

// ---------- TEXTURE FACTORY ----------
const TextureFactory = {
  _canvas: null,
  _ctx: null,
  _getCanvas(size) {
    if (!this._canvas) { this._canvas = document.createElement('canvas'); }
    this._canvas.width = size; this._canvas.height = size;
    if (!this._ctx) this._ctx = this._canvas.getContext('2d');
    return this._canvas;
  },
  _toTexture() {
    const tex = new THREE.CanvasTexture(this._canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  },
  wallTexture(baseColor) {
    const c = this._getCanvas(256); const ctx = this._ctx;
    const hex = '#' + baseColor.toString(16).padStart(6, '0');
    ctx.fillStyle = hex; ctx.fillRect(0, 0, 256, 256);
    // noise
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 256, y = Math.random() * 256;
      const v = (Math.random() - 0.5) * 40;
      const r = parseInt(hex.substr(1,2),16)+v, g = parseInt(hex.substr(3,2),16)+v, b = parseInt(hex.substr(5,2),16)+v;
      ctx.fillStyle = `rgb(${Math.max(0,Math.min(255,r))},${Math.max(0,Math.min(255,g))},${Math.max(0,Math.min(255,b))})`;
      ctx.fillRect(x, y, 2, 2);
    }
    // stains
    for (let i = 0; i < 8; i++) {
      const x = Math.random()*256, y = Math.random()*256, r = 10+Math.random()*30;
      const grad = ctx.createRadialGradient(x,y,0,x,y,r);
      grad.addColorStop(0, 'rgba(40,30,10,0.4)');
      grad.addColorStop(1, 'rgba(40,30,10,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }
    // wallpaper pattern lines
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    for (let y = 0; y < 256; y += 32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(256,y); ctx.stroke(); }
    const tex = this._toTexture(); tex.repeat.set(2, 1); return tex;
  },
  floorTexture(baseColor) {
    const c = this._getCanvas(256); const ctx = this._ctx;
    const hex = '#' + baseColor.toString(16).padStart(6, '0');
    ctx.fillStyle = hex; ctx.fillRect(0,0,256,256);
    for (let i = 0; i < 1500; i++) {
      const x = Math.random()*256, y = Math.random()*256, v = (Math.random()-0.5)*30;
      const r = parseInt(hex.substr(1,2),16)+v, g = parseInt(hex.substr(3,2),16)+v, b = parseInt(hex.substr(5,2),16)+v;
      ctx.fillStyle = `rgb(${Math.max(0,Math.min(255,r))},${Math.max(0,Math.min(255,g))},${Math.max(0,Math.min(255,b))})`;
      ctx.fillRect(x,y,2,2);
    }
    // grid tiles
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i <= 256; i += 64) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,256); ctx.moveTo(0,i); ctx.lineTo(256,i); ctx.stroke(); }
    const tex = this._toTexture(); tex.repeat.set(3,3); return tex;
  },
  ceilingTexture(baseColor) {
    const c = this._getCanvas(256); const ctx = this._ctx;
    const hex = '#' + baseColor.toString(16).padStart(6, '0');
    ctx.fillStyle = hex; ctx.fillRect(0,0,256,256);
    for (let i = 0; i < 1000; i++) {
      const x = Math.random()*256, y = Math.random()*256, v = (Math.random()-0.5)*20;
      const r = parseInt(hex.substr(1,2),16)+v, g = parseInt(hex.substr(3,2),16)+v, b = parseInt(hex.substr(5,2),16)+v;
      ctx.fillStyle = `rgb(${Math.max(0,Math.min(255,r))},${Math.max(0,Math.min(255,g))},${Math.max(0,Math.min(255,b))})`;
      ctx.fillRect(x,y,2,2);
    }
    // ceiling panels
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    for (let i = 0; i <= 256; i += 128) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,256); ctx.moveTo(0,i); ctx.lineTo(256,i); ctx.stroke(); }
    const tex = this._toTexture(); tex.repeat.set(2,2); return tex;
  },
  metalTexture() {
    const c = this._getCanvas(128); const ctx = this._ctx;
    ctx.fillStyle = '#555'; ctx.fillRect(0,0,128,128);
    for (let i = 0; i < 500; i++) { const x=Math.random()*128,y=Math.random()*128,v=(Math.random()-0.5)*40; ctx.fillStyle=`rgb(${85+v},${85+v},${85+v})`; ctx.fillRect(x,y,2,2); }
    ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.strokeRect(2,2,124,124);
    return this._toTexture();
  },
  doorTexture() {
    const c = this._getCanvas(128); const ctx = this._ctx;
    ctx.fillStyle='#3a2810'; ctx.fillRect(0,0,128,128);
    ctx.fillStyle='#5a3820'; ctx.fillRect(8,8,112,112);
    ctx.strokeStyle='#2a1808'; ctx.lineWidth=2; ctx.strokeRect(8,8,112,112);
    ctx.fillStyle='#8a6030'; ctx.fillRect(56,64,16,16); // handle
    return this._toTexture();
  },
  crateTexture() {
    const c = this._getCanvas(128); const ctx = this._ctx;
    ctx.fillStyle='#6a4a20'; ctx.fillRect(0,0,128,128);
    ctx.strokeStyle='#4a3010'; ctx.lineWidth=3;
    ctx.strokeRect(4,4,120,120); ctx.beginPath();
    ctx.moveTo(4,4); ctx.lineTo(124,124); ctx.moveTo(124,4); ctx.lineTo(4,124); ctx.stroke();
    for (let i=0;i<200;i++){ctx.fillStyle=`rgba(${80+Math.random()*30},${60+Math.random()*20},${20+Math.random()*10},0.5)`;ctx.fillRect(Math.random()*128,Math.random()*128,2,2);}
    return this._toTexture();
  },
  bloodTexture() {
    const c = this._getCanvas(128); const ctx = this._ctx;
    ctx.clearRect(0,0,128,128);
    for (let i=0;i<15;i++){const x=Math.random()*128,y=Math.random()*128,r=5+Math.random()*20;const grad=ctx.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,'rgba(120,0,0,0.7)');grad.addColorStop(1,'rgba(80,0,0,0)');ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
    return this._toTexture();
  },
  monsterFaceTexture() {
    const c = this._getCanvas(256); const ctx = this._ctx;
    ctx.fillStyle='#000'; ctx.fillRect(0,0,256,256);
    // face
    ctx.fillStyle='#1a1a1a'; ctx.beginPath(); ctx.ellipse(128,128,90,110,0,0,Math.PI*2); ctx.fill();
    // eyes
    ctx.fillStyle='#ff0000'; ctx.beginPath(); ctx.ellipse(95,100,18,12,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(161,100,18,12,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ff6666'; ctx.beginPath(); ctx.ellipse(95,100,8,6,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(161,100,8,6,0,0,Math.PI*2); ctx.fill();
    // mouth
    ctx.fillStyle='#660000'; ctx.beginPath(); ctx.ellipse(128,175,40,25,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ff3333'; for(let i=0;i<6;i++){ctx.fillRect(108+i*8,155,4,20);}
    return this._toTexture();
  }
};

// ---------- AUDIO SYSTEM ----------
const AudioSystem = {
  ctx: null, masterGain: null, ambientNode: null, volume: 0.5,
  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    } catch(e) { console.warn('Audio init failed', e); }
  },
  setVolume(v) { this.volume = v; if (this.masterGain) this.masterGain.gain.value = v; },
  _now() { return this.ctx ? this.ctx.currentTime : 0; },
  _tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type || 'square'; osc.frequency.value = freq;
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, this._now()+dur);
    gain.gain.setValueAtTime(vol||0.3, this._now());
    gain.gain.exponentialRampToValueAtTime(0.001, this._now()+dur);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this._now()+dur);
  },
  _noise(dur, vol, filterFreq) {
    if (!this.ctx) return;
    const bufSize = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random()*2-1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol||0.2, this._now());
    gain.gain.exponentialRampToValueAtTime(0.001, this._now()+dur);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = filterFreq || 2000;
    src.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
    src.start(); src.stop(this._now()+dur);
  },
  playGunshot(type) {
    if (!this.ctx) return;
    const freqMap = { ar: 150, smg: 200, sg: 80, sr: 100, pg: 250 };
    this._noise(0.08, 0.4, 3000);
    this._tone(freqMap[type]||150, 0.05, 'square', 0.3, 50);
  },
  playReload() { this._tone(400,0.05,'sine',0.2); setTimeout(()=>this._tone(300,0.05,'sine',0.2),100); setTimeout(()=>this._tone(500,0.08,'sine',0.2),250); },
  playMonsterGrowl(type) {
    const f = { hound: 80, stalker: 50, smiler: 200, skinstealer: 60, partygoer: 120 }[type] || 80;
    this._tone(f, 0.5, 'sawtooth', 0.15, f*0.5);
  },
  playFootstep() { this._noise(0.03, 0.08, 500); },
  playHurt() { this._tone(200, 0.15, 'sawtooth', 0.3, 80); },
  playPickup() { this._tone(600,0.06,'sine',0.2); setTimeout(()=>this._tone(800,0.06,'sine',0.2),80); },
  playLevelUp() { this._tone(500,0.1,'sine',0.3); setTimeout(()=>this._tone(700,0.1,'sine',0.3),100); setTimeout(()=>this._tone(900,0.15,'sine',0.3),200); },
  playExtractAlarm() {
    this._tone(800,0.2,'square',0.2);
    setTimeout(()=>this._tone(600,0.2,'square',0.2),250);
    setTimeout(()=>this._tone(800,0.2,'square',0.2),500);
  },
  playAmbient(level) {
    if (this.ambientNode) { try { this.ambientNode.stop(); } catch(e){} }
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 40 + level * 5;
    gain.gain.value = 0.03;
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start();
    this.ambientNode = osc;
  },
  playJumpScare() {
    this._noise(0.3, 0.6, 5000);
    this._tone(1000, 0.2, 'sawtooth', 0.4, 200);
  },
  stopAmbient() { if (this.ambientNode) { try { this.ambientNode.stop(); } catch(e){} this.ambientNode = null; } }
};

// ---------- MAP GENERATOR ----------
const MapGenerator = {
  generate(levelIndex) {
    const cfg = CONFIG.levels[levelIndex];
    if (cfg.isChase) return this._generateChase(levelIndex);
    return this._generateNormal(levelIndex, cfg);
  },
  _generateNormal(levelIndex, cfg) {
    const rooms = [], corridors = [], walls = [], lights = [];
    const lootBoxes = [], extractPoints = [], specialRooms = [];
    const hiddenDoors = [];
    let safeHouse = null, spawnPoint = null;

    const gridSize = Math.ceil(Math.sqrt(cfg.roomCount * 1.5));
    const cellSize = 10;
    const grid = [];
    for (let i = 0; i < gridSize; i++) { grid[i] = []; for (let j = 0; j < gridSize; j++) grid[i][j] = null; }

    // Place rooms
    const roomCount = Math.min(cfg.roomCount, gridSize * gridSize);
    let placed = 0;
    const roomPositions = [];
    while (placed < roomCount) {
      const gx = Math.floor(Math.random() * gridSize);
      const gy = Math.floor(Math.random() * gridSize);
      if (grid[gx][gy] === null) {
        const w = 6 + Math.floor(Math.random() * 4) * 2; // 6,8,10,12
        const d = 6 + Math.floor(Math.random() * 4) * 2;
        const room = {
          id: placed, gx, gy, x: gx * cellSize, z: gy * cellSize,
          width: w, depth: d, height: 3,
          type: 'normal', connected: false
        };
        grid[gx][gy] = room;
        rooms.push(room);
        roomPositions.push({gx, gy});
        placed++;
      }
    }

    // Connect rooms (MST-like)
    rooms[0].connected = true;
    const connected = [rooms[0]];
    while (connected.length < rooms.length) {
      let bestPair = null, bestDist = Infinity;
      for (let a of connected) {
        for (let b of rooms) {
          if (b.connected) continue;
          const dx = a.gx - b.gx, dy = a.gy - b.gy;
          const dist = Math.abs(dx) + Math.abs(dy);
          if (dist < bestDist) { bestDist = dist; bestPair = {a, b}; }
        }
      }
      if (!bestPair) break;
      bestPair.b.connected = true;
      connected.push(bestPair.b);
      // Create corridor
      const corridor = this._makeCorridor(bestPair.a, bestPair.b, cellSize);
      corridors.push(corridor);
    }

    // Assign special rooms
    const shuffled = [...rooms].sort(() => Math.random() - 0.5);
    // Spawn point
    spawnPoint = new THREE.Vector3(shuffled[0].x, CONFIG.playerHeight, shuffled[0].z);
    shuffled[0].type = 'spawn';
    // Safe house
    if (shuffled[1]) { shuffled[1].type = 'safe'; safeHouse = new THREE.Vector3(shuffled[1].x, 0, shuffled[1].z); }
    // Extract points (2-3)
    const numExtract = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numExtract && i + 2 < shuffled.length; i++) {
      shuffled[i + 2].type = 'extract';
      extractPoints.push({
        position: new THREE.Vector3(shuffled[i+2].x, 0, shuffled[i+2].z),
        activated: false, room: shuffled[i+2]
      });
    }
    // Treasure rooms (1-2)
    const numTreasure = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numTreasure && i + 2 + numExtract < shuffled.length; i++) {
      const idx = i + 2 + numExtract;
      shuffled[idx].type = 'treasure';
      specialRooms.push({ room: shuffled[idx], type: 'treasure' });
      lootBoxes.push({
        position: new THREE.Vector3(shuffled[idx].x, 0, shuffled[idx].z),
        opened: false, rarity: 'rare', mesh: null
      });
    }
    // Hidden room
    if (Math.random() < 0.5 && shuffled.length > numTreasure + numExtract + 2) {
      const idx = numTreasure + numExtract + 2;
      shuffled[idx].type = 'hidden';
      hiddenDoors.push({
        position: new THREE.Vector3(shuffled[idx].x, 0, shuffled[idx].z),
        opened: false, mesh: null
      });
      lootBoxes.push({
        position: new THREE.Vector3(shuffled[idx].x + 1, 0, shuffled[idx].z + 1),
        opened: false, rarity: 'epic', mesh: null
      });
    }

    // Generate walls for each room
    for (let room of rooms) {
      this._addRoomWalls(room, walls);
      // Room light
      const flicker = Math.random() < 0.3;
      lights.push({
        position: new THREE.Vector3(room.x, 2.7, room.z),
        color: cfg.lightColor, intensity: 0.8, flicker, flickerTimer: Math.random() * 5,
        room: room
      });
    }

    // Generate walls for corridors
    for (let corr of corridors) {
      this._addCorridorWalls(corr, walls);
    }

    // Place loot boxes in normal rooms
    for (let room of rooms) {
      if (room.type === 'normal' && Math.random() < 0.4) {
        const lx = room.x + (Math.random() - 0.5) * (room.width - 2);
        const lz = room.z + (Math.random() - 0.5) * (room.depth - 2);
        lootBoxes.push({
          position: new THREE.Vector3(lx, 0, lz),
          opened: false, rarity: Math.random() < 0.15 ? 'rare' : 'common', mesh: null
        });
      }
    }

    // Place scattered items
    const items = [];
    for (let room of rooms) {
      if (room.type === 'normal' && Math.random() < 0.3) {
        const ix = room.x + (Math.random() - 0.5) * (room.width - 2);
        const iz = room.z + (Math.random() - 0.5) * (room.depth - 2);
        const itemTypes = ['ammo', 'coin', 'syringe', 'molotov'];
        const kind = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        items.push({
          position: new THREE.Vector3(ix, 0.5, iz),
          kind, pickedUp: false, mesh: null,
          amount: kind === 'ammo' ? 10 + Math.floor(Math.random() * 20) : kind === 'coin' ? 10 + Math.floor(Math.random() * 30) : 1,
          name: kind
        });
      }
    }

    return { rooms, corridors, walls, lights, lootBoxes, extractPoints, items, spawnPoint, safeHouse, specialRooms, hiddenDoors };
  },
  _makeCorridor(a, b, cellSize) {
    const ax = a.x, az = a.z, bx = b.x, bz = b.z;
    const midX = (ax + bx) / 2, midZ = (az + bz) / 2;
    // L-shaped corridor
    const segments = [];
    if (Math.abs(ax - bx) > 1) {
      segments.push({ x1: ax, z1: az, x2: midX, z2: az, w: 2.5 });
      segments.push({ x1: midX, z1: az, x2: midX, z2: bz, w: 2.5 });
    } else {
      segments.push({ x1: ax, z1: az, x2: ax, z2: midZ, w: 2.5 });
      segments.push({ x1: ax, z1: midZ, x2: bx, z2: midZ, w: 2.5 });
    }
    return { segments, a, b };
  },
  _addRoomWalls(room, walls) {
    const hw = room.width / 2, hd = room.depth / 2;
    // 4 walls with door gaps
    const doorWidth = 2.5;
    // North wall (z - hd)
    walls.push({ x: room.x, z: room.z - hd, width: room.width, depth: 0.3, type: 'wall' });
    // South wall
    walls.push({ x: room.x, z: room.z + hd, width: room.width, depth: 0.3, type: 'wall' });
    // East wall
    walls.push({ x: room.x + hw, z: room.z, width: 0.3, depth: room.depth, type: 'wall' });
    // West wall
    walls.push({ x: room.x - hw, z: room.z, width: 0.3, depth: room.depth, type: 'wall' });
    // Internal collision boxes for AABB
    walls.push({ x: room.x - hw, z: room.z, width: 0.3, depth: room.depth, isCollision: true });
    walls.push({ x: room.x + hw, z: room.z, width: 0.3, depth: room.depth, isCollision: true });
    walls.push({ x: room.x, z: room.z - hd, width: room.width, depth: 0.3, isCollision: true });
    walls.push({ x: room.x, z: room.z + hd, width: room.width, depth: 0.3, isCollision: true });
  },
  _addCorridorWalls(corr, walls) {
    for (let seg of corr.segments) {
      const cx = (seg.x1 + seg.x2) / 2, cz = (seg.z1 + seg.z2) / 2;
      const dx = Math.abs(seg.x2 - seg.x1), dz = Math.abs(seg.z2 - seg.z1);
      if (dx > dz) {
        // Horizontal corridor
        walls.push({ x: cx, z: cz - seg.w/2, width: dx + 1, depth: 0.3, isCollision: true });
        walls.push({ x: cx, z: cz + seg.w/2, width: dx + 1, depth: 0.3, isCollision: true });
      } else {
        // Vertical corridor
        walls.push({ x: cx - seg.w/2, z: cz, width: 0.3, depth: dz + 1, isCollision: true });
        walls.push({ x: cx + seg.w/2, z: cz, width: 0.3, depth: dz + 1, isCollision: true });
      }
    }
  },
  _generateChase(levelIndex) {
    const walls = [], lights = [], lootBoxes = [], extractPoints = [], items = [];
    const corridorLen = 120, corridorWidth = 4;
    // Long straight corridor
    for (let z = 0; z < corridorLen; z += 10) {
      walls.push({ x: -corridorWidth/2, z, width: 0.3, depth: 10, isCollision: true });
      walls.push({ x: corridorWidth/2, z, width: 0.3, depth: 10, isCollision: true });
      lights.push({
        position: new THREE.Vector3(0, 2.7, z),
        color: 0xff0000, intensity: 0.5, flicker: true, flickerTimer: 0
      });
    }
    // Obstacles
    for (let i = 0; i < 8; i++) {
      const z = 15 + i * 12 + Math.random() * 5;
      walls.push({ x: (Math.random() - 0.5) * 2, z, width: 1, depth: 1, isCollision: true });
    }
    const spawnPoint = new THREE.Vector3(0, CONFIG.playerHeight, 0);
    const exitPoint = new THREE.Vector3(0, 0, corridorLen - 5);
    extractPoints.push({ position: exitPoint, activated: true });
    return { rooms: [], corridors: [], walls, lights, lootBoxes, extractPoints, items, spawnPoint, safeHouse: null, specialRooms: [], hiddenDoors: [], exitPoint, isChase: true };
  }
};

// ---------- SCENE BUILDER ----------
const SceneBuilder = {
  _geometries: {}, _materials: {},
  buildScene(mapData, levelIndex) {
    const cfg = CONFIG.levels[levelIndex];
    // Fog
    Game.scene.fog = new THREE.FogExp2(cfg.fogColor, CONFIG.fogDensity);
    Game.scene.background = new THREE.Color(cfg.fogColor);
    // Ambient light
    const ambient = new THREE.AmbientLight(cfg.lightColor, cfg.ambientIntensity);
    Game.scene.add(ambient);

    // Shared materials
    const wallTex = TextureFactory.wallTexture(cfg.wallColor);
    const floorTex = TextureFactory.floorTexture(cfg.floorColor);
    const ceilTex = TextureFactory.ceilingTexture(cfg.ceilColor);
    const matWall = new THREE.MeshLambertMaterial({ map: wallTex });
    const matFloor = new THREE.MeshLambertMaterial({ map: floorTex });
    const matCeil = new THREE.MeshLambertMaterial({ map: ceilTex });

    // Build rooms
    if (mapData.rooms && mapData.rooms.length > 0) {
      for (let room of mapData.rooms) {
        this._buildRoom(room, matWall, matFloor, matCeil, cfg);
      }
    }
    // Build corridors
    if (mapData.corridors) {
      for (let corr of mapData.corridors) {
        this._buildCorridor(corr, matWall, matFloor, matCeil, cfg);
      }
    }
    // Build lights
    for (let lt of mapData.lights) {
      const light = new THREE.PointLight(lt.color, lt.intensity, 15, 2);
      light.position.copy(lt.position);
      Game.scene.add(light);
      Game.lights.push({ light, data: lt });
      // Light fixture
      const fixtureGeo = new THREE.BoxGeometry(0.5, 0.1, 0.5);
      const fixtureMat = new THREE.MeshBasicMaterial({ color: lt.color });
      const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixture.position.copy(lt.position);
      fixture.position.y += 0.2;
      Game.scene.add(fixture);
    }
    // Build loot boxes
    for (let lb of mapData.lootBoxes) {
      const geo = new THREE.BoxGeometry(0.8, 0.6, 0.8);
      const mat = new THREE.MeshLambertMaterial({ map: TextureFactory.crateTexture() });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(lb.position);
      mesh.position.y = 0.3;
      Game.scene.add(mesh);
      lb.mesh = mesh;
      // Glow for rare/epic
      if (lb.rarity !== 'common') {
        const glowColor = lb.rarity === 'epic' ? 0xff00ff : 0x00ffff;
        const glow = new THREE.PointLight(glowColor, 0.5, 5);
        glow.position.copy(lb.position); glow.position.y = 0.5;
        Game.scene.add(glow);
      }
    }
    // Build extract points
    for (let ep of mapData.extractPoints) {
      // Red door
      const doorGeo = new THREE.BoxGeometry(1.5, 2.5, 0.2);
      const doorMat = new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: 0x440000 });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.copy(ep.position); door.position.y = 1.25;
      Game.scene.add(door);
      // Beacon
      const beacon = new THREE.PointLight(0xff0000, 1, 10);
      beacon.position.copy(ep.position); beacon.position.y = 2;
      Game.scene.add(beacon);
      Game.lights.push({ light: beacon, data: { flicker: true, flickerTimer: 0, color: 0xff0000, intensity: 1 } });
    }
    // Build safe house marker
    if (mapData.safeHouse) {
      const markerGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 16);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3 });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(mapData.safeHouse); marker.position.y = 0.05;
      Game.scene.add(marker);
      const healLight = new THREE.PointLight(0x00ff00, 0.5, 8);
      healLight.position.copy(mapData.safeHouse); healLight.position.y = 2;
      Game.scene.add(healLight);
    }
    // Build hidden doors
    if (mapData.hiddenDoors) {
      for (let hd of mapData.hiddenDoors) {
        const geo = new THREE.BoxGeometry(1.2, 2.2, 0.15);
        const mat = new THREE.MeshLambertMaterial({ color: 0x333322 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(hd.position); mesh.position.y = 1.1;
        Game.scene.add(mesh);
        hd.mesh = mesh;
      }
    }
    // Build items on ground
    for (let item of mapData.items) {
      this._buildItem(item);
    }
    // Build props (tables, pipes etc.)
    if (mapData.rooms) {
      for (let room of mapData.rooms) {
        if (room.type === 'normal' && Math.random() < 0.4) {
          this._buildProp(room);
        }
      }
    }
    // Chase level special
    if (mapData.isChase) {
      // Floor
      const floorGeo = new THREE.PlaneGeometry(4, 120);
      const floorMat = new THREE.MeshLambertMaterial({ color: 0x2a0000 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 60);
      Game.scene.add(floor);
      // Ceiling
      const ceil = new THREE.Mesh(floorGeo, matCeil);
      ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3, 60);
      Game.scene.add(ceil);
      // Walls
      const wallGeoL = new THREE.PlaneGeometry(120, 3);
      const wallMatR = new THREE.MeshLambertMaterial({ color: 0x4a0000 });
      const wL = new THREE.Mesh(wallGeoL, wallMatR); wL.position.set(-2, 1.5, 60); wL.rotation.y = Math.PI/2; Game.scene.add(wL);
      const wR = new THREE.Mesh(wallGeoL, wallMatR); wR.position.set(2, 1.5, 60); wR.rotation.y = -Math.PI/2; Game.scene.add(wR);
    }
  },
  _buildRoom(room, matWall, matFloor, matCeil, cfg) {
    const hw = room.width / 2, hd = room.depth / 2;
    // Floor
    const floorGeo = new THREE.PlaneGeometry(room.width, room.depth);
    const floor = new THREE.Mesh(floorGeo, matFloor);
    floor.rotation.x = -Math.PI / 2; floor.position.set(room.x, 0, room.z);
    Game.scene.add(floor);
    // Ceiling
    const ceil = new THREE.Mesh(floorGeo, matCeil);
    ceil.rotation.x = Math.PI / 2; ceil.position.set(room.x, 3, room.z);
    Game.scene.add(ceil);
    // Walls (visual only, collision is separate)
    const wallNGeo = new THREE.PlaneGeometry(room.width, 3);
    const wallN = new THREE.Mesh(wallNGeo, matWall); wallN.position.set(room.x, 1.5, room.z - hd); Game.scene.add(wallN);
    const wallS = new THREE.Mesh(wallNGeo, matWall); wallS.position.set(room.x, 1.5, room.z + hd); wallS.rotation.y = Math.PI; Game.scene.add(wallS);
    const wallEGeo = new THREE.PlaneGeometry(room.depth, 3);
    const wallE = new THREE.Mesh(wallEGeo, matWall); wallE.position.set(room.x + hw, 1.5, room.z); wallE.rotation.y = -Math.PI/2; Game.scene.add(wallE);
    const wallW = new THREE.Mesh(wallEGeo, matWall); wallW.position.set(room.x - hw, 1.5, room.z); wallW.rotation.y = Math.PI/2; Game.scene.add(wallW);
    // Special room coloring
    if (room.type === 'safe') {
      const ringGeo = new THREE.RingGeometry(1, 1.4, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2; ring.position.set(room.x, 0.02, room.z);
      Game.scene.add(ring);
    } else if (room.type === 'treasure') {
      const glow = new THREE.PointLight(0x00ffff, 0.4, 8);
      glow.position.set(room.x, 2, room.z); Game.scene.add(glow);
    } else if (room.type === 'spawn') {
      const ringGeo = new THREE.RingGeometry(0.8, 1.2, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2; ring.position.set(room.x, 0.02, room.z);
      Game.scene.add(ring);
    }
  },
  _buildCorridor(corr, matWall, matFloor, matCeil, cfg) {
    for (let seg of corr.segments) {
      const cx = (seg.x1 + seg.x2) / 2, cz = (seg.z1 + seg.z2) / 2;
      const dx = Math.max(Math.abs(seg.x2 - seg.x1), 1), dz = Math.max(Math.abs(seg.z2 - seg.z1), 1);
      const w = seg.w || 2.5;
      const floorW = dx > dz ? dx + 1 : w;
      const floorD = dx > dz ? w : dz + 1;
      const floorGeo = new THREE.PlaneGeometry(floorW, floorD);
      const floor = new THREE.Mesh(floorGeo, matFloor);
      floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0, cz);
      Game.scene.add(floor);
      const ceil = new THREE.Mesh(floorGeo, matCeil);
      ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, 3, cz);
      Game.scene.add(ceil);
    }
  },
  _buildItem(item) {
    let geo, mat;
    if (item.kind === 'ammo') {
      geo = new THREE.BoxGeometry(0.3, 0.2, 0.3); mat = new THREE.MeshLambertMaterial({ color: 0x8a7a2e });
    } else if (item.kind === 'coin') {
      geo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 8); mat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
    } else if (item.kind === 'syringe') {
      geo = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6); mat = new THREE.MeshLambertMaterial({ color: 0x00ffff });
    } else {
      geo = new THREE.BoxGeometry(0.2, 0.3, 0.2); mat = new THREE.MeshLambertMaterial({ color: 0x8a4040 });
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(item.position);
    mesh.userData.item = item;
    Game.scene.add(mesh);
    item.mesh = mesh;
  },
  _buildProp(room) {
    const types = ['table', 'shelf', 'pipe', 'barrel'];
    const type = types[Math.floor(Math.random() * types.length)];
    const px = room.x + (Math.random() - 0.5) * (room.width - 3);
    const pz = room.z + (Math.random() - 0.5) * (room.depth - 3);
    if (type === 'table') {
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.8), new THREE.MeshLambertMaterial({ color: 0x5a3a20 }));
      top.position.set(px, 0.8, pz); Game.scene.add(top);
      for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), new THREE.MeshLambertMaterial({ color: 0x4a2a10 }));
        leg.position.set(px + (i < 2 ? -0.65 : 0.65), 0.4, pz + (i % 2 ? -0.3 : 0.3)); Game.scene.add(leg);
      }
    } else if (type === 'shelf') {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.4), new THREE.MeshLambertMaterial({ color: 0x4a4a4a }));
      shelf.position.set(px, 1, pz); Game.scene.add(shelf);
    } else if (type === 'pipe') {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3, 8), new THREE.MeshLambertMaterial({ color: 0x665544 }));
      pipe.rotation.z = Math.PI / 2; pipe.position.set(px, 2.5, pz); Game.scene.add(pipe);
    } else {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1, 12), new THREE.MeshLambertMaterial({ color: 0x4a2a2a }));
      barrel.position.set(px, 0.5, pz); Game.scene.add(barrel);
    }
  }
};

// ---------- PLAYER CONTROLLER ----------
const PlayerController = {
  yaw: 0, pitch: 0, bobPhase: 0, breathPhase: 0, footstepTimer: 0, hurtFlash: 0,
  handleMouseMove(dx, dy) {
    this.yaw -= dx * Game.sensitivity;
    this.pitch -= dy * Game.sensitivity;
    this.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, this.pitch));
    Game.camera.rotation.order = 'YXZ';
    Game.camera.rotation.y = this.yaw;
    Game.camera.rotation.x = this.pitch;
  },
  update(delta) {
    const p = Game.player;
    // Movement input
    let mx = 0, mz = 0;
    if (Game.keys['KeyW']) mz -= 1;
    if (Game.keys['KeyS']) mz += 1;
    if (Game.keys['KeyA']) mx -= 1;
    if (Game.keys['KeyD']) mx += 1;
    // Normalize
    if (mx !== 0 && mz !== 0) { mx *= 0.707; mz *= 0.707; }
    // Speed
    let speed = CONFIG.walkSpeed;
    if (Game.keys['ShiftLeft'] && !p.isCrouching && p.stamina > 0) { speed = CONFIG.sprintSpeed; p.isSprinting = true; p.stamina -= delta * 20; }
    else { p.isSprinting = false; p.stamina = Math.min(100, p.stamina + delta * 15); }
    if (Game.keys['ControlLeft'] || Game.keys['KeyC']) { speed = CONFIG.crouchSpeed; p.isCrouching = true; }
    else p.isCrouching = false;
    // ADS slows down
    if (Game.isADS) speed *= 0.5;
    // Calculate movement vector (relative to yaw)
    const cosY = Math.cos(this.yaw), sinY = Math.sin(this.yaw);
    const vx = (mx * cosY - mz * sinY) * speed;
    const vz = (mx * sinY + mz * cosY) * speed;
    p.velocity.x = vx; p.velocity.z = vz;
    // Gravity & jump
    if (Game.keys['Space'] && p.onGround) { p.velocity.y = CONFIG.jumpForce; p.onGround = false; }
    p.velocity.y -= CONFIG.gravity * delta;
    // Move and collide
    let newX = p.position.x + p.velocity.x * delta;
    let newZ = p.position.z + p.velocity.z * delta;
    // Collision X
    if (this._checkCollision(newX, p.position.z, CONFIG.playerRadius)) { newX = p.position.x; }
    // Collision Z
    if (this._checkCollision(newX, newZ, CONFIG.playerRadius)) { newZ = p.position.z; }
    p.position.x = newX; p.position.z = newZ;
    // Vertical
    p.position.y += p.velocity.y * delta;
    let floorY = CONFIG.playerHeight;
    if (p.isCrouching) floorY = CONFIG.playerHeight * 0.6;
    if (p.position.y <= floorY) { p.position.y = floorY; p.velocity.y = 0; p.onGround = true; }
    // Head bob
    if ((mx !== 0 || mz !== 0) && p.onGround) {
      this.bobPhase += delta * (p.isSprinting ? 12 : 8);
      const bob = Math.sin(this.bobPhase) * 0.04;
      Game.camera.position.y = p.position.y + bob;
      this.footstepTimer += delta;
      if (this.footstepTimer > (p.isSprinting ? 0.3 : 0.5)) { AudioSystem.playFootstep(); this.footstepTimer = 0; }
    } else {
      // Breathing
      this.breathPhase += delta * 1.5;
      Game.camera.position.y = p.position.y + Math.sin(this.breathPhase) * 0.01;
    }
    Game.camera.position.x = p.position.x; Game.camera.position.z = p.position.z;
    // Hurt flash
    if (this.hurtFlash > 0) {
      this.hurtFlash -= delta * 3;
      const v = document.getElementById('damageVignette');
      if (v) v.style.boxShadow = `inset 0 0 ${100 + this.hurtFlash*50}px rgba(255,0,0,${this.hurtFlash * 0.5})`;
    }
  },
  _checkCollision(x, z, radius) {
    if (!Game.walls) return false;
    for (let w of Game.walls) {
      if (!w.isCollision) continue;
      const dx = Math.abs(x - w.x) - w.width/2 - radius;
      const dz = Math.abs(z - w.z) - w.depth/2 - radius;
      if (dx < 0 && dz < 0) return true;
    }
    return false;
  },
  takeDamage(amount) {
    Game.player.health -= amount;
    this.hurtFlash = 1;
    AudioSystem.playHurt();
    // Damage direction indicator
    uiSystem.showDamageIndicator(0);
    if (Game.player.health <= 0) { Game.player.health = 0; }
  },
  heal(amount) { Game.player.health = Math.min(Game.player.maxHealth, Game.player.health + amount); },
  addSan(amount) { Game.player.san = Math.min(Game.player.maxSan, Game.player.san + amount); },
  reduceSan(amount) { Game.player.san = Math.max(0, Game.player.san - amount); },
  die() { playerDeath(); }
};
