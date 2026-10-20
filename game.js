(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = 1280, H = 720, RUN_DURATION = 210, BOSS_TIME = 130;
  const MAPS = [
    { id:'flooded', name:{es:'CIUDAD INUNDADA',en:'FLOODED CITY'}, floor:[5,13,22], variation:[9,13,18], line:[62,121,145], accent:'#ffc078', glow:'rgba(58,184,215,.10)', motif:'water', creatures:[1,2,3,4], bossCreature:5, bossName:{es:'LA MAREA HUECA',en:'THE HOLLOW TIDE'}, duration:210, bossTime:130 },
    { id:'catacombs', name:{es:'CATACUMBAS DE CENIZA',en:'ASH CATACOMBS'}, floor:[12,10,17], variation:[14,11,17], line:[127,91,70], accent:'#ffb46e', glow:'rgba(222,130,69,.10)', motif:'stone', creatures:[6,7,8,9], bossCreature:10, bossName:{es:'EL ABAD SIN ROSTRO',en:'THE FACELESS ABBOT'}, duration:225, bossTime:135 },
    { id:'forest', name:{es:'BOSQUE DE RAÍCES MUERTAS',en:'FOREST OF DEAD ROOTS'}, floor:[4,14,14], variation:[7,13,10], line:[60,117,91], accent:'#9af0a8', glow:'rgba(70,227,166,.10)', motif:'rune', creatures:[11,12,13,14], bossCreature:15, bossName:{es:'CIERVO DEL ECLIPSE',en:'ECLIPSE STAG'}, duration:230, bossTime:140 },
    { id:'hospital', name:{es:'HOSPITAL APAGADO',en:'THE DARK HOSPITAL'}, floor:[10,13,23], variation:[12,13,20], line:[91,135,157], accent:'#a4e5f5', glow:'rgba(94,190,220,.10)', motif:'hospital', creatures:[16,17,18,19], bossCreature:20, bossName:{es:'DOCTORA ECLIPSE',en:'DOCTOR ECLIPSE'}, duration:240, bossTime:145 },
    { id:'port', name:{es:'PUERTO DE CONTENEDORES',en:'CONTAINER PORT'}, floor:[10,15,22], variation:[15,13,16], line:[109,130,139], accent:'#ffb36d', glow:'rgba(255,148,70,.08)', motif:'port', creatures:[21,22,23,24], bossCreature:25, bossName:{es:'EL LEVIATÁN DE CASCO',en:'THE HULL LEVIATHAN'}, duration:240, bossTime:145 },
    { id:'crystal', name:{es:'MINA DE CRISTAL NEGRO',en:'BLACK CRYSTAL MINE'}, floor:[8,9,22], variation:[11,13,26], line:[95,120,190], accent:'#9bdcff', glow:'rgba(76,139,255,.12)', motif:'ice', creatures:[26,27,28,29], bossCreature:30, bossName:{es:'CORAZÓN DE GEODA',en:'GEODE HEART'}, duration:250, bossTime:150 },
    { id:'fairground', name:{es:'PARQUE DE ATRACCIONES OLVIDADO',en:'FORGOTTEN FAIRGROUND'}, floor:[17,8,21], variation:[18,10,20], line:[151,87,135], accent:'#ff9fd7', glow:'rgba(213,72,166,.11)', motif:'fairground', creatures:[31,32,33,34], bossCreature:35, bossName:{es:'MAESTRO DE CEREMONIAS',en:'RINGMASTER'}, duration:255, bossTime:155 },
    { id:'sunkenlighthouse', name:{es:'EL FARO HUNDIDO',en:'THE SUNKEN LIGHTHOUSE'}, floor:[3,11,20], variation:[7,15,22], line:[59,130,159], accent:'#ffc078', glow:'rgba(58,184,215,.14)', motif:'astral', creatures:[36,37,38,39], bossCreature:40, bossName:{es:'EL APAGADOR',en:'THE LIGHT-EXTINGUISHER'}, duration:270, bossTime:160 }
  ];
  const creatureImages = new Map();
  const creatureFileNames = ['ahogado', 'anguila_de_alcantarilla', 'medusa_fantasma', 'cangrejo_de_chatarra', 'la_marea_hueca', 'susurrante', 'chacal_de_huesos', 'arana_de_cirios', 'penitente', 'el_abad_sin_rostro', 'polilla_lamparera', 'sabueso_de_niebla', 'raizon', 'enjambre_de_esporas', 'ciervo_del_eclipse', 'paciente_cero', 'cirujano_gris', 'quiste_palpitante', 'boca_de_ventilacion', 'doctora_eclipse', 'estibador_hundido', 'gaviota_ciega', 'pulpo_de_sentina', 'ermitano_de_acero', 'el_leviatan_de_casco', 'gusano_prisma', 'duende_de_cuarzo', 'murcielago_de_sombra', 'golem_de_obsidiana', 'corazon_geoda', 'payaso_parpadeo', 'caballito_de_carrusel', 'globo_fantasma', 'espejo_mentiroso', 'maestro_de_ceremonias', 'vigia_naufragado', 'anima_de_faro', 'ave_tormenta', 'tentaculo_del_abismo', 'el_apagador'];
  for (let i=1;i<=40;i++) { const img=new Image(); img.src='assets/creature-sprites/'+String(i).padStart(2,'0')+'_'+creatureFileNames[i-1]+'.svg'; creatureImages.set(i,img); }
  const MAP_COUNT = MAPS.length;
  const $ = (id) => document.getElementById(id);
  const screens = ['main-menu','how-screen','armory-screen','upgrade-screen','pause-screen','result-screen'];
  const keys = new Set();
  const mouse = { x: W * 0.72, y: H * 0.5, down: false };
  let lang = 'es';
  let state = 'menu';
  let lastFrame = 0;
  let elapsed = 0, spawnTimer = 0, bossSpawned = false, bossKilled = false;
  let player = null;
  let currentMap = MAPS[0], previousMapId = null, mapDeck = [];
  let campaignLevel = 1;
  let enemies = [], pickups = [], bullets = [], particles = [], floatingTexts = [], effects = [];
  let runStats = { kills: 0, crystals: 0, damage: 0, level: 1 };
  let shake = 0, runEnded = false, soundOn = true, audioCtx = null;
  let toastTimer = 0;
  let save = loadSave();
  // Testing build: make all eight sectors available even if this PC has an older save.
  save.campaignLevelUnlocked = MAP_COUNT;
  save.selectedCampaignLevel = Math.min(MAP_COUNT, Math.max(1, Number(save.selectedCampaignLevel) || 1));
  let upgradeChoices = [];
  let runBanked = 0;

  function defaultSave() { return { bank: 0, best: 0, runs: 0, wins: 0, sound: true, advancedUnlocked: false, campaignLevelUnlocked: MAP_COUNT, upgrades: { vitality: 0, lens: 0, battery: 0, stride: 0, magnet: 0, emberCoil: 0, farPrism: 0, dispelCore: 0, echoDividend: 0 } }; }
  function loadSave() {
    try {
      const raw = JSON.parse(localStorage.getItem('cinder-signal-night-dispatch-save') || 'null');
      const base = defaultSave();
      if (!raw || typeof raw !== 'object') return base;
      return { ...base, ...raw, upgrades: { ...base.upgrades, ...(raw.upgrades || {}) } };
    } catch (_) { return defaultSave(); }
  }
  function saveGame() {
    try { localStorage.setItem('cinder-signal-night-dispatch-save', JSON.stringify(save)); } catch (_) { /* local saves may be disabled in private mode */ }
  }

  const I18N = {
    es: {
      eyebrow:'SEÑAL PERDIDA · DISTRITO 07', tagline:'La oscuridad no te persigue. Espera a que apagues la luz.', play:'INICIAR TURNO', armory:'TALLER DE ECOS', how:'CÓMO SOBREVIVIR', best:'MEJOR TIEMPO', bank:'ECOS GUARDADOS', runs:'TURNOS', chapter:'EL FARO HA MUERTO', 'chapter-sub':'REACTIVA EL ÚLTIMO HAZ', 'tip-title':'REGLA DE ORO', tip:'La luz detiene a las sombras. Pero cada segundo encendida consume tu única oportunidad de ver el amanecer.', move:'MOVERSE', aim:'APUNTAR', manual:'MANUAL DE CAMPO', 'how-title':'SOBREVIVE A LA OSCURIDAD', 'm-move':'Desplazamiento', 'm-move-p':'Muévete entre ruinas, recoge ecos y no dejes que te rodeen.', 'm-light':'Haz de luz', 'm-light-p':'Mantén pulsado para revelar y abrasar a los monstruos dentro del cono. Sus puntos débiles brillan al quedar enfocados.', 'm-pulse':'Pulso de emergencia', 'm-pulse-p':'Gasta energía para lanzar una onda que daña y repele a los enemigos cercanos.', 'm-dash':'Impulso', 'm-dash-p':'Haz una evasión rápida. Tiene enfriamiento: guárdala para escapar de un cerco.', 'm-pause':'Pausa', 'm-pause-p':'Pausa o continúa la partida. Al subir de nivel, el tiempo se detiene para elegir una mejora.', 'm-goal':'Objetivo', 'm-goal-p':'Sobrevive hasta que vuelva la señal y derrota al Guardián del Vacío. Cada turno es distinto.', understood:'ENTENDIDO', 'between-runs':'PROGRESO ENTRE TURNOS', 'armory-title':'TALLER DE ECOS', 'armory-sub':'Los ecos que rescatas pueden reforzar tu siguiente expedición.', available:'ECOS DISPONIBLES', 'shop-note':'Las mejoras permanentes se guardan en este ordenador.', back:'VOLVER', 'signal-upgrade':'SEÑAL RECONSTRUIDA', 'choose-upgrade':'ELIGE UNA MODIFICACIÓN', 'upgrade-sub':'Elige con cabeza. No volverás a ver estas opciones en este turno.', paused:'TRANSMISIÓN EN ESPERA', 'pause-title':'TURNO PAUSADO', 'pause-sub':'La oscuridad también sabe esperar.', resume:'CONTINUAR', quit:'ABANDONAR TURNO', retry:'OTRO TURNO', 'main-menu':'MENÚ PRINCIPAL', 'pause-hint':'PAUSAR', soundOn:'SONIDO ON', soundOff:'SONIDO OFF', noEchoes:'NO HAY ECOS SUFICIENTES', bought:'MODIFICACIÓN INSTALADA', maxed:'NIVEL MÁXIMO', cost:'COSTE', level:'NIVEL', buy:'INSTALAR', max:'MÁXIMO', health:'INTEGRIDAD', battery:'CARGA', echo:'ECOS', kills:'ELIMINACIONES', time:'TIEMPO', levelUp:'NIVEL', boss:'GUARDIÁN DEL VACÍO', bossAppear:'ALGO ENORME HA OÍDO TU SEÑAL', bossDown:'EL GUARDIÁN HA CAÍDO', pulseReady:'PULSO LISTO', pulseCharging:'PULSO CARGANDO', dashReady:'IMPULSO LISTO', dashCharging:'IMPULSO RECARGANDO', objective:'REACTIVA EL FARO', survive:'SOBREVIVE AL APAGÓN', bossObjective:'DESTRUYE AL GUARDIÁN', 'boss-dead':'GUARDIÁN DESTRUIDO', runWon:'SEÑAL RECUPERADA', runLost:'SEÑAL PERDIDA', wonDesc:'El faro vuelve a emitir. Has encontrado una ruta hacia el amanecer.', lostDesc:'La señal se apagó. Cada eco recuperado puede ayudar en el siguiente turno.', resultTime:'SUPERVIVENCIA', resultKills:'ELIMINACIONES', resultLevel:'NIVEL', resultEcho:'ECOS RESCATADOS', deposited:'ECOS AÑADIDOS', shopVita:'Revestimiento vital', shopVitaDesc:'+12 de integridad máxima al inicio de cada turno.', shopLens:'Lente concentradora', shopLensDesc:'+5% de daño del haz por nivel.', shopBattery:'Batería de flujo', shopBatteryDesc:'+8 de carga máxima y +1 de regeneración por nivel.', shopStride:'Botas de deriva', shopStrideDesc:'+5% de velocidad de movimiento por nivel.', shopMagnet:'Resonador de ecos', shopMagnetDesc:'Atrae ecos desde más lejos por nivel.', upCoil:'Bobina de ruptura', upCoilDesc:'+18% de daño del haz. Las sombras no tendrán tiempo de acercarse.', upBattery:'Celda de alta densidad', upBatteryDesc:'+24 de carga máxima y +2 de regeneración por segundo.', upPrism:'Prisma de dispersión', upPrismDesc:'El cono de luz se ensancha. Controla más espacio.', upPulse:'Condensador de choque', upPulseDesc:'El pulso golpea más fuerte y alcanza más lejos.', upStep:'Impulso vectorial', upStepDesc:'+12% de velocidad y recuperación más rápida del impulso.', upMed:'Sutura de luz', upMedDesc:'Restaura 35 de integridad y aumenta el máximo en 10.', upMagnet:'Malla resonante', upMagnetDesc:'El radio de atracción de ecos aumenta notablemente.', upEcho:'Eco duplicado', upEchoDesc:'Cada fragmento recogido concede experiencia adicional.', upEfficiency:'Circuito eficiente', upEfficiencyDesc:'El haz consume un 18% menos de carga.', upFocus:'Enfoque quirúrgico', upFocusDesc:'+12% de daño y un poco más de alcance.', upPulseWave:'Onda expansiva', upPulseWaveDesc:'Tu pulso empuja más lejos y aturde durante más tiempo.', upgrade:'MEJORA', choose:'ELEGIR MODIFICACIÓN', common:'ESTÁNDAR', rare:'AVANZADA', epic:'EXPERIMENTAL', picked:'MODIFICACIÓN ACTIVADA', next:'SIGUIENTE SEÑAL', pulseLow:'CARGA INSUFICIENTE', deathTitle:'TURNO INTERRUMPIDO', victoryTitle:'EL FARO VUELVE A ARDER', continueText:'PULSA PARA CONTINUAR', record:'NUEVO RÉCORD', 'shop-level':'NIVEL INSTALADO', confirmQuit:'¿Abandonar este turno? El progreso actual se perderá.', dispelReady:'DISIPAR DISPONIBLE', dispelUsed:'DISIPAR UTILIZADO', dispelTitle:'DISIPAR', dispelToast:'TODAS LAS SOMBRAS ESTÁN ATURDIDAS', 'm-dispel':'Disipar', 'm-dispel-p':'Una sola vez por turno: aturde a todos los enemigos activos durante 3 segundos.', shopUnlock:'Protocolo de élite', shopUnlockDesc:'Desbloquea cuatro mejoras permanentes avanzadas en el taller.', shopUnlocked:'PROTOCOLO DE ÉLITE DESBLOQUEADO', shopEmber:'Bobina de brasa', shopEmberDesc:'+8% de daño de linterna por nivel.', shopFar:'Prisma de alcance', shopFarDesc:'+8% de alcance del haz por nivel.', shopDispel:'Cámara de disipación', shopDispelDesc:'+0,5 s de aturdimiento global de Disipar por nivel.', shopDividend:'Dividendo de ecos', shopDividendDesc:'Recupera un 12% más de ecos de media por nivel.'
    },
    en: {
      eyebrow:'SIGNAL LOST · DISTRICT 07', tagline:'The dark is not chasing you. It is waiting for you to turn off the light.', play:'START SHIFT', armory:'ECHO WORKSHOP', how:'HOW TO SURVIVE', best:'BEST SURVIVAL', bank:'BANKED ECHOES', runs:'SHIFTS', chapter:'THE LIGHTHOUSE IS DEAD', 'chapter-sub':'RESTORE THE LAST BEAM', 'tip-title':'GOLDEN RULE', tip:'Light stops the shadows. But every second it stays on drains your only chance to see the sunrise.', move:'MOVE', aim:'AIM', manual:'FIELD MANUAL', 'how-title':'SURVIVE THE DARK', 'm-move':'Movement', 'm-move-p':'Move through the ruins, gather echoes, and never let them surround you.', 'm-light':'Light beam', 'm-light-p':'Hold to reveal and burn monsters inside the cone. Their weak points glow when the lantern locks onto them.', 'm-pulse':'Emergency pulse', 'm-pulse-p':'Spend energy to release a shockwave that damages and pushes nearby enemies back.', 'm-dash':'Dash', 'm-dash-p':'Make a quick evasive move. It has a cooldown, so save it to escape a swarm.', 'm-pause':'Pause', 'm-pause-p':'Pause or resume the run. Level-ups stop time while you choose an upgrade.', 'm-goal':'Objective', 'm-goal-p':'Survive until the signal returns and defeat the Void Warden. Every shift is different.', understood:'UNDERSTOOD', 'between-runs':'BETWEEN-RUN PROGRESSION', 'armory-title':'ECHO WORKSHOP', 'armory-sub':'The echoes you rescue can strengthen your next expedition.', available:'AVAILABLE ECHOES', 'shop-note':'Permanent upgrades are saved on this computer.', back:'BACK', 'signal-upgrade':'SIGNAL REBUILT', 'choose-upgrade':'CHOOSE AN UPGRADE', 'upgrade-sub':'Choose wisely. These options will not return this shift.', paused:'TRANSMISSION ON HOLD', 'pause-title':'SHIFT PAUSED', 'pause-sub':'The dark knows how to wait, too.', resume:'RESUME', quit:'ABANDON SHIFT', retry:'ANOTHER SHIFT', 'main-menu':'MAIN MENU', 'pause-hint':'PAUSE', soundOn:'SOUND ON', soundOff:'SOUND OFF', noEchoes:'NOT ENOUGH ECHOES', bought:'UPGRADE INSTALLED', maxed:'MAX LEVEL', cost:'COST', level:'LEVEL', buy:'INSTALL', max:'MAX', health:'INTEGRITY', battery:'CHARGE', echo:'ECHOES', kills:'KILLS', time:'TIME', levelUp:'LEVEL', boss:'VOID WARDEN', bossAppear:'SOMETHING HUGE HEARD YOUR SIGNAL', bossDown:'THE WARDEN HAS FALLEN', pulseReady:'PULSE READY', pulseCharging:'PULSE CHARGING', dashReady:'DASH READY', dashCharging:'DASH RECHARGING', objective:'RESTORE THE LIGHTHOUSE', survive:'SURVIVE THE BLACKOUT', bossObjective:'DESTROY THE WARDEN', 'boss-dead':'WARDEN DESTROYED', runWon:'SIGNAL RESTORED', runLost:'SIGNAL LOST', wonDesc:'The lighthouse is broadcasting again. You have found a route to sunrise.', lostDesc:'The signal faded. Every echo recovered can help on the next shift.', resultTime:'SURVIVED', resultKills:'KILLS', resultLevel:'LEVEL', resultEcho:'ECHOES FOUND', deposited:'ECHOES BANKED', shopVita:'Vital lining', shopVitaDesc:'+12 maximum integrity at the start of each shift.', shopLens:'Focusing lens', shopLensDesc:'+5% beam damage per level.', shopBattery:'Flow battery', shopBatteryDesc:'+8 max charge and +1 regeneration per level.', shopStride:'Drift boots', shopStrideDesc:'+5% movement speed per level.', shopMagnet:'Echo resonator', shopMagnetDesc:'Attract echoes from farther away per level.', upCoil:'Rupture coil', upCoilDesc:'+18% beam damage. Shadows will not have time to get close.', upBattery:'High-density cell', upBatteryDesc:'+24 maximum charge and +2 charge regeneration per second.', upPrism:'Scatter prism', upPrismDesc:'Widens the light cone. Control more ground.', upPulse:'Impact capacitor', upPulseDesc:'The pulse hits harder and reaches farther.', upStep:'Vector dash', upStepDesc:'+12% speed and faster dash recovery.', upMed:'Light sutures', upMedDesc:'Restore 35 integrity and increase maximum by 10.', upMagnet:'Resonance mesh', upMagnetDesc:'Substantially increases echo pickup radius.', upEcho:'Echo duplicate', upEchoDesc:'Each fragment collected grants bonus experience.', upEfficiency:'Efficient circuit', upEfficiencyDesc:'The beam consumes 18% less charge.', upFocus:'Surgical focus', upFocusDesc:'+12% damage and a little more range.', upPulseWave:'Expanding wave', upPulseWaveDesc:'Your pulse pushes farther and stuns for longer.', upgrade:'UPGRADE', choose:'CHOOSE MODIFICATION', common:'STANDARD', rare:'ADVANCED', epic:'EXPERIMENTAL', picked:'MODIFICATION ACTIVE', next:'NEXT SIGNAL', pulseLow:'NOT ENOUGH CHARGE', deathTitle:'SHIFT INTERRUPTED', victoryTitle:'THE LIGHTHOUSE BURNS AGAIN', continueText:'PRESS TO CONTINUE', record:'NEW RECORD', 'shop-level':'INSTALLED LEVEL', confirmQuit:'Abandon this shift? Current progress will be lost.', dispelReady:'DISPEL READY', dispelUsed:'DISPEL SPENT', dispelTitle:'DISPEL', dispelToast:'ALL SHADOWS ARE STUNNED', 'm-dispel':'Dispel', 'm-dispel-p':'Once per shift: stuns every active enemy for 3 seconds.', shopUnlock:'Elite protocol', shopUnlockDesc:'Unlock four new permanent advanced upgrades in the workshop.', shopUnlocked:'ELITE PROTOCOL UNLOCKED', shopEmber:'Ember coil', shopEmberDesc:'+8% lantern damage per level.', shopFar:'Range prism', shopFarDesc:'+8% beam range per level.', shopDispel:'Dispel chamber', shopDispelDesc:'+0.5 seconds to global Dispel stun per level.', shopDividend:'Echo dividend', shopDividendDesc:'Recover 12% more echoes on average per level.'
    }
  };
  const T = (key) => (I18N[lang] && I18N[lang][key]) || I18N.es[key] || key;
  const formatTime = (seconds) => {
    const s = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  };
  function applyTranslations() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { const v = T(el.dataset.i18n); if (v) el.textContent = v; });
    $('sound-label').textContent = soundOn ? T('soundOn') : T('soundOff');
    $('best-time').textContent = save.best > 0 ? formatTime(save.best) : '—';
    $('bank-count').textContent = save.bank;
    $('runs-count').textContent = save.runs;
    if (!$('armory-screen').classList.contains('hidden')) renderShop();
  }

  const SHOP = [
    { id:'vitality', icon:'✚', title:'shopVita', desc:'shopVitaDesc', base:18, max:5, step:15 },
    { id:'lens', icon:'⌾', title:'shopLens', desc:'shopLensDesc', base:24, max:5, step:18 },
    { id:'battery', icon:'ϟ', title:'shopBattery', desc:'shopBatteryDesc', base:20, max:5, step:16 },
    { id:'stride', icon:'≫', title:'shopStride', desc:'shopStrideDesc', base:18, max:5, step:15 },
    { id:'magnet', icon:'⌁', title:'shopMagnet', desc:'shopMagnetDesc', base:15, max:5, step:13 }
  ];

  const ADVANCED_SHOP = [
    { id:'emberCoil', icon:'ϟ', title:'shopEmber', desc:'shopEmberDesc', base:72, max:3, step:48 },
    { id:'farPrism', icon:'⌖', title:'shopFar', desc:'shopFarDesc', base:68, max:3, step:45 },
    { id:'dispelCore', icon:'✺', title:'shopDispel', desc:'shopDispelDesc', base:85, max:3, step:55 },
    { id:'echoDividend', icon:'✦', title:'shopDividend', desc:'shopDividendDesc', base:78, max:3, step:50 }
  ];
  const ADVANCED_UNLOCK_COST = 90;

  const RUN_UPGRADES = [
    { id:'coil', icon:'ϟ', title:'upCoil', desc:'upCoilDesc', rarity:'rare', apply:p=>{p.beamDps*=1.18;} },
    { id:'battery', icon:'▰', title:'upBattery', desc:'upBatteryDesc', rarity:'common', apply:p=>{p.maxEnergy+=24;p.energy=Math.min(p.maxEnergy,p.energy+24);p.energyRegen+=2;} },
    { id:'prism', icon:'◉', title:'upPrism', desc:'upPrismDesc', rarity:'rare', apply:p=>{p.beamArc=Math.min(1.25,p.beamArc+.105);} },
    { id:'pulse', icon:'◎', title:'upPulse', desc:'upPulseDesc', rarity:'rare', apply:p=>{p.pulseDamage+=26;p.pulseRadius+=18;} },
    { id:'step', icon:'≫', title:'upStep', desc:'upStepDesc', rarity:'common', apply:p=>{p.speed*=1.12;p.dashCooldown=Math.max(1.05,p.dashCooldown-.18);} },
    { id:'med', icon:'✚', title:'upMed', desc:'upMedDesc', rarity:'common', apply:p=>{p.maxHp+=10;p.hp=Math.min(p.maxHp,p.hp+35);} },
    { id:'magnet', icon:'⌁', title:'upMagnet', desc:'upMagnetDesc', rarity:'common', apply:p=>{p.magnet+=48;} },
    { id:'echo', icon:'✦', title:'upEcho', desc:'upEchoDesc', rarity:'epic', apply:p=>{p.echoBonus+=1;} },
    { id:'efficiency', icon:'◌', title:'upEfficiency', desc:'upEfficiencyDesc', rarity:'rare', apply:p=>{p.energyDrain*=.82;} },
    { id:'focus', icon:'⌖', title:'upFocus', desc:'upFocusDesc', rarity:'rare', apply:p=>{p.beamDps*=1.12;p.beamRange+=28;} },
    { id:'pulseWave', icon:'✺', title:'upPulseWave', desc:'upPulseWaveDesc', rarity:'epic', apply:p=>{p.pulseRadius+=38;p.pulseStun+=.35;} }
  ];

  function showScreen(id) {
    screens.forEach(s => $(s).classList.toggle('hidden', s !== id));
    $('corner-hint').classList.toggle('hidden', !['playing','paused','upgrade'].includes(state));
  }
  function showMenu() { state = 'menu'; showScreen('main-menu'); $('corner-hint').classList.add('hidden'); refreshMenuStats(); refreshCampaignButtons(); }
  function refreshMenuStats() { $('best-time').textContent = save.best > 0 ? formatTime(save.best) : '—'; $('bank-count').textContent = save.bank; $('runs-count').textContent = save.runs; }
  function toast(message) {
    const el = $('toast'); el.textContent = message; el.classList.remove('hidden','flash'); void el.offsetWidth; el.classList.add('flash');
    toastTimer = 2.1;
  }

  function ensureAudio() {
    if (!soundOn) return;
    try { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch (_) { audioCtx = null; }
  }
  function sfx(kind='tick') {
    if (!soundOn) return;
    ensureAudio(); if (!audioCtx) return;
    const now = audioCtx.currentTime;
    try {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      const presets = { beam:[410,'sawtooth',.022,.045], pickup:[760,'sine',.055,.11], pulse:[95,'sawtooth',.13,.32], hit:[80,'triangle',.09,.18], level:[620,'sine',.12,.32], dash:[270,'triangle',.05,.12], boss:[65,'sawtooth',.18,.6], click:[520,'sine',.035,.06], death:[105,'sawtooth',.2,.7], win:[880,'sine',.23,.6] };
      const [freq,wave,vol,duration] = presets[kind] || presets.click;
      osc.type = wave; osc.frequency.setValueAtTime(freq, now);
      if (kind === 'pickup' || kind === 'level' || kind === 'win') osc.frequency.exponentialRampToValueAtTime(freq*1.45, now+duration);
      if (kind === 'hit' || kind === 'death' || kind === 'boss') osc.frequency.exponentialRampToValueAtTime(Math.max(35,freq*.52), now+duration);
      gain.gain.setValueAtTime(vol,now); gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
      osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now); osc.stop(now+duration+.01);
    } catch (_) {}
  }

  function beginRun() {
    ensureAudio();
    campaignLevel = Math.min(MAP_COUNT, Math.max(1, Number(save.selectedCampaignLevel)||1));
    if(campaignLevel > MAP_COUNT) campaignLevel = MAP_COUNT;
    currentMap = MAPS[campaignLevel-1] || MAPS[0];
    previousMapId=currentMap.id;
    elapsed = 0; spawnTimer = .5; bossSpawned = false; bossKilled = false; runEnded = false; runBanked = 0; shake = 0;
    enemies=[];pickups=[];bullets=[];particles=[];floatingTexts=[];effects=[]; keys.clear(); mouse.down=false;
    runStats = { kills:0, crystals:0, damage:0, level:1 };
    player = {
      x:0,y:0,r:13,hp:100,maxHp:100,energy:100,maxEnergy:100,speed:235,beamDps:40,beamRange:385,beamArc:.62,
      energyDrain:25,energyRegen:9.5,pulseCost:34,pulseDamage:72,pulseRadius:145,pulseStun:1.0,pulseCooldown:0,dashCooldown:2.2,dashTimer:0,dashDirX:0,dashDirY:0,dashCd:0,
      invuln:1.3,hitCd:0,magnet:105,xp:0,xpNeed:16,level:1,crystals:0,echoBonus:0,beamActive:false,beamAngle:0,moveX:0,moveY:0,moveBlend:0,walkPhase:0,upgrades:{},upgradeHistory:[],beamParticleTimer:0,dispelUsed:false,dispelDuration:3,dispelTimer:0,echoDividendLevel:0,echoBonusProgress:0
    };
    const u=save.upgrades;
    player.maxHp += (u.vitality||0)*12; player.hp=player.maxHp;
    player.beamDps *= 1+(u.lens||0)*.05;
    player.maxEnergy += (u.battery||0)*8; player.energy=player.maxEnergy; player.energyRegen += (u.battery||0)*1;
    player.speed *= 1+(u.stride||0)*.05;
    player.magnet += (u.magnet||0)*18;
    player.beamDps *= 1 + (u.emberCoil||0)*.08;
    player.beamRange *= 1 + (u.farPrism||0)*.08;
    player.dispelDuration += (u.dispelCore||0)*.5;
    player.echoDividendLevel = u.echoDividend||0;
    state='playing'; showScreen(null); screens.forEach(s=>$(s).classList.add('hidden')); $('corner-hint').classList.remove('hidden');
    toast(`${currentMap.name[lang]} · ${T('objective')}`);
    sfx('level');
  }

  function openShop() { state='menu'; showScreen('armory-screen'); renderShop(); }
  function renderShop() {
    $('armory-bank').textContent = save.bank;
    const wrap = $('upgrade-shop'); wrap.innerHTML='';
    const renderItem = (item) => {
      const level = save.upgrades[item.id] || 0;
      const cost = item.base + level * item.step;
      const maxed = level >= item.max;
      const card = document.createElement('article'); card.className='shop-item';
      card.innerHTML = `<div class="shop-item-head"><div class="shop-icon">${item.icon}</div><div><h3>${T(item.title)}</h3><span class="shop-level">${T('level')} ${level}/${item.max}</span></div></div><p>${T(item.desc)}</p><div class="shop-bottom"><span class="shop-level">${maxed ? T('maxed') : `${T('cost')}: ✦ ${cost}`}</span><button class="shop-buy" ${maxed || save.bank<cost ? 'disabled':''}>${maxed ? T('max') : T('buy')}</button></div>`;
      card.querySelector('button').addEventListener('click', () => {
        if (maxed || save.bank < cost) { if (!maxed) toast(T('noEchoes')); return; }
        save.bank -= cost; save.upgrades[item.id] = level+1; saveGame(); sfx('pickup'); renderShop(); refreshMenuStats(); toast(T('bought'));
      });
      wrap.appendChild(card);
    };
    SHOP.forEach(renderItem);
    if (!save.advancedUnlocked) {
      const card = document.createElement('article'); card.className='shop-item shop-unlock-item';
      card.innerHTML = `<div class="shop-item-head"><div class="shop-icon">✧</div><div><h3>${T('shopUnlock')}</h3><span class="shop-level">${T('cost')}: ✦ ${ADVANCED_UNLOCK_COST}</span></div></div><p>${T('shopUnlockDesc')}</p><div class="shop-bottom"><span class="shop-level">${T('upgrade')}</span><button class="shop-buy" ${save.bank<ADVANCED_UNLOCK_COST?'disabled':''}>${T('buy')}</button></div>`;
      card.querySelector('button').addEventListener('click', () => {
        if (save.advancedUnlocked) return;
        if (save.bank < ADVANCED_UNLOCK_COST) { toast(T('noEchoes')); return; }
        save.bank -= ADVANCED_UNLOCK_COST; save.advancedUnlocked = true; saveGame(); sfx('level'); renderShop(); refreshMenuStats(); toast(T('shopUnlocked'));
      });
      wrap.appendChild(card);
    } else {
      const divider = document.createElement('div'); divider.className='shop-section-label'; divider.textContent=lang==='es'?'MEJORAS DE ÉLITE':'ELITE UPGRADES'; wrap.appendChild(divider);
      ADVANCED_SHOP.forEach(renderItem);
    }
  }

  function spawnParticles(x,y,color,count=8,power=1) {
    for(let i=0;i<count;i++) {
      const a=Math.random()*Math.PI*2, sp=(40+Math.random()*200)*power;
      particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.35+Math.random()*.45,max:.35+Math.random()*.45,size:1.5+Math.random()*3,color,drag:2.2});
    }
  }
  function floatText(x,y,text,color='#b7f9ff',size=15) { floatingTexts.push({x,y,text,color,size,life:.8,max:.8}); }
  function spawnPickup(x,y,amount=1) { pickups.push({x:x+(Math.random()-.5)*20,y:y+(Math.random()-.5)*20,vx:(Math.random()-.5)*45,vy:(Math.random()-.5)*45,r:5+Math.random()*1.5,amount,life:24,phase:Math.random()*6}); }
  function spawnEnemy(type) {
    if (enemies.length > 115 && type !== 'boss') return;
    const a=Math.random()*Math.PI*2, d=(Math.max(W,H)*.55)+Math.random()*140;
    const x=player.x+Math.cos(a)*d, y=player.y+Math.sin(a)*d;
    const scale=1+Math.max(0,elapsed-28)/200*.62;
    const defs={
      shade:{hp:43*scale,speed:88+Math.min(33,elapsed*.12),r:14,damage:10,color:'#293a49',xp:1,kind:'shade'},
      skitter:{hp:27*scale,speed:151+Math.min(38,elapsed*.13),r:11,damage:8,color:'#344d5b',xp:1,kind:'skitter'},
      brute:{hp:142*scale,speed:47+Math.min(14,elapsed*.05),r:23,damage:18,color:'#51404a',xp:2,kind:'brute'},
      seer:{hp:64*scale,speed:67,r:15,damage:9,color:'#35586b',xp:2,kind:'seer'},
      wraith:{hp:68*scale,speed:72+Math.min(9,elapsed*.035),r:17,damage:10,color:'#365466',xp:2,kind:'wraith'},
      devourer:{hp:92*scale,speed:75+Math.min(12,elapsed*.04),r:20,damage:13,color:'#4d343f',xp:3,kind:'devourer'},
      sentinel:{hp:192*scale,speed:36+Math.min(8,elapsed*.03),r:25,damage:20,color:'#51474a',xp:3,kind:'sentinel'},
      riftling:{hp:48*scale,speed:104+Math.min(24,elapsed*.1),r:13,damage:10,color:'#55406f',xp:1,kind:'riftling'},
      orbit:{hp:72*scale,speed:83,r:16,damage:11,color:'#3f547d',xp:2,kind:'orbit'},
      lancer:{hp:88*scale,speed:68,r:18,damage:14,color:'#694a88',xp:2,kind:'lancer'},
      mirror:{hp:116*scale,speed:57,r:20,damage:12,color:'#536d88',xp:3,kind:'mirror'},
      nullstalker:{hp:158*scale,speed:49,r:22,damage:18,color:'#342b4d',xp:3,kind:'nullstalker'}
    };
    const dfn=defs[type]||defs.shade;
    const pool=currentMap.creatures||[1,2,3,4];
    const stage=Math.min(pool.length-1,Math.floor(elapsed/Math.max(1,(currentMap.bossTime||130)/pool.length)));
    const creatureIndex=pool[Math.random()<.72?stage:Math.floor(Math.random()*pool.length)];
    enemies.push({x,y,...dfn,maxHp:dfn.hp,creatureIndex,stun:0,hitFlash:0,contactCd:Math.random()*.4,fireCd:1+Math.random()*1.1,phase:Math.random()*8,dead:false,attackWindup:0,hitParticleCd:0});
  }

  function spawnBoss() {
    if(bossSpawned) return;
    bossSpawned=true;
    const a=Math.random()*Math.PI*2;
    const x=player.x+Math.cos(a)*540, y=player.y+Math.sin(a)*360;
    const hp=1120+(campaignLevel-1)*175;
    const bossStyle=campaignLevel-1;
    enemies.push({x,y,hp,maxHp:hp,speed:42+bossStyle*1.2,r:39+Math.min(8,bossStyle),damage:24+bossStyle*1.5,color:'#3d283f',xp:0,kind:'boss',creatureIndex:currentMap.bossCreature,bossStyle,bossVariant:bossStyle===1?'astral':'map'+campaignLevel,stun:0,hitFlash:0,contactCd:0,fireCd:1.0,phase:0,dead:false,hitParticleCd:0});
    effects.push({type:'banner',text:T('bossAppear'),life:2.6,max:2.6});
    toast(T('bossAppear'));sfx('boss');shake=10;
  }

  function angleDelta(a,b) {
    let d=a-b;
    while(d>Math.PI)d-=Math.PI*2;
    while(d<-Math.PI)d+=Math.PI*2;
    return d;
  }
  // Shared geometry for both the beam's damage and its visual lock-on, so what glows is what can be hit.
  function beamFocus(e) {
    if(!player || !player.beamActive || !e || e.dead) return 0;
    const dx=e.x-player.x, dy=e.y-player.y, d=Math.hypot(dx,dy);
    if(d>player.beamRange+e.r || d<1) return 0;
    const diff=Math.abs(angleDelta(Math.atan2(dy,dx),player.beamAngle));
    const edge=player.beamArc*.5+Math.asin(Math.min(.35,e.r/Math.max(d,1)));
    if(diff>edge) return 0;
    const angular=1-diff/Math.max(edge,.01);
    const radial=Math.max(0,Math.min(1,(player.beamRange+e.r-d)/Math.max(e.r,player.beamRange*.14)));
    return Math.max(.12,Math.min(1,angular*.72+radial*.28));
  }
  function mixHex(a,b,t) {
    const parse=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
    const A=parse(a),B=parse(b);
    return '#'+A.map((v,i)=>Math.round(v*(1-t)+B[i]*t).toString(16).padStart(2,'0')).join('');
  }
  function damageEnemy(e,amount) {
    if(e.dead) return;
    e.hp-=amount; e.hitFlash=.075;
    if((e.hitParticleCd||0)<=0){spawnParticles(e.x,e.y,e.kind==='boss'?'#ff9aa7':'#76edf6',1,.32);e.hitParticleCd=.28;}
    if(e.hp<=0) killEnemy(e);
  }
  function killEnemy(e) {
    if(e.dead) return; e.dead=true; runStats.kills++;
    const isBoss=e.kind==='boss';
    spawnParticles(e.x,e.y,isBoss?'#ffb963':'#65deee',isBoss?55:11,isBoss?1.8:1);
    if(isBoss) {
      bossKilled=true; sfx('boss'); shake=17; floatText(e.x,e.y-45,T('bossDown'),'#ffc16a',25); effects.push({type:'banner',text:T('bossDown'),life:2.8,max:2.8});
      for(let i=0;i<20;i++) spawnPickup(e.x+(Math.random()-.5)*100,e.y+(Math.random()-.5)*100,1);
      // A boss kill sends a few final echoes directly to the run total as a reward for objective completion.
      player.crystals += 12; runStats.crystals += 12;
      // The update loop ends the run cleanly after processing this frame.
      return;
    }
    spawnPickup(e.x,e.y,1);
    if(e.kind==='brute' || Math.random()<.17) spawnPickup(e.x+8,e.y-5,1);
    if(Math.random()<.13) pickups.push({x:e.x,y:e.y,vx:0,vy:0,r:5,amount:1,life:12,health:true,phase:0});
  }

  function triggerPulse() {
    if(!player || state!=='playing' || player.pulseCooldown>0) return;
    if(player.energy < player.pulseCost) { toast(T('pulseLow')); sfx('click'); return; }
    player.energy -= player.pulseCost; player.pulseCooldown=6.6; effects.push({type:'pulse',x:player.x,y:player.y,life:.42,max:.42,radius:player.pulseRadius});
    spawnParticles(player.x,player.y,'#8af7ff',24,1.2); shake=6; sfx('pulse');
    for(const e of enemies) {
      if(e.dead) continue;
      const dx=e.x-player.x,dy=e.y-player.y,d=Math.hypot(dx,dy);
      if(d<player.pulseRadius+e.r) {
        damageEnemy(e, e.kind==='boss'?player.pulseDamage*.58:player.pulseDamage);
        e.stun=Math.max(e.stun,player.pulseStun);
        if(e.kind!=='boss') { const k=Math.max(1,d);e.x+=dx/k*80;e.y+=dy/k*80; }
      }
    }
  }

  function triggerDispel() {
    if(!player || state!=='playing') return;
    if(player.dispelUsed) { toast(T('dispelUsed')); sfx('click'); return; }
    player.dispelUsed=true;
    player.dispelTimer=player.dispelDuration;
    for(const e of enemies) if(!e.dead) e.stun=Math.max(e.stun,player.dispelDuration);
    effects.push({type:'dispel',x:player.x,y:player.y,life:1.05,max:1.05,radius:Math.hypot(W,H)});
    spawnParticles(player.x,player.y,'#9bf7ff',28,1.05);
    shake=4.5; sfx('pulse'); toast(T('dispelToast'));
  }

  function dash() {
    if(!player || state!=='playing' || player.dashCd>0) return;
    let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
    let dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
    if(dx===0&&dy===0){dx=Math.cos(player.beamAngle);dy=Math.sin(player.beamAngle);}
    const m=Math.hypot(dx,dy)||1; player.dashDirX=dx/m;player.dashDirY=dy/m;player.dashTimer=.16;player.dashCd=player.dashCooldown;player.invuln=Math.max(player.invuln,.32);spawnParticles(player.x,player.y,'#6cecf4',12,.75);sfx('dash');
  }

  function startLevelUp() {
    if(state!=='playing') return;
    const previousNeed = player.xpNeed;
    state='upgrade'; player.level++; runStats.level=player.level;
    player.xp = Math.max(0, player.xp - previousNeed);
    player.xpNeed=Math.floor(16+player.level*6.2);
    // Large XP bursts cannot trigger a rapid chain of modal screens; retain some progress toward the next level.
    player.xp = Math.min(player.xp, Math.floor(player.xpNeed * .62));
    const seen = new Set(player.upgradeHistory || []);
    const fresh = RUN_UPGRADES.filter(up => !seen.has(up.id));
    const pool=[...(fresh.length >= 3 ? fresh : RUN_UPGRADES)];
    upgradeChoices=[];
    for(let i=0;i<3&&pool.length;i++){const ix=Math.floor(Math.random()*pool.length);upgradeChoices.push(pool.splice(ix,1)[0]);}
    renderUpgradeChoices();showScreen('upgrade-screen');sfx('level');
  }
  function grantXP(n) {
    if(!player) return;
    player.xp+=n;
    if(player.xp>=player.xpNeed && state==='playing') startLevelUp();
  }
  function renderUpgradeChoices() {
    const wrap=$('upgrade-options');wrap.innerHTML='';
    upgradeChoices.forEach(up => {
      const card=document.createElement('button');card.className='upgrade-option';
      card.innerHTML=`<span class="upgrade-symbol">${up.icon}</span><span class="rarity">${T(up.rarity)}</span><h3>${T(up.title)}</h3><p>${T(up.desc)}</p><span class="pick">${T('choose')} ↗</span>`;
      card.addEventListener('click',()=>{
        up.apply(player);player.upgrades[up.id]=(player.upgrades[up.id]||0)+1;player.upgradeHistory=player.upgradeHistory||[];player.upgradeHistory.push(up.id);state='playing';showScreen(null);screens.forEach(s=>$(s).classList.add('hidden'));$('corner-hint').classList.remove('hidden');toast(T('picked'));spawnParticles(player.x,player.y,'#8af7ff',20,.8);
        if(player.xp>=player.xpNeed) startLevelUp();
      });
      wrap.appendChild(card);
    });
  }

  function hurtPlayer(damage, x, y) {
    if(player.invuln>0 || player.dashTimer>0 || player.hp<=0) return;
    player.hp-=damage;player.invuln=.68;runStats.damage+=damage;shake=7;spawnParticles(player.x,player.y,'#ff7a8c',15,.65);sfx('hit');
    const dx=player.x-x,dy=player.y-y,d=Math.hypot(dx,dy)||1;player.x+=dx/d*20;player.y+=dy/d*20;
    if(player.hp<=0) finishRun(false);
  }

  function update(dt) {
    if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.add('hidden');}
    if(state!=='playing' || !player) return;
    elapsed+=dt;
    if(elapsed>=(currentMap.bossTime||BOSS_TIME) && !bossSpawned) spawnBoss();
    player.invuln=Math.max(0,player.invuln-dt);player.hitCd=Math.max(0,player.hitCd-dt);player.dashCd=Math.max(0,player.dashCd-dt);player.pulseCooldown=Math.max(0,player.pulseCooldown-dt);player.dashTimer=Math.max(0,player.dashTimer-dt);player.dispelTimer=Math.max(0,player.dispelTimer-dt);
    player.beamAngle=Math.atan2(mouse.y-H/2,mouse.x-W/2);
    const mx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
    const my=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
    const inputAmount=Math.min(1,Math.hypot(mx,my));
    const moveLen=Math.hypot(mx,my)||1;player.moveX=mx/moveLen;player.moveY=my/moveLen;
    const animTarget=(inputAmount>.05 || player.dashTimer>0)?1:0;
    player.moveBlend += (animTarget-player.moveBlend)*Math.min(1,dt*(animTarget?10:7));
    player.walkPhase += dt * (inputAmount>.05 ? 10.5 : (player.dashTimer>0 ? 13.5 : .85));
    if(player.dashTimer>0){player.x+=player.dashDirX*player.speed*3.4*dt;player.y+=player.dashDirY*player.speed*3.4*dt;}
    else{player.x+=player.moveX*player.speed*dt;player.y+=player.moveY*player.speed*dt;}
    player.beamActive=mouse.down && player.energy>0.1;
    if(player.beamActive){player.energy=Math.max(0,player.energy-player.energyDrain*dt);}
    else{player.energy=Math.min(player.maxEnergy,player.energy+player.energyRegen*dt);}
    if(player.dashTimer>0)player.energy=Math.min(player.maxEnergy,player.energy+3*dt);

    spawnTimer-=dt;
    const interval=Math.max(.32,.88-(elapsed/(currentMap.duration||RUN_DURATION))*.43);
    const maxEnemies=Math.min(110,30+Math.floor(elapsed*.34));
    while(spawnTimer<=0 && enemies.length<maxEnemies){
      const r=Math.random();let type='shade';
      const mapStage=Math.min(4,Math.floor(elapsed/Math.max(1,(currentMap.bossTime||130)/5)));
      if(mapStage===0) type='shade';
      else if(mapStage===1) type=r<.55?'skitter':'wraith';
      else if(mapStage===2) type=r<.35?'seer':r<.7?'brute':'orbit';
      else if(mapStage===3) type=r<.32?'devourer':r<.62?'lancer':'mirror';
      else type=r<.4?'sentinel':r<.7?'nullstalker':'brute';
      if(bossSpawned&&!bossKilled&&Math.random()<.15) type=mapStage<2?'skitter':'orbit';
      spawnEnemy(type);spawnTimer+=interval;
    }

    // A monster becomes sharply visible only while the beam actually catches it.
    player.beamParticleTimer=Math.max(0,player.beamParticleTimer-dt);
    if(player.beamActive){
      let emittedBeamSpark=false;
      for(const e of enemies){
        const focus=beamFocus(e);
        if(focus>0){
          const armor=e.kind==='sentinel'?.66:e.kind==='brute'?.82:1;
          damageEnemy(e,player.beamDps*dt*(e.kind==='boss'?.86:1)*armor);
          if(!emittedBeamSpark && player.beamParticleTimer<=0 && focus>.42){
            spawnParticles(e.x+(Math.random()-.5)*e.r,e.y+(Math.random()-.5)*e.r,'#fff0c7',1,.22);
            player.beamParticleTimer=.16; emittedBeamSpark=true;
          }
        }
      }
    }

    for(const e of enemies){
      if(e.dead)continue;
      e.hitFlash=Math.max(0,e.hitFlash-dt);e.stun=Math.max(0,e.stun-dt);e.contactCd=Math.max(0,e.contactCd-dt);e.fireCd-=dt;e.phase+=dt;e.hitParticleCd=Math.max(0,(e.hitParticleCd||0)-dt);
      if(player.dispelTimer>0)e.stun=Math.max(e.stun,player.dispelTimer);
      const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
      if(e.stun<=0){
        let dirX=dx/d,dirY=dy/d;
        if(e.kind==='seer'){
          if(d<205){dirX=-dirX;dirY=-dirY;} else if(d<260){dirX=0;dirY=0;}
          if(e.fireCd<=0&&d<430){const base=Math.atan2(dy,dx);bullets.push({x:e.x,y:e.y,vx:Math.cos(base)*178,vy:Math.sin(base)*178,r:5,life:4,damage:11,color:'#ff788d',fromBoss:false});e.fireCd=1.8+Math.random()*.5;}
        } else if(e.kind==='wraith'){
          const weave=Math.sin(e.phase*2.6)*.62;
          dirX+=-dirY*weave;dirY+=dirX*weave;
          const norm=Math.hypot(dirX,dirY)||1;dirX/=norm;dirY/=norm;
          if(e.fireCd<=0&&d<350){const base=Math.atan2(dy,dx);for(const offset of [-.12,.12]){const a=base+offset;bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*142,vy:Math.sin(a)*142,r:4.5,life:4.5,damage:8,color:'#91dcff',fromBoss:false});}e.fireCd=2.15+Math.random()*.45;}
        } else if(e.kind==='devourer'){
          if(e.fireCd<=0&&d>145&&d<390){const base=Math.atan2(dy,dx);bullets.push({x:e.x,y:e.y,vx:Math.cos(base)*120,vy:Math.sin(base)*120,r:7,life:4.8,damage:12,color:'#9bf08e',fromBoss:false});e.fireCd=2.5+Math.random()*.55;}
        } else if(e.kind==='boss'){
          if(d<240){dirX*=.3;dirY*=.3;}
          if(e.fireCd<=0){
            const base=Math.atan2(dy,dx);
            const style=e.bossStyle||0;
            if(style===1){
              // Astral Abbot: rotating six-point volley alternating with a fast aimed lance.
              if(Math.floor(elapsed*.7)%2===0){for(let j=0;j<6;j++){const a=base+j*Math.PI/3+elapsed*.22;bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*128,vy:Math.sin(a)*128,r:6.5,life:5.8,damage:12,color:'#c7a5ff',fromBoss:true});}}
              else bullets.push({x:e.x,y:e.y,vx:Math.cos(base)*235,vy:Math.sin(base)*235,r:9,life:4,damage:19,color:'#79eaff',fromBoss:true});
              e.fireCd=1.45;
            } else if(style===2){
              // Eclipse Stag: expanding ring of green spores.
              for(let j=0;j<8;j++){const a=base+j*Math.PI/4+e.phase*.16;bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*112,vy:Math.sin(a)*112,r:7,life:6,damage:11,color:'#9df08e',fromBoss:true});}e.fireCd=1.65;
            } else if(style===3){
              // Doctor Eclipse: three delayed surgical darts with a tight spread.
              for(let j=-1;j<=1;j++){const a=base+j*.12;bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*205,vy:Math.sin(a)*205,r:5.5,life:4.2,damage:12,color:'#8fe7ff',fromBoss:true});}e.fireCd=1.35;
            } else if(style===4){
              // Hull Leviathan: alternating horizontal and vertical cross volleys.
              const phase=Math.floor(elapsed*1.1)%2===0?0:Math.PI/2;for(let j=0;j<4;j++){const a=phase+j*Math.PI/2;bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*150,vy:Math.sin(a)*150,r:8,life:5.5,damage:14,color:'#ffb36d',fromBoss:true});}e.fireCd=1.2;
            } else if(style===5){
              // Geode Heart: slow crystalline fan aimed at the player's last direction.
              for(let j=-2;j<=2;j++){const a=base+j*.19;bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*118,vy:Math.sin(a)*118,r:8,life:6.5,damage:13,color:'#9bdcff',fromBoss:true});}e.fireCd=1.55;
            } else if(style===6){
              // Ringmaster: rotating eight-shot carousel.
              for(let j=0;j<8;j++){const a=base+j*Math.PI/4+elapsed*.42;bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*142,vy:Math.sin(a)*142,r:6,life:5.2,damage:12,color:j%2?'#ff9fd7':'#ffc078',fromBoss:true});}e.fireCd=1.4;
            } else if(style===7){
              // The Light-Extinguisher: tightening spiral plus a single punishing bolt.
              for(let j=0;j<10;j++){const a=base+j*Math.PI/5+elapsed*.5;bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*126,vy:Math.sin(a)*126,r:6.5,life:6.2,damage:13,color:j%2?'#8deeff':'#ffb76e',fromBoss:true});}bullets.push({x:e.x,y:e.y,vx:Math.cos(base)*250,vy:Math.sin(base)*250,r:9,life:3.8,damage:18,color:'#fff0c0',fromBoss:true});e.fireCd=1.7;
            } else {
              for(let j=-2;j<=2;j++){const a=base+j*.24;bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*155,vy:Math.sin(a)*155,r:7,life:5,damage:13,color:'#ff9c82',fromBoss:true});}e.fireCd=1.12;
            }
          }
        } else if(e.kind==='orbit' && e.fireCd<=0 && d<310){
          const base=Math.atan2(dy,dx);for(const off of [-.28,.28]){const a=base+off;bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*145,vy:Math.sin(a)*145,r:5,life:4.5,damage:8,color:'#a6a2ff',fromBoss:false});}e.fireCd=2.2;
        } else if(e.kind==='lancer' && e.fireCd<=0 && d<380){
          const base=Math.atan2(dy,dx);bullets.push({x:e.x,y:e.y,vx:Math.cos(base)*220,vy:Math.sin(base)*220,r:7,life:3.3,damage:13,color:'#ffb3f3',fromBoss:false});e.fireCd=2.8;
        }
        const vel=e.speed*dt;
        e.x+=dirX*vel;e.y+=dirY*vel;
      }
      if(e.kind!=='boss' && Math.random()<dt*.5) spawnParticles(e.x,e.y,e.color,1,.16);
      const dPlayer=Math.hypot(e.x-player.x,e.y-player.y);
      if(dPlayer<e.r+player.r && e.contactCd<=0 && e.stun<=0){hurtPlayer(e.damage,e.x,e.y);e.contactCd=.82;}
    }
    enemies=enemies.filter(e=>!e.dead);

    for(const b of bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;}
    for(const b of bullets){if(b.life<=0)continue;if(Math.hypot(b.x-player.x,b.y-player.y)<player.r+b.r){b.life=0;spawnParticles(b.x,b.y,b.color,5,.35);hurtPlayer(b.damage,b.x,b.y);}}
    bullets=bullets.filter(b=>b.life>0);

    for(const p of pickups){
      p.life-=dt;p.phase+=dt*3;p.vx*=Math.pow(.08,dt);p.vy*=Math.pow(.08,dt);p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.health){if(Math.hypot(player.x-p.x,player.y-p.y)<player.magnet*.75){p.x+=(player.x-p.x)*Math.min(1,dt*2);p.y+=(player.y-p.y)*Math.min(1,dt*2);}if(Math.hypot(player.x-p.x,player.y-p.y)<18){player.hp=Math.min(player.maxHp,player.hp+19);p.life=0;spawnParticles(p.x,p.y,'#a4f6c9',10,.5);sfx('pickup');}continue;}
      const d=Math.hypot(player.x-p.x,player.y-p.y);
      if(d<player.magnet){const pull=(1-d/player.magnet)*7.8+1.5;p.x+=(player.x-p.x)*Math.min(1,dt*pull);p.y+=(player.y-p.y)*Math.min(1,dt*pull);}
      if(d<player.r+p.r+5){p.life=0;player.echoBonusProgress+=(player.echoDividendLevel||0)*.12*p.amount;const bonusEchoes=Math.floor(player.echoBonusProgress);player.echoBonusProgress-=bonusEchoes;const gained=p.amount+bonusEchoes;player.crystals+=gained;runStats.crystals+=gained;player.energy=Math.min(player.maxEnergy,player.energy+4.5);grantXP(p.amount+player.echoBonus);spawnParticles(p.x,p.y,'#69f1ed',6,.38);sfx('pickup');}
    }
    pickups=pickups.filter(p=>p.life>0);
    for(const p of particles){p.life-=dt;p.vx*=Math.exp(-p.drag*dt);p.vy*=Math.exp(-p.drag*dt);p.x+=p.vx*dt;p.y+=p.vy*dt;}
    particles=particles.filter(p=>p.life>0);
    for(const f of floatingTexts){f.life-=dt;f.y-=22*dt;}
    floatingTexts=floatingTexts.filter(f=>f.life>0);
    for(const e of effects)e.life-=dt;
    effects=effects.filter(e=>e.life>0);
    shake=Math.max(0,shake-dt*22);
    if(bossKilled && !runEnded){finishRun(true);}
  }

  function finishRun(victory) {
    if(runEnded)return;runEnded=true;state='result';mouse.down=false;keys.clear();if(player)player.beamActive=false;
    const banked=victory?player.crystals:Math.floor(player.crystals*.5);
    runBanked=banked;save.bank+=banked;save.runs++;if(victory)save.wins++;
    const oldBest=save.best;save.best=Math.max(save.best,elapsed);
    if(victory && campaignLevel<MAP_COUNT && (save.campaignLevelUnlocked||1)<campaignLevel+1){
      save.campaignLevelUnlocked=campaignLevel+1;
      const nextName=MAPS[campaignLevel].name[lang];
      toast(lang==='es'?`NUEVO SECTOR DESBLOQUEADO: ${nextName}`:`NEW SECTOR UNLOCKED: ${nextName}`);
    }
    saveGame();
    refreshCampaignButtons();
    const retryButton = $('retry-btn');
    if (retryButton) retryButton.textContent = (victory && campaignLevel < MAP_COUNT)
      ? (lang === 'es' ? `ENTRAR AL NIVEL ${campaignLevel+1}` : `ENTER LEVEL ${campaignLevel+1}`)
      : T('retry');
    $('result-eyebrow').textContent=victory?T('runWon'):T('runLost');
    $('result-title').textContent=victory?(campaignLevel===MAP_COUNT?(lang==='es'?'LA SEÑAL HA SIDO SILENCIADA':'THE SIGNAL HAS BEEN SILENCED'):T('victoryTitle')):T('deathTitle');
    $('result-desc').textContent=victory?(campaignLevel===MAP_COUNT?(lang==='es'?'El Apagador cae. La señal original deja de devorar la oscuridad.':'The Light-Extinguisher falls. The original signal stops devouring the dark.'):T('wonDesc')):T('lostDesc');
    $('result-stats').innerHTML=`<div class="result-stat"><strong>${formatTime(elapsed)}</strong><span>${T('resultTime')}</span></div><div class="result-stat"><strong>${runStats.kills}</strong><span>${T('resultKills')}</span></div><div class="result-stat"><strong>${player.level}</strong><span>${T('resultLevel')}</span></div><div class="result-stat"><strong>+${banked}</strong><span>${T('deposited')}</span></div>`;
    showScreen('result-screen');$('corner-hint').classList.add('hidden');refreshMenuStats();sfx(victory?'win':'death');
    if(save.best>oldBest && save.best===Math.floor(elapsed) && elapsed>oldBest+1) toast(T('record'));
  }

  function screenToWorld(sx,sy){return {x:sx+player.x-W/2,y:sy+player.y-H/2};}
  function hash2(x,y){let n=Math.sin(x*127.1+y*311.7)*43758.5453123;return n-Math.floor(n);}
  function drawBackground(camX,camY){
    const map=currentMap||MAPS[0], tile=64;
    ctx.fillStyle='#070c14';ctx.fillRect(0,0,W,H);
    const sx=Math.floor(camX/tile)*tile, sy=Math.floor(camY/tile)*tile;
    for(let wy=sy;wy<camY+H+tile;wy+=tile){for(let wx=sx;wx<camX+W+tile;wx+=tile){
      const gx=Math.floor(wx/tile),gy=Math.floor(wy/tile),h=hash2(gx,gy),x=wx-camX,y=wy-camY;
      const r=Math.floor(map.floor[0]+h*map.variation[0]),g=Math.floor(map.floor[1]+h*map.variation[1]),b=Math.floor(map.floor[2]+h*map.variation[2]);
      ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fillRect(x,y,tile+1,tile+1);
      ctx.strokeStyle=`rgba(${map.line[0]},${map.line[1]},${map.line[2]},${.045+h*.065})`;ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,tile-1,tile-1);
      if(map.motif==='water'){
        if(h>.68){ctx.fillStyle=`rgba(54,177,203,${.07+(h-.68)*.3})`;ctx.beginPath();ctx.ellipse(x+tile*hash2(gx+8,gy),y+tile*hash2(gy,gx+5),10+h*17,4+h*6,h*3,0,Math.PI*2);ctx.fill();}
        if(h>.88){ctx.strokeStyle='rgba(151,232,239,.20)';ctx.beginPath();ctx.ellipse(x+32,y+32,8,3,.2,0,Math.PI*2);ctx.ellipse(x+32,y+32,14,5,.2,0,Math.PI*2);ctx.stroke();}
      } else if(map.motif==='stone'){
        if(h>.76){ctx.strokeStyle='rgba(255,190,112,.13)';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x+32,y+32,8+h*8,0,Math.PI*1.55);ctx.stroke();}
        if(h<.10){ctx.fillStyle='rgba(2,4,8,.42)';ctx.beginPath();ctx.ellipse(x+32,y+30,14,17,.2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(162,132,106,.22)';ctx.stroke();}
        if(h>.57&&h<.63){ctx.strokeStyle='rgba(173,143,116,.18)';ctx.beginPath();ctx.moveTo(x+8,y+12);ctx.lineTo(x+28,y+24);ctx.lineTo(x+24,y+40);ctx.lineTo(x+49,y+52);ctx.stroke();}
      } else if(map.motif==='rune'){
        if(h>.79){ctx.save();ctx.translate(x+32,y+32);ctx.rotate(h*5);ctx.strokeStyle=`rgba(105,244,181,${.1+(h-.79)*.35})`;ctx.beginPath();ctx.ellipse(0,0,12,6,0,0,Math.PI*2);ctx.moveTo(-7,-6);ctx.lineTo(5,6);ctx.moveTo(4,-7);ctx.lineTo(-2,7);ctx.stroke();ctx.restore();}
        if(h<.13){ctx.strokeStyle='rgba(173,211,170,.17)';ctx.beginPath();ctx.moveTo(x+15,y+22);ctx.quadraticCurveTo(x+32,y+5,x+48,y+23);ctx.moveTo(x+21,y+28);ctx.lineTo(x+42,y+28);ctx.stroke();}
        if(h>.54&&h<.62){ctx.fillStyle='rgba(199,213,171,.17)';ctx.beginPath();ctx.arc(x+20,y+41,4,0,Math.PI*2);ctx.arc(x+27,y+39,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(199,213,171,.12)';ctx.beginPath();ctx.moveTo(x+21,y+42);ctx.lineTo(x+41,y+50);ctx.stroke();}
      } else if(map.motif==='ice'){
        if(h>.78){ctx.save();ctx.translate(x+tile*hash2(gx+2,gy),y+tile*hash2(gy+3,gx));ctx.fillStyle=`rgba(143,205,255,${.08+(h-.78)*.34})`;ctx.strokeStyle='rgba(183,226,255,.18)';ctx.beginPath();ctx.moveTo(0,-13-h*5);ctx.lineTo(6,0);ctx.lineTo(1,12);ctx.lineTo(-6,2);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
        if(h>.53&&h<.65){ctx.strokeStyle='rgba(156,204,255,.20)';ctx.beginPath();ctx.moveTo(x+7,y+10);ctx.lineTo(x+24,y+25);ctx.lineTo(x+20,y+40);ctx.lineTo(x+49,y+54);ctx.stroke();}
      } else if(map.motif==='hospital'){
        if(h>.78){ctx.strokeStyle='rgba(139,194,218,.17)';ctx.strokeRect(x+12,y+10,40,44);ctx.beginPath();ctx.moveTo(x+32,y+17);ctx.lineTo(x+32,y+47);ctx.moveTo(x+20,y+32);ctx.lineTo(x+44,y+32);ctx.stroke();}
        if(h<.10){ctx.fillStyle='rgba(170,210,220,.12)';ctx.fillRect(x+10,y+14,5,35);ctx.fillRect(x+17,y+14,5,35);}
      } else if(map.motif==='port'){
        if(h>.69){ctx.strokeStyle='rgba(171,150,118,.19)';ctx.strokeRect(x+6,y+8,52,48);ctx.beginPath();ctx.moveTo(x+9,y+18);ctx.lineTo(x+55,y+18);ctx.moveTo(x+9,y+30);ctx.lineTo(x+55,y+30);ctx.moveTo(x+9,y+42);ctx.lineTo(x+55,y+42);ctx.stroke();}
      } else if(map.motif==='fairground'){
        if(h>.79){ctx.strokeStyle='rgba(229,115,192,.19)';ctx.beginPath();ctx.arc(x+32,y+32,13,0,Math.PI*2);ctx.arc(x+32,y+32,21,0,Math.PI*2);ctx.stroke();}
        if(h<.08){ctx.fillStyle='rgba(255,158,214,.16)';ctx.beginPath();ctx.arc(x+20,y+22,3,0,Math.PI*2);ctx.arc(x+43,y+43,3,0,Math.PI*2);ctx.fill();}
      }
      if(h<.06){ctx.fillStyle='rgba(0,0,0,.19)';ctx.fillRect(x+8,y+9,18,3);ctx.fillRect(x+8,y+9,3,18);}
    }}
    // Landmark silhouettes create a recognizable district mood without obstructing navigation.
    const landmarkSize=256, lx0=Math.floor(camX/landmarkSize)*landmarkSize, ly0=Math.floor(camY/landmarkSize)*landmarkSize;
    for(let wy=ly0;wy<camY+H+landmarkSize;wy+=landmarkSize){for(let wx=lx0;wx<camX+W+landmarkSize;wx+=landmarkSize){
      const h=hash2(Math.floor(wx/landmarkSize)+31,Math.floor(wy/landmarkSize)-19),x=wx-camX+landmarkSize*.5,y=wy-camY+landmarkSize*.5;
      if(h<.70)continue;
      ctx.save();ctx.translate(x,y);ctx.globalAlpha=.11+h*.10;ctx.strokeStyle=`rgb(${map.line[0]},${map.line[1]},${map.line[2]})`;ctx.fillStyle=`rgba(${map.line[0]},${map.line[1]},${map.line[2]},.20)`;ctx.lineWidth=2;
      if(map.motif==='stone'){
        ctx.fillRect(-21,-31,42,62);ctx.strokeRect(-25,-35,50,70);ctx.beginPath();ctx.arc(0,-28,19,Math.PI,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(255,185,111,.25)';ctx.fillRect(-4,-17,8,25);
      } else if(map.motif==='rune'){
        ctx.beginPath();ctx.arc(0,0,25,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(-24,-8);ctx.lineTo(0,22);ctx.lineTo(24,-8);ctx.lineTo(0,-24);ctx.closePath();ctx.stroke();ctx.fillStyle='rgba(100,255,178,.3)';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();
      } else if(map.motif==='ice'){
        ctx.beginPath();ctx.moveTo(0,-42);ctx.lineTo(13,-8);ctx.lineTo(30,2);ctx.lineTo(9,10);ctx.lineTo(4,37);ctx.lineTo(-11,8);ctx.lineTo(-29,-1);ctx.lineTo(-10,-13);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.moveTo(0,-42);ctx.lineTo(4,37);ctx.moveTo(-29,-1);ctx.lineTo(30,2);ctx.stroke();
      } else if(map.motif==='astral'){
        for(let ring=0;ring<3;ring++){ctx.beginPath();ctx.ellipse(0,0,22+ring*11,8+ring*4,ring*.5,0,Math.PI*2);ctx.stroke();}
        ctx.beginPath();ctx.moveTo(0,-39);ctx.lineTo(9,-8);ctx.lineTo(37,0);ctx.lineTo(8,8);ctx.lineTo(0,37);ctx.lineTo(-8,8);ctx.lineTo(-37,0);ctx.lineTo(-8,-8);ctx.closePath();ctx.stroke();ctx.fillStyle='rgba(157,136,255,.35)';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();
      } else {
        ctx.beginPath();ctx.ellipse(0,0,43,13,.14,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(0,0,28,8,.14,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(255,184,104,.27)';ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }}
    const haze=ctx.createRadialGradient(W*.68,H*.45,30,W*.68,H*.45,W*.72);haze.addColorStop(0,map.glow);haze.addColorStop(1,'rgba(1,4,10,0)');ctx.fillStyle=haze;ctx.fillRect(0,0,W,H);
  }
  function worldToScreen(x,y){return {x:x-player.x+W/2,y:y-player.y+H/2};}

  function drawPickup(p){const s=worldToScreen(p.x,p.y);if(s.x<-30||s.x>W+30||s.y<-30||s.y>H+30)return;ctx.save();ctx.translate(s.x,s.y);ctx.rotate(p.phase*.7);if(p.health){ctx.shadowBlur=16;ctx.shadowColor='#9bf3bd';ctx.strokeStyle='#b0ffcb';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(5,0);ctx.moveTo(0,-5);ctx.lineTo(0,5);ctx.stroke();}else{ctx.shadowBlur=15;ctx.shadowColor='#68f0ef';ctx.fillStyle='#5ee7e8';ctx.beginPath();ctx.moveTo(0,-p.r-2);ctx.lineTo(p.r+1,0);ctx.lineTo(0,p.r+2);ctx.lineTo(-p.r-1,0);ctx.closePath();ctx.fill();ctx.fillStyle='#d8ffff';ctx.beginPath();ctx.arc(0,0,1.7,0,Math.PI*2);ctx.fill();}ctx.restore();}

  function drawEnemy(e, focused=false){
    const s=worldToScreen(e.x,e.y);if(s.x<-90||s.x>W+90||s.y<-90||s.y>H+90)return;
    const d=Math.hypot(e.x-player.x,e.y-player.y), focus=focused?beamFocus(e):0;
    ctx.save();ctx.translate(s.x,s.y);ctx.rotate(Math.atan2(player.y-e.y,player.x-e.x));
    const proximity = Math.max(0, Math.min(1, (310-d)/175));
    const reveal = Math.max(focused?1:0, proximity);
    // Enemies near the courier are pulled out of the darkness by the lighthouse spill.
    ctx.globalAlpha=focused?1:(d>470?.30:d>300?.55:.88);
    ctx.globalAlpha=Math.max(ctx.globalAlpha, reveal*.98);
    const glow=e.kind==='boss'?'#ff6f7e':e.kind==='wraith'?'#a5dfff':e.kind==='devourer'?'#a7ff8a':e.kind==='sentinel'?'#ffb56f':'#6bc8d4';
    // Large canvas shadowBlur values are expensive on integrated GPUs; use restrained glow only for the closest threats.
    ctx.shadowBlur=reveal>.35?Math.min(10,4+reveal*6):0;ctx.shadowColor=focused?'#ffcb81':glow;
    const fill=e.hitFlash>0?'#f4ffff':(reveal>.12?mixHex(e.color,'#b5dce0',reveal*.52):(focused?mixHex(e.color,'#ffdca2',.36):e.color));
    ctx.fillStyle=fill;
    const sprite=creatureImages.get(e.creatureIndex);
    if(sprite && sprite.complete && sprite.naturalWidth>0){
      const size=e.kind==='boss'?e.r*3.05:e.r*2.65;
      ctx.globalAlpha=Math.max(.72,ctx.globalAlpha);
      if(e.hitFlash>0){ctx.globalAlpha=.95;}
      ctx.drawImage(sprite,-size/2,-size/2,size,size);
    } else {
    // Fallback vector silhouettes are retained while sprites load.
    if(e.kind==='boss'){
      for(let i=0;i<10;i++){const a=i/10*Math.PI*2;const r=e.r*(i%2===0?1.28:.78);ctx.strokeStyle=e.bossVariant==='astral'?(i%2?'#27264d':'#a88cff'):(i%2?'#332b39':'#65505a');ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(Math.cos(a)*e.r*.55,Math.sin(a)*e.r*.55);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.stroke();}
      ctx.beginPath();for(let i=0;i<14;i++){const a=i/14*Math.PI*2,r=e.r*(i%2===0?1.05:.76);if(i===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();
      ctx.fillStyle='#20131b';ctx.beginPath();ctx.ellipse(0,3,e.r*.62,e.r*.72,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=e.bossVariant==='astral'?'#8aeaff':'#d16d73';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-e.r*.32,-e.r*.45);ctx.lineTo(-e.r*.53,-e.r*1.08);ctx.lineTo(-e.r*.12,-e.r*.72);ctx.moveTo(e.r*.24,-e.r*.47);ctx.lineTo(e.r*.63,-e.r*1.05);ctx.lineTo(e.r*.56,-e.r*.48);ctx.stroke();
      ctx.strokeStyle='rgba(255,161,122,.75)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,e.r*.64,e.r*.7,0,0,Math.PI*2);ctx.stroke();
      ctx.shadowBlur=focused?28:18;ctx.shadowColor=e.bossVariant==='astral'?'#9f8cff':'#ff7b61';ctx.fillStyle=e.bossVariant==='astral'?'#9deaff':'#ffb481';ctx.beginPath();ctx.arc(e.r*.28,-e.r*.17,5.4,0,Math.PI*2);ctx.arc(-e.r*.28,-e.r*.17,5.4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ffebc0';ctx.beginPath();ctx.arc(0,e.r*.2,6,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#160e1b';ctx.beginPath();ctx.ellipse(0,e.r*.42,e.r*.30,e.r*.15,0,0,Math.PI*2);ctx.fill();
    } else if(e.kind==='riftling') {
      ctx.beginPath();ctx.moveTo(e.r,0);ctx.lineTo(e.r*.25,-e.r*.85);ctx.lineTo(-e.r*.72,-e.r*.55);ctx.lineTo(-e.r*.35,0);ctx.lineTo(-e.r*.72,e.r*.55);ctx.lineTo(e.r*.25,e.r*.85);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#e1b6ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-e.r*.5,0);ctx.lineTo(0,-e.r*.35);ctx.lineTo(e.r*.42,0);ctx.lineTo(0,e.r*.35);ctx.closePath();ctx.stroke();
      ctx.fillStyle='#fff1ff';ctx.fillRect(e.r*.1,-3,4,6);
    } else if(e.kind==='orbit') {
      ctx.strokeStyle='#9b9cff';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,0,e.r*1.25,e.r*.65,e.phase,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,e.r*.68,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#c6f7ff';ctx.beginPath();ctx.arc(e.r*.4,-e.r*.15,3.4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#a5a0ff';ctx.beginPath();ctx.arc(Math.cos(e.phase*2)*e.r,Math.sin(e.phase*2)*e.r*.6,3,0,Math.PI*2);ctx.fill();
    } else if(e.kind==='lancer') {
      ctx.beginPath();ctx.moveTo(e.r*1.35,0);ctx.lineTo(-e.r*.45,-e.r*.55);ctx.lineTo(-e.r*.8,-e.r*.25);ctx.lineTo(-e.r*.8,e.r*.25);ctx.lineTo(-e.r*.45,e.r*.55);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#ffb3f3';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-e.r*.2,0);ctx.lineTo(e.r*1.45,0);ctx.stroke();
      ctx.fillStyle='#fff0ff';ctx.fillRect(e.r*.25,-3,5,6);
    } else if(e.kind==='mirror') {
      ctx.beginPath();ctx.moveTo(0,-e.r);ctx.lineTo(e.r*.82,-e.r*.25);ctx.lineTo(e.r*.62,e.r*.8);ctx.lineTo(-e.r*.62,e.r*.8);ctx.lineTo(-e.r*.82,-e.r*.25);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#a8edff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-e.r*.65);ctx.lineTo(0,e.r*.62);ctx.moveTo(-e.r*.5,0);ctx.lineTo(e.r*.5,0);ctx.stroke();
      ctx.fillStyle='#e2fbff';ctx.beginPath();ctx.arc(0,0,3.5,0,Math.PI*2);ctx.fill();
    } else if(e.kind==='nullstalker') {
      for(let i=0;i<4;i++){const a=i*Math.PI/2+e.phase*.2;ctx.strokeStyle='#8070ad';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*e.r*1.25,Math.sin(a)*e.r*1.25);ctx.stroke();}
      ctx.beginPath();ctx.moveTo(0,-e.r);ctx.lineTo(e.r*.72,-e.r*.25);ctx.lineTo(e.r*.5,e.r*.75);ctx.lineTo(-e.r*.5,e.r*.75);ctx.lineTo(-e.r*.72,-e.r*.25);ctx.closePath();ctx.fill();
      ctx.fillStyle='#ff8fe7';ctx.beginPath();ctx.arc(0,-2,4.5,0,Math.PI*2);ctx.fill();
    } else if(e.kind==='skitter') {
      // Low, many-legged stalker with an exposed blue spine.
      ctx.strokeStyle='#182932';ctx.lineWidth=3.2;for(let i=0;i<3;i++){const yy=(i-1)*5;ctx.beginPath();ctx.moveTo(-3,yy);ctx.lineTo(-e.r*.85,yy-7);ctx.lineTo(-e.r*1.45,yy-12);ctx.moveTo(-3,yy);ctx.lineTo(-e.r*.85,yy+7);ctx.lineTo(-e.r*1.45,yy+12);ctx.stroke();}
      ctx.beginPath();ctx.moveTo(e.r*1.05,0);ctx.lineTo(e.r*.35,-e.r*.8);ctx.lineTo(-e.r*.75,-e.r*.62);ctx.lineTo(-e.r*.5,0);ctx.lineTo(-e.r*.75,e.r*.62);ctx.lineTo(e.r*.35,e.r*.8);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#93f7ef';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(-4,-2);ctx.lineTo(-e.r*.5,-6);ctx.lineTo(-8,0);ctx.lineTo(-e.r*.35,5);ctx.stroke();
      ctx.shadowBlur=focused?20:11;ctx.shadowColor='#8bfff3';ctx.fillStyle='#bcfff2';ctx.fillRect(e.r*.18,-4,4,3);ctx.fillRect(e.r*.18,2,4,3);
    } else if(e.kind==='brute') {
      // Heavy, broken armour with a cracked red heart.
      ctx.beginPath();ctx.moveTo(-e.r*.88,-e.r*.45);ctx.lineTo(-e.r*.72,-e.r*.93);ctx.lineTo(-e.r*.17,-e.r*.78);ctx.lineTo(e.r*.2,-e.r*1.04);ctx.lineTo(e.r*.69,-e.r*.69);ctx.lineTo(e.r,e.r*.05);ctx.lineTo(e.r*.6,e.r*.77);ctx.lineTo(-e.r*.27,e.r*.94);ctx.lineTo(-e.r,e.r*.35);ctx.closePath();ctx.fill();
      ctx.fillStyle='#242630';ctx.beginPath();ctx.moveTo(-e.r*.35,-e.r*.47);ctx.lineTo(e.r*.34,-e.r*.54);ctx.lineTo(e.r*.48,e.r*.3);ctx.lineTo(-e.r*.16,e.r*.49);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#a75b78';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(-3,-e.r*.45);ctx.lineTo(2,-3);ctx.lineTo(-3,5);ctx.lineTo(4,e.r*.4);ctx.stroke();
      ctx.fillStyle='#ffb2cc';ctx.fillRect(e.r*.23,-5,5,3);ctx.fillRect(-e.r*.3,-5,5,3);
      ctx.strokeStyle='#77636b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-e.r*.52,-e.r*.72);ctx.lineTo(-e.r*.76,-e.r*1.13);ctx.moveTo(e.r*.36,-e.r*.75);ctx.lineTo(e.r*.66,-e.r*1.10);ctx.stroke();
    } else if(e.kind==='seer') {
      // The watcher is a suspended mask held together by a ritual ring.
      ctx.strokeStyle='rgba(111,201,226,.8)';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(-1,0,e.r*1.24,e.r*1.38,e.phase*.1,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(e.r,0);ctx.lineTo(e.r*.38,-e.r*.76);ctx.lineTo(-e.r*.45,-e.r*.82);ctx.lineTo(-e.r*.98,0);ctx.lineTo(-e.r*.45,e.r*.82);ctx.lineTo(e.r*.38,e.r*.76);ctx.closePath();ctx.fill();
      ctx.fillStyle='#10121b';ctx.beginPath();ctx.ellipse(e.r*.13,0,5,7,0,0,Math.PI*2);ctx.fill();ctx.shadowColor='#ff5e8f';ctx.shadowBlur=focused?22:10;ctx.fillStyle='#ff8da7';ctx.beginPath();ctx.arc(e.r*.2,0,4,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#a8e9f3';ctx.beginPath();ctx.moveTo(-2,-e.r*.8);ctx.lineTo(3,-e.r*1.25);ctx.lineTo(8,-e.r*.83);ctx.stroke();
    } else if(e.kind==='wraith') {
      // A veiled spectre; the trailing ribbons flutter with its phase.
      ctx.fillStyle=focused?'#94bed1':'#243845';ctx.beginPath();ctx.moveTo(-e.r*.85,-e.r*.1);ctx.quadraticCurveTo(-e.r*1.1,-e.r*.95,0,-e.r*1.04);ctx.quadraticCurveTo(e.r*1.15,-e.r*.85,e.r*.82,-e.r*.05);ctx.lineTo(e.r*.62,e.r*.55);ctx.lineTo(e.r*.25,e.r*.31);ctx.lineTo(-e.r*.04,e.r*1.02);ctx.lineTo(-e.r*.4,e.r*.42);ctx.lineTo(-e.r*.85,e.r*.7);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#7bafc2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-e.r*.42,e.r*.38);ctx.quadraticCurveTo(-e.r*.85,e.r*.95,-e.r*1.08,e.r*1.1);ctx.moveTo(e.r*.2,e.r*.42);ctx.quadraticCurveTo(e.r*.72,e.r*.82,e.r*.98,e.r*1.03);ctx.stroke();
      ctx.fillStyle='#101823';ctx.beginPath();ctx.ellipse(0,-e.r*.1,e.r*.43,e.r*.46,0,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=focused?24:11;ctx.shadowColor='#a9eaff';ctx.fillStyle='#a7efff';ctx.beginPath();ctx.ellipse(-4,-e.r*.12,2.3,3.2,0,0,Math.PI*2);ctx.ellipse(4,-e.r*.12,2.3,3.2,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(193,234,255,.7)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,-e.r*.1,e.r*.62,.1,Math.PI-.1);ctx.stroke();
    } else if(e.kind==='devourer') {
      // A ravenous knot of limbs and a split jaw around a poisonous core.
      for(let i=0;i<4;i++){const a=i*Math.PI/2+e.phase*.14;ctx.strokeStyle='#352630';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(Math.cos(a)*e.r*.42,Math.sin(a)*e.r*.42);ctx.quadraticCurveTo(Math.cos(a+.25)*e.r*1.08,Math.sin(a+.25)*e.r*1.08,Math.cos(a+.6)*e.r*1.35,Math.sin(a+.6)*e.r*1.35);ctx.stroke();ctx.fillStyle='#6a4148';ctx.beginPath();ctx.arc(Math.cos(a+.6)*e.r*1.35,Math.sin(a+.6)*e.r*1.35,2.6,0,Math.PI*2);ctx.fill();}
      ctx.beginPath();ctx.moveTo(e.r*.84,0);ctx.lineTo(e.r*.2,-e.r*.74);ctx.lineTo(-e.r*.58,-e.r*.48);ctx.lineTo(-e.r*.72,e.r*.12);ctx.lineTo(-e.r*.22,e.r*.67);ctx.closePath();ctx.fill();
      ctx.fillStyle='#101d1a';ctx.beginPath();ctx.ellipse(e.r*.18,0,e.r*.38,e.r*.45,-.2,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#c5ff9b';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-1,-e.r*.23);ctx.lineTo(4,-2);ctx.lineTo(-2,5);ctx.stroke();
      ctx.shadowBlur=focused?24:11;ctx.shadowColor='#b2ff8c';ctx.fillStyle='#bdff91';ctx.beginPath();ctx.arc(e.r*.12,-e.r*.04,4.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#d8f7b8';for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(e.r*.25+i*2,-e.r*.14+i*2);ctx.lineTo(e.r*.31+i*2,-e.r*.02+i*2);ctx.lineTo(e.r*.20+i*2,-e.r*.01+i*2);ctx.fill();}
    } else if(e.kind==='sentinel') {
      // Slow plated warder with a glowing chest seal and horned helm.
      ctx.beginPath();ctx.moveTo(-e.r*.85,-e.r*.43);ctx.lineTo(-e.r*.55,-e.r*.91);ctx.lineTo(-e.r*.18,-e.r*.7);ctx.lineTo(0,-e.r);ctx.lineTo(e.r*.34,-e.r*.7);ctx.lineTo(e.r*.8,-e.r*.8);ctx.lineTo(e.r,.0);ctx.lineTo(e.r*.65,e.r*.72);ctx.lineTo(0,e.r*.91);ctx.lineTo(-e.r*.68,e.r*.71);ctx.lineTo(-e.r,e.r*.08);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#a28c78';ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(-e.r*.55,-e.r*.48);ctx.lineTo(-e.r*.35,e.r*.37);ctx.lineTo(0,e.r*.58);ctx.lineTo(e.r*.38,e.r*.37);ctx.lineTo(e.r*.55,-e.r*.48);ctx.stroke();
      ctx.fillStyle='#262631';ctx.beginPath();ctx.ellipse(0,-e.r*.12,e.r*.34,e.r*.39,0,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=focused?25:9;ctx.shadowColor='#ffbf70';ctx.fillStyle='#ffd08a';ctx.beginPath();ctx.moveTo(0,-e.r*.32);ctx.lineTo(e.r*.17,-e.r*.02);ctx.lineTo(0,e.r*.21);ctx.lineTo(-e.r*.17,-e.r*.02);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#766d68';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-e.r*.53,-e.r*.65);ctx.lineTo(-e.r*.88,-e.r*1.04);ctx.moveTo(e.r*.52,-e.r*.65);ctx.lineTo(e.r*.88,-e.r*1.02);ctx.stroke();
      ctx.fillStyle='#ffb77b';ctx.fillRect(e.r*.22,-e.r*.18,4,3);ctx.fillRect(-e.r*.22,-e.r*.18,4,3);
    } else {
      // Standard shade: hunched, long-armed creature with a split skull.
      ctx.strokeStyle='#172731';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-3,-2);ctx.lineTo(-e.r*.83,-e.r*.7);ctx.lineTo(-e.r*1.22,-e.r*.43);ctx.moveTo(-3,2);ctx.lineTo(-e.r*.78,e.r*.71);ctx.lineTo(-e.r*1.18,e.r*.43);ctx.stroke();
      ctx.beginPath();ctx.moveTo(e.r*1.06,0);ctx.quadraticCurveTo(e.r*.35,-e.r*.9,-e.r*.25,-e.r*.65);ctx.lineTo(-e.r*.76,-e.r*.9);ctx.lineTo(-e.r*.57,-e.r*.18);ctx.lineTo(-e.r*.97,e.r*.2);ctx.lineTo(-e.r*.35,e.r*.72);ctx.quadraticCurveTo(e.r*.6,e.r*.77,e.r*1.06,0);ctx.fill();
      ctx.fillStyle='#10151e';ctx.beginPath();ctx.ellipse(e.r*.16,-2,5.3,5.8,0,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=focused?24:9;ctx.shadowColor='#a2fffc';ctx.fillStyle='#91fcf4';ctx.beginPath();ctx.arc(e.r*.2,-4,2.7,0,Math.PI*2);ctx.arc(e.r*.2,3,2.7,0,Math.PI*2);ctx.fill();
    }
    }
    if(e.stun>0){ctx.globalAlpha=.92;ctx.strokeStyle='#8ef5ff';ctx.lineWidth=1.25;ctx.beginPath();ctx.arc(0,-e.r*.72,e.kind==='boss'?10:5,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#b5fbff';ctx.beginPath();ctx.moveTo(-3,-e.r*.72);ctx.lineTo(0,-e.r*.72-3);ctx.lineTo(3,-e.r*.72);ctx.lineTo(0,-e.r*.72+3);ctx.closePath();ctx.fill();}
    if(reveal>.25){
      // The lighthouse spill reveals nearby silhouettes even when the player is not aiming directly at them.
      ctx.globalAlpha=.28+reveal*.48;ctx.strokeStyle=e.kind==='boss'?'rgba(255,151,142,.95)':'rgba(148,245,244,.92)';ctx.lineWidth=1+reveal;ctx.beginPath();ctx.ellipse(0,0,e.r*1.14,e.r*.94,.04,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=1;
    }
    if(focused){
      // Sharp gold rim and a visible weak-point glint when the flashlight catches the body.
      ctx.globalAlpha=.85;ctx.shadowBlur=17;ctx.shadowColor='#ffca7d';ctx.strokeStyle='rgba(255,222,165,.78)';ctx.lineWidth=1.25;ctx.beginPath();ctx.ellipse(0,0,e.r*1.06,e.r*.86,.04,0,Math.PI*2);ctx.stroke();
      ctx.shadowBlur=14;ctx.shadowColor='#fff3c9';ctx.fillStyle='#fff1c3';ctx.beginPath();ctx.arc(e.kind==='boss'?0:e.r*.18,e.kind==='boss'?e.r*.2:0,e.kind==='boss'?4.5:2.8,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    if(e.kind==='boss'||e.hp<e.maxHp||(focused&&focus>.2)){
      const bw=e.kind==='boss'?112:(focused?Math.max(30,e.r*2.5):38),by=s.y-e.r-15;
      ctx.fillStyle='rgba(2,5,10,.84)';ctx.fillRect(s.x-bw/2,by,bw,4.5);
      ctx.fillStyle=e.kind==='boss'?'#ff7788':focused?'#ffc36f':'#66e4ed';ctx.fillRect(s.x-bw/2,by,bw*Math.max(0,e.hp/e.maxHp),4.5);
      if(focused&&e.kind!=='boss'){
        const r=e.r+7+(Math.sin(elapsed*9+e.phase)+1)*1.2;ctx.save();ctx.globalAlpha=.65+focus*.3;ctx.strokeStyle='rgba(255,218,156,.92)';ctx.lineWidth=1.4;ctx.setLineDash([4,5]);ctx.beginPath();ctx.arc(s.x,s.y,r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
      }
    }
  }

  // Lightweight focus treatment: the beam itself reveals the original sprite; this overlay avoids
  // redrawing every detailed monster with expensive canvas shadows each frame.
  function drawBeamFocusOverlay(e) {
    const s=worldToScreen(e.x,e.y); if(s.x<-90||s.x>W+90||s.y<-90||s.y>H+90)return;
    const focus=beamFocus(e); if(focus<=0)return;
    const radius=e.kind==='boss'?e.r*.72:Math.max(3,e.r*.22);
    ctx.save();ctx.globalAlpha=.62+focus*.30;ctx.strokeStyle=e.kind==='boss'?'#ffad9e':'#ffe0a2';ctx.lineWidth=e.kind==='boss'?1.7:1.1;
    ctx.beginPath();ctx.ellipse(s.x,s.y,e.r+5,e.r*.82+5,.03,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=1;ctx.fillStyle=e.kind==='boss'?'#ffaaa1':'#fff0bd';ctx.beginPath();ctx.arc(s.x+(e.kind==='boss'?0:e.r*.18),s.y+(e.kind==='boss'?e.r*.2:0),radius,0,Math.PI*2);ctx.fill();
    const bw=e.kind==='boss'?112:Math.max(30,e.r*2.5),by=s.y-e.r-15;
    ctx.fillStyle='rgba(2,5,10,.92)';ctx.fillRect(s.x-bw/2,by,bw,5);
    ctx.fillStyle=e.kind==='boss'?'#ff8b91':'#ffd07d';ctx.fillRect(s.x-bw/2,by,bw*Math.max(0,e.hp/e.maxHp),5);
    ctx.restore();
  }

  function pointInBeam(x,y,r=0) {
    if(!player || !player.beamActive)return false;
    const dx=x-player.x,dy=y-player.y,d=Math.hypot(dx,dy);
    if(d>player.beamRange+r || d<1)return false;
    const diff=Math.abs(angleDelta(Math.atan2(dy,dx),player.beamAngle));
    return diff<=player.beamArc*.5+Math.asin(Math.min(.45,r/Math.max(d,1)));
  }

  // Enemy shots are redrawn above the darkness pass, with a bright core and velocity trail when lit.
  function drawProjectiles() {
    for(const b of bullets){
      const s=worldToScreen(b.x,b.y);if(s.x<-35||s.x>W+35||s.y<-35||s.y>H+35)continue;
      const focused=pointInBeam(b.x,b.y,b.r),speed=Math.hypot(b.vx,b.vy)||1;
      const tail=focused?Math.min(19,5+speed*.055):Math.min(8,2+speed*.025);
      ctx.save();ctx.globalAlpha=focused?1:.58;
      ctx.strokeStyle=focused?'#fff1c5':b.color;ctx.lineWidth=focused?3:1.5;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(s.x-b.vx/speed*tail,s.y-b.vy/speed*tail);ctx.lineTo(s.x,s.y);ctx.stroke();
      ctx.fillStyle=focused?'#fff7d7':b.color;ctx.beginPath();ctx.arc(s.x,s.y,focused?b.r+1.4:b.r,0,Math.PI*2);ctx.fill();
      if(focused){ctx.strokeStyle=b.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(s.x,s.y,b.r+3,0,Math.PI*2);ctx.stroke();}
      ctx.restore();
    }
  }

  function drawBeamCone(){
    if(!player.beamActive)return;
    const sx=W/2,sy=H/2,angle=player.beamAngle,spread=player.beamArc/2,range=player.beamRange;
    ctx.save();ctx.globalCompositeOperation='lighter';
    ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(angle-spread)*range,sy+Math.sin(angle-spread)*range);ctx.arc(sx,sy,range,angle-spread,angle+spread);ctx.closePath();
    const g=ctx.createRadialGradient(sx,sy,4,sx,sy,range);g.addColorStop(0,'rgba(255,214,145,.43)');g.addColorStop(.24,'rgba(255,194,112,.27)');g.addColorStop(.68,'rgba(255,166,75,.13)');g.addColorStop(1,'rgba(255,150,64,0)');ctx.fillStyle=g;ctx.fill();
    // Inner core makes the cone look like a real lantern beam, with a faint cyan fringe.
    ctx.globalAlpha=.78;ctx.shadowBlur=0;ctx.shadowColor='#ffb968';ctx.strokeStyle='rgba(255,211,142,.52)';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(angle-spread)*range,sy+Math.sin(angle-spread)*range);ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(angle+spread)*range,sy+Math.sin(angle+spread)*range);ctx.stroke();
    ctx.shadowBlur=0;ctx.shadowColor='#64e8ed';ctx.strokeStyle='rgba(106,226,237,.24)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(sx,sy,range,angle-spread,angle+spread);ctx.stroke();
    // Small drifting motes sell the light volume without relying on an external particle texture.
    for(let i=0;i<4;i++){const t=(i/4+elapsed*.095)%1;const a=angle+(hash2(i,Math.floor(elapsed*5))-.5)*spread*1.35;const rr=35+t*(range-40);const x=sx+Math.cos(a)*rr,y=sy+Math.sin(a)*rr;ctx.globalAlpha=(1-t)*.38;ctx.fillStyle=i%3===0?'#fff0c7':'#ffc77a';ctx.beginPath();ctx.arc(x,y,1+(i%3)*.35,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }

  function drawPlayer(){
    const sx=W/2,sy=H/2,angle=player.beamAngle;
    const moving=Math.max(0,Math.min(1,player.moveBlend||0));
    const phase=player.walkPhase;
    const step=Math.sin(phase), opposite=Math.sin(phase+Math.PI);
    const dash=player.dashTimer>0;
    const idleBreath=Math.sin(elapsed*2.35)*.48*(1-moving);
    const bodyBob=idleBreath + moving*(.45 + (1-Math.cos(phase*2))*.72) + (dash?1.3:0);
    const coatFlap=step*moving*2.1;
    const relativeMove=Math.atan2(player.dashTimer>0?player.dashDirY:player.moveY,player.dashTimer>0?player.dashDirX:player.moveX)-angle;
    const lean=Math.max(-1,Math.min(1,Math.cos(relativeMove)))*moving;
    const sway=Math.max(-1,Math.min(1,Math.sin(relativeMove)))*moving;

    // The contact shadow stays attached to the floor while the body rises and falls above it.
    ctx.save();ctx.translate(sx,sy);
    ctx.fillStyle='rgba(0,0,0,.64)';ctx.beginPath();ctx.ellipse(-2,13,25+moving*1.5,15-moving*.7,0,0,Math.PI*2);ctx.fill();
    if(dash){ctx.strokeStyle='rgba(100,238,242,.43)';ctx.lineWidth=2;for(let i=1;i<=3;i++){ctx.beginPath();ctx.ellipse(-i*12,2,19+i*4,24+i*3,-.08,0,Math.PI*2);ctx.stroke();}}
    ctx.restore();

    // Lantern spill remains light-weight: one soft radial gradient, no extra per-frame particle systems.
    const lightX=sx+Math.cos(angle)*22,lightY=sy+Math.sin(angle)*22-bodyBob;
    const halo=ctx.createRadialGradient(lightX,lightY,1,lightX,lightY,90);
    halo.addColorStop(0,'rgba(255,184,91,.20)');halo.addColorStop(1,'rgba(255,160,65,0)');
    ctx.fillStyle=halo;ctx.fillRect(lightX-90,lightY-90,180,180);

    ctx.save();ctx.translate(sx,sy-bodyBob);ctx.rotate(angle);ctx.scale(1.14,1.14);
    // Lean subtly into the direction of travel while retaining independent mouse aim.
    ctx.translate(lean*1.25, sway*.65);
    ctx.rotate(-sway*.035);

    // Back arm swings opposite to the near arm, with simple articulated elbow and glove.
    const farArmSwing=step*5.2*moving;
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.strokeStyle='#111a23';ctx.lineWidth=6;
    ctx.beginPath();ctx.moveTo(-12,-5);ctx.lineTo(-15+farArmSwing*.55,-1);ctx.lineTo(-19+farArmSwing,3);ctx.stroke();
    ctx.strokeStyle='#35434a';ctx.lineWidth=2.2;
    ctx.beginPath();ctx.moveTo(-13,-5);ctx.lineTo(-16+farArmSwing*.55,-1);ctx.stroke();
    ctx.fillStyle='#171e24';ctx.beginPath();ctx.arc(-19+farArmSwing,3,3.2,0,Math.PI*2);ctx.fill();

    // Two separate legs and boots: the opposite stride phases create visible foot contact instead of sliding.
    const farStep=opposite*8.2*moving,nearStep=step*8.2*moving;
    ctx.strokeStyle='#111923';ctx.lineWidth=6.5;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-10,-7);ctx.lineTo(-10+farStep*.55,-10);ctx.lineTo(-8+farStep,-11);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-9,5);ctx.lineTo(-9+nearStep*.55,10);ctx.lineTo(-7+nearStep,13);ctx.stroke();
    ctx.strokeStyle='rgba(101,126,137,.58)';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(-10,-7);ctx.lineTo(-10+farStep*.55,-10);ctx.moveTo(-9,5);ctx.lineTo(-9+nearStep*.55,10);ctx.stroke();

    // Weathered split coat follows through at the hem rather than remaining a rigid triangle.
    const coat=ctx.createLinearGradient(-28,-12,12,16);coat.addColorStop(0,'#101923');coat.addColorStop(.48,'#26323b');coat.addColorStop(1,'#111923');
    ctx.fillStyle=coat;ctx.beginPath();ctx.moveTo(-13,-10);ctx.lineTo(-25,-16);ctx.lineTo(-30,-7);ctx.lineTo(-29,6);ctx.lineTo(-35-coatFlap,15+coatFlap*.25);ctx.lineTo(-21-coatFlap*.45,18);ctx.lineTo(-10,11);ctx.lineTo(6,10);ctx.lineTo(12,2);ctx.lineTo(5,-11);ctx.closePath();ctx.fill();
    const coatHighlight=ctx.createLinearGradient(-25,-13,8,10);coatHighlight.addColorStop(0,'rgba(177,204,211,.16)');coatHighlight.addColorStop(.45,'rgba(125,153,163,.05)');coatHighlight.addColorStop(1,'rgba(0,0,0,.34)');
    ctx.fillStyle=coatHighlight;ctx.beginPath();ctx.moveTo(-13,-10);ctx.lineTo(-25,-16);ctx.lineTo(-30,-7);ctx.lineTo(-29,6);ctx.lineTo(-35-coatFlap,15+coatFlap*.25);ctx.lineTo(-21-coatFlap*.45,18);ctx.lineTo(-10,11);ctx.lineTo(6,10);ctx.lineTo(12,2);ctx.lineTo(5,-11);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(190,164,122,.62)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-26,-10);ctx.lineTo(-21,2);ctx.lineTo(-28,12);ctx.moveTo(-13,-6);ctx.lineTo(-9,10);ctx.stroke();

    // Boots are drawn over the coat hem so each step has a readable toe and planted sole.
    ctx.fillStyle='#080c13';ctx.beginPath();ctx.ellipse(-8+farStep,-10,6.8,3.7,-.1,0,Math.PI*2);ctx.ellipse(-7+nearStep,14,6.8,3.8,.12,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(153,178,188,.52)';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(-10+farStep,-11);ctx.lineTo(-4+farStep,-10);ctx.moveTo(-9+nearStep,13);ctx.lineTo(-3+nearStep,14);ctx.stroke();

    // Dispatch pack with a slight counter-sway to give the body weight.
    ctx.save();ctx.translate(-7,-2);ctx.rotate(-sway*.045+step*moving*.018);
    ctx.fillStyle='#4b3b2e';ctx.beginPath();ctx.moveTo(-18,-10);ctx.lineTo(-9,-16);ctx.lineTo(1,-12);ctx.lineTo(4,-2);ctx.lineTo(-4,6);ctx.lineTo(-17,3);ctx.closePath();ctx.fill();
    ctx.fillStyle='#6e5941';ctx.beginPath();ctx.moveTo(-16,-11);ctx.lineTo(-9,-14);ctx.lineTo(-1,-11);ctx.lineTo(-2,-6);ctx.lineTo(-14,-5);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#b59a72';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(-14,-10);ctx.lineTo(-8,3);ctx.moveTo(-3,-10);ctx.lineTo(-7,4);ctx.moveTo(-15,0);ctx.lineTo(-4,-1);ctx.stroke();
    ctx.fillStyle='#d9b576';ctx.fillRect(-11,-2,3,4);ctx.fillRect(-6,-7,3,3);ctx.restore();

    // Head and hood react to the gait with restrained counter-motion.
    ctx.save();ctx.translate(0,idleBreath*.6-step*moving*.35);ctx.rotate(-step*moving*.018);
    const hood=ctx.createLinearGradient(-8,-22,9,-5);hood.addColorStop(0,'#56616a');hood.addColorStop(.32,'#303b44');hood.addColorStop(1,'#111a22');
    ctx.fillStyle=hood;ctx.beginPath();ctx.moveTo(-9,-10);ctx.lineTo(-7,-19);ctx.quadraticCurveTo(2,-24,9,-15);ctx.lineTo(8,-5);ctx.lineTo(-1,1);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(205,221,222,.34)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-6,-17);ctx.quadraticCurveTo(1,-23,6,-16);ctx.stroke();
    ctx.fillStyle='#090d12';ctx.beginPath();ctx.moveTo(-4,-13);ctx.quadraticCurveTo(2,-19,7,-13);ctx.lineTo(5,-5);ctx.lineTo(-2,-4);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,190,123,.65)';ctx.beginPath();ctx.arc(5,-7,1.6,0,Math.PI*2);ctx.fill();ctx.restore();

    // Lantern arm stays aimed by the mouse; only the elbow and wrist absorb the walk bounce.
    const armBob=step*moving*1.25+idleBreath*.35;
    ctx.strokeStyle='#1a252d';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(1,-3);ctx.lineTo(8,-1+armBob*.55);ctx.lineTo(18,1+armBob);ctx.stroke();
    ctx.strokeStyle='#554333';ctx.lineWidth=4.2;ctx.beginPath();ctx.moveTo(3,-2);ctx.lineTo(12,0+armBob*.65);ctx.lineTo(20,1+armBob);ctx.stroke();
    ctx.strokeStyle='#c1a06a';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(22,-8+armBob);ctx.quadraticCurveTo(30,-6+armBob,30,1+armBob);ctx.stroke();
    ctx.shadowColor='#ffae4d';ctx.shadowBlur=20;ctx.fillStyle='rgba(255,166,65,.17)';ctx.beginPath();ctx.arc(26,4+armBob,15,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=8;ctx.shadowColor='#ffbf70';ctx.fillStyle='#3b3226';ctx.strokeStyle='#e9b96e';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(20,-1+armBob);ctx.lineTo(32,-1+armBob);ctx.lineTo(31,10+armBob);ctx.lineTo(21,10+armBob);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#ffdc8c';ctx.beginPath();ctx.moveTo(26,1+armBob);ctx.lineTo(29,5+armBob);ctx.lineTo(26,9+armBob);ctx.lineTo(23,5+armBob);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#8a6a42';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(21,0+armBob);ctx.lineTo(31,0+armBob);ctx.moveTo(21,8+armBob);ctx.lineTo(31,8+armBob);ctx.stroke();

    // Compact cyan motion accents are used only during a dash; no extra filters or heavy effects.
    if(dash){ctx.strokeStyle='rgba(100,238,242,.7)';ctx.lineWidth=1.5;for(let i=1;i<=3;i++){ctx.beginPath();ctx.moveTo(-22-i*5,-7+i*4);ctx.lineTo(-13-i*5,-7+i*4);ctx.stroke();}}
    if(player.invuln>0 && Math.floor(player.invuln*18)%2===0){ctx.strokeStyle='rgba(255,255,255,.50)';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,0,29,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }

  function drawWorld(){
    const camX=player.x-W/2,camY=player.y-H/2;
    ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
    drawBackground(camX,camY);
    for(const p of pickups)drawPickup(p);
    for(const e of enemies){if(Math.hypot(e.x-player.x,e.y-player.y)>=165)drawEnemy(e,false);}
    for(const p of particles){const s=worldToScreen(p.x,p.y);ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(s.x,s.y,p.size,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    // Outside the small lantern halo, the street falls into darkness. Holding the beam cuts a real, directional window through it.
    ctx.save();ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(0,3,10,.77)';ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='destination-out';
    const revealRadius=player.beamActive?205:174;const lg=ctx.createRadialGradient(W/2,H/2,23,W/2,H/2,revealRadius);lg.addColorStop(0,'rgba(0,0,0,.98)');lg.addColorStop(.67,'rgba(0,0,0,.78)');lg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=lg;ctx.beginPath();ctx.arc(W/2,H/2,revealRadius,0,Math.PI*2);ctx.fill();
    if(player.beamActive){const spread=player.beamArc*.5,range=player.beamRange;ctx.fillStyle='rgba(0,0,0,.99)';ctx.beginPath();ctx.moveTo(W/2,H/2);ctx.lineTo(W/2+Math.cos(player.beamAngle-spread)*range,H/2+Math.sin(player.beamAngle-spread)*range);ctx.arc(W/2,H/2,range,player.beamAngle-spread,player.beamAngle+spread);ctx.closePath();ctx.fill();}
    ctx.restore();
    // Keep enemies inside contact range readable above the darkness mask.
    for(const e of enemies){if(Math.hypot(e.x-player.x,e.y-player.y)<165)drawEnemy(e,false);}
    drawBeamCone();
    // Redraw only enemies caught by the cone at full contrast: eyes, weak points and health all snap into focus.
    if(player.beamActive){for(const e of enemies){const focus=beamFocus(e);if(focus>0)drawBeamFocusOverlay(e);}}
    drawProjectiles();
    for(const eff of effects){if(eff.type==='pulse'){const s=worldToScreen(eff.x,eff.y);const t=1-eff.life/eff.max;ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(107,245,255,${1-t})`;ctx.lineWidth=3*(1-t)+.5;ctx.shadowColor='#66eefa';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(s.x,s.y,eff.radius*t,0,Math.PI*2);ctx.stroke();ctx.restore();}else if(eff.type==='dispel'){const s=worldToScreen(eff.x,eff.y);const t=1-eff.life/eff.max;ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.max(0,1-t);ctx.strokeStyle='#9bf7ff';ctx.lineWidth=4*(1-t)+1;ctx.beginPath();ctx.arc(s.x,s.y,eff.radius*t,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='rgba(255,219,157,.82)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(s.x,s.y,eff.radius*Math.max(0,t-.045),0,Math.PI*2);ctx.stroke();ctx.restore();}}
    drawPlayer();
    for(const f of floatingTexts){const s=worldToScreen(f.x,f.y);ctx.save();ctx.globalAlpha=Math.max(0,f.life/f.max);ctx.fillStyle=f.color;ctx.font=`700 ${f.size}px ${'Arial Narrow, Impact, sans-serif'}`;ctx.textAlign='center';ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=5;ctx.fillText(f.text,s.x,s.y);ctx.restore();}
    ctx.restore();
  }

  function drawBar(x,y,w,h,pct,color,bg='rgba(3,8,15,.85)') {ctx.fillStyle=bg;ctx.fillRect(x,y,w,h);ctx.fillStyle=color;ctx.fillRect(x,y,w*Math.max(0,Math.min(1,pct)),h);ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(x,y,w,1);}
  function panel(x,y,w,h){ctx.fillStyle='rgba(3,9,17,.82)';ctx.fillRect(x,y,w,h);ctx.strokeStyle='rgba(130,184,207,.22)';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);}
  function drawHUD(){
    // Top-left: shift identity & level.
    panel(22,18,230,80);ctx.fillStyle=currentMap.accent;ctx.fillRect(22,18,2,80);
    ctx.fillStyle='#86f2f6';ctx.font='600 9px IBM Plex Mono, monospace';ctx.textAlign='left';ctx.fillText('CINDER SIGNAL / DISPATCH 07',35,36);
    ctx.fillStyle='#ecf6fc';ctx.font='700 23px Arial Narrow, Impact, sans-serif';ctx.fillText(`${T('levelUp')} ${String(player.level).padStart(2,'0')}`,35,62);
    ctx.fillStyle='#8ba1b1';ctx.font='9px IBM Plex Mono, monospace';ctx.fillText(`${runStats.kills} ${T('kills').toUpperCase()}`,153,61);
    ctx.fillStyle=currentMap.accent;ctx.font='600 8px IBM Plex Mono, monospace';ctx.fillText(currentMap.name[lang],35,82);
    // Clock & objective
    panel(W/2-106,18,212,69);ctx.textAlign='center';ctx.fillStyle='#7d95a7';ctx.font='600 8px IBM Plex Mono, monospace';ctx.fillText(T('objective'),W/2,34);
    const mapDuration=currentMap.duration||RUN_DURATION;ctx.fillStyle=elapsed>=mapDuration?'#9bf3bd':'#f0f7fb';ctx.font='700 28px IBM Plex Mono, monospace';ctx.fillText(formatTime(Math.max(0,mapDuration-elapsed)),W/2,64);
    ctx.fillStyle='#1a2c3d';ctx.fillRect(W/2-82,75,164,3);ctx.fillStyle='#5ee7f2';ctx.fillRect(W/2-82,75,164*Math.min(1,elapsed/mapDuration),3);
    // Top-right resource readout.
    panel(W-216,18,194,69);ctx.fillStyle='#ffbf71';ctx.font='600 8px IBM Plex Mono, monospace';ctx.textAlign='left';ctx.fillText('✦ '+T('echo').toUpperCase(),W-202,37);ctx.fillStyle='#fff2dc';ctx.font='700 21px IBM Plex Mono, monospace';ctx.fillText(String(player.crystals).padStart(3,'0'),W-202,62);
    ctx.fillStyle='#8fa4b5';ctx.font='9px IBM Plex Mono, monospace';ctx.fillText('◉ '+T('kills').toUpperCase(),W-118,37);ctx.fillStyle='#dfeef7';ctx.font='700 16px IBM Plex Mono, monospace';ctx.fillText(String(runStats.kills).padStart(3,'0'),W-118,61);
    // Bottom-left: core status.
    panel(22,H-91,295,69);
    ctx.textAlign='left';ctx.fillStyle='#aabcc9';ctx.font='600 8px IBM Plex Mono, monospace';ctx.fillText(T('health').toUpperCase(),34,H-72);
    ctx.fillStyle='#e9f5f7';ctx.font='600 9px IBM Plex Mono, monospace';ctx.textAlign='right';ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`,303,H-72);drawBar(34,H-65,269,7,player.hp/player.maxHp,player.hp/player.maxHp<.3?'#ff6b78':'#f3b677');
    ctx.textAlign='left';ctx.fillStyle='#aabcc9';ctx.font='600 8px IBM Plex Mono, monospace';ctx.fillText(T('battery').toUpperCase(),34,H-44);ctx.textAlign='right';ctx.fillStyle='#e9f5f7';ctx.fillText(`${Math.ceil(player.energy)} / ${player.maxEnergy}`,303,H-44);drawBar(34,H-37,269,7,player.energy/player.maxEnergy,'#5ee7f2');
    // XP stripe
    ctx.fillStyle='rgba(3,9,17,.82)';ctx.fillRect(22,H-14,295,4);ctx.fillStyle='#b6a2ff';ctx.fillRect(22,H-14,295*Math.min(1,player.xp/player.xpNeed),4);
    // Abilities
    panel(W/2-119,H-76,238,54);ctx.textAlign='left';ctx.fillStyle='#5ee7f2';ctx.font='700 13px IBM Plex Mono, monospace';ctx.fillText('E',W/2-104,H-55);ctx.fillStyle=player.pulseCooldown<=0?'#a6f8ff':'#718796';ctx.font='600 8px IBM Plex Mono, monospace';ctx.fillText(player.pulseCooldown<=0?T('pulseReady'):T('pulseCharging'),W/2-81,H-57);drawBar(W/2-81,H-48,85,3,1-player.pulseCooldown/6.6,'#5ee7f2');
    ctx.fillStyle='#ffbd77';ctx.font='700 13px IBM Plex Mono, monospace';ctx.fillText('SPACE',W/2+18,H-55);ctx.fillStyle=player.dashCd<=0?'#f5c98f':'#718796';ctx.font='600 8px IBM Plex Mono, monospace';ctx.fillText(player.dashCd<=0?T('dashReady'):T('dashCharging'),W/2+65,H-57);drawBar(W/2+65,H-48,82,3,1-player.dashCd/player.dashCooldown,'#ffbd77');
    panel(W/2+132,H-76,176,54);ctx.textAlign='left';ctx.fillStyle=player.dispelUsed?'#687c89':'#a7f8ff';ctx.font='700 13px IBM Plex Mono, monospace';ctx.fillText('Q',W/2+145,H-55);ctx.font='600 8px IBM Plex Mono, monospace';ctx.fillText(player.dispelUsed?T('dispelUsed'):T('dispelReady'),W/2+166,H-57);drawBar(W/2+166,H-48,126,3,player.dispelUsed?0:1,'#9bf7ff');
    // Boss health remains visible even if the creature goes off-screen.
    const boss=enemies.find(e=>e.kind==='boss');
    if(boss){panel(W/2-180,101,360,34);ctx.textAlign='center';ctx.fillStyle='#ff9f9c';ctx.font='700 10px IBM Plex Mono, monospace';ctx.fillText(T('boss').toUpperCase(),W/2,114);drawBar(W/2-166,121,332,6,boss.hp/boss.maxHp,'#ef6b82','rgba(22,5,12,.9)');}
    else if(bossKilled){ctx.textAlign='center';ctx.fillStyle='rgba(153,243,199,.85)';ctx.font='600 9px IBM Plex Mono, monospace';ctx.fillText(T('boss-dead').toUpperCase(),W/2,108);}
    // Short objective reminder at top center-right.
    ctx.textAlign='right';ctx.fillStyle='rgba(180,202,216,.6)';ctx.font='500 8px IBM Plex Mono, monospace';ctx.fillText(elapsed<(currentMap.duration||RUN_DURATION)?T('survive').toUpperCase():(bossKilled?T('next').toUpperCase():T('bossObjective').toUpperCase()),W-27,111);
  }

  function render() {
    ctx.clearRect(0,0,W,H);
    if(player && ['playing','paused','upgrade','result'].includes(state)) { drawWorld(); drawHUD(); }
    else { ctx.fillStyle='#060b13';ctx.fillRect(0,0,W,H); }
    // The CSS main menu supplies the key art; canvas effects continue to update behind its overlays only during a run.
  }

  function gameLoop(ts) {
    const dt=lastFrame?Math.min(.05,(ts-lastFrame)/1000):0;lastFrame=ts;
    update(dt);render();requestAnimationFrame(gameLoop);
  }

  // Menu and overlay controls.
  function refreshCampaignButtons(){
    const unlocked=save.campaignLevelUnlocked||1;
    for(let level=2;level<=MAP_COUNT;level++){
      let btn=$(`level${level}-btn`);
      if(!btn){
        btn=document.createElement('button');btn.id=`level${level}-btn`;btn.className='button campaign-level-btn';
        const icon=document.createElement('span');icon.className='button-icon';icon.textContent=level===2?'✧':String(level).padStart(2,'0');
        const label=document.createElement('span');label.id=`level${level}-label`;btn.append(icon,label);
        const armory=$('armory-btn');armory.parentNode.insertBefore(btn,armory);
        btn.addEventListener('click',()=>{if((save.campaignLevelUnlocked||1)<level)return;save.selectedCampaignLevel=level;beginRun();});
      }
      const map=MAPS[level-1], isUnlocked=unlocked>=level;
      btn.disabled=!isUnlocked;btn.title=isUnlocked?map.name[lang]:(lang==='es'?`Completa el nivel ${level-1} para desbloquearlo`:`Complete level ${level-1} to unlock`);
      $(`level${level}-label`).textContent=`NIVEL ${String(level).padStart(2,'0')} · ${map.name[lang]}`+(isUnlocked?'':' · BLOQUEADO');
    }
    const first=$('level2-btn');if(first)first.querySelector('#level2-label').textContent=`NIVEL 02 · ${MAPS[1].name[lang]}`+((unlocked>=2)?'':' · BLOQUEADO');
  }
  $('play-btn').addEventListener('click',()=>{save.selectedCampaignLevel=1;beginRun();});
  $('level2-btn').addEventListener('click',()=>{if((save.campaignLevelUnlocked||1)<2)return;save.selectedCampaignLevel=2;beginRun();});
  refreshCampaignButtons();
  $('armory-btn').addEventListener('click',openShop);
  $('how-btn').addEventListener('click',()=>showScreen('how-screen'));
  $('result-armory-btn').addEventListener('click',openShop);
  $('retry-btn').addEventListener('click',()=>{
    if(state==='result' && bossKilled && campaignLevel<MAP_COUNT && (save.campaignLevelUnlocked||1)>campaignLevel){
      save.selectedCampaignLevel=campaignLevel+1;
    } else {
      save.selectedCampaignLevel=campaignLevel;
    }
    beginRun();
  });
  $('menu-btn').addEventListener('click',showMenu);
  $('resume-btn').addEventListener('click',()=>{if(state==='paused'){state='playing';showScreen(null);screens.forEach(s=>$(s).classList.add('hidden'));$('corner-hint').classList.remove('hidden');}});
  $('quit-btn').addEventListener('click',()=>{if(confirm(T('confirmQuit'))){state='menu';showMenu();}});
  document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',()=>{const close=el.dataset.close;if(close==='how-screen'||close==='armory-screen')showMenu();else $(close).classList.add('hidden');}));
  $('sound-toggle').addEventListener('click',()=>{soundOn=!soundOn;save.sound=soundOn;saveGame();$('sound-label').textContent=soundOn?T('soundOn'):T('soundOff');if(soundOn)sfx('click');});
  $('lang-toggle').addEventListener('click',()=>{lang=lang==='es'?'en':'es';applyTranslations();refreshCampaignButtons();if(state==='upgrade')renderUpgradeChoices();if(state==='result'&&player){$('result-eyebrow').textContent=runBanked>=0?(elapsed>=RUN_DURATION&&bossKilled?T('runWon'):T('runLost')):T('runLost');$('result-title').textContent=(elapsed>=RUN_DURATION&&bossKilled)?T('victoryTitle'):T('deathTitle');$('result-desc').textContent=(elapsed>=RUN_DURATION&&bossKilled)?T('wonDesc'):T('lostDesc');$('result-stats').innerHTML=`<div class="result-stat"><strong>${formatTime(elapsed)}</strong><span>${T('resultTime')}</span></div><div class="result-stat"><strong>${runStats.kills}</strong><span>${T('resultKills')}</span></div><div class="result-stat"><strong>${player.level}</strong><span>${T('resultLevel')}</span></div><div class="result-stat"><strong>+${runBanked}</strong><span>${T('deposited')}</span></div>`;}});

  // The browser receives keyboard events even when overlays have focus; avoid scrolling during a run.
  window.addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();
    if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k) && ['playing','paused'].includes(state)) e.preventDefault();
    if(k==='escape'){
      if(state==='playing'){state='paused';showScreen('pause-screen');mouse.down=false;if(player)player.beamActive=false;}
      else if(state==='paused'){state='playing';showScreen(null);screens.forEach(s=>$(s).classList.add('hidden'));$('corner-hint').classList.remove('hidden');}
      return;
    }
    if(k===' ' && !e.repeat){dash();return;}
    if(k==='e' && !e.repeat){triggerPulse();return;}
    if(k==='q' && !e.repeat){triggerDispel();return;}
    keys.add(k);
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>{keys.clear();mouse.down=false;if(state==='playing'){state='paused';showScreen('pause-screen');if(player)player.beamActive=false;}});
  canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*W;mouse.y=(e.clientY-r.top)/r.height*H;});
  canvas.addEventListener('mousedown',e=>{if(e.button===0){mouse.down=true;ensureAudio();}if(e.button===2){triggerPulse();}});
  window.addEventListener('mouseup',e=>{if(e.button===0)mouse.down=false;});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('click',()=>{if(state==='menu')return;ensureAudio();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing'){state='paused';mouse.down=false;if(player)player.beamActive=false;showScreen('pause-screen');}});

  save.campaignLevelUnlocked = MAP_COUNT;
  saveGame();
  soundOn = save.sound !== false;
  applyTranslations();
  showMenu();
  requestAnimationFrame(gameLoop);
})();
