import {SPECIES,BOAT_RATE,capacity,initialState,sanitize,rollFish,landFish,sellFish,earnBoat} from './economy.mjs?v=island-1';
import {createBite,biteCue,advanceBite,setHook,createFight,fightCue,tugStep} from './fishing.mjs';
import {createIslandWorld} from './island-scene.mjs?v=fishing-2';
import {STATIONS,nearestStation,walkable,findPath,stepPlayer,followPath,distance,frameDelta} from './island.mjs';
import {earnBusiness} from './business.mjs';
import {createStations} from './stations.mjs';
import {bindFishingInput} from './fishing-input.mjs?v=fishing-2';
import {advanceMarket} from './market.mjs';
import {createExchange} from './exchange.mjs?v=island-1';
const $=id=>document.getElementById(id),money=n=>'$'+Math.floor(n).toLocaleString('en-US');
const KEY='rod-to-riches-save-v1';let state=initialState(),storageAvailable=true;
try{const raw=JSON.parse(localStorage.getItem(KEY));state=sanitize(raw);if(raw?.version===1&&!raw.business&&!localStorage.getItem('rod-to-riches-pre-island-backup-v1'))localStorage.setItem('rod-to-riches-pre-island-backup-v1',JSON.stringify(raw));}catch{storageAvailable=false;}
let phase='idle',bite=null,currentFish=null,fight=null,holding=false,paused=false,dockSession=false,lossMessage='',perfectHook=false,lastFightStage='';
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
 const active=['waiting','nibble','bite','fighting'].includes(phase);
 dockSession=false;phase='idle';holding=false;paused=false;currentFish=null;bite=null;fight=null;fishingInput.cancel();
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
function beforeModal(){clearMovement();fishingInput.cancel();if(['waiting','nibble','bite','fighting'].includes(phase))paused=true;updateFishing();}
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
 $('game').classList.toggle('at-dock',dockSession);
 const texts={idle:['READ THE WATER','A little patience. A little instinct.','Wait through the nibbles. Set the hook in the green window.','Cast your line','↗'],waiting:['01 / READ THE FLOAT','Let them come to you.','Small dips are nibbles, not bites. Pulling now scares the fish away.','Pull line · too early','≈'],nibble:['JUST A NIBBLE…','Wait for the full bite.','The fish is testing your bait. Keep your finger ready.','Pull line · too early','≈'],bite:['02 / SET THE HOOK','A bite! Time your strike.','Press once while the marker is in green. Gold is a perfect hook.','Set the hook','!'],fighting:[perfectHook?'PERFECT HOOK · 03 / TUG OF WAR':'03 / TUG OF WAR',currentFish?species(currentFish).name+' on the line!':'Fish on!',currentFish?species(currentFish).rarity+' · Hold to reel. Release for surges. Keep some tension.':'','Hold to reel','↥'],caught:['ONE CATCH CLOSER',currentFish?species(currentFish).name+' landed.':'A fine catch.',currentFish?species(currentFish).rarity+' · '+currentFish.kg.toFixed(2)+' kg · '+money(currentFish.value)+' · In your cooler.':'','Cast again','↗'],lost:['THE ONE THAT GOT AWAY','There’s always another fish.',lossMessage,'Try another cast','↗']};
 const t=texts[phase];$('phase-label').textContent=paused?'FISHING PAUSED':t[0];$('fishing-title').textContent=paused?'The bay can wait.':t[1];$('fishing-hint').textContent=paused?'Press P or tap Resume to continue.':t[2];$('cast-label').textContent=paused?'Resume fishing':t[3];$('cast-icon').textContent=paused?'▷':t[4];$('cast').disabled=!world||!dockSession;$('cast').className='cast-button'+(paused?' paused':phase==='bite'?' bite':phase==='fighting'?' reel':'');$('fight').hidden=phase!=='fighting';$('float-watch').hidden=!['waiting','nibble','bite'].includes(phase);$('hook-timing').hidden=phase!=='bite';$('control-note').textContent='Space / button · P pauses · Release between actions';
 $('fishing-controls').dataset.phase=phase;
 if(['waiting','nibble','bite'].includes(phase))renderBite();
 if(phase==='fighting')renderFight();
}
function renderBite(){
 if(!bite)return;const cue=biteCue(bite);
 $('float-watch').dataset.cue=cue.phase;
 $('float-bobber').style.transform=`translate(0,${cue.dip*26}px) rotate(${cue.phase==='nibble'?Math.sin(bite.time*28)*12:0}deg)`;
 $('float-bobber').style.opacity=1-cue.dip*.9;
 $('float-caption').textContent=paused?'Paused':cue.phase==='bite'?'FLOAT UNDER · GET READY':cue.phase==='nibble'?'Nibble… wait for it.':'Watch for a full dip…';
 $('hook-zone').style.left=bite.start*100+'%';$('hook-zone').style.width=(bite.end-bite.start)*100+'%';
 $('perfect-zone').style.left=(bite.start+(bite.end-bite.start)/3)*100+'%';$('perfect-zone').style.width=(bite.end-bite.start)/3*100+'%';
 $('hook-marker').style.left=cue.position*100+'%';$('hook-meter').setAttribute('aria-valuenow',Math.round(cue.position*100));
 $('hook-instruction').textContent=paused?'Paused':cue.ready?cue.perfect?'PERFECT · STRIKE!':'STRIKE NOW!':cue.position>bite.end?'TOO LATE…':'WAIT FOR GREEN…';
 $('hook-timing').dataset.ready=String(cue.ready);
}
const FIGHT_CUES={steady:['STEADY','Reel, but keep tension below 85%.'],warning:['SURGE INCOMING','Ease off now. Be ready for the run.'],surge:['LET IT RUN','Release! Reeling against a surge damages the hook.'],recovery:['YOUR OPENING','Reel now—recover ground while the fish tires.']};
function renderFight(){
 if(!fight)return;const cue=fightCue(fight),[title,advice]=FIGHT_CUES[cue.stage];
 $('fight').dataset.stage=cue.stage;$('fish-behavior').textContent=paused?'FIGHT PAUSED':title;
 $('fight-advice').textContent=paused?'Resume when ready.':fight.tension<18?'Too slack! Reel to keep the hook secure.':fight.tension>85?'Danger! Release before the line snaps.':advice;
 for(const [id,value] of [['tension',fight.tension],['hook-health',fight.hook],['catch',fight.progress]]){$(id+'-bar').style.width=value+'%';$(id+'-meter').setAttribute('aria-valuenow',Math.round(value));}
 $('tension-value').textContent=Math.round(fight.tension)+'%';$('hook-health-value').textContent=Math.round(fight.hook)+'%';$('catch-percent').textContent=Math.round(fight.progress)+'%';
 $('tension-bar').style.background=fight.tension>85||fight.tension<18?'#ed9878':'#9dcfaa';
 $('fight-fish').style.left=(80-fight.progress*.6)+'%';$('fight-fish').dataset.running=String(cue.stage==='surge');
 if(!paused&&cue.stage!==lastFightStage){lastFightStage=cue.stage;if(cue.stage==='warning')tone(410,.15);$('fishing-announcement').textContent=title+'. '+advice;}
}
function setPhase(value){phase=value;holding=false;updateFishing();}
function cast(){
 if(!dockSession||modalOpen()||nearestStation(state.business.position)?.id!=='dock')return;
 if(paused){paused=false;updateFishing();return;}
 if(['idle','caught','lost'].includes(phase)){
  if(state.fish.length>=capacity(state)){toast('Cooler full. Walk to the fish market to sell your catch.');return;}
  currentFish=rollFish(state);bite=createBite(species(currentFish).difficulty,state.bait);fight=null;lossMessage='';perfectHook=false;lastFightStage='';setPhase('waiting');renderBite();$('fishing-announcement').textContent='Line cast. Wait through the nibbles for a full bite.';tone(350);
 }else if(['waiting','nibble','bite'].includes(phase)){
  const result=setHook(bite);
  if(result==='early'||result==='late'){loseFish(result);return;}
  perfectHook=result==='perfect';fight=createFight(species(currentFish).difficulty,state.rod,perfectHook);setPhase('fighting');tone(perfectHook?980:700);
 }else if(phase==='fighting'){holding=!holding;}
}
function loseFish(reason){
 lossMessage={early:'Too early—you pulled the bait away before the fish committed.',late:'Too late—the fish ate the bait and swam away.',snap:'The line snapped. Ease off before tension reaches 100%.',slack:'Too much slack—the hook slipped out. Keep tension above 18%.',hook:'The hook tore free. Release during surges and avoid excessive tension.',escape:'The fish outlasted you. Reel during its recovery to gain ground.'}[reason]||'The fish slipped away. Try another cast.';
 setPhase('lost');$('fishing-announcement').textContent=lossMessage;tone(180,.2);
}
function finishFight(result){
 if(result==='caught'&&landFish(state,currentFish)){setPhase('caught');updateHUD();save();$('fishing-announcement').textContent=species(currentFish).name+' landed and saved in your cooler.';tone(880,.25);if(state.caught===1)toast('First catch! Carry it to the green fish-market stall.');}
 else loseFish(fight?.reason);
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
function pauseInput(){clearMovement();fishingInput.cancel();if(['waiting','nibble','bite','fighting'].includes(phase))paused=true;updateFishing();renderBite();updateTravel();}
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
   if(['waiting','nibble','bite'].includes(phase)){
    if(advanceBite(bite,dt)==='late')loseFish('late');
    else {const cue=biteCue(bite);if(cue.phase!==phase){setPhase(cue.phase);if(cue.phase==='bite'){tone(720,.2);$('fishing-announcement').textContent='Bite! Press when the marker reaches green.';}else if(cue.phase==='nibble')tone(440,.06);}renderBite();}
   }else if(phase==='fighting'){const result=tugStep(fight,holding,dt);renderFight();if(result!=='fighting')finishFight(result);}
  }
  if(advanceMarket(state.market,dt)){exchange.render();save();}
  earnBoat(state,dt);earnBusiness(state,dt);uiTimer+=dt;saveTimer+=dt;
  if(uiTimer>=.25){uiTimer=0;updateTravel();stations.refresh();exchange.updateClock();}
  if(saveTimer>=8){saveTimer=0;save();}
  const labels=world?.render(dt,state,moving,phase,holding,{atDock:dockSession,dip:bite&&phase!=='fighting'?biteCue(bite).dip:0,time:phase==='fighting'?fight.time:bite?.time||0,stage:fight?fightCue(fight).stage:null,progress:fight?.progress||0,paused})||[];
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
