const canvas = document.getElementById("game_canvas");
const ctx = canvas.getContext("2d");

const PHYSICS_HZ = 160;
const PHYSICS_TICK_MS = 1000 / PHYSICS_HZ;
let debugging = true;

let audioContext, gainNode;
let accumulator = 0;
let previousTime = performance.now();
let queuedSounds = [];
let soundsPlaying = [];
let started = false;
let bgImg = new Image();
let camera = {
    x: 0,
    y: 0
}
let bounds = {
    x: 0,
    y: 0,
    w: 100,
    h: 100
}
let activeMenu;
let activeLevel;
let activeCutscene;
let player;

const LEVEL_SEQUENCE = [
    "test",
    "test2"
];

let curr_level = 0;

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
    },
    "ooeeoo": {
        type: "music",
        path: "assets/music/miku_miku_oo_ee_oo.mp3"
    },
    "title": {
        type: "music",
        path: "assets/music/title.mp3",
        loop: true
    }
}

const keyBinds = {
    "l": {
        fn: _ => {
            if (!debugging) return;
            new Danny();
            delete keyBinds["l"];
        }, sf: true
    },
    "arrowup": {
        fn: _ => {
            if (activeMenu) {
                if (debugging) keyBinds["arrowup"].sf = true;
                if (activeMenu.nav) activeMenu.nav(-1);
            } else if (debugging) {
                keyBinds["arrowup"].sf = false;
                camera.y--;
            }
        }, sf: true
    },
    "arrowdown": {
        fn: _ => {
            if (activeMenu) {
                if (debugging) keyBinds["arrowup"].sf = true;
                if (activeMenu.nav) activeMenu.nav(1);
            } else if (debugging) {
                keyBinds["arrowdown"].sf = false;
                camera.y++;
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
            if (!debugging) return;
            new SonLoaf(player.x + 60, player.y);
        }, sf: true
    },
    "m": {
        fn: _ => {
            if (!debugging) return;
            new Miku();
            playSound("ooeeoo");
        }, sf: true
    },
    "t": {
        fn: _ => {
            for (const sound of soundsPlaying) {
                sound.stop();
            }
        }, sf: true
    },
    "c": {
        fn: _ => {
            if (!debugging) return;
            new Cutscene(TEST_CUTSCENE);
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
    },
    "z": {
        fn: _ => {
            debugger;
        }, sf: true
    },
    "arrowleft": {
        fn: _ => {
            if (debugging) camera.x--;
        }
    },
    "arrowright": {
        fn: _ => {
            if (debugging) camera.x++;
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
    "title_img": "assets/other/title.png",
    "title_animation": e => { return Math.max(1, 50 + (5 * Math.sin(e / 90))) },
    "defaultOption": "Begin Game",
    "options": {
        "Begin Game": _ => {
            for (const sound of soundsPlaying) {
                sound.stop();
            }
            queuedSounds = [];
            activeMenu.dismiss();
            new Level();
        }
    }
}

async function mantime() {
    // Haha.. Heehee... Ahahaha.. Ahoo!!!! Oh wow ....
    // You shouldn't figure out how to trigger this.
    eval(atob("YXN5bmMgZnVuY3Rpb24gbSgpIHtpZighd2luZG93LmhoaGgpIHsgcmV0dXJuIGNvbnNvbGUubG9nKCJOYXVnaHR5IGxpdHRsZSBib3kuLi4gVGhhdCdzIG5vdCBob3cgdGhpcyB3b3Jrcy4gS2VlcCBkaWdnaW5nISIpIH1hY3RpdmVNZW51LmRpc21pc3MoKTsKICAgIGFjdGl2ZU1lbnUgPSB0cnVlOwogICAgd2luZG93Lnd0a2ltX3RpbWUgPSAxMDAwOwoJCXdpbmRvdy53dGtpbV9hY3RpdmF0ZWQgPSB0cnVlOwogICAgd2luZG93Lm9sZEJsYW5rID0gYmxhbms7CiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHsKICAgICAgICBmdW5jdGlvbiB3YWl0KCkgewogICAgICAgICAgICBpZiAoc291bmRzTG9hZGluZyB8fCAhc291bmRzTG9hZGVkKSB7CiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHdhaXQsIDEwKTsKICAgICAgICAgICAgfSBlbHNlIHsKICAgICAgICAgICAgICAgIHJlc29sdmUoKTsKICAgICAgICAgICAgfQogICAgICAgIH0KICAgICAgICB3YWl0KCk7CiAgICB9KSAvLyB3ZSBhd2FpdAogICAgc291bmRzTG9hZGVkID0gZmFsc2U7CiAgICBzb3VuZHNbInd0a2ltIl0gPSB7CiAgICAgICAgdHlwZTogIj8/PyIsCiAgICAgICAgcGF0aDogImFzc2V0cy9tdXNpYy93dGtpbS5tcDMiCiAgICB9CiAgICBhd2FpdCBsb2FkU291bmRzKCk7CiAgICBwbGF5U291bmQoInd0a2ltIik7CiAgICBibGFuayA9IF8gPT4gewogICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IDAuMDU7CiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICJibGFjayI7CiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIGNhbnZhcy5jbGllbnRXaWR0aCwgY2FudmFzLmNsaWVudEhlaWdodCk7CiAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gMTsKICAgICAgICBjdHguZHJhd0ltYWdlKGNhbnZhcywgLTUsIC01LCBjYW52YXMuY2xpZW50V2lkdGgrMTAsIGNhbnZhcy5jbGllbnRIZWlnaHQrMTApCiAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gTWF0aC5tYXgoMCwgd3RraW1fdGltZS0tIC8gMTAwMCk7CiAgICAgICAgY3R4LmRyYXdJbWFnZShNQU4sIDUwLCA1MCwgY2FudmFzLmNsaWVudFdpZHRoLTEwMCwgY2FudmFzLmNsaWVudEhlaWdodC0xMDApOwogICAgICAgIGlmICh3dGtpbV90aW1lIDw9IC0yNTApIHsKICAgICAgICAgICAgZGVsZXRlIE1BSU5fTUVOVV9MQVlPVVQub3B0aW9uc1siPz8/Pz8/Pz8/Pz8/Pz8iXTsKICAgICAgICAgICAgbmV3IE1lbnUoTUFJTl9NRU5VX0xBWU9VVCk7CiAgICAgICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IDE7CiAgICAgICAgICAgIGJsYW5rID0gd2luZG93Lm9sZEJsYW5rOwogICAgICAgICAgICBjb25zb2xlLmxvZygiTWFuIHRpbWUgaXMgb3ZlciIpOwogICAgICAgIH0KICAgIH19bSgp"));
}

const TEST_CUTSCENE = [
    {
        duration: 1000,
        func: _ => {
            camera.x += 2;
        }
    },
    {
        duration: 500,
    },
    {
        duration: 800,
        func: _ => {
            camera.x *= 0.99;
        },
        canProceedWhen: _ => camera.x <= player.x
    }
]

class Cutscene {
    constructor(script) {
        activeCutscene = this;
        this.script = script;
        this.pos = 0;
        this.counter = 0;
    }
    draw() {
        let instruction = this.script[this.pos];
        if (instruction.func) instruction.func(this.counter);
        this.counter++;
        if (instruction.canProceedWhen) {
            if (instruction.canProceedWhen(this.counter)) {
                this.pos++;
                this.counter = 0;
            }
        } else if (this.counter > instruction.duration) {
            this.pos++;
            this.counter = 0;
        }
        if (this.pos > this.script.length - 1) {
            this.end();
        }
    }
    end() {
        activeCutscene = false;
        debugger;
    }
}

class Menu {
    constructor(layout) {
        this.layout = layout;
        this.active = true;
        activeMenu = this;
        this.selected = 0;
        this.selectedFn = this.layout.options[this.layout.defaultOption];
        if (this.layout.title_img) {
            this.title_img = new Image();
            this.title_img.src = this.layout.title_img;
            this.title_img.onload = _ => this.titleImgLoaded();
        }
    }
    titleImgLoaded() {
        this.title_img_ratio = this.title_img.width / this.title_img.height;
    }
    dismiss() {
        this.active = false;
        activeMenu = false;
    }
    draw() {
        if (!this.active) return;
        let center_x = canvas.width / 2;
        let height = canvas.height;
        let scale = this.layout.title_animation ? this.layout.title_animation(framecount) : 50;
        if (this.title_img) {
            ctx.drawImage(this.title_img, center_x - (scale * this.title_img_ratio / 2), height * 0.3, scale * this.title_img_ratio, scale);
        } else {
            text(center_x, height * 0.3, this.layout.title, "white", scale, true);
        }
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
        this._kill = false; // if this is true then the engine will discard the entity on the next frame
        this.health = 100;
        this.sounds = [];
        this.ignoreCamOffset = false;
        ents.push(this);
    }
    draw() {
        let { x, y } = this.ignoreCamOffset ? { x: this.x, y: this.y } : camOffset(this.x, this.y);
        ctx.drawImage(this.spriteImg, x, y, this.w, this.h);
    }
    remove() {
        for (const sound of this.sounds) {
            sound.stop();
        }
        this._kill = true;
    }
    setSprite(spr) {
        if (this.sprite == spr) return;
        this.sprite = spr;
        this.spriteImg = new Image();
        this.spriteImg.src = this.sprite;
        this.spriteImg.addEventListener("load", _ => this.sprLoaded());
    }
    get coX() {
        return this.x + this.w / 2;
    }
    get coY() {
        return this.y + this.h;
    }
    tick() {
        // bounds
        if (this.x < bounds.x) {
            this.x = bounds.x;
            this.xv = 0;
        } else if (this.x + this.w > bounds.x + bounds.w) {
            this.x = bounds.x + bounds.w - this.w;
            this.xv = 0;
        }
        if (this.y < bounds.y) {
            this.y = bounds.y;
            this.yv = 0;
        } else if (this.y + this.h > bounds.y + bounds.h) {
            this.y = bounds.y + bounds.h - this.h;
            this.yv = 0;
        }

        // gravity + friction
        this.yv += 0.25;
        this.yv *= 0.97;
        this.xv *= 0.97;

        if (Math.abs(this.xv) < 0.05) this.xv = 0;
        if (Math.abs(this.yv) < 0.05) this.yv = 0;

        // ceiling collisions
        if (this.yv < 0) {
            const headProps = activeLevel.getProps(this.coX, this.y);
            if (headProps.collision) {
                this.yv = 0;
            }
        }

        // right & left collisions
        if (this.xv > 0) {
            const rightProps = activeLevel.getProps(this.x + this.w, this.y + (this.h / 2));
            if (rightProps.collision) {
                this.xv = 0;
            }
        } else if (this.xv < 0) {
            const leftProps = activeLevel.getProps(this.x, this.y + (this.h / 2));
            if (leftProps.collision) {
                this.xv = 0;
            }
        }

        // collision resolution (limited to 5 attempts)
        let attempts = 0;
        while (attempts++ < 5) {
            this.propsBelow = activeLevel.getProps(this.coX, this.coY + 1);
            this.propsAt = activeLevel.getProps(this.coX, this.coY);

            if (this.propsBelow.slope) {
                let slopeAttempts = 0;
                while (slopeAttempts++ < 10) {
                    let slopeProps = activeLevel.getProps(this.coX, this.coY - slopeAttempts);
                    if (slopeProps.slope) {
                        this.y--;
                    } else {
                        break;
                    }
                }
                this.y++;
                attempts = 10;
                continue;
            } else {
                const checkX = this.coX + this.xv * 3;
                const checkY = this.coY + this.yv * 3;

                const checkXProps = activeLevel.getProps(checkX, this.coY);
                const checkYProps = activeLevel.getProps(this.coX, checkY);

                if (checkXProps.collision && !checkXProps.slope) {
                    this.xv = 0;
                }
                if (checkYProps.collision && Math.abs(this.yv) > 1 && !checkYProps.slope) {
                    this.yv = 0;
                }
            }

            if (this.propsBelow.collision && this.yv >= 0 && !this.propsBelow.slope) {
                this.yv = 0;
                if (this.propsAt.collision) {
                    this.y--;
                    continue;
                }
            }
            break;
        }
        this.onGround = activeLevel.getProps(this.coX, this.coY + 1).collision || this.coY + 1 >= bounds.h;
        this.x += this.xv;
        this.y += this.yv;
    }
    isCollidingWith(ent) {
        return this.x < ent.x + ent.w &&
            this.x + this.w > ent.x &&
            this.y < ent.y + ent.h &&
            this.y + this.h > ent.y;
    }
    isInBounds() {
        return this.isCollidingWith(bounds);
    }
    playSound(name) {
        playSound(name, this);
    }
    sprLoaded() {
        console.log("sprLoaded");
        if (this.autoSize) {
            this._h = this._w * (this.spriteImg.height / this.spriteImg.width);
        }
    }
    set w(val) {
        this._w = val;
        if (this.autoSize) {
            this._h = this._w * (this.spriteImg.height / this.spriteImg.width);
        }
    }
    set h(val) {
        this._h = val;
        if (!!val) this.autoSize = false;
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
        super(canvas.width / 2, canvas.height / 2, 50, null, "assets/sprites/stalagmite.png", "player");
        player = this;
        this.jumpState = 0;
        this.ignoreCamOffset = false;
        this.onGround = false;
    }
    draw() {
        if (!activeCutscene) moveCamTo(this.x, this.y);
        super.draw();
    }
    jump() {
        if (this.onGround) {
            this.y--;
            this.jumpState = 1;
            this.yv = -15;
            this.playSound("jump");
        } else if (!this.onGround && this.jumpState == 1) {
            this.xv *= 2.5;
            this.yv = -15;
            this.jumpState = 2;
        }
    }
    tick() {
        if (!activeLevel) return;
        super.tick();
        if (this.onGround) this.jumpState = 0;
        for (const ent of ents.filter(e => e.isItem)) {
            if (this.isCollidingWith(ent)) {
                ent.action(this);
            }
        }
        if (debugging) {
            let dbgInfo = {
                onGround: this.onGround,
                jumpState: this.jumpState,
                xv: this.xv,
                yv: this.yv
            }
            let i = 0;
            for (const prop of Object.keys(this.propsBelow)) {
                text(0, 50 + (15 * i), `${prop}: ${this.propsBelow[prop]}`, "red", 15, false);
                i++;
            }
            for (const prop of Object.keys(dbgInfo)) {
                text(0, 50 + (15 * i), `${prop}: ${dbgInfo[prop]}`, "cyan", 15, false);
                i++;
            }
        }
        if (this.propsAt.goal) {
            activeLevel.next();
            this.remove();
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

class Miku extends Item {
    constructor() {
        super(Math.random() * canvas.width, 10, "assets/sprites/miku.webp", "miku");
    }
    action(ent) {
        new Miku();
        new Miku();
        // playSound("ooeeoo");
        this.remove();
    }
}

// const ball = new Item(1, 2)

class Danny extends Entity {
    constructor() {
        super(10, 10, 20);
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

class Level {
    constructor(name = "test") {
        this.name = name;
        this._levelBgReady = false;
        this._propmapReady = false;
        this.levelBg = new Image();
        this.levelBg.src = `assets/levels/${name}/level.png`;
        this.levelBg.onload = _ => this.levelBgLoaded();
        this.propmapImg = new Image();
        this.propmapImg.src = `assets/levels/${name}/propmap.png`;
        this.propmapImg.onload = _ => this.propmapLoaded();
        this.propmapCanvas = document.createElement("canvas");
        this.propmapCtx = this.propmapCanvas.getContext("2d");
        this.originX = 0;
        this.originY = 0;
    }
    levelBgLoaded() {
        bgImg = this.levelBg;
        console.log("levelbg is loaded");
        bounds.x = 0;
        bounds.y = 0;
        bounds.w = bgImg.width;
        bounds.h = bgImg.height;
        this._levelBgReady = true;
        this.checkReady();
    }
    propmapLoaded() {
        this.propmapCanvas.width = this.propmapImg.width;
        this.propmapCanvas.height = this.propmapImg.height;
        this.propmapCtx.drawImage(this.propmapImg, 0, 0);
        this.propmapData = this.propmapCtx.getImageData(0, 0, this.propmapImg.width, this.propmapImg.height);
        this.propmap = this.propmapData.data;
        for (let i = 0; i < this.propmap.length; i += 4) {
            let isOrigin = this.propmap[i] == 0 && this.propmap[i + 1] == 255 && this.propmap[i + 2] == 255;
            if (isOrigin) {
                let pixelIndex = i / 4;
                this.originX = pixelIndex % this.propmapData.width;
                this.originY = Math.floor(pixelIndex / this.propmapData.width);
                console.log(`found level origin for ${this.name} @ X: ${this.originX}, Y: ${this.originY}`);
                break;
            }
        }
        console.log("propmap is loaded");
        this._propmapReady = true;
        this.checkReady();
    }
    checkReady() {
        if (this._levelBgReady && this._propmapReady) {
            this.levelReady();
        }
    }
    levelReady() {
        new Player();
        player.x = this.originX;
        player.y = this.originY;
        activeLevel = this;
        console.log(`level ${this.name} finished loading`);
    }
    getProps(x, y) {
        x = Math.floor(x);
        y = Math.floor(y);
        if (debugging) {
            let { x: plotX, y: plotY } = camOffset(x, y);
            rect(plotX, plotY, 5, 5, "green");
        }
        const index = (y * this.propmapImg.width + x) * 4;
        return {
            collision: this.propmap[index] == 255 || typeof this.propmap[index] == "undefined",
            conditionalCollision: this.propmap[index] == 255 && this.propmap[index + 1] == 255 && this.propmap[index + 2] == 0,
            goal: this.propmap[index] == 0 && this.propmap[index + 1] == 255 && this.propmap[index + 2] == 0,
            slope: this.propmap[index] == 255 && this.propmap[index + 1] == 0 && this.propmap[index + 2] == 255,
            rawR: this.propmap[index],
            rawG: this.propmap[index + 1],
            rawB: this.propmap[index + 2]
        }
    }
    next() {
        curr_level++;
        return new Level(LEVEL_SEQUENCE[curr_level]);
    }
}

let framecount = 0;

async function getAudioFromFile(filepath) {
    const response = await fetch(filepath);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
}

function camOffset(x, y) {
    return { x: x - camera.x + canvas.width / 2, y: y - camera.y + canvas.height / 2 };
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
    let soundPromises = [];
    soundsLoading = true;
    audioContext = new AudioContext();
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.1;
    for (const sound of Object.keys(sounds)) {
        soundPromises.push(getAudioFromFile(sounds[sound].path).then(data => {
            sounds[sound].file = data;
            sounds[sound].loaded = true;
            for (const queued of queuedSounds) {
                if (queued.sound != sound) continue;
                console.log(queued, sound);
                console.log(`playing queued sound ${queued.sound}`);
                playSound(queued.sound, queued.sourceEnt);
            }
        }));
        console.log(`began loading sound ${sound}`);
    }
    await Promise.all(soundPromises);
    console.log(`finished loading all sounds`);
    soundsLoaded = true;
    soundsLoading = false;
}

function playSound(sound, sourceEnt) {
    if (!sounds[sound]?.loaded) {
        queuedSounds.push({ sound, sourceEnt });
        return console.log(`queueing ${sound} because sounds aren't finished loading yet`);
    }
    const trackSource = audioContext.createBufferSource();
    trackSource.buffer = sounds[sound].file;
    trackSource.connect(gainNode);
    trackSource.start();
    trackSource.loop = !!sounds[sound].loop;
    soundsPlaying.push(trackSource);
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
    if (bgImg.width > 0 && !activeMenu) {
        let { x, y } = camOffset(0, 0);
        ctx.drawImage(bgImg, x, y);
        if (debugging) {
            let { x: boundX, y: boundY } = camOffset(bounds.x, bounds.y);
            ctx.strokeStyle = "red";
            ctx.strokeRect(boundX, boundY, bounds.w, bounds.h);
        }
    }
}

function moveCamTo(targetX, targetY) {
    let halfW = canvas.width / 2;
    let halfH = canvas.height / 2;
    camera.x = Math.max(halfW, Math.min(bgImg.width - halfW, targetX));
    camera.y = Math.max(halfH, Math.min(bgImg.height - halfH, targetY));
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
            keyBinds[k].fn();
            if (keyBinds[k]?.sf) keysPressed.delete(k);
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

    ents = ents.filter(e => !e._kill); // remove all entities marked for deletion

    blank();

    if (activeCutscene) {
        if (activeCutscene.draw) activeCutscene.draw();
        processKeys();
        accumulator = 0;
    } else if (activeMenu) {
        if (activeMenu.draw) activeMenu.draw();
        framecount++;
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
    if (ents.length < 1000) window.requestAnimationFrame(gameLoop);
}

function startGameOnKeypress() {
    if (started) return;
    started = true;
    keysPressed.clear();
    new Menu(MAIN_MENU_LAYOUT);
    window.requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", function (e) {
    startGameOnKeypress();
    console.log(e.key);
    keysPressed.add(e.key.toLowerCase());
    loadSounds();
});

document.addEventListener("keyup", function (e) {
    keysPressed.delete(e.key.toLowerCase());
    // startGameOnKeypress();
    loadSounds();
});

document.addEventListener("mousedown", function (e) {
    loadSounds();
    startGameOnKeypress();
});

// scaleCanvas();
canvas.width = 1500;
canvas.height = 800;

playSound("title");
blank();
text(canvas.width / 2, canvas.height / 2, "Press any key to start...", "white", 60, true);