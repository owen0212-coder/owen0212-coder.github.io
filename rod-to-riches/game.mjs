import {SPECIES,GEAR,BOAT_RATE,MAX_BOATS,initialState,sanitize,capacity,boatCost,rollFish,landFish,sellFish,upgrade,buyBoat,earnBoat,collectBoat,fightStep} from './economy.mjs';
import {createWorld} from './scene.mjs?v=swim-depth-3';
import {bindFishingInput} from './fishing-input.mjs';
const $=id=>document.getElementById(id), money=n=>'$'+Math.floor(n).toLocaleString('en-US');
const KEY='rod-to-riches-save-v1';let state=initialState(),storageAvailable=true;
try{state=sanitize(JSON.parse(localStorage.getItem(KEY)));}catch{storageAvailable=false;}
let phase='idle',timer=0,currentFish=null,fight=null,holding=false,paused=false,tab='catch',toastTimer,saveTimer=0,uiTimer=0,audio;
let world;try{world=createWorld($('world'));}catch(error){$('world').innerHTML='<div class="fatal">This browser could not start the 3D harbor. Try enabling hardware acceleration or opening the game in a recent browser.<a href="../">Back to the Shed</a></div>';$('cast').disabled=true;console.error(error);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;}$('save-state').textContent=storageAvailable?'SAVED ON THIS DEVICE':'SAVING UNAVAILABLE · KEEP THIS TAB OPEN';}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function tone(freq=550,duration=.12){if(!state.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(freq,audio.currentTime);gain.gain.setValueAtTime(.06,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+duration);}catch{}}
function species(f){return SPECIES.find(p=>p.id===f.id);}
function fishRow(f){const p=species(f);return `<div class="fish-row"><span class="fish-chip" style="color:${p.color}">⌁</span><div><strong>${p.name}</strong><small>${p.rarity} · ${f.kg.toFixed(2)} kg</small></div><b>${money(f.value)}</b></div>`;}
function updatePanel(){
 $('coins').textContent=money(state.coins);const price=boatCost(state),hasFleet=state.boats>0;
 $('milestone-label').textContent=hasFleet?'FLEET INCOME / MINUTE':'YOUR FIRST FISHING BOAT';$('milestone-value').textContent=hasFleet?money(state.boats*BOAT_RATE):`${money(state.coins)} / $450`;$('milestone-bar').style.width=(hasFleet?state.boats/MAX_BOATS:Math.min(1,state.coins/450))*100+'%';$('milestone-copy').textContent=hasFleet?'A little fleet. A growing future.':'Every catch is a little capital.';
 let html='';
 if(tab==='catch'){const total=state.fish.reduce((v,f)=>v+f.value,0);html=`<div class="panel-kicker"><span>IN YOUR COOLER</span><span>${state.fish.length} / ${capacity(state)} fish</span></div>`;
 html+=state.fish.length?state.fish.map(fishRow).join(''):'<div class="empty"><span class="fish-symbol" aria-hidden="true">⌁</span><strong>Something good is biting.</strong><p>Your cooler is empty. Cast a line and see what the bay has for you.</p></div>';
 if(total)html+=`<div class="sell-total"><span>Market value</span><strong>${money(total)}</strong></div>`;
 html+=`<button class="primary" data-action="sell" ${total?'':'disabled'}>Sell all fish${total?' · '+money(total):''}</button>`;
 }else if(tab==='gear'){html=Object.entries(GEAR).map(([key,g])=>`<div class="upgrade"><div class="upgrade-top"><h3>${g.name}</h3><span class="level">LEVEL ${state[key]+1} / 4</span></div><p>${g.names[state[key]]} · ${g.description}</p><button class="primary secondary" data-upgrade="${key}" ${state[key]>=3||state.coins<g.costs[state[key]]?'disabled':''}>${state[key]>=3?'Fully upgraded':`Upgrade · ${money(g.costs[state[key]])}`}</button></div>`).join('');
 }else if(tab==='fleet'){html=`<div class="fleet-hero"><strong>${state.boats} ${state.boats===1?'boat':'boats'}</strong><p>${state.boats?money(state.boats*BOAT_RATE)+' per minute while you play':'Your next chapter starts here.'}</p></div><div class="fleet-money"><span>Ready to collect</span><strong id="fleet-bank">${money(state.boatBank)}</strong></div><button class="primary secondary" data-action="collect" ${state.boatBank<1?'disabled':''}>Collect earnings</button><p class="fleet-note">Each boat earns $18 / min. Earnings pause when this tab is hidden or closed. Maximum 3 boats.</p><button class="primary" data-action="boat" ${state.boats>=MAX_BOATS||state.coins<price?'disabled':''}>${state.boats>=MAX_BOATS?'Fleet complete':`Buy ${state.boats?'another':'your first'} boat · ${money(price)}`}</button>`;
 }else{html=`<div class="journal-stats"><div><strong>${state.caught}</strong><small>FISH CAUGHT</small></div><div><strong>${state.best.toFixed(2)} kg</strong><small>PERSONAL BEST</small></div></div><div class="panel-kicker"><span>SPECIES DISCOVERED</span><span>${Object.keys(state.collection).length} / ${SPECIES.length}</span></div>`+SPECIES.map(p=>`<div class="fish-row ${state.collection[p.id]?'':'unknown'}"><span class="fish-chip" style="color:${p.color}">${state.collection[p.id]?'⌁':'?'}</span><div><strong>${state.collection[p.id]?p.name:'Undiscovered'}</strong><small>${p.rarity}${p.rod>state.rod?' · Rod level '+(p.rod+1):''}</small></div><b>${state.collection[p.id]||'—'}</b></div>`).join('')+`<p class="fleet-note">Total earned: ${money(state.revenue)}. Prices are fictional game dollars.</p>`;}
 $('panel-content').innerHTML=html;
}
function updateFishing(){
 const texts={idle:['A GOOD DAY TO START SOMETHING','Your empire starts with a cast.','Cast your line. A little patience goes a long way.','Cast your line','↗'],waiting:['LINE IN THE WATER','Good things take a little patience.','Watch the float. Hook the fish when it bites.','Waiting for a bite…','≈'],bite:['SOMETHING IS BITING','Now! Hook your fish.','Tap the button or press Space before it gets away.','Hook the fish!','!'],fighting:['EASY DOES IT',currentFish?species(currentFish).name+' on the line!':'Fish on the line!','Hold to reel. Release before the line gets too hot.','Hold to reel','↥'],caught:['ONE CATCH CLOSER',currentFish?species(currentFish).name+' landed.':'A fine catch.',currentFish?`${currentFish.kg.toFixed(2)} kg · Worth ${money(currentFish.value)} · Safely in your cooler.`:'','Cast again','↗'],lost:['THERE IS ALWAYS ANOTHER FISH','That one got away.','Try again. Ease off the reel when tension rises.','Try another cast','↗']};
 const t=texts[phase];$('phase-label').textContent=paused?'TAKE YOUR TIME · PAUSED':t[0];$('fishing-title').textContent=paused?'The bay can wait.':t[1];$('fishing-hint').textContent=paused?'Press P or tap Resume when you are ready.':t[2];$('cast-label').textContent=paused?'Resume fishing':t[3];$('cast-icon').textContent=paused?'▷':t[4];$('cast').disabled=!world||(!paused&&phase==='waiting');$('cast').className='cast-button'+(paused?' paused':phase==='bite'?' bite':phase==='fighting'?' reel':'');$('fight').hidden=phase!=='fighting';$('control-note').textContent=phase==='fighting'?'Hold button or Space · release to relax · P to pause':'Click or press Space · progress saved on this device';
}
function setPhase(value){phase=value;holding=false;updateFishing();}
function cast(){
 if(paused){paused=false;updateFishing();return;}
 if(['idle','caught','lost'].includes(phase)){if(state.fish.length>=capacity(state)){toast('Your cooler is full. Sell your fish at the harbor.');selectTab('catch');return;}currentFish=rollFish(state);timer=2.5+Math.random()*3-state.bait*.45;setPhase('waiting');tone(350);}
 else if(phase==='bite'){fight={time:0,progress:0,tension:20};setPhase('fighting');tone(700);}
}
function finishFight(result){if(result==='caught'){if(landFish(state,currentFish)){setPhase('caught');updatePanel();save();tone(880,.25);if(state.caught===1)toast('Your first catch! Sell it in the harbor to start investing.');}else{setPhase('lost');toast('The cooler is full. Sell your catch first.');}}else{setPhase('lost');tone(180,.2);}}
function selectTab(value){tab=value;for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-pressed',String(b.dataset.tab===tab));setPanel(true);updatePanel();}
function setPanel(expanded){$('harbor-body').hidden=!expanded;$('panel-toggle').textContent=expanded?'−':'+';$('panel-toggle').setAttribute('aria-expanded',String(expanded));$('panel-toggle').setAttribute('aria-label',expanded?'Collapse harbor':'Expand harbor');document.querySelector('.harbor').classList.toggle('expanded',expanded);}
document.querySelector('.tabs').addEventListener('click',e=>{if(e.target.dataset.tab)selectTab(e.target.dataset.tab);});
$('panel-content').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.action==='sell'){const value=sellFish(state);toast(`Catch sold for ${money(value)}. Your next investment awaits.`);tone(780);}
 if(b.dataset.upgrade){if(upgrade(state,b.dataset.upgrade)){toast(GEAR[b.dataset.upgrade].names[state[b.dataset.upgrade]]+' unlocked.');tone(900,.2);}}
 if(b.dataset.action==='boat'){if(buyBoat(state)){toast('Welcome aboard! Your boat is now earning $18 per minute.');tone(1000,.3);}}
 if(b.dataset.action==='collect'){toast(`Collected ${money(collectBoat(state))} from your fleet.`);tone(700);}
 updatePanel();save();});
