import { gameContext } from "../context.js";
import { camOffset } from "../util.js";

export class GameObject {
	constructor(x, y) {
		this._x = x;
		this._y = y;
		this.createdAt = gameContext.framecount;
	}
	get age() {
		return gameContext.framecount - this.createdAt;
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

export class Entity extends GameObject {
	static allowedDecimalPlaces;
	static decimalFactor;
	static {
		this.allowedDecimalPlaces = 2;
		this.decimalFactor = 10 ** this.allowedDecimalPlaces;
	}
	constructor(x, y, w, h, sprite = "assets/sprites/theredone.png", type = "default") {
		super(x, y);
		this.setSprite(sprite);
		this.autoSize = !h;
		this.w = w;
		this.h = h;
		this._xv = 0;
		this._yv = 0;
		this.type = type;
		this._kill = false; // if this is true then the engine will discard the entity on the next frame
		this.health = 100;
		this.sounds = [];
		this.ignoreCamOffset = false;
		this.visible = true;
		gameContext.ents.push(this);
	}
	draw() {
		let { x, y } = this.ignoreCamOffset ? { x: this.x, y: this.y } : camOffset(this.x, this.y);
		gameContext.ctx.drawImage(this.spriteImg, x, y, this.w, this.h);
	}
	remove(unsafe_immediate = false) {
		for (const sound of this.sounds) {
			sound.stop();
		}
		if (unsafe_immediate) {
			gameContext.ents.splice(gameContext.ents.indexOf(this), 1);
		} else {
			this._kill = true;
		}
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
	set xv(val) {
		this._xv = Math.round(val * Entity.decimalFactor) / Entity.decimalFactor;
	}
	get xv() {
		return this._xv;
	}
	set yv(val) {
		this._yv = Math.round(val * Entity.decimalFactor) / Entity.decimalFactor;
	}
	get yv() {
		return this._yv;
	}
	tick() {
		// bounds
		if (this.x < gameContext.bounds.x) {
			this.x = gameContext.bounds.x;
			this.xv = 0;
		} else if (this.x + this.w > gameContext.bounds.x + gameContext.bounds.w) {
			this.x = gameContext.bounds.x + gameContext.bounds.w - this.w;
			this.xv = 0;
		}
		if (this.y < gameContext.bounds.y) {
			this.y = gameContext.bounds.y;
			this.yv = 0;
		} else if (this.y + this.h > gameContext.bounds.y + gameContext.bounds.h) {
			this.y = gameContext.bounds.y + gameContext.bounds.h - this.h;
			this.yv = 0;
		}

		// gravity + friction
		this.yv += 0.30;
		this.yv *= 0.95;
		this.xv *= 0.95;

		if (Math.abs(this.xv) < 0.05) this.xv = 0;
		if (Math.abs(this.yv) < 0.05) this.yv = 0;

		// ceiling collisions
		if (this.yv < 0) {
			const headProps = gameContext.activeLevel.getProps(this.coX, this.y);
			if (headProps.collision && !headProps.conditionalCollision) {
				this.yv = 0;
			}
		}

		// right & left collisions
		if (this.xv > 0) {
			const rightProps = gameContext.activeLevel.getProps(this.x + this.w, this.y + (this.h / 2));
			if (rightProps.collision) {
				this.xv = 0;
			}
		} else if (this.xv < 0) {
			const leftProps = gameContext.activeLevel.getProps(this.x, this.y + (this.h / 2));
			if (leftProps.collision) {
				this.xv = 0;
			}
		}

		// collision resolution (limited to 5 attempts)
		let attempts = 0;
		while (attempts++ < 5) {
			this.propsBelow = gameContext.activeLevel.getProps(this.coX, this.coY + 1);
			this.propsAt = gameContext.activeLevel.getProps(this.coX, this.coY);

			const checkX = this.coX + this.xv * 3;
			const checkY = this.coY + this.yv * 3;
			const checkXProps = gameContext.activeLevel.getProps(checkX, this.coY);
			const checkYProps = gameContext.activeLevel.getProps(this.coX, checkY);

			if (checkXProps.collision) {
				this.xv = 0;
			}
			if (checkYProps.collision && Math.abs(this.yv) > 1) {
				this.yv = 0;
			}

			if ((this.propsBelow.collision || checkXProps.conditionalCollision) && this.yv >= 0) {
				this.yv = 0;
				if (this.propsAt.collision) {
					this.y--;
					continue;
				}
			}
			break;
		}
		this.onGround = gameContext.activeLevel.getProps(this.coX, this.coY + 1).collision || this.coY + 1 >= gameContext.bounds.h;
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
		return this.isCollidingWith(gameContext.bounds);
	}
	playSound(name) {
		this.sounds.push(gameContext.audioManager.playSound(name));
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

