phina.globalize();

const version = "1.0";

ASSETS = {
    image: {
        "green": "img/green.png",
        "ground": "img/ground.png",
        "water": "img/water.png",
        "water2": "img/water2.png",
        "water3": "img/water3.png",
        "smoke": "img/smoke.png",
        "smoke2": "img/smoke2.png",
        "fire1": "img/fire1.png",
        "fire2": "img/fire2.png",
        "fire3": "img/fire3.png",
        "fire4": "img/fire4.png",
        "fire5": "img/fire5.png",
    },
};

const TYPE_GREEN = "0";
const TYPE_FIRE = "1";
const TYPE_WATER = "2";
const TYPE_GROUND = "3";

const FIRE_START_COUNT = 70;
let fireCount;

phina.define('TitleScene', {
    superClass: 'DisplayScene',
  
    init: function(options) {
        this.superInit(options);

        const self = this;

        this.backgroundColor = "#689F38";

        // Label({
        //     text: '',
        //     x: this.gridX.center(),
        //     y: this.gridY.span(2),
        //     fontSize: 25,
        //     fill: "black",
        //     fontWeight: 800,
        // }).addChildTo(this);

        Label({
            text: 'FIRE  FIGHT',
            x: this.gridX.center(),
            y: this.gridY.span(3),
            fontSize:80,
            // fill: "#81D4FA",
            fill: "RED",
            fontWeight: 800,
            strokeWidth: 20,
            // stroke: "white",
            stroke: "white",
        }).addChildTo(this);

        // const verLabel = Label({
        //     x: this.gridX.span(12),
        //     y: this.gridY.span(4),
        //     fontSize: 18,
        //     fill: "black",
        //     fontFamily: "monospace",
        // }).addChildTo(this);
        // verLabel.text = "version " + version;

        Demo().addChildTo(this).setPosition(this.gridX.center(), this.gridY.span(8));

        Label({
            text: 'Tap to start',
            x: this.gridX.center(),
            y: this.gridY.span(13),
            fontSize: 30,
            fill: "white",
            fontWeight: 800,
        }).addChildTo(this);

        const best = window.localStorage.getItem("best");

        if (best) {
            Label({
                text: "Best " + best + " sec",
                x: this.gridX.center(),
                y: this.gridY.span(14),
                fontSize: 40,
                fill: "red",
                fontWeight: 800,
                strokeWidth: 5,
                stroke: "white",
                }).addChildTo(this);
            }

        this.on("pointstart",function() {
            this.exit();
        });

    },

});


phina.define('GameScene', {
    superClass: 'DisplayScene',

    init: function(options) {
        this.superInit(options);

        const self = this;

        self.backgroundColor = "black";

        const fieldMap = FieldMap().addChildTo(self).setPosition(this.gridX.center(), this.gridY.center());

        this.on("pointstart", function(e) {
            putWater(e);
        });

        this.on("pointmove", function(e) {
            putWater(e);
        });

        function putWater(e) {
            if (gameStart === false) {
                return;
            }
            fieldMap.blocks.forEach((rows) => {
                rows.forEach((block) => {
                    if (block.hitTest(e.pointer.x, e.pointer.y)) {
                        // 緑地か地面なら水にする
                        if (block.type === TYPE_GREEN || block.type === TYPE_GROUND) {
                            block.changeToWater();
                            fieldMap.checkAllBlocks();
                        }
                    }
                });
            });
        }

    },


});