$('panel-toggle').addEventListener('click',()=>setPanel($('harbor-body').hidden));
function release(){holding=false;}
const fishingInput=bindFishingInput($('cast'),{getPhase:()=>phase,isPaused:()=>paused,isHelpOpen:()=>$('help-dialog').open,activate:cast,setHolding:value=>{holding=value;},togglePause:()=>{paused=!paused;updateFishing();}});
addEventListener('blur',()=>{release();if(['waiting','bite','fighting'].includes(phase)){paused=true;updateFishing();}});
function showHelp(){release();if(['waiting','bite','fighting'].includes(phase))paused=true;updateFishing();$('help-dialog').showModal();}
$('help').addEventListener('click',showHelp);$('help-done').addEventListener('click',()=>$('help-dialog').close());
$('sound').addEventListener('click',()=>{state.sound=!state.sound;updateSound();tone();save();});
function updateSound(){$('sound-state').textContent=state.sound?'ON':'OFF';$('sound').setAttribute('aria-label',state.sound?'Turn sound off':'Turn sound on');}
document.addEventListener('visibilitychange',()=>{fishingInput.cancel();if(document.hidden){save();if(['waiting','bite','fighting'].includes(phase)){paused=true;updateFishing();}}});addEventListener('pagehide',save);
if(matchMedia('(max-width:600px)').matches)setPanel(false);
updatePanel();updateFishing();updateSound();save();
let last=performance.now();function frame(now){const dt=Math.min((now-last)/1000,.08);last=now;if(!document.hidden){
 if(!paused&&!$('help-dialog').open){if(phase==='waiting'){timer-=dt;if(timer<=0){timer=4.5;setPhase('bite');tone(720,.2);}}
 else if(phase==='bite'){timer-=dt;if(timer<=0)setPhase('lost');}
 else if(phase==='fighting'){const result=fightStep(fight,holding,dt,species(currentFish).difficulty,state.rod);$('tension-bar').style.width=fight.tension+'%';$('tension-bar').style.background=fight.tension>80?'#eb845f':'#e6c065';$('tension-value').textContent=Math.round(fight.tension)+'%';$('catch-bar').style.width=fight.progress+'%';$('catch-percent').textContent=Math.round(fight.progress)+'%';$('fight-advice').textContent=fight.tension>78?'Release! Let the line cool.':holding?'Reeling in…':'Hold to reel · release to cool';if(result!=='fighting')finishFight(result);}
 }
 earnBoat(state,dt);uiTimer+=dt;saveTimer+=dt;if(uiTimer>=1){uiTimer=0;if(tab==='fleet')updatePanel();}if(saveTimer>=8){saveTimer=0;save();}world?.render(dt,phase,holding,state.boats);
 }requestAnimationFrame(frame);}requestAnimationFrame(frame);
// Optional browser-agent access uses the same economy actions as the controls.
if(document.modelContext?.registerTool){const lifecycle=new AbortController();addEventListener('pagehide',()=>lifecycle.abort());
 const tools=[{name:'read_fishing_progress',description:'Read the visible Rod to Riches balance, catch, upgrades and fleet.',annotations:{readOnlyHint:true},execute:()=>({coins:state.coins,fish:state.fish,rod:state.rod,bait:state.bait,cooler:state.cooler,boats:state.boats,boatBank:state.boatBank,phase})},{name:'sell_caught_fish',description:'Sell all fish currently in the cooler for game dollars, exactly like Sell all fish.',annotations:{readOnlyHint:false},execute:()=>{const soldFor=sellFish(state);updatePanel();save();return {soldFor,coins:state.coins};}}];
 for(const tool of tools){try{Promise.resolve(document.modelContext.registerTool({...tool,inputSchema:{type:'object',properties:{},additionalProperties:false},execute:input=>{if(input&&Object.keys(input).length)throw new Error('No arguments accepted');return tool.execute();}},{signal:lifecycle.signal})).catch(()=>{});}catch{}}
}
