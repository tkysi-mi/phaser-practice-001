import { ingredients } from "./data/ingredients.js";
import { dishes } from "./data/dishes.js";

class MarketScene extends Phaser.Scene {
  constructor() {
    super("MarketScene");
    this.totalTime = 300;
    this.worldWidth = 1920;
    this.worldHeight = 1080;
  }

  preload() {
    this.load.spritesheet("player-shopper", "./assets/player/shopper-sheet.png", {
      frameWidth: 64,
      frameHeight: 64
    });
  }

  create() {
    this.cameras.main.setBackgroundColor("#0a172f");
    this.createTextures();
    this.createPlayerAnimations();
    this.setupRunState();
    this.createMap();
    this.createPlayer();
    this.createNpcStaff();
    this.createItemObjects();
    this.createHud();
    this.bindControls();
    this.updateHud();
  }

  setupRunState() {
    this.timeLeft = this.totalTime;
    this.isGameOver = false;
    this.dialogueOpen = false;
    this.nearNpc = null;
    this.lastFeedback = "";
    this.hintLog = [];
    this.revealed = new Set();
    this.collected = new Set();
    this.askedCount = 0;
    this.currentQuestion = null;
    this.currentConversation = null;
    this.nearCheckout = false;
    this.nearItemId = null;
    this.focusTargetId = null;
    this.currentDish = Phaser.Utils.Array.GetRandom(dishes);
    this.requiredIds = [...this.currentDish.ingredientIds];
  }

  createTextures() {
    if (this.textures.exists("player")) {
      return;
    }

    const g = this.add.graphics();
    g.fillStyle(0x38bdf8, 1);
    g.fillRoundedRect(0, 0, 28, 38, 8);
    g.generateTexture("player", 28, 38);
    g.clear();

    g.fillStyle(0x334155, 1);
    g.fillRoundedRect(0, 0, 18, 46, 4);
    g.generateTexture("shelf", 18, 46);
    g.clear();

    g.fillStyle(0xf59e0b, 1);
    g.fillCircle(13, 13, 13);
    g.generateTexture("npc", 26, 26);
    g.clear();

    g.fillStyle(0x22c55e, 1);
    g.fillCircle(10, 10, 10);
    g.generateTexture("item", 20, 20);
    g.destroy();
  }

  createMap() {
    this.add.rectangle(this.worldWidth / 2, this.worldHeight / 2, this.worldWidth, this.worldHeight, 0x0f274f, 0.9);

    this.add.text(150, 180, "野菜", { fontSize: "18px", color: "#bfdbfe", fontFamily: "Segoe UI, sans-serif" });
    this.add.text(820, 180, "缶詰", { fontSize: "18px", color: "#bfdbfe", fontFamily: "Segoe UI, sans-serif" });
    this.add.text(1560, 180, "乳製品", { fontSize: "18px", color: "#bfdbfe", fontFamily: "Segoe UI, sans-serif" });
    this.add.text(1240, 630, "ハーブ", { fontSize: "18px", color: "#bfdbfe", fontFamily: "Segoe UI, sans-serif" });
    this.add.text(1510, 630, "スパイス", { fontSize: "18px", color: "#bfdbfe", fontFamily: "Segoe UI, sans-serif" });

    this.walls = this.physics.add.staticGroup();
    const shelfX = [150, 240, 480, 570, 870, 960, 1220, 1310, 1560, 1650];
    shelfX.forEach((x) => {
      [245, 330, 415, 600, 690, 780].forEach((y) => {
        this.walls.create(x, y, "shelf");
      });
    });

    this.checkoutDesk = this.add.rectangle(540, 760, 180, 70, 0x1f2937, 0.95);
    this.checkoutDesk.setStrokeStyle(2, 0xfde68a);
    this.checkoutLabel = this.add.text(494, 745, "レジ", {
      fontSize: "18px",
      color: "#fde68a",
      fontFamily: "Segoe UI, sans-serif"
    });
  }

  createPlayer() {
    this.player = this.physics.add.sprite(120, 940, "player-shopper", 1);
    this.playerDirection = "down";
    this.player.setScale(0.95);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(22, 30);
    this.playerSpeed = 185;
    this.physics.add.collider(this.player, this.walls);
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.setPlayerIdleFrame();
  }

