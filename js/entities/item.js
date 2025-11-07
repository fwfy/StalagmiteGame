import { Entity } from "./index.js";

export class Item extends Entity {
	constructor(x, y, sprite, type = "item") {
		super(x, y, 25, 25, sprite, type)
		this.isItem = true;
	}
	action(ent) {
		// :D
	}
}