import {GameSystem} from "@lib/ecs/gameSystem";
import {GameRenderSystem} from "@lib/ecs/gameRenderSystem";
import {GameEntity} from "@lib/ecs/gameEntity";
import {Camera} from "@lib/rendering/rayCaster/camera";
import {CameraSystem} from "@lib/ecs/system/entity/cameraSystem";
import {InteractionSystem} from "@lib/ecs/system/entity/interactionSystem";
import {PickUpDropSystem} from "@lib/ecs/system/entity/pickUpDropSystem";
import {GameEntityRegistry} from "@lib/registries/gameEntityRegistry";
import {WidgetManager} from "@lib/ui/widgetManager";
import {RepairSystem} from "../system/repairSystem";
import {DrillSystem} from "../system/drillSystem";
import {Performance} from "@lib/rendering/rayCaster/performance";
import {InventoryComponent} from "@lib/ecs/components/inventoryComponent";
import {CameraComponent} from "@lib/ecs/components/cameraComponent";
import {VelocityComponent} from "@lib/ecs/components/velocityComponent";
import {GlobalState} from "@lib/application/globalState";
import {isKeyDown, KeyboardInput} from "@lib/input/keyboard";
import {DrillingActionComponent} from "../components/drillingActionComponent";
import {InteractingActionComponent} from "@lib/ecs/components/interactions/interactingActionComponent";
import {MouseButton} from "@lib/input/mouse";
import {Widget} from "@lib/ui/widget";
import {GameEntityBuilder} from "@lib/ecs/gameEntityBuilder";
import {DrillComponent} from "../components/drillComponent";
import {InventorySpriteComponent} from "../components/inventorySpriteComponent";
import {Sprite} from "@lib/rendering/sprite";
import {HoldingSpriteComponent} from "@lib/ecs/components/holdingSpriteComponent";
import {RepairComponent} from "../components/repairComponent";
import {Renderer} from "@lib/rendering/renderer";
import {Colors} from "@lib/utils/colorUtils";
import {Color} from "@lib/primatives/color";
import {Fonts} from "../fonts";
import {AudioManager} from "@lib/audio/audioManager";
import {Timer} from "@lib/utils/timerUtils";
import {BuildingComponent} from "../components/buildingComponent";
import {BuildActionComponent} from "@lib/ecs/components/interactions/buildActionComponent";
import {ConstructionSystem} from "../system/constructionSystem";
import {logger, LogType} from "@lib/utils/loggerUtils";


export class GameScreenBase {

    protected _walkSound: string;
    protected _moveSpeed: number = 0.05;
    protected _gameEntityRegistry: GameEntityRegistry = GameEntityRegistry.getInstance();
    protected _gameSystems: Array<GameSystem> = [];
    protected _renderSystems: Array<GameRenderSystem> = [];
    protected _postRenderSystems: Array<GameRenderSystem> = [];
    protected _player: GameEntity;
    protected _camera: Camera;
    protected _moveSway: number = 0;
    protected _updateSway: boolean = false;
    protected _lastXPos: number;
    protected _lastYPos: number;
    protected _moves: number = 0;
    protected _widgetManager: WidgetManager = new WidgetManager();
    protected _openButtons: Array<Widget> = [];
    protected _requiresPower: Array<GameEntity> = [];
    protected _useTool: boolean = false;
    protected _translationTable: Map<number, GameEntity> = new Map<number, GameEntity>();
    private _walkTimer: Timer = new Timer(120);


    constructor() {

        this.registerSystems([
            new CameraSystem(),
            new InteractionSystem(),
            new PickUpDropSystem(),
            new RepairSystem(),
            new DrillSystem(),
            new ConstructionSystem()
            //   new SuitSystem(),
            //   new HealthSystem()
        ]);

        AudioManager.register("drill", require("../../assets/sound/drill.wav"));

        logger(LogType.INFO, "Systems registered")
    }

    sway(): void {
        if (!this._updateSway) {

            let sway: number = this._moveSway % (Math.PI * 2);
            let diff: number = 0;
            if (sway - Math.PI <= 0) {
                diff = -Math.PI / 30;
            } else {
                diff = Math.PI / 30;
            }

            if (sway + diff < 0 || sway + diff > Math.PI * 2) {
                this._moveSway -= sway;
            } else {
                this._moveSway += diff;
            }
            return;
        }

        if (this._moves > 1) {
            this._moveSway += Math.PI / 25;
            this._moveSway %= Math.PI * 8;
        }

    }

