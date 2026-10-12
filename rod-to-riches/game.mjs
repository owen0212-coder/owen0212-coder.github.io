import {SPECIES,BOAT_RATE,capacity,initialState,sanitize,rollFish,landFish,sellFish,earnBoat,fightStep} from './economy.mjs?v=island-1';
import {createIslandWorld} from './island-scene.mjs';
import {STATIONS,nearestStation,walkable,findPath,stepPlayer,followPath,distance,frameDelta} from './island.mjs';
import {earnBusiness} from './business.mjs';
import {createStations} from './stations.mjs';
import {bindFishingInput} from './fishing-input.mjs';
import {advanceMarket} from './market.mjs';
import {createExchange} from './exchange.mjs?v=island-1';
const $=id=>document.getElementById(id),money=n=>'$'+Math.floor(n).toLocaleString('en-US');
const KEY='rod-to-riches-save-v1';let state=initialState(),storageAvailable=true;
try{const raw=JSON.parse(localStorage.getItem(KEY));state=sanitize(raw);if(raw?.version===1&&!raw.business&&!localStorage.getItem('rod-to-riches-pre-island-backup-v1'))localStorage.setItem('rod-to-riches-pre-island-backup-v1',JSON.stringify(raw));}catch{storageAvailable=false;}
let phase='idle',timer=0,currentFish=null,fight=null,holding=false,paused=false,dockSession=false;
let path=[],destination=null,moving=null,toastTimer,saveTimer=0,uiTimer=0,audio,world;
const keys=new Set(),touch=new Set();
function modalOpen(){return $('help-dialog').open||$('exchange-dialog').open||$('station-dialog').open;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;}
 $('save-state').textContent=storageAvailable?'SAVED ON THIS DEVICE':'SAVING UNAVAILABLE';
 const note=storageAvailable?'Progress saved on this device.':'Saving unavailable. Keep this tab open; progress may be lost when you leave.';
 $('exchange-save-state').textContent=note;$('station-save-state').textContent=note;
}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3800);}
function tone(freq=550,duration=.12){if(!state.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.04,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
const species=f=>SPECIES.find(p=>p.id===f.id);
function updateHUD(){
 $('coins').textContent=money(state.coins);$('bag-count').textContent=state.fish.length+'/'+capacity(state);
 $('empire-summary').textContent=(state.business.plots.length?1+state.business.plots.length+' land parcels':'Home island')+' · '+state.business.workers+' crew';
}
function clearRoute(){path=[];destination=null;world?.setPath([]);}
function clearMovement(){keys.clear();touch.clear();moving=null;clearRoute();}
function leaveDock(silent=false){
 if(!dockSession)return;
 const active=['waiting','bite','fighting'].includes(phase);
 dockSession=false;phase='idle';holding=false;paused=false;currentFish=null;fight=null;fishingInput.cancel();
 if(active&&!silent)toast('Line brought in. Your stored catch is safe.');
 updateFishing();updateTravel();
}
function walkTo(point,stationId=null){
 if(modalOpen()||!world)return;
 if(!walkable(point,state.business.plots)){toast('That ground is not walkable. Buy new land at the Harbormaster.');return;}
 const route=findPath(state.business.position,point,state.business.plots);
 if(!route.length){toast('No clear route there. Try a nearby path.');return;}
 leaveDock();keys.clear();touch.clear();path=route;destination=stationId;world.setPath(path);
 $('destination-guide').hidden=true;$('guide-toggle').setAttribute('aria-expanded','false');updateTravel();
}
try{world=createIslandWorld($('world'),point=>walkTo(point));}catch(error){$('world').innerHTML='<div class="fatal">This browser could not start the island. Please enable hardware acceleration or try a recent WebGL2-capable browser.<a href="../">Back to the Shed</a></div>';console.error(error);}
$('destination-buttons').innerHTML=STATIONS.map(s=>'<button data-destination="'+s.id+'"><b>'+s.number+'</b><span><strong>'+s.name+'</strong><small>'+s.action+'</small></span></button>').join('');
$('station-labels').innerHTML=STATIONS.map(s=>'<button class="station-sign" data-destination="'+s.id+'" id="sign-'+s.id+'" aria-label="Walk to '+s.name+'"><span class="station-number">'+s.number+'</span>'+s.short+'</button>').join('')+'<span id="sign-player" class="player-marker" aria-hidden="true">YOU</span>';
for(const id of ['destination-buttons','station-labels'])$(id).addEventListener('click',event=>{const button=event.target.closest('[data-destination]');if(button){const s=STATIONS.find(s=>s.id===button.dataset.destination);walkTo({x:s.x,z:s.z},s.id);}});
$('guide-toggle').addEventListener('click',()=>{$('destination-guide').hidden=!$('destination-guide').hidden;$('guide-toggle').setAttribute('aria-expanded',String(!$('destination-guide').hidden));});
function beforeModal(){clearMovement();fishingInput.cancel();if(['waiting','bite','fighting'].includes(phase))paused=true;updateFishing();}
function afterModal(){keys.clear();touch.clear();fishingInput.cancel();save();updateHUD();updateTravel();updateFishing();}
const stations=createStations({getState:()=>state,onChange:()=>{updateHUD();save();tone(750);},onOpen:beforeModal,onClose:afterModal});
const exchange=createExchange({getState:()=>state,onChange:()=>{updateHUD();save();tone(700);},onOpen:beforeModal,onClose:afterModal,canTrade:()=>nearestStation(state.business.position)?.id==='exchange'});
function enterStation(){
 if(modalOpen()||!world)return;
 const station=nearestStation(state.business.position);if(!station){toast('Walk up to a station first.');return;}
 clearMovement();
 if(station.id==='dock'){if(!dockSession){dockSession=true;paused=false;phase='idle';}updateFishing();updateTravel();$('cast').focus({preventScroll:true});}
 else if(station.id==='exchange')exchange.open();
 else stations.open(station.id);
}
$('interact').addEventListener('click',enterStation);$('stop-walking').addEventListener('click',()=>{clearMovement();updateTravel();});
$('bag').addEventListener('click',()=>stations.open('bag'));
$('leave-dock').addEventListener('click',()=>leaveDock());
function updateTravel(){
 const near=nearestStation(state.business.position),target=STATIONS.find(s=>s.id===destination);
 $('travel-hud').hidden=dockSession;$('touch-controls').hidden=dockSession;
 $('travel-kicker').textContent=path.length?'ON YOUR WAY':near?'AT '+near.short:'WELCOME TO WILLOW BAY';
 $('travel-title').textContent=path.length?'Walking'+(target?' to '+target.name:'…'):near?near.name:'Your island. Your next move.';
 $('travel-hint').textContent=path.length?'Your character is following the path. Use movement controls to take over.':near?near.action+' · Press E or use the button below.':'Tap a sign or use Island guide · WASD / arrows to explore';
 $('interact').disabled=!near||path.length>0||!world;$('interact').innerHTML=(near?near.action:'Walk up to a station')+' <kbd>E</kbd>';
 $('stop-walking').hidden=!path.length;
 for(const s of STATIONS)$('sign-'+s.id).classList.toggle('near',near?.id===s.id);
}
function updateFishing(){
 $('fishing-controls').hidden=!dockSession;
 const texts={idle:['AT THE FISHING DOCK','Cast into your future.','Your cooler travels with you. Sell catches at the fish market.','Cast your line','↗'],waiting:['LINE IN THE WATER','A little patience.','Hook the fish when the float dips.','Waiting for a bite…','≈'],bite:['SOMETHING IS BITING','Hook your fish!','Tap the button or press Space before it escapes.','Hook the fish!','!'],fighting:['EASY DOES IT',currentFish?species(currentFish).name+' on the line!':'Fish on!','Hold to reel. Release to ease the tension.','Hold to reel','↥'],caught:['ONE CATCH CLOSER',currentFish?species(currentFish).name+' landed.':'A fine catch.',currentFish?currentFish.kg.toFixed(2)+' kg · '+money(currentFish.value)+' · In your cooler.':'','Cast again','↗'],lost:['THERE IS ALWAYS ANOTHER FISH','That one got away.','Ease off when the line tension rises.','Try another cast','↗']};
 const t=texts[phase];$('phase-label').textContent=paused?'FISHING PAUSED':t[0];$('fishing-title').textContent=paused?'The bay can wait.':t[1];$('fishing-hint').textContent=paused?'Press P or tap Resume to continue.':t[2];$('cast-label').textContent=paused?'Resume fishing':t[3];$('cast-icon').textContent=paused?'▷':t[4];$('cast').disabled=!world||!dockSession||(!paused&&phase==='waiting');$('cast').className='cast-button'+(paused?' paused':phase==='bite'?' bite':phase==='fighting'?' reel':'');$('fight').hidden=phase!=='fighting';$('control-note').textContent='Hold button or Space · P pauses fishing · Leave dock to explore';
}
function setPhase(value){phase=value;holding=false;updateFishing();}
function cast(){
 if(!dockSession||modalOpen()||nearestStation(state.business.position)?.id!=='dock')return;
 if(paused){paused=false;updateFishing();return;}
 if(['idle','caught','lost'].includes(phase)){
  if(state.fish.length>=capacity(state)){toast('Cooler full. Walk to the fish market to sell your catch.');return;}
  currentFish=rollFish(state);timer=2.5+Math.random()*3-state.bait*.45;setPhase('waiting');tone(350);
 }else if(phase==='bite'){fight={time:0,progress:0,tension:20};setPhase('fighting');tone(700);}
}
function finishFight(result){
 if(result==='caught'&&landFish(state,currentFish)){setPhase('caught');updateHUD();save();tone(880,.25);if(state.caught===1)toast('First catch! Carry it to the green fish-market stall.');}
 else{setPhase('lost');tone(180,.2);}
}
const fishingInput=bindFishingInput($('cast'),{getPhase:()=>phase,isPaused:()=>paused,isHelpOpen:()=>modalOpen()||!dockSession,activate:cast,setHolding:v=>{holding=v;},togglePause:()=>{paused=!paused;updateFishing();}});
const directions={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
addEventListener('keydown',event=>{
 if(modalOpen()||event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
 if(directions[event.code]){event.preventDefault();if(!event.repeat){leaveDock();clearRoute();keys.add(event.code);updateTravel();}}
 if(event.code==='KeyE'&&!event.repeat){event.preventDefault();enterStation();}
 if(event.code==='Escape'){$('destination-guide').hidden=true;$('guide-toggle').setAttribute('aria-expanded','false');clearMovement();leaveDock();updateTravel();}
});
addEventListener('keyup',event=>{keys.delete(event.code);});
for(const button of document.querySelectorAll('[data-move]')){
 button.addEventListener('pointerdown',event=>{if(modalOpen())return;event.preventDefault();button.setPointerCapture(event.pointerId);leaveDock();clearRoute();touch.add(button.dataset.move);updateTravel();});
 const release=()=>touch.delete(button.dataset.move);button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
}
function pauseInput(){clearMovement();fishingInput.cancel();if(['waiting','bite','fighting'].includes(phase))paused=true;updateFishing();updateTravel();}
addEventListener('blur',pauseInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseInput();save();}});addEventListener('pagehide',save);
$('help').addEventListener('click',()=>{beforeModal();$('help-dialog').showModal();});$('help-done').addEventListener('click',()=>$('help-dialog').close());$('help-dialog').addEventListener('close',afterModal);
$('sound').addEventListener('click',()=>{state.sound=!state.sound;updateSound();tone();save();});
function updateSound(){$('sound-state').textContent=state.sound?'ON':'OFF';$('sound').setAttribute('aria-label',state.sound?'Turn sound off':'Turn sound on');}
function move(dt){
 moving=null;if(modalOpen()||!world)return;
 const dirs=new Set([...Array.from(keys).map(k=>directions[k]),...touch]);
 let dx=0,dz=0;for(const d of dirs){if(d==='up'){dx-=.555;dz-=.832;}if(d==='down'){dx+=.555;dz+=.832;}if(d==='left'){dx-=.832;dz+=.555;}if(d==='right'){dx+=.832;dz-=.555;}}
 const old={...state.business.position};
 if(Math.hypot(dx,dz)>0)state.business.position=stepPlayer(old,dx,dz,dt,state.business.plots);
 else if(path.length){
  const result=followPath(old,path,dt,state.business.plots);state.business.position=result.position;path=result.path;
  if(result.blocked){clearRoute();toast('Path blocked. Try another spot.');}
  if(!path.length){const arrived=destination;clearRoute();if(arrived)enterStation();updateTravel();}
 }
 const p=state.business.position;if(distance(old,p)>.0001)moving={angle:Math.atan2(p.x-old.x,p.z-old.z)};
}
updateHUD();updateTravel();updateFishing();updateSound();save();
let last=null;
function frame(now){
 const dt=frameDelta(now,last);last=now;
 if(!document.hidden){
  move(dt);
  if(dockSession&&!paused&&!modalOpen()){
   if(phase==='waiting'){timer-=dt;if(timer<=0){timer=4.5;setPhase('bite');tone(720,.2);}}
   else if(phase==='bite'){timer-=dt;if(timer<=0)setPhase('lost');}
   else if(phase==='fighting'){const result=fightStep(fight,holding,dt,species(currentFish).difficulty,state.rod);$('tension-bar').style.width=fight.tension+'%';$('tension-bar').style.background=fight.tension>80?'#eb845f':'#e6c065';$('tension-value').textContent=Math.round(fight.tension)+'%';$('catch-bar').style.width=fight.progress+'%';$('catch-percent').textContent=Math.round(fight.progress)+'%';$('fight-advice').textContent=fight.tension>78?'Release! Let the line cool.':holding?'Reeling in…':'Hold to reel · release to cool';if(result!=='fighting')finishFight(result);}
  }
  if(advanceMarket(state.market,dt)){exchange.render();save();}
  earnBoat(state,dt);earnBusiness(state,dt);uiTimer+=dt;saveTimer+=dt;
  if(uiTimer>=.25){uiTimer=0;updateTravel();stations.refresh();exchange.updateClock();}
  if(saveTimer>=8){saveTimer=0;save();}
  const labels=world?.render(dt,state,moving,phase,holding)||[];
  for(const label of labels){const el=$('sign-'+label.id),visible=label.x>45&&label.x<innerWidth-45&&label.y>178&&label.y<innerHeight-190;el.hidden=!visible;el.style.left=label.x+'px';el.style.top=label.y+'px';}
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();addEventListener('pagehide',()=>lifecycle.abort());
 const tools=[{name:'read_fishing_progress',description:'Read Rod to Riches cash, catch, location, crew, land and fleet.',annotations:{readOnlyHint:true},execute:()=>({coins:state.coins,fish:state.fish,rod:state.rod,boats:state.boats,boatBank:state.boatBank,phase,business:state.business,nearStation:nearestStation(state.business.position)?.id||null})},{name:'sell_caught_fish',description:'Sell caught fish only when the character is physically at the fish-market counter.',annotations:{readOnlyHint:false},execute:()=>{if(nearestStation(state.business.position)?.id!=='market')throw new Error('Walk to the fish-market counter first.');const soldFor=sellFish(state);updateHUD();save();return {soldFor,coins:state.coins};}}];
 for(const tool of tools)try{Promise.resolve(document.modelContext.registerTool({...tool,inputSchema:{type:'object',properties:{},additionalProperties:false},execute:input=>{if(input&&Object.keys(input).length)throw new Error('No arguments accepted');return tool.execute();}},{signal:lifecycle.signal})).catch(()=>{});}catch{}
}