phina.define("FieldMap", {
    superClass: "RectangleShape",
    init: function(options) {

        this.superInit({
            width: 512,
            height: 832,
            fill: "#ecf0f1",
            strokeWidth: 10,
            stroke: "#2c3e50",
            cornerRadius: 10,
        });

        const self = this;

        self.gridX = Grid({width: 512, columns: 8});
        self.gridY = Grid({width: 832, columns: 13});
 
        self.blocks = [];

        // 初期マップ生成
        [...Array(14)].map(() => self.blocks.push([]));
    
        self.blocks.forEach((block, y) => {
            [...Array(9)].map((_, x) => block.push(Block(x, y)));
        });

        self.blocks.forEach((rows, y) => {
            rows.forEach((block, x) => {
                block.addChildTo(this).setPosition(this.gridX.span(x) - this.width / 2, this.gridY.span(y) - this.height / 2);
            });
        });

        // 火をつける。
        [...Array(FIRE_START_COUNT)].map(() => self.putFire());
        fireCount = FIRE_START_COUNT;
        gameStart = true;
        startTime = new Date();

        function removeFireLoop() {
            self.removeFireRandom();
            self.checkAllBlocks();

            let timeout;
            if (fireCount / FIRE_START_COUNT > 0.7) {
                timeout = 4000;
            } else if (fireCount / FIRE_START_COUNT > 0.4) {
                timeout = 2500;
            } else {
                timeout = 1500;
            }

            if (gameStart === false) {
                return;
            }

            timeoutID = setTimeout(() => {
                removeFireLoop();
            }, timeout);

        }

        timeoutID = setTimeout(() => {
            removeFireLoop();
        }, 4000);
        
    },
    getBlock: function(x, y) {
        const self = this;
        if (x < 0 || x > 9 || y < 0 || y > 14) {
            return null;
        }
        return self.blocks[y][x];
    },
    getBlocks: function(type) {
        const retBlocks = [];
        this.blocks.forEach((row) => {
            row.forEach((block) => {
                if (block.type === type) {
                    retBlocks.push(block);
                }
            })
        });
        return retBlocks;
    },
    getUpperBlock: function(block) {
        const y = block.py - 1;
        if (y < 0) return null;
        return this.getBlock(block.px, y);
    },

    getUnderBlock: function(block) {
        const y = block.py + 1;
        if (y > 13) return null;
        return this.getBlock(block.px, y);
    },

    getLeftBlock: function(block) {
        const x = block.px - 1;
        if (x < 0) return null;
        return this.getBlock(x, block.py);
    },

    getRightBlock: function(block) {
        const x = block.px + 1;
        if (x > 8) return null;
        return this.getBlock(x, block.py);
    },

    // 指定セルがダメを持つかを調べる再帰関数
    hasDame: function (type, block) {

        const self = this;

        const againstType = (type === TYPE_WATER ? TYPE_FIRE : TYPE_WATER);

        // 盤外ならfalseを返す
        if (!block) {
            return false;
        }

        // チェック済みの場合はfalseを返す
        if (block.checked) {
            return false;
        }

        block.checked = true;

        // 逆のTYPEならfalseを返す
        if (block.type === againstType) {
            return false;
        }

        // 空点ならtrueを返す
        if (block.type === TYPE_GREEN || block.type === TYPE_GROUND) {
            return true;
        }

        let nextToBlock;

        // 右隣りを見る
        nextToBlock = self.getRightBlock(block);
        if (self.hasDame(type, nextToBlock) === true) {
            return true;
        }
        // 左隣りを見る
        nextToBlock = self.getLeftBlock(block);
        if (self.hasDame(type, nextToBlock) === true) {
            return true;
        }
        // 上隣りを見る
        nextToBlock = self.getUpperBlock(block);
        if (self.hasDame(type, nextToBlock) === true) {
            return true;
        }
        // 下隣りを見る
        nextToBlock = self.getUnderBlock(block);
        if (self.hasDame(type, nextToBlock) === true) {
            return true;
        }            

        return false;
    },

    // ダメを持たないセルを取り除く再帰関数
    removeBlocks: function (type, block) {

        const self = this;

        const againstType = (type === TYPE_WATER ? TYPE_FIRE : TYPE_WATER);

        // 盤外ならなにもしない
        if (!block) {
            return;
        }

        // 逆のTYPEならなにもしない
        if (block.type === againstType) {
            return;
        }

        // 空点ならなにもしない
        if (block.type === TYPE_GREEN || block.type === TYPE_GROUND) {
            return;
        }

        // 同じTYPEなら
        if (block.type === type) {
            // 空点にする
            if (type === TYPE_FIRE) {
                block.changeToGroundFromFire();
            } else {
                block.changeToGreenFromWater();
            }
        }

        // 右隣りを見る
        self.removeBlocks(type, self.getRightBlock(block));
        // 左隣りを見る
        self.removeBlocks(type, self.getLeftBlock(block));
        // 上隣りを見る
        self.removeBlocks(type, self.getUpperBlock(block));
        // 下隣りを見る
        self.removeBlocks(type, self.getUnderBlock(block));
    },

    checkAllBlocks: function() {

        const self = this;

        // チェック済みフラグを初期化する関数
        function clearCheck() {
            self.blocks.map((rows) => {
                rows.map((block) => {
                    block.checked = false;
                });
            });
        }

        // 火のセル
        self.getBlocks(TYPE_FIRE).forEach((block) => {
            clearCheck();
            if (!self.hasDame(TYPE_FIRE, block)) {
                self.removeBlocks(TYPE_FIRE, block);
            }
        });

        // 水のセル
        self.getBlocks(TYPE_WATER).forEach((block) => {
            clearCheck();
            if (!self.hasDame(TYPE_WATER, block)) {
                self.removeBlocks(TYPE_WATER, block);
            }
        });

        // 終了判定
        const fireBlocks = self.getBlocks(TYPE_FIRE);
        if (fireBlocks.length === 0) {
            clearTimeout(timeoutID);
            gameStart = false;
            gameClear();
        }


    },

    putFire: function() {
        const self = this;
        const freeBlocks = self.getBlocks(TYPE_GREEN);
        util.shuffleArray(freeBlocks);
        freeBlocks[0].changeToFire();
    },

    putWater: function(block) {

        if (block.type !== TYPE_GREEN && block.type !== TYPE_GROUND) {
            return;
        }
        block.type = TYPE_WATER;
        this.checkAllBlocks();

    },

    removeFireRandom: function() {
        const self = this;
        const fireBlocks = self.getBlocks(TYPE_FIRE);
        if (fireBlocks.length === 0) {
            return;
        }
        util.shuffleArray(fireBlocks);
        fireBlocks[0].changeToGroundFromFire(true);
    },

});