    keyboard(): void {

        let moveSpeed: number = this._moveSpeed * Performance.deltaTime;
        let moveX: number = 0;
        let moveY: number = 0;

        let player: GameEntity = this._gameEntityRegistry.getSingleton("player");
        let inventory: InventoryComponent = player.getComponent("inventory") as InventoryComponent;
        let camera: CameraComponent = player.getComponent("camera") as CameraComponent;

        let velocity: VelocityComponent = player.getComponent("velocity") as VelocityComponent;


        if (isKeyDown(KeyboardInput.ONE)) {
            inventory.currentItemIdx = 0;
            this.closeButtons();
        }

        if (isKeyDown(KeyboardInput.TWO)) {
            inventory.currentItemIdx = 1;
            this.closeButtons();
        }

        if (isKeyDown(KeyboardInput.THREE)) {
            inventory.currentItemIdx = 2;
            this.closeButtons();
        }

        if (isKeyDown(KeyboardInput.FOUR)) {
            inventory.currentItemIdx = 3;
            this.closeButtons();
        }

        if (isKeyDown(KeyboardInput.FIVE)) {
            inventory.currentItemIdx = 4;
            this.closeButtons();
        }

        if (isKeyDown(KeyboardInput.SIX)) {
            inventory.currentItemIdx = 5;
            this.closeButtons();
        }

        if (isKeyDown(KeyboardInput.UP)) {
            moveX += camera.xDir;
            moveY += camera.yDir;
            this._updateSway = true;
            this._moves++;
            this.closeButtons();
            if (this._walkTimer.isTimePassed()) {
                this._walkTimer.reset();
                AudioManager.play(this._walkSound);
            }
        }

        if (isKeyDown(KeyboardInput.DOWN)) {
            moveX -= camera.xDir;
            moveY -= camera.yDir;
            this._updateSway = true;
            this._moves++;
            this.closeButtons();

            if (this._walkTimer.isTimePassed()) {
                this._walkTimer.reset();
                AudioManager.play(this._walkSound);
            }

        }

        if (isKeyDown(KeyboardInput.LEFT)) {
            velocity.rotateLeft = true;
            this.closeButtons();
        }

        if (isKeyDown(KeyboardInput.RIGHT)) {
            velocity.rotateRight = true;
            this.closeButtons();
        }

        if (isKeyDown(KeyboardInput.SPACE)) {

            let inventory: InventoryComponent = this._player.getComponent("inventory") as InventoryComponent;
            let holdingItem: GameEntity = inventory.getCurrentItem();


            if (holdingItem.hasComponent("drill")) {
                player.addComponent(new DrillingActionComponent())
                AudioManager.play("drill");
                player.addComponent(new InteractingActionComponent())
            } else {
                player.addComponent(new InteractingActionComponent())
            }

            this._useTool = true;
        }

        if (isKeyDown(KeyboardInput.SHIFT)) {
            moveX *= moveSpeed * 2;
            moveY *= moveSpeed * 2;
        } else {
            moveX *= moveSpeed;
            moveY *= moveSpeed;
        }

        velocity.velX = moveX;
        velocity.velY = moveY;


        this._lastXPos = this._camera.xPos;
        this._lastYPos = this._camera.yPos;

    }

    logicLoop(): void {

        this.keyboard();

        let player: GameEntity = this._gameEntityRegistry.getSingleton("player");

        this._gameSystems.forEach((gameSystem: GameSystem) => {
            gameSystem.processEntity(player)
        });


        if (!this._camera) {
            return;
        }

        if (this._camera.xPos == this._lastXPos && this._camera.yPos == this._lastYPos) {
            this._updateSway = false;
            this._moves = 0;
        }
    }

    mouseClick(x: number, y: number, mouseButton: MouseButton): void {
        this._widgetManager.mouseClick(x, y, mouseButton);
    }

    mouseMove(x: number, y: number): void {
        this._widgetManager.mouseMove(x, y);
    }

    closeButtons(): void {
        this._openButtons.forEach((widget: Widget) => {
            this._widgetManager.delete(widget.id);
        });
    }


