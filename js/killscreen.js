import { gameContext } from "./context.js";
import { Cutscene } from "./cutscene.js";
import { moveCamTo, camOffset } from "./util.js";

const killscreenSprite = new Image();
killscreenSprite.src = "assets/other/spike_transition.png";
const KILLSCREEN = [
    {
        duration: 100,
        func: e => {
            gameContext.ctx.drawImage(killscreenSprite, 0, -e * 16 + 800);
        }
    },
    {
        canProceedWhen: _ => true,
        func: _ => {
            moveCamTo(gameContext.activeLevel.originX, gameContext.activeLevel.originY);
            gameContext.ctx.drawImage(killscreenSprite, 0, -800);
            gameContext.player.visible = true;
        }
    },
    {
        duration: 100,
        func: e => {
            let { x: playerDrawX, y: playerDrawY } = camOffset(gameContext.activeLevel.originX, gameContext.activeLevel.originY)
            gameContext.ctx.drawImage(gameContext.player.spriteImg, playerDrawX, playerDrawY, gameContext.player.w, gameContext.player.h);
            gameContext.ctx.drawImage(killscreenSprite, 0, -e * 16 - 800);
        }
    }
]

export function triggerKillScreen() {
    new Cutscene(KILLSCREEN);
}