phina.define('Block', {
    superClass: 'Sprite',

    type: TYPE_GREEN,
    lastType: TYPE_GREEN,

    init: function(x, y) {
        const self = this;
        this.superInit("green");
        self.px = x;
        self.py = y;
        self.checked = false;
        self.step = 0;
        self.counter = 0;
    },

    changeToWater: function() {
        if (this.type === TYPE_WATER) return;
        this.setImage("water");
        this.lastType = this.type;
        this.type = TYPE_WATER;
        this.step = 0;
    },

    changeToGreenFromWater: function() {
        this.setImage("water2");
        this.lastType = this.type;
        this.type = TYPE_GREEN;
        this.step = 0;
    },

    changeToFire: function() {
        if (this.type === TYPE_FIRE) return;
        this.setImage("fire3");
        this.lastType = this.type;
        this.type = TYPE_FIRE;
        this.step = 0;
    },

    changeToGroundFromFire: function(isSelf) {
        if (this.type === TYPE_GROUND) return;
        this.setImage("fire2");
        this.lastType = this.type;
        this.type = TYPE_GROUND;
        this.step = 0;
        fireCount = fireCount - 1;
        if (isSelf) {
            const smoke1 = Sprite("smoke2").addChildTo(this).setPosition(0, 5);
            smoke1.tweener.to({alpha: 0, scaleX: 0.5, scaleY: 5}, 2000).call(() => smoke1.remove()).play();
            const smoke2 = Sprite("smoke2").addChildTo(this).setPosition(-5, 0);
            smoke2.tweener.to({alpha: 0, scaleX: 0.5, scaleY: 5}, 2000).call(() => smoke2.remove()).play();
            const smoke3 = Sprite("smoke2").addChildTo(this).setPosition(5, 0);
            smoke3.tweener.to({alpha: 0, scaleX: 0.5, scaleY: 5}, 2000).call(() => smoke3.remove()).play();
        } else {
            const smoke = Sprite("smoke").addChildTo(this).setPosition(0, 0);
            smoke.alpha = 0.9;
            smoke.tweener.to({y: -30, alpha: 0, scaleX: 2}, 500).call(() => smoke.remove()).play();
        }
    },

    changeToFGreen: function() {
        if (this.type === TYPE_GREEN) return;
        this.setImage("green");
        this.lastType = this.type;
        this.type = TYPE_GREEN;
        this.step = 0;
    },

    update: function() {

        self.counter += 1;
        if (self.counter <= 10) {
            return;
        }
        self.counter = 0;

        if (this.type === TYPE_FIRE) {
            if (this.step === 0) {
                this.step = 1;
            } else if (this.step === 1) {
                this.setImage("fire4");
                this.step = 2;
            } else if (this.step === 2) {
                this.step = 3;
            } else if (this.step === 3) {
                this.setImage("fire3");
                this.step = 4;
            } else if (this.step === 4) {
                this.step = 5;
            } else if (this.step === 5) {
                this.setImage("fire5");
                this.step = 6;
            } else if (this.step === 6) {
                this.step = 7;
            } else if (this.step === 7) {
                this.setImage("fire3");
                this.step = 0;
            }
            return;
        }

        if (this.type === TYPE_GROUND) {
            if (this.lastType === TYPE_FIRE) {
                if (this.step === 0) {
                    this.setImage("fire1");
                    this.step = 1;
                } else {
                    this.setImage("ground");
                }
            }
            return;
        }

        if (this.type === TYPE_GREEN) {
            if (this.lastType === TYPE_WATER) {
                if (this.step === 0) {
                    this.setImage("water3");
                    this.step = 1;
                } else {
                    this.setImage("green");
                }
            }
            return;
        }
    },

});