    createInventory(): InventoryComponent {
        let inventory: InventoryComponent = new InventoryComponent(6);

        let drill: GameEntity = new GameEntityBuilder("drill")
            .addComponent(new DrillComponent(10))
            .addComponent(new InventorySpriteComponent(new Sprite(0, 0, require("../../assets/images/tools/drillInventory.png"))))
            .addComponent(new HoldingSpriteComponent(new Sprite(0, 0, require("../../assets/images/tools/drill.png"))))
            .build();

        let wrench: GameEntity = new GameEntityBuilder("wrench")
            .addComponent(new RepairComponent(50))
            .addComponent(new InventorySpriteComponent(new Sprite(0, 0, require("../../assets/images/tools/wrenchInventory.png"))))
            .addComponent(new HoldingSpriteComponent(new Sprite(0, 0, require("../../assets/images/tools/wrench.png"))))
            .build();


        let hammer: GameEntity = new GameEntityBuilder("hammer")
            .addComponent(new DrillComponent(50))
            .addComponent(new InventorySpriteComponent(new Sprite(0, 0, require("../../assets/images/tools/hammerInventory.png"))))
            .addComponent(new HoldingSpriteComponent(new Sprite(0, 0, require("../../assets/images/tools/hammer.png"))))
            .build()

        let building: GameEntity = new GameEntityBuilder("building")
            .addComponent(new BuildingComponent())
            .addComponent(new InventorySpriteComponent(new Sprite(0, 0, require("../../assets/images/tools/buildingInventory.png"))))
            .addComponent(new HoldingSpriteComponent(new Sprite(0, 0, require("../../assets/images/tools/building.png"))))
            .build()

        inventory.addItem(drill);
        inventory.addItem(wrench);
        //  inventory.addItem(hammer);
        //   inventory.addItem(building);


        return inventory;
    }


    holdingItem(): void {

        if (!this._player) {
            return;
        }

        let inventory: InventoryComponent = this._player.getComponent("inventory") as InventoryComponent;
        let holdingItem: GameEntity = inventory.getCurrentItem();

        if (holdingItem) {

            let xOffset: number = Math.sin(this._moveSway / 2) * 40,
                yOffset: number = Math.cos(this._moveSway) * 30;

            let holdingItemSprite: HoldingSpriteComponent = holdingItem.getComponent("holdingSprite") as HoldingSpriteComponent;
            holdingItemSprite.sprite.render(280 + xOffset, 110 + yOffset, 512, 512);
        }

    }

    addEntity(id: number, gameEntity): void {
        this._translationTable.set(id, gameEntity);
        this._gameEntityRegistry.register(gameEntity);
    }

    wideScreen(): void {
        Renderer.rect(0, 0, Renderer.getCanvasWidth(), 40, Colors.BLACK());


        Renderer.rect(0, Renderer.getCanvasHeight() - 60, Renderer.getCanvasWidth(), 40, Colors.BLACK());

        let offsetX: number = 550;
        let offsetY: number = 70;

        let inventory: InventoryComponent = this._player.getComponent("inventory") as InventoryComponent;
        let inventoryBoxSize: number = 32;

        for (let i: number = 0; i < inventory.maxItems; i++) {

            if (i == inventory.currentItemIdx) {
                Renderer.rect(offsetX - 1, Renderer.getCanvasHeight() - (offsetY + 1), inventoryBoxSize + 2, inventoryBoxSize + 2, Colors.WHITE());
            } else {
                Renderer.rect(offsetX - 1, Renderer.getCanvasHeight() - (offsetY + 1), inventoryBoxSize + 2, inventoryBoxSize + 2, Colors.BLACK());
            }

            Renderer.rect(offsetX, Renderer.getCanvasHeight() - offsetY, inventoryBoxSize, inventoryBoxSize, new Color(190, 190, 190, 0.45));

            if (inventory.inventory[i] != null) {
                let inventorySprite: InventorySpriteComponent = inventory.inventory[i].getComponent("inventorySprite") as InventorySpriteComponent;
                Renderer.renderImage(inventorySprite.sprite.image, offsetX, Renderer.getCanvasHeight() - offsetY, inventoryBoxSize - 4, inventoryBoxSize - 4);
            }

            offsetX += inventoryBoxSize + 6;
        }


        //   this.debug();
    }


    debug(): void {
        Renderer.print(`X: ${this._camera.xPos} Y: ${this._camera.yPos}`, 10, 20, {
            family: Fonts.Oxanium,
            size: 10,
            color: Colors.WHITE()
        })
        Renderer.print(`dirX: ${this._camera.xDir} dirY: ${this._camera.yDir}`, 10, 40, {
            family: Fonts.Oxanium,
            size: 10,
            color: Colors.WHITE()
        })
    }

    registerSystems(gameSystems: Array<GameSystem>): void {

        gameSystems.forEach((gameSystem: GameSystem): void => {
            this._gameSystems.push(gameSystem);
        })

    }

    registerRenderSystems(gameRenderSystem: Array<GameRenderSystem>): void {

        gameRenderSystem.forEach((gameRenderSystem: GameRenderSystem): void => {
            this._renderSystems.push(gameRenderSystem);
        })
    }

    registerPostRenderSystems(gameRenderSystem: Array<GameRenderSystem>): void {

        gameRenderSystem.forEach((gameRenderSystem: GameRenderSystem): void => {
            this._postRenderSystems.push(gameRenderSystem);
        })
    }

}
