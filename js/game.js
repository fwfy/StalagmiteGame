const canvas = document.getElementById("game_canvas");
const ctx = canvas.getContext("2d");
let audioContext, gainNode;

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
        }, sf: true
    }
}

const keysPressed = new Set();

let ents = [];
let soundsLoaded = false;

function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

class GameObject {
    constructor(x, y) {
        this.x = x;
        this.y = y;
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
        ents.push(this);
    }
    draw() {
        let h = this.autoSize ? this.w * (this.spriteImg.height / this.spriteImg.width) : this.h;
        ctx.drawImage(this.spriteImg, this.x, this.y, this.w, h);
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
        playSound("dannytrack", 0.5);
    }
    tick() {
        this.w = Math.abs(Math.sin(framecount / 150)*100);
        this.x = ((canvas.clientWidth - this.w) / 2) + Math.sin(framecount / 5) * 10;
        this.y = ((canvas.clientHeight - this.w) / 2) + + Math.cos(framecount / 10) * 10;
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
    if(soundsLoaded) return;
    soundsLoaded = true;
    audioContext = new AudioContext();
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.1;
    for (const sound of Object.keys(sounds)) {
        sounds[sound].file = await getAudioFromFile(sounds[sound].path);
        console.log(`loaded sound ${sound}`, sounds[sound]);
    }
}

function playSound(sound) {
    if (!soundsLoaded) return console.log(`tried to play ${sound} but it's not loaded yet!!`);
    const trackSource = audioContext.createBufferSource();
    trackSource.buffer = sounds[sound].file;
    trackSource.connect(gainNode);
    trackSource.start();
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

function gameLoop() {
    framecount++;
    scaleCanvas();
    blank();
    tickAll();
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

gameLoop();