  createPlayerAnimations() {
    if (this.anims.exists("player-walk-down")) {
      return;
    }

    this.anims.create({
      key: "player-walk-down",
      frames: this.anims.generateFrameNumbers("player-shopper", { start: 1, end: 6 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: "player-walk-up",
      frames: this.anims.generateFrameNumbers("player-shopper", { start: 23, end: 28 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: "player-walk-right",
      frames: this.anims.generateFrameNumbers("player-shopper", { start: 45, end: 50 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: "player-walk-left",
      frames: this.anims.generateFrameNumbers("player-shopper", { start: 67, end: 72 }),
      frameRate: 10,
      repeat: -1
    });
  }

  setPlayerIdleFrame() {
    if (!this.player) {
      return;
    }

    const idleFrames = {
      down: 1,
      up: 23,
      right: 45,
      left: 67
    };
    this.player.anims.stop();
    this.player.setFrame(idleFrames[this.playerDirection] ?? 1);
  }

  createNpcStaff() {
    this.npcs = [
      this.createNpc(90, 120, "Mia", "Vegetables", true, "ingredient", { id: "mia", base: 0xfb7185, accent: 0x7f1d1d, style: 0 }),
      this.createNpc(960, 110, "Ken", "Canned Food", true, "location", { id: "ken", base: 0x60a5fa, accent: 0x1e3a8a, style: 1 }),
      this.createNpc(1750, 120, "Sora", "Dairy", true, "color", { id: "sora", base: 0xfbbf24, accent: 0x78350f, style: 2 }),
      this.createNpc(1280, 640, "Lena", "Herbs", true, "type", { id: "lena", base: 0x34d399, accent: 0x064e3b, style: 3 }),
      this.createNpc(320, 900, "Noah", "Snacks", false, "smalltalk", { id: "noah", base: 0xc084fc, accent: 0x581c87, style: 4 }),
      this.createNpc(700, 870, "Emma", "Bakery", false, "smalltalk", { id: "emma", base: 0xfda4af, accent: 0x881337, style: 5 }),
      this.createNpc(1120, 900, "Riku", "Frozen", false, "smalltalk", { id: "riku", base: 0x67e8f9, accent: 0x155e75, style: 6 }),
      this.createNpc(1500, 910, "Ava", "Beverages", false, "smalltalk", { id: "ava", base: 0xfdba74, accent: 0x7c2d12, style: 7 }),
      this.createNpc(1640, 690, "Yuna", "Home Goods", false, "smalltalk", { id: "yuna", base: 0xa3e635, accent: 0x365314, style: 8 }),
      this.createNpc(540, 640, "Taro", "Checkout", false, "smalltalk", { id: "taro", base: 0x94a3b8, accent: 0x0f172a, style: 9 })
    ];
  }

  createNpc(x, y, name, section, givesHint, clueType, avatar) {
    const textureKey = this.getNpcTextureKey(avatar);
    const sprite = this.physics.add.staticImage(x, y, textureKey);
    const nameLabel = this.add.text(x, y - 24, name, {
      fontSize: "16px",
      color: "#fde68a",
      fontFamily: "Segoe UI, sans-serif"
    });
    nameLabel.setOrigin(0.5);
    return { sprite, name, section, givesHint, clueType, nameLabel };
  }

  getNpcTextureKey(avatar) {
    const textureKey = `npc_${avatar.id}`;
    if (this.textures.exists(textureKey)) {
      return textureKey;
    }

    const g = this.add.graphics();
    g.fillStyle(avatar.base, 1);
    g.fillCircle(16, 16, 14);
    g.fillStyle(0xffffff, 0.92);
    g.fillCircle(12, 13, 2);
    g.fillCircle(20, 13, 2);
    g.fillStyle(avatar.accent, 1);

    switch (avatar.style % 5) {
      case 0:
        g.fillRect(5, 3, 22, 5);
        g.fillRect(6, 22, 20, 3);
        break;
      case 1:
        g.fillTriangle(3, 6, 16, 0, 29, 6);
        g.fillCircle(16, 25, 3);
        break;
      case 2:
        g.fillRoundedRect(4, 3, 24, 6, 3);
        g.fillRoundedRect(9, 22, 14, 3, 1);
        break;
      case 3:
        g.fillCircle(16, 4, 4);
        g.fillRect(6, 22, 20, 3);
        break;
      default:
        g.fillRect(2, 5, 28, 4);
        g.fillRoundedRect(10, 21, 12, 4, 1);
        break;
    }

    g.generateTexture(textureKey, 32, 32);
    g.destroy();
    return textureKey;
  }

  createItemObjects() {
    this.items = [];
    ingredients.forEach((ing) => {
      this.spawnItem(ing);
    });
  }

  spawnItem(ing) {
    const orb = this.physics.add.sprite(ing.x, ing.y, "item");
    orb.setData("ingredientId", ing.id);
    const label = this.add.text(ing.x, ing.y - 18, this.revealed.has(ing.id) ? ing.word : "?", {
      fontSize: "14px",
      color: "#dcfce7",
      fontFamily: "Segoe UI, sans-serif"
    });
    label.setOrigin(0.5);
    this.physics.add.collider(orb, this.walls);
    this.items.push({ ing, orb, label });
  }

  createHud() {
    this.externalDishTimeText = document.getElementById("hud-dish-time");
    this.externalTaskText = document.getElementById("hud-task");

    this.bagPanel = this.add.rectangle(205, 99, 380, 148, 0x081529, 0.92);
    this.bagPanel.setStrokeStyle(2, 0x35537e);
    this.bagPanel.setScrollFactor(0);
    this.bagPanel.setDepth(98);

    this.bagHeaderBar = this.add.rectangle(205, 38, 352, 24, 0x0d203a, 0.88);
    this.bagHeaderBar.setStrokeStyle(1, 0x2f4f78);
    this.bagHeaderBar.setScrollFactor(0);
    this.bagHeaderBar.setDepth(99);

    this.bagInnerPanel = this.add.rectangle(205, 109, 352, 96, 0x0a1426, 0.72);
    this.bagInnerPanel.setStrokeStyle(1, 0x27456a);
    this.bagInnerPanel.setScrollFactor(0);
    this.bagInnerPanel.setDepth(99);

    this.bagTitleText = this.add.text(28, 28, "バッグ", {
      fontSize: "15px",
      color: "#e0e7ff",
      fontFamily: "Segoe UI, sans-serif",
      fontStyle: "bold"
    });
    this.bagTitleText.setScrollFactor(0);
    this.bagTitleText.setDepth(100);

    this.bagHelperText = this.add.text(28, 46, "クリックで戻す", {
      fontSize: "11px",
      color: "#93c5fd",
      fontFamily: "Segoe UI, sans-serif"
    });
    this.bagHelperText.setScrollFactor(0);
    this.bagHelperText.setDepth(100);

    this.bagCountBadge = this.add.rectangle(356, 38, 54, 22, 0x1d4ed8, 0.26);
    this.bagCountBadge.setStrokeStyle(1, 0x60a5fa);
    this.bagCountBadge.setScrollFactor(0);
    this.bagCountBadge.setDepth(100);

    this.bagCountText = this.add.text(356, 38, "", {
      fontSize: "12px",
      color: "#dbeafe",
      fontFamily: "Segoe UI, sans-serif",
      fontStyle: "bold"
    });
    this.bagCountText.setOrigin(0.5);
    this.bagCountText.setScrollFactor(0);
    this.bagCountText.setDepth(101);

    this.inventorySlots = [];
    for (let i = 0; i < ingredients.length; i += 1) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 28 + col * 84;
      const y = 70 + row * 27;
      const box = this.add.rectangle(x, y, 74, 22, 0x0b1730, 0.96).setOrigin(0, 0);
      box.setStrokeStyle(1, 0x35537e);
      box.setScrollFactor(0);
      box.setDepth(100);
      box.setInteractive({ useHandCursor: true });
      box.on("pointerdown", () => this.putBackInventorySlot(i));
      box.on("pointerover", () => {
        if (box.getData("filled")) {
          box.setFillStyle(0x2563eb, 0.98);
          box.setStrokeStyle(1, 0xdbeafe);
        } else {
          box.setFillStyle(0x10203b, 0.98);
          box.setStrokeStyle(1, 0x60a5fa);
        }
      });
      box.on("pointerout", () => {
        if (box.getData("filled")) {
          box.setFillStyle(0x1d4ed8, 0.95);
          box.setStrokeStyle(1, 0x93c5fd);
        } else {
          box.setFillStyle(0x0b1730, 0.96);
          box.setStrokeStyle(1, 0x35537e);
        }
      });
      const text = this.add.text(x + 7, y + 3, "", {
        fontSize: "11px",
        color: "#e2e8f0",
        fontFamily: "Segoe UI, sans-serif",
        wordWrap: { width: 60 }
      });
      text.setScrollFactor(0);
      text.setDepth(101);
      this.inventorySlots.push({ box, text, itemId: null });
    }

    this.dialogBg = this.add.rectangle(480, 428, 900, 218, 0x020617, 0.94);
    this.dialogBg.setStrokeStyle(1, 0x334155);
    this.dialogBg.setVisible(false);
    this.dialogBg.setScrollFactor(0);
    this.dialogBg.setDepth(120);

    this.dialogHistoryText = this.add.text(44, 330, "", {
      fontSize: "15px",
      color: "#e2e8f0",
      fontFamily: "Segoe UI, sans-serif",
      wordWrap: { width: 850 }
    });
    this.dialogHistoryText.setVisible(false);
    this.dialogHistoryText.setScrollFactor(0);
    this.dialogHistoryText.setDepth(121);

    this.dialogQuestionText = this.add.text(44, 396, "", {
      fontSize: "17px",
      color: "#bfdbfe",
      fontFamily: "Segoe UI, sans-serif",
      wordWrap: { width: 850 }
    });
    this.dialogQuestionText.setVisible(false);
    this.dialogQuestionText.setScrollFactor(0);
    this.dialogQuestionText.setDepth(121);

    this.optionButtons = [];
    for (let i = 0; i < 5; i += 1) {
      const y = 420 + i * 24;
      const rect = this.add.rectangle(44, y, 850, 20, 0x1f2937).setOrigin(0, 0).setVisible(false);
      rect.setStrokeStyle(1, 0x475569);
      rect.setInteractive({ useHandCursor: true });
      const text = this.add.text(54, y + 2, "", {
        fontSize: "14px",
        color: "#f8fafc",
        fontFamily: "Segoe UI, sans-serif",
        wordWrap: { width: 830 }
      }).setVisible(false);
      rect.setScrollFactor(0);
      text.setScrollFactor(0);
      rect.setDepth(122);
      text.setDepth(123);
      rect.on("pointerover", () => rect.setFillStyle(0x334155));
      rect.on("pointerout", () => rect.setFillStyle(0x1f2937));
      rect.on("pointerdown", () => this.selectDialogueOption(i));
      this.optionButtons.push({ rect, text });
    }
  }

  bindControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.tickTimer,
      callbackScope: this,
      loop: true
    });
  }

  tickTimer() {
    if (this.isGameOver || this.dialogueOpen) {
      return;
    }
    this.timeLeft -= 1;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.finishGame(false);
    }
    this.updateHud();
  }

  updateHud() {
    const min = Math.floor(this.timeLeft / 60);
    const sec = String(this.timeLeft % 60).padStart(2, "0");
    if (this.externalDishTimeText) {
      this.externalDishTimeText.textContent = `時間: ${min}:${sec}`;
    }
    const uncollectedCount = this.requiredIds.filter((id) => !this.collected.has(id)).length;
    if (uncollectedCount > 0) {
      if (this.externalTaskText) {
        this.externalTaskText.textContent = `タスク: ${this.currentDish.name}の食材を集めよう`;
      }
    } else {
      if (this.externalTaskText) {
        this.externalTaskText.textContent = `タスク: レジに行って${this.currentDish.name}を完成させよう`;
      }
    }

    this.bagTitleText.setText("バッグ");
    this.bagCountText.setText(`${this.collected.size}/${ingredients.length}`);
    const collectedIds = [...this.collected];
    this.inventorySlots.forEach((slot, index) => {
      const itemId = collectedIds[index];
      const item = itemId ? this.getIngredient(itemId) : null;
      slot.itemId = itemId || null;
      slot.box.setData("filled", Boolean(item));
      if (item) {
        slot.box.setFillStyle(0x1d4ed8, 0.95);
        slot.box.setStrokeStyle(1, 0x93c5fd);
        slot.text.setColor("#eff6ff");
        slot.text.setText(item.word);
      } else {
        slot.box.setFillStyle(0x0b1730, 0.96);
        slot.box.setStrokeStyle(1, 0x35537e);
        slot.text.setText("");
      }
    });

    this.items.forEach((item) => {
      const id = item.ing.id;
      const visibleWord = this.revealed.has(id) ? item.ing.word : "?";
      item.label.setText(visibleWord);
    });
  }

  getIngredient(id) {
    return ingredients.find((item) => item.id === id);
  }

  getAisleLabel(aisle) {
    const labels = {
      Vegetables: "野菜",
      "Canned Food": "缶詰",
      Dairy: "乳製品",
      Herbs: "ハーブ",
      Spices: "スパイス",
      Snacks: "スナック",
      Bakery: "ベーカリー",
      Frozen: "冷凍食品",
      Beverages: "飲み物",
      "Home Goods": "日用品",
      Checkout: "レジ"
    };
    return labels[aisle] ?? aisle;
  }

  putBackInventorySlot(index) {
    const slot = this.inventorySlots[index];
    if (!slot || !slot.itemId || this.dialogueOpen || this.isGameOver) {
      return;
    }
    this.putBackIngredient(slot.itemId);
  }

  putBackIngredient(ingredientId) {
    if (!this.collected.has(ingredientId)) {
      return;
    }

    const ing = this.getIngredient(ingredientId);
    this.collected.delete(ingredientId);
    this.spawnItem(ing);
    this.lastFeedback = `戻した: ${ing.word}`;
    this.feedbackText?.setColor("#cbd5e1");
    this.updateHud();
  }

  update() {
    if (this.isGameOver) {
      return;
    }
    this.handleMovement();
    this.checkNpcProximity();
    this.checkCheckoutProximity();
    this.checkItemProximity();
    this.updateInteractHint();

    if (!this.dialogueOpen && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      if (this.nearCheckout) {
        this.tryCheckout();
        return;
      }
      if (this.nearItemId) {
        this.tryCollect(this.nearItemId);
        return;
      }
      if (this.nearNpc) {
        this.openDialogue(this.nearNpc);
      }
    }
  }

  handleMovement() {
    if (this.dialogueOpen) {
      this.player.setVelocity(0, 0);
      this.setPlayerIdleFrame();
      return;
    }

    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown) vx = -this.playerSpeed;
    else if (this.cursors.right.isDown) vx = this.playerSpeed;
    if (this.cursors.up.isDown) vy = -this.playerSpeed;
    else if (this.cursors.down.isDown) vy = this.playerSpeed;
    this.player.setVelocity(vx, vy);

    if (vx < 0) {
      this.playerDirection = "left";
      this.player.anims.play("player-walk-left", true);
    } else if (vx > 0) {
      this.playerDirection = "right";
      this.player.anims.play("player-walk-right", true);
    } else if (vy < 0) {
      this.playerDirection = "up";
      this.player.anims.play("player-walk-up", true);
    } else if (vy > 0) {
      this.playerDirection = "down";
      this.player.anims.play("player-walk-down", true);
    } else {
      this.setPlayerIdleFrame();
    }
  }

