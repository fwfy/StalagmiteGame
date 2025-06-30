const canvas = document.getElementById("game_canvas");
const ctx = canvas.getContext("2d");

const PHYSICS_HZ = 160;
const PHYSICS_TICK_MS = 1000 / PHYSICS_HZ;

let audioContext, gainNode;
let accumulator = 0;
let previousTime = performance.now();
let queuedSounds = [];

const sounds = {
    "dannytrack": {
        type: "music",
        path: "/assets/music/dannytrack.mp3"
    }
}

const keyBinds = {
    "l": {
        fn: _ => {
            new Danny();
            delete keyBinds["l"];
        }, sf: true
    }
}

const keysPressed = new Set();

let ents = [];
let soundsLoaded = false;
let soundsLoading = false;

function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

class GameObject {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.createdAt = framecount;
    }
    get age() {
        return framecount - this.createdAt;
    }
}

class Entity extends GameObject {
    constructor(x, y, w, h, sprite = "/assets/sprites/theredone.png", type = "default") {
        super(x, y);
        this.sprite = sprite;
        this.spriteImg = new Image();
        this.spriteImg.src = this.sprite;
        this.autoSize = !h;
        this.w = w;
        this.h = h;
        this.type = type;
        this.health = 100;
        this.sounds = [];
        ents.push(this);
    }
    draw() {
        let h = this.autoSize ? this.w * (this.spriteImg.height / this.spriteImg.width) : this.h;
        ctx.drawImage(this.spriteImg, this.x, this.y, this.w, h);
    }
    remove() {
        for (const sound of this.sounds) {
            sound.stop();
        }
        ents.splice(ents.indexOf(this), 1);
    }
    setSprite(spr) {
        if (this.sprite == spr) return;
        this.sprite = spr;
        this.spriteImg = new Image();
        this.spriteImg.src = this.sprite;
    }
}

class Item extends Entity {
    constructor(x, y, w, h, sprite, type = "item") {
        super(x, y, 10, 10, sprite, type)
    }
}

class SonLoaf extends Item {
    constructor(x, y) {
        super(x, y, "/assets/sprites/sonloaf.png", "son_loaf")
        this.healthAdd = 10;
    }
    action() {
        // TODO: sdjlfksdklfjdskl
    }
}

// const ball = new Item(1, 2)

class Danny extends Entity {
    constructor() {
        super(0, 0, 20);
        this.type = "DANNY";
        this.scaler = 150;
        this.oldGain = gainNode.gain.value;
        playSound("dannytrack", this);
    }
    tick() {
        this.x = ((canvas.clientWidth - this.w) / 2) + (Math.sin(framecount / 5) * Math.max(0, this.scaler - 145));
        this.y = ((canvas.clientHeight - this.w) / 2) + Math.cos(framecount / 10) * 10;
        gainNode.gain.value = 0.1 * (this.w / 100);
        this.w = Math.abs(Math.sin(framecount / 150) * this.scaler);
        if (this.age > 1000) this.scaler++;
        if (this.age > 3000) {
            this.scaler = 150;
            this.w = canvas.clientWidth;
            this.autoSize = false;
            this.h = canvas.clientHeight;
            this.setSprite("/assets/sprites/sonloaf.png");
        }
        if (this.age > 5000) {
            gainNode.gain.value = this.oldGain;
            blank = function () {
                ctx.fillStyle = "black";
                ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
            }
            this.remove();
        }
    }
    draw() {
        if (this.age == 200) {
            blank = function () { };
        }
        super.draw();
        if (this.age > 300) {
            // let a = (this.age - 1200) % 100;
            /* for (let i = 0; i < a; i++) */ ctx.drawImage(canvas, -1, -1, canvas.clientWidth + 2, canvas.clientHeight + 2);
        }
    }
}

let sqX = 0;
let sqY = 0;
let framecount = 0;

async function getAudioFromFile(filepath) {
    const response = await fetch(filepath);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
}

async function loadSounds() {
    if (soundsLoaded || soundsLoading) return;
    soundsLoading = true;
    audioContext = new AudioContext();
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.1;
    for (const sound of Object.keys(sounds)) {
        sounds[sound].file = await getAudioFromFile(sounds[sound].path);
        console.log(`loaded sound ${sound}`, sounds[sound]);
    }
    soundsLoaded = true;
    for (const sound of queuedSounds) {
        playSound(sound.sound, sound.sourceEnt);
    }
}

function playSound(sound, sourceEnt) {
    if (!soundsLoaded) {
        queuedSounds.push({ sound, sourceEnt });
        return console.log(`queueing ${sound} because sounds aren't finished loading yet`);
    }
    const trackSource = audioContext.createBufferSource();
    trackSource.buffer = sounds[sound].file;
    trackSource.connect(gainNode);
    trackSource.start();
    if (sourceEnt) {
        sourceEnt.sounds.push(trackSource);
    }
}

function renderAll() {
    for (const ent of ents) {
        ent.draw();
    }
}

function tickAll() {
    for (const ent of ents) {
        ent.tick();
    }
}

function blank() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
}

function scaleCanvas() {
    canvas.width = document.body.clientWidth * 0.8;
    canvas.height = document.body.clientHeight * 0.8;
}

function processKeys() {
    /* Object.keys(nL.keyBinds).forEach(k=>{
        if(nL.keyMap.has(k)) nL.keyBinds[k].fn();
        if(nL.keyBinds[k].sf) nL.keyMap.delete(k);
    })
     */
    for (const k of Object.keys(keyBinds)) {
        if (keysPressed.has(k)) {
            if (keyBinds[k].sf) keysPressed.delete(k);
            keyBinds[k].fn();
        }
    }
}

function gameLoop(currentTime) {
    // some physics lag prevention stuff
    // tl;dr: if a gameLoop takes more than PHYSICS_TICK_MS, it'll tick physics more than once during the frame to keep physics running at a predictable pace.
    // this also uncouples the physics code from the speed at which the user's monitor refreshes, so John on his shitty 60hz screen won't have a slower game than Joe on his 165hz.
    let deltaTime = currentTime - previousTime;
    previousTime = currentTime;
    accumulator += deltaTime;

    blank();
    processKeys();
    
    while (accumulator >= PHYSICS_TICK_MS) {
        framecount++;
        tickAll();
        accumulator -= PHYSICS_TICK_MS;
    }
    
    renderAll();
    window.requestAnimationFrame(gameLoop);
}

document.onkeydown = function (e) {
    keysPressed.add(e.key.toLowerCase());
    loadSounds();
}

document.onkeyup = function (e) {
    keysPressed.delete(e.key.toLowerCase());
    loadSounds();
}

scaleCanvas();
window.requestAnimationFrame(gameLoop);