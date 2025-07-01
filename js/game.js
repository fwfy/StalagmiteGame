const canvas = document.getElementById("game_canvas");
const ctx = canvas.getContext("2d");

const PHYSICS_HZ = 160;
const PHYSICS_TICK_MS = 1000 / PHYSICS_HZ;
let debugging = true;

let audioContext, gainNode;
let accumulator = 0;
let previousTime = performance.now();
let queuedSounds = [];
let activeMenu;
let player;
let cutscene;

const MAN = new Image();
MAN.src = "assets/sprites/wtkim.jpg";

let sounds = {
    "dannytrack": {
        type: "music",
        path: "assets/music/dannytrack.mp3"
    },
    "itemget": {
        type: "sfx",
        path: "assets/sfx/itemget.mp3"
    },
    "jump": {
        type: "sfx",
        path: "assets/sfx/jump.mp3"
    }
}

const keyBinds = {
    "l": {
        fn: _ => {
            new Danny();
            delete keyBinds["l"];
        }, sf: true
    },
    "arrowup": {
        fn: _ => {
            if (activeMenu) {
                if (activeMenu.nav) activeMenu.nav(-1);
            }
        }, sf: true
    },
    "arrowdown": {
        fn: _ => {
            if (activeMenu) {
                if (activeMenu.nav) activeMenu.nav(1);
            }
        }, sf: true
    },
    "enter": {
        fn: _ => {
            if (activeMenu) {
                if (activeMenu.confirm) activeMenu.confirm();
            }
        }, sf: true
    },
    "y": {
        fn: _ => {
            // Since when did we have something assigned to the Y key....? I wonder what this does...
            eval(atob("TUFJTl9NRU5VX0xBWU9VVC5vcHRpb25zWyI/Pz8/Pz8/Pz8/Pz8/PyJdID0gXyA9PiB7CiAgICAgICAgICAgICAgICB3aW5kb3cuaGhoaCA9IDY4OwogICAgICAgICAgICAgICAgbWFudGltZSgpOwogICAgICAgICAgICB9"));
            delete keyBinds["y"];
        }, sf: true
    },
    "v": {
        fn: _ => {
            new SonLoaf(player.x+60, player.y);
        }, sf: true
    },
    " ": {
        fn: _ => {
            if (player) {
                player.jump();
            }
        }, sf: true
    },
    "s": {
        fn: _ => {
            if (player) {
                player.yv += 1;
            }
        }
    },
    "a": {
        fn: _ => {
            if (player) {
                player.xv += -0.20;
            }
        }
    },
    "d": {
        fn: _ => {
            if (player) {
                player.xv += 0.20;
            }
        }
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

const MAIN_MENU_LAYOUT = {
    "title": "Stalagmite Game",
    "defaultOption": "Begin Game",
    "options": {
        "Begin Game": _ => {
            activeMenu.dismiss();
            new Player();
        }
    }
}

async function mantime() {
    // Haha.. Heehee... Ahahaha.. Ahoo!!!! Oh wow ....
    // You shouldn't figure out how to trigger this.
    eval(atob("YXN5bmMgZnVuY3Rpb24gbSgpIHtpZighd2luZG93LmhoaGgpIHsgcmV0dXJuIGNvbnNvbGUubG9nKCJOYXVnaHR5IGxpdHRsZSBib3kuLi4gVGhhdCdzIG5vdCBob3cgdGhpcyB3b3Jrcy4gS2VlcCBkaWdnaW5nISIpIH1hY3RpdmVNZW51LmRpc21pc3MoKTsKICAgIGFjdGl2ZU1lbnUgPSB0cnVlOwogICAgd2luZG93Lnd0a2ltX3RpbWUgPSAxMDAwOwoJCXdpbmRvdy53dGtpbV9hY3RpdmF0ZWQgPSB0cnVlOwogICAgd2luZG93Lm9sZEJsYW5rID0gYmxhbms7CiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHsKICAgICAgICBmdW5jdGlvbiB3YWl0KCkgewogICAgICAgICAgICBpZiAoc291bmRzTG9hZGluZyB8fCAhc291bmRzTG9hZGVkKSB7CiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHdhaXQsIDEwKTsKICAgICAgICAgICAgfSBlbHNlIHsKICAgICAgICAgICAgICAgIHJlc29sdmUoKTsKICAgICAgICAgICAgfQogICAgICAgIH0KICAgICAgICB3YWl0KCk7CiAgICB9KSAvLyB3ZSBhd2FpdAogICAgc291bmRzTG9hZGVkID0gZmFsc2U7CiAgICBzb3VuZHNbInd0a2ltIl0gPSB7CiAgICAgICAgdHlwZTogIj8/PyIsCiAgICAgICAgcGF0aDogImFzc2V0cy9tdXNpYy93dGtpbS5tcDMiCiAgICB9CiAgICBhd2FpdCBsb2FkU291bmRzKCk7CiAgICBwbGF5U291bmQoInd0a2ltIik7CiAgICBibGFuayA9IF8gPT4gewogICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IDAuMDU7CiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICJibGFjayI7CiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIGNhbnZhcy5jbGllbnRXaWR0aCwgY2FudmFzLmNsaWVudEhlaWdodCk7CiAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gMTsKICAgICAgICBjdHguZHJhd0ltYWdlKGNhbnZhcywgLTUsIC01LCBjYW52YXMuY2xpZW50V2lkdGgrMTAsIGNhbnZhcy5jbGllbnRIZWlnaHQrMTApCiAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gTWF0aC5tYXgoMCwgd3RraW1fdGltZS0tIC8gMTAwMCk7CiAgICAgICAgY3R4LmRyYXdJbWFnZShNQU4sIDUwLCA1MCwgY2FudmFzLmNsaWVudFdpZHRoLTEwMCwgY2FudmFzLmNsaWVudEhlaWdodC0xMDApOwogICAgICAgIGlmICh3dGtpbV90aW1lIDw9IC0yNTApIHsKICAgICAgICAgICAgZGVsZXRlIE1BSU5fTUVOVV9MQVlPVVQub3B0aW9uc1siPz8/Pz8/Pz8/Pz8/Pz8iXTsKICAgICAgICAgICAgbmV3IE1lbnUoTUFJTl9NRU5VX0xBWU9VVCk7CiAgICAgICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IDE7CiAgICAgICAgICAgIGJsYW5rID0gd2luZG93Lm9sZEJsYW5rOwogICAgICAgICAgICBjb25zb2xlLmxvZygiTWFuIHRpbWUgaXMgb3ZlciIpOwogICAgICAgIH0KICAgIH19bSgp"));
}

class Cutscene {
    constructor() {
        cutscene = this;
        this.nextDuration = 1000;
    }
    draw() {
        // TODO: impl
    }
    end() {
        cutscene = false;
    }
}

class Menu {
    constructor(layout) {
        this.layout = layout;
        this.active = true;
        activeMenu = this;
        this.selected = 0;
        this.selectedFn = this.layout.options[this.layout.defaultOption];
    }
    dismiss() {
        this.active = false;
        activeMenu = false;
    }
    draw() {
        if (!this.active) return;
        let center_x = canvas.width / 2;
        let height = canvas.height;
        text(center_x, height * 0.3, this.layout.title, "white", 50, true);
        let pos = 1;
        for (const btn of Object.keys(this.layout.options)) {
            pos++;
            let isSelected = this.selected == pos - 2;
            if (isSelected) this.selectedFn = this.layout.options[btn];
            text(center_x, height * 0.35 + (1 + pos * 50), btn, isSelected ? "white" : "gray", 35, true);
        }
    }
    nav(offset) {
        this.selected += offset;
        if (this.selected < 0) {
            this.selected = Object.keys(this.layout.options).length - 1;
        } else if (this.selected > Object.keys(this.layout.options).length - 1) {
            this.selected = 0;
        }
    }
    confirm() {
        this.selectedFn();
    }
}

class GameObject {
    constructor(x, y) {
        this._x = x;
        this._y = y;
        this.createdAt = framecount;
    }
    get age() {
        return framecount - this.createdAt;
    }
    // everything below this line in the GameObject class is just for coordinate rounding
    // it makes the visuals look a lot smoother + supposedly it makes the game run faster?
    // idk. mdn said so and i trust mdn with my life
    set x(val) {
        this._x = Math.round(val);
    }
    set y(val) {
        this._y = Math.round(val);
    }
    get x() {
        return this._x;
    }
    get y() {
        return this._y;
    }
}

class Entity extends GameObject {
    constructor(x, y, w, h, sprite = "assets/sprites/theredone.png", type = "default") {
        super(x, y);
        this.setSprite(sprite);
        this.autoSize = !h;
        this.w = w;
        this.h = h;
        this.xv = 0;
        this.yv = 0;
        this.type = type;
        this.health = 100;
        this.sounds = [];
        ents.push(this);
    }
    draw() {
        ctx.drawImage(this.spriteImg, this.x, this.y, this.w, this.h);
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
        this.spriteImg.addEventListener("load", _ => this.sprLoaded());
    }
    tick() {
        this.x += this.xv;
        this.y += this.yv;
        if (this.x < 0) {
            this.x = 0;
            this.xv = 0;
        } else if (this.x + this.w > canvas.width) {
            this.x = canvas.width - this.w;
            this.xv = 0;
        }
        if (this.y == 0) {
            this.y = 0;
            this.yv = 0;
        } else if (this.y + this.h > canvas.height) {
            this.y = canvas.height - this.h;
            this.yv = 0;
        }
        this.yv += 0.25;
        this.yv *= 0.95;
        this.xv *= 0.95;
    }
    isCollidingWith(ent) {
        return this.x < ent.x + ent.w &&
            this.x + this.w > ent.x &&
            this.y < ent.y + ent.h &&
            this.y + this.h > ent.y;
    }
    isInBounds() {
        return this.isCollidingWith({
            x: 0,
            y: 0,
            w: canvas.width,
            h: canvas.height
        });
    }
    playSound(name) {
        playSound(name, this);
    }
    sprLoaded() {
        console.log("sprLoaded");
        if(this.autoSize) {
            this._h = this._w * (this.spriteImg.height / this.spriteImg.width);
        }
    }
    set w(val) {
        this._w = val;
        if(this.autoSize) {
            this._h = this._w * (this.spriteImg.height / this.spriteImg.width);
        }
    }
    set h(val) {
        this._h = val;
        if(!!val) this.autoSize = false;
    }
    get w() {
        return this._w;
    }
    get h() {
        return this._h;
    }
}

class Player extends Entity {
    constructor() {
        super(canvas.width / 2, canvas.height / 2, 30, null, "assets/sprites/player.png", "player");
        player = this;
        this.trollText = new Image();
        this.trollText.src = "assets/sprites/itsut.png";
        this.ttxo = 0;
        this.ttyo = 0;
    }
    draw() {
        super.draw();
        if (this.age < 1000 && this.age > 10) {
            if (Math.random() < 0.1) {
                this.ttxo = ((Math.random() * 5) - 2.5);
                this.ttyo = ((Math.random() * 5) - 2.5);
            }
            let x = (this.x - 200) + this.ttxo;
            let y = (this.y - 100) + this.ttyo;
            ctx.drawImage(this.trollText, x, y);
        }
    }
    jump() {
        let onGround = this.y == (canvas.height - this.h);
        if(onGround) {
            player.yv = -10;
            this.playSound("jump");
        }
    }
    tick() {
        super.tick();
        for(const ent of ents) {
            if(ent.isItem && this.isCollidingWith(ent)) {
                ent.action(this);
            }
        }
    }
}

class Item extends Entity {
    constructor(x, y, sprite, type = "item") {
        super(x, y, 25, 25, sprite, type)
        this.isItem = true;
    }
    action(ent) {
        // :D
    }
}

class SonLoaf extends Item {
    constructor(x, y) {
        super(x, y, "assets/sprites/sonloaf.png", "son_loaf")
        this.healthAdd = 10;
    }
    action(ent) {
        ent.health += this.healthAdd;
        this.remove();
        playSound("itemget");
    }
}

// const ball = new Item(1, 2)

class Danny extends Entity {
    constructor() {
        super(0, 0, 20);
        this.type = "DANNY";
        this.scaler = 150;
        this.oldGain = gainNode.gain.value;
        this.playSound("dannytrack");
        if (window.wtkim_activated) {
            this.setSprite("assets/sprites/wtkim.jpg");
        }
    }
    tick() {
        this.x = ((canvas.width - this.w) / 2) + (Math.sin(framecount / 5) * Math.max(0, this.scaler - 145));
        this.y = ((canvas.height - this.w) / 2) + Math.cos(framecount / 10) * 10;
        gainNode.gain.value = 0.1 * (this.w / 100);
        this.w = Math.abs(Math.sin(framecount / 150) * this.scaler);
        if (this.age > 1000) this.scaler++;
        if (this.age > 3000) {
            this.scaler = 150;
            this.w = canvas.width;
            this.autoSize = false;
            this.h = canvas.height;
            this.setSprite("assets/sprites/sonloaf.png");
        }
        if (this.age > 5000) {
            gainNode.gain.value = this.oldGain;
            blank = function () {
                ctx.fillStyle = "black";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
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
            /* for (let i = 0; i < a; i++) */ ctx.drawImage(canvas, -1, -1, canvas.width + 2, canvas.height + 2);
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

function text(x, y, text, color, size, center = true) {
    ctx.font = `${size ? size : 16}px sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = center ? "center" : "left";
    ctx.fillStyle = color;
    ctx.fillText(text, x, y + (size / 2));
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
    soundsLoading = false;
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
    ctx.globalAlpha = 1;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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

    if (cutscene) {
        if (cutscene.draw) cutscene.draw();
        processKeys();
    } else if (activeMenu) {
        if (activeMenu.draw) activeMenu.draw();
        processKeys();
        accumulator = 0;
    } else {
        if (accumulator > 20 * PHYSICS_TICK_MS) {
            accumulator = 20 * PHYSICS_TICK_MS; // if the user's pc is REALLY STRUGGLING to do physics, this will prevent it from entering a death spiral
            if (debugging) text(0, 15, "LAG!", "red", 15, false);
        } else {
            if (debugging) text(0, 15, `${accumulator.toFixed(0)}`, "red", 15, false);
        }
        while (accumulator >= PHYSICS_TICK_MS) {
            framecount++;
            processKeys();
            tickAll();
            accumulator -= PHYSICS_TICK_MS;
        }
    }

    renderAll();
    if (debugging) {
        text(0, 0, "DEBUG MODE", "red", 15, false);
    }
    window.requestAnimationFrame(gameLoop);
}

document.onkeydown = function (e) {
    keysPressed.add(e.key.toLowerCase());
    console.log(e.key);
    loadSounds();
}

document.onkeyup = function (e) {
    keysPressed.delete(e.key.toLowerCase());
    loadSounds();
}

// scaleCanvas();
canvas.width = 1500;
canvas.height = 800;
// new Menu(MAIN_MENU_LAYOUT);
new Player();
window.requestAnimationFrame(gameLoop);