/*
 * クリア
 */
function gameClear() {

    var scene = App._scenes[App._sceneIndex];

    time = Math.floor(((new Date()).getTime() - startTime.getTime()) / 100) / 10;

    Label({
        text: "CLEAR !",
        fontSize: 100,
        fontWeight: 800,
        fill: "white",
        stroke: "red",
        strokeWidth: 20,
    }).addChildTo(scene)
    .setPosition(-700, scene.gridY.center())
    .tweener.to({x: scene.gridX.center()}, 400, "easeOutExpo")
    .wait(500)
    .to({x: scene.gridX.center() + 800}, 200, "easeOutQuad")
    .call(function() {
        Label({
            text: time + " sec",
            fontSize: 80,
            fontWeight: 800,
            fill: "white",
            stroke: "black",
            strokeWidth: 20,
        }).addChildTo(scene)
        .setPosition(scene.gridX.center(), scene.gridY.center());

        const bestTime = window.localStorage.getItem("best");
        if (!bestTime || bestTime > time) {
            Label({
                text: "New record !",
                fontSize: 60,
                fontWeight: 800,
                fill: "white",
                stroke: "red",
                strokeWidth: 20,
            }).addChildTo(scene)
            .setPosition(scene.gridX.center(), scene.gridY.center() - 120);
            window.localStorage.setItem("best", time);
        }

    })
    .wait(1000)
    .call(function() {

        Label({
            text: "Tap to exit",
            fontSize: 30,
            fontWeight: 800,
            fill: "black",
            stroke: "white",
            strokeWidth: 5,
    }).addChildTo(scene)
        .setPosition(scene.gridX.center(), scene.gridY.center() + 100);

        scene.on("pointstart", function() {
            scene.exit();
        });
        
    })
    .play();
}

let gameStart = false;
let startTime;
let endTime;

let timeoutID;

phina.main(function() {
    App = GameApp({
        assets: ASSETS,
        startLabel: 'TitleScene',
        scenes: [
            {
                label: 'TitleScene',
                className: 'TitleScene',
                nextLabel: "GameScene",
            }, {
                label: 'GameScene',
                className: 'GameScene',
                nextLabel: "TitleScene",
            }
        ],
    });

    App.fps = 60;
    // App.enableStats();

    App.run();

});

