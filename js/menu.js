import { gameContext } from "./context.js";
import { blank, text } from "./util.js";

export class Menu {
	constructor(layout) {
		this.ctx = gameContext.ctx;
		this.layout = layout;
		this.active = true;
		gameContext.activeMenu = this;
		this.selected = 0;
		this.selectedFn = this.layout.options[this.layout.defaultOption];
		this.yOffset = 0;
		if (this.layout.title_img) {
			this.title_img = new Image();
			this.title_img.src = this.layout.title_img;
			this.title_img.onload = _ => this.titleImgLoaded();
		}
		if(this.layout.init) this.layout.init();
	}
	titleImgLoaded() {
		this.title_img_ratio = this.title_img.width / this.title_img.height;
	}
	dismiss() {
		this.active = false;
		gameContext.activeMenu = this.previousMenu || false;
	}
	draw() {
		if (!this.active) return;
		blank();
		let center_x = this.ctx.canvas.width / 2;
		let height = this.ctx.canvas.height;
		let scale = this.layout.title_animation ? this.layout.title_animation(gameContext.framecount) : 50;
		if (this.title_img) {
			this.ctx.drawImage(this.title_img, center_x - (scale * this.title_img_ratio / 2), (height * 0.3) + this.yOffset, scale * this.title_img_ratio, scale);
		} else {
			text(center_x, (height * 0.3) + this.yOffset, this.layout.title, "white", scale, true);
		}
		let pos = 1;
		for (const btn of Object.keys(this.layout.options)) {
			pos++;
			let isSelected = this.selected == pos - 2;
			if (isSelected) this.selectedFn = this.layout.options[btn];
			let btnY = (height * 0.35 + (1 + pos * 50)) + this.yOffset;
			if(isSelected) {
				this.yOffset += (100+(height*0.35) - btnY) / 5;
			}
			text(center_x, btnY, btn, isSelected ? "white" : "gray", 35 + (isSelected ? 5 : 0), true);
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
	openSubMenu(layout) {
		let menu = new Menu(layout);
		menu.previousMenu = this;
	}
	confirm() {
		this.selectedFn();
	}
}