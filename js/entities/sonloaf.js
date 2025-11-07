import { Item } from "./item.js";

export class SonLoaf extends Item {
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