  checkNpcProximity() {
    this.nearNpc = null;
    let shortest = 80;
    this.npcs.forEach((npc) => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.sprite.x, npc.sprite.y);
      if (d < shortest) {
        shortest = d;
        this.nearNpc = npc;
      }
    });
  }

  checkCheckoutProximity() {
    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.checkoutDesk.x, this.checkoutDesk.y);
    this.nearCheckout = d < 90;
  }

  checkItemProximity() {
    this.nearItemId = null;
    let shortest = 36;
    this.items.forEach((entry) => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, entry.orb.x, entry.orb.y);
      if (d < shortest) {
        shortest = d;
        this.nearItemId = entry.ing.id;
      }
    });
  }

  updateInteractHint() {
    if (this.dialogueOpen) {
      this.interactText?.setText("");
      return;
    }
    if (this.nearCheckout) {
      this.interactText?.setText("SPACE: レジ");
      return;
    }
    if (this.nearItemId) {
      this.interactText?.setText("SPACE: ひろう");
      return;
    }
    if (this.nearNpc) {
      this.interactText?.setText("SPACE: 話す");
      return;
    }
    this.interactText?.setText("");
  }

  allRequiredCollected() {
    return this.requiredIds.every((id) => this.collected.has(id));
  }

  buildCheckoutReport() {
    const missingRequired = this.requiredIds.filter((id) => !this.collected.has(id));
    const wrongCollected = [...this.collected].filter((id) => !this.requiredIds.includes(id));
    return { missingRequired, wrongCollected };
  }

  tryCheckout() {
    const report = this.buildCheckoutReport();
    const cleared = report.missingRequired.length === 0 && report.wrongCollected.length === 0;
    this.finishGame(cleared, report);
  }

  openDialogue(npc) {
    const targetId = npc.givesHint ? this.pickTargetIngredientId() : null;
    if (npc.givesHint && !targetId) {
      this.lastFeedback = "必要な食材はもう分かっているよ。集めに行こう。";
      this.updateHud();
      return;
    }

    this.currentConversation = this.buildConversation(targetId, npc);
    this.dialogueOpen = true;
    this.player.setVelocity(0, 0);

    this.dialogBg.setVisible(true);
    this.renderConversationStep();
  }

  pickTargetIngredientId() {
    if (this.focusTargetId && this.requiredIds.includes(this.focusTargetId) && !this.collected.has(this.focusTargetId)) {
      return this.focusTargetId;
    }
    const remainingRequired = this.requiredIds.filter((id) => !this.collected.has(id));
    if (remainingRequired.length === 0) {
      this.focusTargetId = null;
      return null;
    }
    this.focusTargetId = Phaser.Utils.Array.GetRandom(remainingRequired);
    return this.focusTargetId;
  }

  buildConversation(targetId, npc) {
    if (npc.givesHint) {
      return this.buildHintConversation(targetId, npc);
    }
    return this.buildSmallTalkConversation(npc);
  }

  buildHintConversation(targetId, npc) {
    const target = this.getIngredient(targetId);
    const openingUser = Phaser.Utils.Array.GetRandom([
      `You: Hello, are you familiar with ${this.currentDish.name}?`,
      `You: Hi, do you know this dish called ${this.currentDish.name}?`,
      `You: Excuse me, I need help with ${this.currentDish.name}.`
    ]);
    const openingNpc = Phaser.Utils.Array.GetRandom([
      `${npc.name}: Hmm, I know a little about it.`,
      `${npc.name}: Ah yes, I have heard of that dish.`,
      `${npc.name}: Maybe. My family cooked it before.`
    ]);

    const fillerNpcLines = [
      `${npc.name}: I remember the smell was strong and warm.`,
      `${npc.name}: People said it tasted rich.`,
      `${npc.name}: It was often served hot.`,
      `${npc.name}: I think they used fresh ingredients.`
    ];
    const turnCount = Phaser.Math.Between(2, 4);
    const steps = [];
    const contextLines = [openingUser];

    for (let turn = 0; turn < turnCount; turn += 1) {
      const isFinal = turn === turnCount - 1;
      let correctLine = "";
      let onCorrect = "";
      let wrongPrompt = `${npc.name}: Sorry, I am not sure what you need. Ask me about the dish ingredients.`;

      if (turn === 0) {
        if (npc.clueType === "ingredient") {
          correctLine = Phaser.Utils.Array.GetRandom([
            "What ingredients does it usually have?",
            "Do you remember any ingredient in it?",
            "Could you tell me one key ingredient?"
          ]);
          onCorrect = `${openingNpc} I think it had ${target.word} inside.`;
        } else if (npc.clueType === "location") {
          correctLine = Phaser.Utils.Array.GetRandom([
            "Where should I look for one ingredient?",
            "Do you know which aisle I should check?",
            "Can you tell me where to look first?"
          ]);
          onCorrect = `${openingNpc} I think one ingredient is somewhere in ${target.aisle}.`;
        } else if (npc.clueType === "color") {
          correctLine = Phaser.Utils.Array.GetRandom([
            "Do you remember what it looked like?",
            "What color was one ingredient?",
            "Can you describe one ingredient?"
          ]);
          onCorrect = `${openingNpc} I remember one ingredient looked ${target.color}.`;
        } else {
          correctLine = Phaser.Utils.Array.GetRandom([
            "Was one ingredient a spice or something fresh?",
            "What kind of ingredient was it?",
            "Do you remember the type of ingredient?"
          ]);
          onCorrect = `${openingNpc} I think one ingredient was a ${target.kind}.`;
        }
        wrongPrompt = `${npc.name}: Sorry? Ask me about the dish or one ingredient.`;
      } else if (isFinal) {
        if (npc.clueType === "ingredient") {
          correctLine = Phaser.Utils.Array.GetRandom([
            "Could you repeat the ingredient name?",
            "What was the ingredient again?",
            "So which ingredient do I need?"
          ]);
          onCorrect = `${npc.name}: The ingredient I remember is ${target.word}.`;
        } else if (npc.clueType === "location") {
          correctLine = Phaser.Utils.Array.GetRandom([
            "Which aisle is it in exactly?",
            "Where can I find it?",
            "Can you tell me the aisle again?"
          ]);
          onCorrect = `${npc.name}: You can find it in the ${target.aisle} aisle.`;
        } else if (npc.clueType === "color") {
          correctLine = Phaser.Utils.Array.GetRandom([
            "Was it dark or bright?",
            "So what color was it exactly?",
            "Can you tell me the color again?"
          ]);
          onCorrect = `${npc.name}: It was definitely ${target.color}.`;
        } else {
          correctLine = Phaser.Utils.Array.GetRandom([
            "Was it a herb, spice, or dairy item?",
            "What kind of ingredient was it exactly?",
            "Can you tell me the ingredient type again?"
          ]);
          onCorrect = `${npc.name}: It was a ${target.kind}.`;
        }
      } else {
        if (npc.clueType === "color") {
          correctLine = Phaser.Utils.Array.GetRandom([
            "Was it green, red, or yellow?",
            "Did it look bright?",
            "Was the ingredient a strong color?"
          ]);
          onCorrect = `${npc.name}: Yes, the color stood out.`;
        } else if (npc.clueType === "type") {
          correctLine = Phaser.Utils.Array.GetRandom([
            "Was it used like a seasoning?",
            "Did they add only a little of it?",
            "Was it something to flavor the dish?"
          ]);
          onCorrect = `${npc.name}: Yes, I think it changed the taste.`;
        } else {
          correctLine = Phaser.Utils.Array.GetRandom([
            "Was it spicy?",
            "What did it taste like?",
            "Was it cooked for a long time?"
          ]);
          onCorrect = Phaser.Utils.Array.GetRandom(fillerNpcLines);
        }
      }

      const wrongPool = [
        "Can I get a discount?",
        "Where is the toilet?",
        "Do you sell batteries?",
        "Can I pay by cash only?",
        "When do you close today?"
      ];
      const optionCount = Phaser.Math.Between(2, 5);
      const options = this.makeOptions(correctLine, wrongPool, optionCount);

      steps.push({
        lines: [...contextLines],
        question: turn === 0 ? "Choose your reply:" : "Choose your next line:",
        options,
        answer: correctLine,
        onCorrect,
        onWrong: wrongPrompt,
        finalStep: isFinal
      });

      contextLines.push(onCorrect);
    }

    return {
      targetId,
      npc,
      rewardTargetId: targetId,
      stepIndex: 0,
      steps
    };
  }

  buildSmallTalkConversation(npc) {
    const hintStaffNames = this.npcs
      .filter((member) => member.givesHint)
      .map((member) => member.name);
    const recommendedName = Phaser.Utils.Array.GetRandom(hintStaffNames);
    const openingUser = Phaser.Utils.Array.GetRandom([
      `You: Hello, are you familiar with ${this.currentDish.name}?`,
      `You: Hi, I am looking for ingredients for ${this.currentDish.name}.`,
      `You: Excuse me, do you know this dish, ${this.currentDish.name}?`
    ]);
    const openingNpc = Phaser.Utils.Array.GetRandom([
      `${npc.name}: Hmm, not really. I work in ${npc.section}.`,
      `${npc.name}: Sorry, that dish is not my area.`,
      `${npc.name}: I am not sure, but maybe another staff member knows.`
    ]);

    const turnCount = Phaser.Math.Between(2, 3);
    const steps = [];
    const contextLines = [openingUser];

    for (let turn = 0; turn < turnCount; turn += 1) {
      const isFinal = turn === turnCount - 1;
      let correctLine = "";
      let onCorrect = "";

      if (turn === 0) {
        correctLine = Phaser.Utils.Array.GetRandom([
          "I am looking for the ingredients.",
          "I need help finding the ingredients.",
          "Do you know what goes in it?"
        ]);
        onCorrect = openingNpc;
      } else if (isFinal) {
        correctLine = Phaser.Utils.Array.GetRandom([
          "Who should I ask?",
          "Can you point me to the right staff member?",
          "Who knows more about recipes here?"
        ]);
        onCorrect = `${npc.name}: Try asking ${recommendedName}. They usually know recipe ingredients.`;
      } else {
        correctLine = Phaser.Utils.Array.GetRandom([
          "Maybe another staff member knows?",
          "Has anyone talked about that dish?",
          "Could someone else help me?"
        ]);
        onCorrect = `${npc.name}: Maybe someone in another section knows more.`;
      }

      const optionCount = Phaser.Math.Between(2, 5);
      const options = this.makeOptions(correctLine, [
        "Can I return an item?",
        "Is there a sale today?",
        "Where is the parking gate?",
        "Can I use coupons now?",
        "Is this the exit?"
      ], optionCount);

      steps.push({
        lines: [...contextLines],
        question: turn === 0 ? "Choose your reply:" : "Continue naturally:",
        options,
        answer: correctLine,
        onCorrect,
        onWrong: turn === 0
          ? `${npc.name}: Sorry, I do not follow. Tell me what you need.`
          : `${npc.name}: Sorry, I cannot help with that.`,
        finalStep: isFinal
      });
      contextLines.push(onCorrect);
    }

    return {
      targetId: null,
      npc,
      rewardTargetId: null,
      stepIndex: 0,
      steps
    };
  }

  renderConversationStep() {
    const step = this.currentConversation.steps[this.currentConversation.stepIndex];
    const recentLines = step.lines.slice(-3);
    this.dialogHistoryText.setText(recentLines.join("\n"));
    this.dialogHistoryText.setVisible(true);
    this.dialogQuestionText.setText(step.question);
    this.dialogQuestionText.setVisible(true);
    this.optionButtons.forEach((button, index) => {
      if (index < step.options.length) {
        button.text.setText(`${index + 1}. ${step.options[index]}`);
        button.rect.setVisible(true);
        button.text.setVisible(true);
      } else {
        button.rect.setVisible(false);
        button.text.setVisible(false);
      }
    });
  }

  makeOptions(correct, pool, count) {
    const uniquePool = [...new Set(pool.filter((v) => v !== correct))];
    Phaser.Utils.Array.Shuffle(uniquePool);
    const options = [correct, ...uniquePool.slice(0, count - 1)];
    return Phaser.Utils.Array.Shuffle(options);
  }

  selectDialogueOption(index) {
    if (!this.dialogueOpen || !this.currentConversation) {
      return;
    }
    const step = this.currentConversation.steps[this.currentConversation.stepIndex];
    const picked = step.options[index];
    const correct = picked === step.answer;
    this.askedCount += 1;

    if (correct) {
      if (step.finalStep) {
        if (this.currentConversation.rewardTargetId) {
          const targetId = this.currentConversation.rewardTargetId;
          const target = this.getIngredient(targetId);
          this.revealed.add(targetId);
          this.lastFeedback = `Great talk. ${step.onCorrect}`;
          this.hintLog.push(`・${target.word}: ${this.getAisleLabel(target.aisle)}`);
          this.feedbackText?.setColor("#86efac");
        } else {
          this.lastFeedback = step.onCorrect;
          this.feedbackText?.setColor("#93c5fd");
        }
        this.closeDialogue();
      } else {
        this.lastFeedback = step.onCorrect;
        this.feedbackText?.setColor("#93c5fd");
        this.currentConversation.stepIndex += 1;
        this.renderConversationStep();
      }
    } else {
      this.lastFeedback = step.onWrong;
      this.feedbackText?.setColor("#fcd34d");
      this.closeDialogue();
    }

    this.updateHud();
  }

  closeDialogue() {
    this.dialogueOpen = false;
    this.currentQuestion = null;
    this.currentConversation = null;
    this.dialogBg.setVisible(false);
    this.dialogHistoryText.setVisible(false);
    this.dialogQuestionText.setVisible(false);
    this.optionButtons.forEach((button) => {
      button.rect.setVisible(false);
      button.text.setVisible(false);
    });
  }

  tryCollect(ingredientId) {
    if (this.isGameOver || this.dialogueOpen || this.collected.has(ingredientId)) {
      return;
    }

    const ing = this.getIngredient(ingredientId);
    this.revealed.add(ingredientId);
    this.collected.add(ingredientId);
    const targetObj = this.items.find((entry) => entry.ing.id === ingredientId);
    if (targetObj) {
      targetObj.orb.destroy();
      targetObj.label.destroy();
    }
    this.items = this.items.filter((entry) => entry.ing.id !== ingredientId);
    this.nearItemId = null;

    this.lastFeedback = `入手: ${ing.word}`;
    this.feedbackText?.setColor("#bae6fd");
    if (this.allRequiredCollected()) {
      this.lastFeedback = "食材がそろった。レジへ行こう。";
      this.feedbackText?.setColor("#93c5fd");
    }
    this.updateHud();
  }

  finishGame(cleared, report = null) {
    if (this.isGameOver) {
      return;
    }
    this.isGameOver = true;
    this.player.setVelocity(0, 0);
    this.timerEvent.remove();
    this.dialogueOpen = false;
    this.closeDialogue();

    const overlay = this.add.rectangle(480, 270, 960, 540, 0x020617, 0.78);
    overlay.setDepth(200);
    overlay.setScrollFactor(0);
    const title = cleared ? "クリア！" : "未クリア";
    const checkoutReport = report || this.buildCheckoutReport();
    const missingWords = checkoutReport.missingRequired.map((id) => this.getIngredient(id).word);
    const wrongWords = checkoutReport.wrongCollected.map((id) => this.getIngredient(id).word);
    let sub = "";
    if (cleared) {
      sub = `${this.currentDish.name}の会計に成功しました。`;
    } else if (this.timeLeft <= 0) {
      sub = `時間切れ。不足: ${missingWords.join(", ") || "なし"}`;
    } else {
      sub = `会計に失敗しました。不足: ${missingWords.join(", ") || "なし"} / 余分: ${wrongWords.join(", ") || "なし"}`;
    }
    const reviewWords = this.requiredIds.map((id) => this.getIngredient(id).word).join(", ");
    const resultText = this.add.text(
      120,
      165,
      `${title}\n\n${sub}\n\n復習ワード:\n${reviewWords}\n\nクリックで再スタート`,
      {
        fontSize: "30px",
        color: "#f8fafc",
        fontFamily: "Segoe UI, sans-serif",
        lineSpacing: 12,
        wordWrap: { width: 720 }
      }
    );
    resultText.setDepth(201);
    resultText.setScrollFactor(0);
    this.input.once("pointerdown", () => this.scene.restart());
  }
}

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: "game",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [MarketScene]
};

new Phaser.Game(config);