phina.define("Demo", {
    superClass: "RectangleShape",
    init: function(options) {

        this.superInit({
            width: 384,
            height: 384,
            fill: "#ecf0f1",
            strokeWidth: 10,
            stroke: "#2c3e50",
            cornerRadius: 10,
        });

        const self = this;

        self.gridX = Grid({width: 384, columns: 6});
        self.gridY = Grid({width: 384, columns: 6});
 
        self.blocks = [
            [Block(0, 0), Block(1, 0), Block(2, 0), Block(3, 0), Block(4, 0), Block(5, 0), Block(6, 0)],
            [Block(0, 1), Block(1, 1), Block(2, 1), Block(3, 1), Block(4, 1), Block(5, 1), Block(6, 1)],
            [Block(0, 2), Block(1, 2), Block(2, 2), Block(3, 2), Block(4, 2), Block(5, 2), Block(6, 2)],
            [Block(0, 3), Block(1, 3), Block(2, 3), Block(3, 3), Block(4, 3), Block(5, 3), Block(6, 3)],
            [Block(0, 4), Block(1, 4), Block(2, 4), Block(3, 4), Block(4, 4), Block(5, 4), Block(6, 4)],
            [Block(0, 5), Block(1, 5), Block(2, 5), Block(3, 5), Block(4, 5), Block(5, 5), Block(6, 5)],
            [Block(0, 6), Block(1, 6), Block(2, 6), Block(3, 6), Block(4, 6), Block(5, 6), Block(6, 6)],
        ];

        self.blocks.forEach((rows, y) => {
            rows.forEach((block, x) => {
                block.addChildTo(this).setPosition(this.gridX.span(x) - this.width / 2, this.gridY.span(y) - this.height / 2);
            });
        });

        function reset() {
            self.blocks.forEach((rows) => {
                rows.forEach((block) => {
                    block.type = TYPE_GREEN;
                    block.lastType = TYPE_GREEN;
                    block.setImage("green");
                });
            });
        }

        function demo1() {
            return self.tweener
                .call(() => {
                    self.blocks[3][3].changeToFire();
                })
                .wait(600).call(() => self.blocks[2][3].changeToWater())
                .wait(300).call(() => self.blocks[3][4].changeToWater())
                .wait(300).call(() => self.blocks[4][3].changeToWater())
                .wait(300).call(() => self.blocks[3][2].changeToWater())
                .wait(600).call(() => self.blocks[3][3].changeToGroundFromFire());
        }

        // function demo2() {
        //     return self.tweener
        //         .call(() => {
        //             self.blocks[2][3].changeToFire();
        //             self.blocks[3][4].changeToFire();
        //             self.blocks[4][3].changeToFire();
        //             self.blocks[3][2].changeToFire();
        //         })
        //         .wait(800).call(() => self.blocks[3][3].changeToWater())
        //         .wait(800).call(() => self.blocks[3][3].changeToGreenFromWater())
        //         .wait(1600).call(() => self.blocks[3][3].changeToWater())
        //         .wait(800).call(() => self.blocks[3][3].changeToGreenFromWater());
        // }

        function demo2() {
            return self.tweener
                .call(() => {
                    self.blocks[2][2].changeToFire();
                    self.blocks[2][3].changeToFire();
                    self.blocks[2][4].changeToFire();
                    self.blocks[3][4].changeToFire();
                    self.blocks[4][4].changeToFire();
                    self.blocks[4][3].changeToFire();
                    self.blocks[4][2].changeToFire();
                    self.blocks[3][2].changeToFire();
                })
                .wait(800).call(() => self.blocks[3][3].changeToWater())
                .wait(800).call(() => self.blocks[3][3].changeToGreenFromWater())
                .wait(1600).call(() => self.blocks[3][3].changeToWater())
                .wait(800).call(() => self.blocks[3][3].changeToGreenFromWater())

                .wait(1600).call(() => self.blocks[1][2].changeToWater())
                .wait(100).call(() => self.blocks[1][3].changeToWater())
                .wait(100).call(() => self.blocks[1][4].changeToWater())
                .wait(100).call(() => self.blocks[2][5].changeToWater())
                .wait(100).call(() => self.blocks[3][5].changeToWater())
                .wait(100).call(() => self.blocks[4][5].changeToWater())
                .wait(100).call(() => self.blocks[5][4].changeToWater())
                .wait(100).call(() => self.blocks[5][3].changeToWater())
                .wait(100).call(() => self.blocks[5][2].changeToWater())
                .wait(100).call(() => self.blocks[4][1].changeToWater())
                .wait(100).call(() => self.blocks[3][1].changeToWater())
                .wait(100).call(() => self.blocks[2][1].changeToWater())
                .wait(1000).call(() => self.blocks[3][3].changeToWater())
                .wait(600).call(() => {
                    self.blocks[2][2].changeToGroundFromFire();
                    self.blocks[2][3].changeToGroundFromFire();
                    self.blocks[2][4].changeToGroundFromFire();
                    self.blocks[3][4].changeToGroundFromFire();
                    self.blocks[4][4].changeToGroundFromFire();
                    self.blocks[4][3].changeToGroundFromFire();
                    self.blocks[4][2].changeToGroundFromFire();
                    self.blocks[3][2].changeToGroundFromFire();
                });
        }

        function demo3() {
            return self.tweener
                .call(() => {
                    self.blocks[2][1].changeToFire();
                    self.blocks[2][2].changeToFire();
                    self.blocks[2][3].changeToFire();
                    self.blocks[2][4].changeToFire();
                    self.blocks[2][5].changeToFire();
                    self.blocks[3][5].changeToFire();
                    self.blocks[4][5].changeToFire();
                    self.blocks[4][4].changeToFire();
                    self.blocks[4][3].changeToFire();
                    self.blocks[4][2].changeToFire();
                    self.blocks[4][1].changeToFire();
                    self.blocks[3][1].changeToFire();
                    self.blocks[2][1].changeToFire();
                    self.blocks[3][3].changeToFire();

                    self.blocks[1][1].changeToWater();
                    self.blocks[1][2].changeToWater();
                    self.blocks[1][3].changeToWater();
                    self.blocks[1][4].changeToWater();
                    self.blocks[1][5].changeToWater();

                    self.blocks[2][6].changeToWater();
                    self.blocks[3][6].changeToWater();
                    self.blocks[4][6].changeToWater();

                    self.blocks[5][1].changeToWater();
                    self.blocks[5][2].changeToWater();
                    self.blocks[5][3].changeToWater();
                    self.blocks[5][4].changeToWater();
                    self.blocks[5][5].changeToWater();

                    self.blocks[2][0].changeToWater();
                    self.blocks[3][0].changeToWater();
                    self.blocks[4][0].changeToWater();
                })
                .wait(600)
                .call(() => self.blocks[3][2].changeToWater())
                .wait(400)
                .call(() => self.blocks[3][2].changeToGreenFromWater())
                .wait(1000)
                .call(() => self.blocks[3][4].changeToWater())
                .wait(400)
                .call(() => self.blocks[3][4].changeToGreenFromWater())
                .wait(1000)
                .call(() => self.blocks[3][2].changeToWater())
                .wait(400)
                .call(() => self.blocks[3][2].changeToGreenFromWater())
                .wait(1000)
                .call(() => self.blocks[3][4].changeToWater())
                .wait(400)
                .call(() => self.blocks[3][4].changeToGreenFromWater())
                .wait(1200)
                .call(() => self.blocks[2][2].changeToGroundFromFire(true))
                .wait(2000)
                .call(() => self.blocks[3][2].changeToWater())
                .wait(300)
                .call(() => self.blocks[2][2].changeToWater())
                .wait(600)
                .call(() => self.blocks[3][4].changeToWater())
                .wait(200)
                .call(() => self.blocks[2][1].changeToGroundFromFire())
                .call(() => self.blocks[2][3].changeToGroundFromFire())
                .call(() => self.blocks[2][4].changeToGroundFromFire())
                .call(() => self.blocks[2][5].changeToGroundFromFire())
                .call(() => self.blocks[3][5].changeToGroundFromFire())
                .call(() => self.blocks[4][5].changeToGroundFromFire())
                .call(() => self.blocks[4][4].changeToGroundFromFire())
                .call(() => self.blocks[4][3].changeToGroundFromFire())
                .call(() => self.blocks[4][2].changeToGroundFromFire())
                .call(() => self.blocks[4][1].changeToGroundFromFire())
                .call(() => self.blocks[3][1].changeToGroundFromFire())
                .call(() => self.blocks[2][1].changeToGroundFromFire())
                .call(() => self.blocks[3][3].changeToGroundFromFire())
                ;
        }

        self.tweener.call(() => {
            demo1().wait(1500).call(() => {
                reset();
                demo2().wait(1500).call(() => {
                    reset();
                    demo3().wait(1500).call(() => {
                        reset();
                    }).play();
                }).play();
            }).play();
        }).setLoop(true).play();

    },
});



const util = {};
util.shuffleArray = (inputArray) => {
    inputArray.sort(() => Math.random() - 0.5);
};
