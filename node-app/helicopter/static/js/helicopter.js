/*jslint browser: true, undef: true, eqeqeq: true, nomen: true, white: true */
/*global window: false, document: false */
/* Human readable keyCode index */
var KEY = {
  'BACKSPACE': 8,
  'TAB': 9,
  'NUM_PAD_CLEAR': 12,
  'ENTER': 13,
  'SHIFT': 16,
  'CTRL': 17,
  'ALT': 18,
  'PAUSE': 19,
  'CAPS_LOCK': 20,
  'ESCAPE': 27,
  'SPACEBAR': 32,
  'PAGE_UP': 33,
  'PAGE_DOWN': 34,
  'END': 35,
  'HOME': 36,
  'ARROW_LEFT': 37,
  'ARROW_UP': 38,
  'ARROW_RIGHT': 39,
  'ARROW_DOWN': 40,
  'PRINT_SCREEN': 44,
  'INSERT': 45,
  'DELETE': 46,
  'SEMICOLON': 59,
  'WINDOWS_LEFT': 91,
  'WINDOWS_RIGHT': 92,
  'SELECT': 93,
  'NUM_PAD_ASTERISK': 106,
  'NUM_PAD_PLUS_SIGN': 107,
  'NUM_PAD_HYPHEN-MINUS': 109,
  'NUM_PAD_FULL_STOP': 110,
  'NUM_PAD_SOLIDUS': 111,
  'NUM_LOCK': 144,
  'SCROLL_LOCK': 145,
  'EQUALS_SIGN': 187,
  'COMMA': 188,
  'HYPHEN-MINUS': 189,
  'FULL_STOP': 190,
  'SOLIDUS': 191,
  'GRAVE_ACCENT': 192,
  'LEFT_SQUARE_BRACKET': 219,
  'REVERSE_SOLIDUS': 220,
  'RIGHT_SQUARE_BRACKET': 221,
  'APOSTROPHE': 222
};

(function() {
  /* 0 - 9 */
  for (var i = 48; i <= 57; i++) {
    KEY['' + (i - 48)] = i;
  }
  /* A - Z */
  for (i = 65; i <= 90; i++) {
    KEY['' + String.fromCharCode(i)] = i;
  }
  /* NUM_PAD_0 - NUM_PAD_9 */
  for (i = 96; i <= 105; i++) {
    KEY['NUM_PAD_' + (i - 96)] = i;
  }
  /* F1 - F12 */
  for (i = 112; i <= 123; i++) {
    KEY['F' + (i - 112 + 1)] = i;
  }
})();

var Heli = {};

Heli.Consts = [{
  name: "State",
  consts: ["WAITING", "WAITING_USER", "PAUSED", "PLAYING", "DYING"]
}, {
  name: "Dir",
  consts: ["UP", "DOWN"]
}, {
  name: "Mode",
  consts: ["SINGLE", "CLIENT", "HOST"]
}, ];

Heli.FOOTER_HEIGHT = 20;
Heli.FPS = 19;

Heli.Color = {
  BACKGROUND: "#C3CCB5",
  BLOCK: "#403B37",
  HOME_TEXT: "#403B37",
  RAND_BLOCK: "#403B37",
  USER: "#AAAAAA",
  TARGET_STROKE: "#B24524",
  DIALOG_TEXT: "#333333",
  FOOTER_BG: "#403B37",
  FOOTER_TEXT: "#C3CCB5"
};

Heli.Sender = {
  CLIENT: "CLIENT",
  HOST: "HOST",
  CONTROLLER: "CONTROLLER"
};

Heli.Socket = function(params) {
  var url = params.url,
    msgHandler = params.msgHandler,
    gameEventHandler = params.gameEventHandler,
    onHostReady = params.onHostReady,
    onDeclined = params.onDeclined,
    onReady = params.onReady,
    onControllerReady = params.onControllerReady,
    socket = null,
    passcode = params.passcode,
    hostToken = "";

  function init() {
    if (url != null) {
      socket = io.connect(url);

      // Adding empty handlers if not defined
      msgHandler = ((msgHandler != null) ? msgHandler : function(data) {
        console.log("Msg Handler: " + data);
      });
      gameEventHandler = ((gameEventHandler != null) ? gameEventHandler : function(data) {
        console.log("Game Event Handler: " + data);
      });
      onHostReady = ((onHostReady != null) ? onHostReady : function(data) {
        console.log("Host Ready: " + data);
      });
      onDeclined = ((onDeclined != null) ? onDeclined : function(data) {
        console.log("Declined: " + data);
      });
      onReady = ((onReady != null) ? onReady : function(data) {
        console.log("Ready: " + data);
      });
      onControllerReady = ((onControllerReady != null) ? onControllerReady : function(data) {
        console.log("Controller Ready: " + data);
      });

      socket.on("message", msgHandler);
      socket.on("gameEvent", gameEventHandler);

      socket.on("hostReady", function(data) {
        console.log("Waiting for the other player...Share this token with your friend : " + data);
        hostToken = data;
        onHostReady(data);
      });
      socket.on("declined", onDeclined);
      socket.on("ready", onReady);
      socket.on("controllerReady", onControllerReady);

      // Host a socket by default for controllers to connect to
      host();
    }
  }

  function host() {
    if (socket != null)
      socket.emit("host", passcode);
  }

  function join(tkn) {
    if (socket != null)
      socket.emit("join", tkn);
  }

  function sendGameEvent(e, tkn) {
    if (socket != null) {
      if (tkn == null)
        tkn = hostToken;
      console.log(e.type);

      var data = {};
      data.type = e.type;
      data.keyCode = e.keyCode;
      data.x = e.x;
      data.y = e.y;

      socket.emit("gameEvent", tkn, data);
    }
  }

  function sendMessage(msg) {
    if (socket != null)
      socket.emit('message', msg);
  }

  function broadcastMessage(msg) {
    if (socket != null)
      socket.emit('broadcast', msg);
  }

  return {
    "init": init,
    "host": host,
    "join": join,
    "sendGameEvent": sendGameEvent,
    "sendMessage": sendMessage,
    "broadcastMessage": broadcastMessage,
  };
};

Heli.User = function(params) {

  var _distance = 0,
    _position = null,
    _trail = null,
    _numLines = 50,
    _momentum = null,
    _thrusters = false,
    _acceleration = 0,
    _collided = false;

  function finished() {
    _collided = true;
    if (_distance > bestDistance()) {
      localStorage.bestDistance = _distance;
    }
  }

  function bestDistance() {
    return parseInt(localStorage.bestDistance || 0, 10);
  }

  function distance() {
    return _distance;
  }

  function position() {
    return _position;
  }

  function collided() {
    return _collided;
  }

  function setThrusters(t) {
    _thrusters = t;
  }

  function setAcceleration(a) {
    _acceleration = a;
  }

  function acceleration() {
    return _acceleration;
  }

  function thrustersOn() {
    return _thrusters;
  }

  function reset(pos) {
    _distance = 0;
    _position = ((pos != null) ? pos : {
      x: 5,
      y: 50
    });
    _trail = [];
    _momentum = 0;
    _thrusters = false;
    _acceleration = 0;
    _collided = false;
  }

  function move() {

    _distance += 1;

    _momentum += ((_thrusters) ? 0.4 : -0.5);
    _position.y += _momentum;

    var xPos = _position.x;
    xPos += (_acceleration * 1);
    xPos = ((xPos < 5) ? 5 : ((xPos > _numLines - 5) ? _numLines - 5 : xPos));
    _position.x = xPos;

    if (params.tick() % 2 === 0) {
      _trail.push(_position);
    }

    if (_trail.length > 4) {
      _trail.shift();
    }

    return _position;
  }

  function trail() {
    return _trail;
  }

  return {
    "reset": reset,
    "move": move,
    "trail": trail,
    "position": position,
    "collided": collided,
    "setThrusters": setThrusters,
    "setAcceleration": setAcceleration,
    "distance": distance,
    "finished": finished,
    "bestDistance": bestDistance,
    "acceleration": acceleration,
    "thrustersOn": thrustersOn
  };
};

Heli.Screen = function(params) {

  var _width = params.width,
    _height = params.height,
    _numLines = 50,
    _direction = Heli.Dir.UP,
    _lineWidth = _width / _numLines,
    _lineHeight = _height / 100,
    _gap = null,
    _randomBlock = null,
    magnitude = null,
    changeDir = 0,
    _blockY = null,
    _blockHeight = 20,
    heliHeight = (30 / params.height) * 100, // Convert px to %
    _terrain = [],
    _terrainPatterns = null,
    _terrainIndex = 0,
    img = new Image(),
    img2 = new Image();

  img.src = './static/images/heli.png';
  img2.src = './static/images/heli2.png';

  function width() {
    return _width;
  }

  function height() {
    return _height;
  }

  function random() {
    if (_terrainPatterns != null) {
      _terrainIndex = (_terrainIndex + 1) % _terrainPatterns.length;
      return _terrainPatterns[_terrainIndex];
    }
    return Math.random();
  }

  function init(patterns) {

    magnitude = null;
    _direction = Heli.Dir.UP;
    changeDir = 0;
    _randomBlock = null;
    _blockY = null;
    _gap = 80;
    _terrain = [];
    _terrainPatterns = patterns;
    _terrainIndex = 0;

    var i,
      size = (100 - _gap) / 2,
      obj = {
        "top": size,
        "bottom": size
      };

    for (i = 0; i < _numLines; i += 1) {
      _terrain.push(obj);
    }
  }

  function draw(ctx) {
    ctx.fillStyle = Heli.Color.BACKGROUND;
    ctx.fillRect(0, 0, _width, _height);
    ctx.fill();
  }

  function toPix(userPos) {
    return _height - (_height * (userPos / 100));
  }

  function randomNum(low, high) {
    return low + Math.floor(random() * (high - low));
  }

  function moveTerrain() {

    var toAdd, len, rand,
      last = _terrain[Math.round(_terrain.length - 1)];

    if (_randomBlock === null) {
      rand = Math.floor(random() * 50);
      if (params.tick() % rand === 0) {
        _randomBlock = _numLines;
        _blockY = randomNum(last.bottom, 100 - last.top);
      }
    } else {
      _randomBlock -= 1;
      if (_randomBlock < 0) {
        _randomBlock = null;
      }
    }

    if (changeDir === 0) {
      _direction = (_direction === Heli.Dir.DOWN) ? Heli.Dir.UP : Heli.Dir.DOWN;
      len = (_direction === Heli.Dir.DOWN) ? last.bottom : last.top;
      magnitude = randomNum(1, 4);
      changeDir = randomNum(5, len / magnitude);
      if (params.tick() % 2 === 0) {
        if (_direction === Heli.Dir.DOWN) {
          last.top += 1;
        } else {
          last.bottom += 1;
        }
      }
    }

    changeDir--;

    toAdd = (_direction === Heli.Dir.UP) ? {
      "top": -magnitude,
      "bottom": magnitude
    } : {
      "top": magnitude,
      "bottom": -magnitude
    };

    _terrain.push({
      "top": last.top + toAdd.top,
      "bottom": last.bottom + toAdd.bottom
    });
    _terrain.shift();
  }

  function drawTerrain(ctx) {

    var i, obj, bottom;

    ctx.fillStyle = Heli.Color.BLOCK;

    for (i = 0; i < _numLines; i += 1) {
      obj = _terrain[i];
      bottom = obj.bottom;
      ctx.fillRect(Math.floor(i * _lineWidth), 0,
        Math.ceil(_lineWidth), obj.top * _lineHeight);
      ctx.fillRect(Math.floor(i * _lineWidth),
        _height - bottom * _lineHeight,
        Math.ceil(_lineWidth),
        _height);
    }

    if (_randomBlock !== null) {
      var start = toPix(_blockY);
      ctx.fillStyle = Heli.Color.RAND_BLOCK;

      ctx.fillRect(_randomBlock * _lineWidth, start,
        _lineWidth, start - toPix(_blockY + _blockHeight));
    }


  }

  function drawUser(ctx, userPos, trail, alternate, label) {

    var i, len, mid, image;
    image = (alternate && params.tick()) % 4 < 2 ? img : img2;

    ctx.fillStyle = Heli.Color.TARGET_STROKE;
    ctx.beginPath();
    ctx.drawImage(image, Math.round(userPos.x) * _lineWidth - 40,
      toPix(userPos.y) - (heliHeight / 2));
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = Heli.Color.USER;
    ctx.fillText(label, Math.round(userPos.x) * _lineWidth - 12, toPix(userPos.y) + 20);
  }

  function collided(pos1, pos2) {

    var terrain = _terrain[Math.round(pos1.x)],
      size = heliHeight / 2;

    var hitBlock = (_randomBlock === Math.round(pos1.x) ||
        _randomBlock === Math.round(pos1.x) - 1) &&
      (pos1.y < (_blockY + size)) &&
      (pos1.y > (_blockY - _blockHeight));

    if (pos2 != null) {
      if (Math.abs(pos1.x - pos2.x) <= 2) {
        if (Math.abs(pos1.y - pos2.y) <= heliHeight) {
          return true;
        }
      }
    }

    return (pos1.y > (100 - terrain.top)) && 100 - terrain.top ||
      pos1.y < (terrain.bottom + size) && (terrain.bottom + size) ||
      hitBlock;
  }

  function drawTarget(ctx, pos, amount) {
    ctx.strokeStyle = Heli.Color.TARGET_STROKE;
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.arc((Math.round(pos.x) * _lineWidth) - 10, toPix(pos.y) + 10,
      50 - amount, 0, Math.PI * 2, false);
    ctx.stroke();
    ctx.closePath();
  }

  return {
    "draw": draw,
    "drawUser": drawUser,
    "drawTerrain": drawTerrain,
    "moveTerrain": moveTerrain,
    "drawTarget": drawTarget,
    "toPix": toPix,
    "init": init,
    "width": width,
    "height": height,
    "collided": collided
  };
};

Heli.Audio = function(game) {

  var files = [],
    endEvents = [],
    progressEvents = [],
    playing = [];

  function load(name, path, cb) {

    var f = files[name] = document.createElement("audio");

    progressEvents[name] = function(event) {
      progress(event, name, cb);
    };

    f.addEventListener("canplaythrough", progressEvents[name], true);
    f.setAttribute("preload", "auto");
    f.setAttribute("autobuffer", "true");
    f.setAttribute("src", path);
    f.pause();
  }

  function progress(event, name, callback) {
    if (event.loaded === event.total && typeof callback === "function") {
      callback();
      files[name].removeEventListener("canplaythrough",
        progressEvents[name], true);
    }
  }

  function disableSound() {
    for (var i = 0; i < playing.length; i++) {
      files[playing[i]].pause();
      files[playing[i]].currentTime = 0;
    }
    playing = [];
  }

  function stop(file) {
    files[file].pause();
    files[file].currentTime = 0;
  }

  function ended(name) {

    var i, tmp = [],
      found = false;

    files[name].removeEventListener("ended", endEvents[name], true);

    for (i = 0; i < playing.length; i++) {
      if (!found && playing[i]) {
        found = true;
      } else {
        tmp.push(playing[i]);
      }
    }
    playing = tmp;
  }

  function play(name) {
    if (!game.soundDisabled()) {
      endEvents[name] = function() {
        ended(name);
      };
      playing.push(name);
      files[name].addEventListener("ended", endEvents[name], true);
      files[name].play();
    }
  }

  function pause() {
    for (var i = 0; i < playing.length; i++) {
      files[playing[i]].pause();
    }
  }

  function resume() {
    for (var i = 0; i < playing.length; i++) {
      files[playing[i]].play();
    }
  }

  return {
    "disableSound": disableSound,
    "load": load,
    "play": play,
    "stop": stop,
    "pause": pause,
    "resume": resume
  };
};

var HELICOPTER = (function() {

  /* Generate Constants from Heli.Consts arrays */
  (function(glob, consts) {
    for (var x, i = 0; i < consts.length; i += 1) {
      glob[consts[i].name] = {};
      for (x = 0; x < consts[i].consts.length; x += 1) {
        glob[consts[i].name][consts[i].consts[x]] = x;
      }
    }
  })(Heli, Heli.Consts);

  var state = Heli.State.WAITING,
    mode = Heli.Mode.SINGLE,
    timer = null,
    audio = null,
    screen = null,
    user1 = null,
    user2 = null,
    died = 0,
    _tick = 0,
    serverURL = null,
    socket = null,
    passcode = null,
    hostToken = null,
    token = null;

  function keyDown(e, user) {
    if (e.sender === Heli.Sender.CONTROLLER || user == null || user === user1) {
      user = user1;
      sendGameEvent(e);
    }

    if (e.keyCode === KEY.S) {
      localStorage.soundDisabled = !soundDisabled();
    } else if (state === Heli.State.WAITING && e.keyCode === KEY.ENTER) {
      // Single user mode by default
      mode = Heli.Mode.SINGLE;
      newGame();
    } else if (state === Heli.State.WAITING && e.keyCode === KEY.H) {
      // Host a new game
      mode = Heli.Mode.HOST;
      state = Heli.State.WAITING_USER;
      socket.host();
    } else if (state === Heli.State.WAITING && e.keyCode === KEY.J) {
      // Join a game
      mode = Heli.Mode.CLIENT;
      state = Heli.State.WAITING_USER;
      token = prompt("Enter the host token to connect", token);
      socket.join(token);
    } else if (state === Heli.State.WAITING_USER && e.keyCode === KEY.ESCAPE) {
      mode = Heli.Mode.SINGLE;
      dialog("Press enter or click mouse to start", true);
      state = Heli.State.WAITING;
    } else if (state === Heli.State.PLAYING && e.keyCode === KEY.P) {
      state = Heli.State.PAUSED;
      window.clearInterval(timer);
      timer = null;
      dialog("Paused");
    } else if (state === Heli.State.PAUSED && e.keyCode === KEY.P) {
      state = Heli.State.PLAYING;
      timer = window.setInterval(mainLoop, 1000 / Heli.FPS);
    } else if (state == Heli.State.PLAYING && (e.keyCode === KEY.ARROW_UP || e.keyCode === KEY.ENTER)) {
      audio.play("start");
      user.setThrusters(true);
    } else if (state == Heli.State.PLAYING && e.keyCode === KEY.ARROW_DOWN) {
      audio.stop("start");
      user.setThrusters(false);
    } else if (state === Heli.State.PLAYING && e.keyCode === KEY.ARROW_LEFT) {
      audio.play("start");
      user.setAcceleration(-1);
    } else if (state === Heli.State.PLAYING && e.keyCode === KEY.ARROW_RIGHT) {
      audio.play("start");
      user.setAcceleration(1);
    }

  }

  function keyUp(e, user) {
    if (e.sender === Heli.Sender.CONTROLLER || user == null || user === user1) {
      user = user1;
      sendGameEvent(e);
    }

    if (e.keyCode === KEY.ENTER) {
      audio.stop("start");
      user.setThrusters(false);
    } else if (e.keyCode === KEY.ARROW_UP || e.keyCode === KEY.ARROW_DOWN) {
      audio.stop("start");
      user.setThrusters(false);
    } else if (e.keyCode === KEY.ARROW_LEFT || e.keyCode === KEY.ARROW_RIGHT) {
      audio.stop("start");
      user.setAcceleration(0);
    }
  }

  function mouseDown(e, user) {
    if (e.sender === Heli.Sender.CONTROLLER || user == null || user === user1) {
      user = user1;
      sendGameEvent(e);
    }

    if (state === Heli.State.PLAYING) {
      audio.play("start");
      user.setThrusters(true);
    } else if (e.target != null && e.target.nodeName === "CANVAS" && state === Heli.State.WAITING) {
      // Single user mode by default
      mode = Heli.Mode.SINGLE;
      newGame();
    }
  }

  function mouseUp(e, user) {
    if (e.sender === Heli.Sender.CONTROLLER || user == null || user === user1) {
      user = user1;
      sendGameEvent(e);
    }

    audio.stop("start");
    if (state === Heli.State.PLAYING) {
      user.setThrusters(false);
    }
  }

  function joystickHandler(e, user) {
    if (e.sender === Heli.Sender.CONTROLLER || user == null || user === user1) {
      user = user1;
      sendGameEvent(e);
    }

    audio.play("start");
    user.setThrusters((e.y > 0));
    user.setAcceleration(e.x);

    if (e.x === 0 && e.y === 0)
      audio.stop("start");
  }

  function gameEventHandler(e) {
    var user;
    if (e.sender === Heli.Sender.HOST && mode === Heli.Mode.HOST) {
      // Ignore. Do nothing
      return;
    } else if (e.sender === Heli.Sender.CLIENT && mode === Heli.Mode.CLIENT) {
      // Ignore. Do nothing
      return;
    } else if (e.sender === Heli.Sender.CONTROLLER) {
      // Received events from the controller.
      user = user1;
    } else {
      // Event from the second player
      user = user2;
    }

    if (e.type === "joystick")
      joystickHandler(e, user);
    else if (e.type === "keydown")
      keyDown(e, user);
    else if (e.type === "keyup")
      keyUp(e, user);
    else if (e.type === "mousedown")
      mouseDown(e, user);
    else if (e.type === "mouseup")
      mouseUp(e, user);
  }

  function sendGameEvent(e) {
    if (state != Heli.State.PLAYING)
      return;

    // If the game is in multi-user mode, process the event and forward to others
    if (mode === Heli.Mode.HOST)
      socket.sendGameEvent(e, hostToken);
    else if (mode === Heli.Mode.CLIENT)
      socket.sendGameEvent(e, token);
  }

  function onHostReady(tkn) {
    if (mode === Heli.Mode.HOST)
      dialog("Waiting for the other player to connect...", true);

    var spnToken = document.getElementById("spnToken");
    spnToken.innerHTML = "<strong>Host token</strong>: " + tkn + "<br/><p style='text-align: right'><img src='https://chart.googleapis.com/chart?cht=qr&chs=100x100&chl=" + document.URL + "|" + tkn + "' /></p>";

    hostToken = tkn;
    drawScore();
  }

  function onDeclined(data) {
    // Join a game
    mode = Heli.Mode.CLIENT;
    state = Heli.State.WAITING_USER;
    token = prompt("Incorrect token. Enter the correct host token to connect", token);
    socket.join(token);
  }

  function onReady(data) {
    // Start the game
    newGame(data);
  }

  function tick() {
    return _tick;
  }

  function newGame(patterns) {
    if (state != Heli.State.PLAYING) {
      user1.reset({
        x: 5,
        y: 50
      });
      user2.reset({
        x: 10,
        y: 50
      });

      // Positioning the host first
      if (mode === Heli.Mode.HOST) {
        user1.reset({
          x: 10,
          y: 50
        });
        user2.reset({
          x: 5,
          y: 50
        });
      }

      screen.init(patterns);
      timer = window.setInterval(mainLoop, 1000 / Heli.FPS);
      state = Heli.State.PLAYING;
    }
  }

  var _prevDialogText = "";

  function dialog(text, clearPrevText) {
    ctx.font = "14px silkscreen";
    if (clearPrevText) {
      var prevTextWidth = ctx.measureText(_prevDialogText).width,
        prevTextHeight = ctx.measureText(_prevDialogText).height,
        prevX = (screen.width() - prevTextWidth) / 2,
        prevY = (screen.height() / 2) - 7;

      ctx.fillStyle = Heli.Color.BACKGROUND;
      ctx.fillRect(prevX, prevY - 20, prevTextWidth, 20);
    }

    var textWidth = ctx.measureText(text).width,
      x = (screen.width() - textWidth) / 2,
      y = (screen.height() / 2) - 7;

    ctx.fillStyle = Heli.Color.DIALOG_TEXT;
    ctx.fillText(text, x, y);

    _prevDialogText = text;
  }

  function soundDisabled() {
    return localStorage.soundDisabled === "true";
  }

  function mainLoop() {
    ++_tick;
    var pos1 = 0,
      pos2 = 0;
    if (state === Heli.State.PLAYING) {

      pos1 = user1.move();

      if (mode === Heli.Mode.HOST || mode === Heli.Mode.CLIENT)
        pos2 = user2.move();

      console.log(user2.thrustersOn());

      screen.moveTerrain();

      screen.draw(ctx);
      screen.drawTerrain(ctx);

      var tmp;
      if (mode === Heli.Mode.HOST || mode === Heli.Mode.CLIENT)
        tmp = screen.collided(pos1, pos2);
      else
        tmp = screen.collided(pos1);

      if (tmp !== false) {
        if (tmp !== true) {
          pos1.y = tmp;
        }
        audio.play("crash");
        state = Heli.State.DYING;
        died = _tick;
        user1.finished();
      } else {

        if (mode === Heli.Mode.HOST || mode === Heli.Mode.CLIENT) {
          tmp = screen.collided(pos2, pos1);
          if (tmp !== false) {
            if (tmp !== true) {
              pos2.y = tmp;
            }
            audio.play("crash");
            state = Heli.State.DYING;
            died = _tick;
            user2.finished();
          }
        }
      }

      screen.drawUser(ctx, pos1, user1.trail(), true, 1);
      if (mode === Heli.Mode.HOST || mode === Heli.Mode.CLIENT)
        screen.drawUser(ctx, pos2, user2.trail(), true, 2);

    } else if (state === Heli.State.DYING && (_tick - died) > (Heli.FPS / 1)) {
      dialog("Press enter or click mouse to start");

      mode = Heli.Mode.SINGLE;
      state = Heli.State.WAITING;
      window.clearInterval(timer);
      timer = null;
    } else if (state === Heli.State.DYING) {
      pos1 = user1.position();
      if (mode === Heli.Mode.HOST || mode === Heli.Mode.CLIENT)
        pos2 = user2.position();

      screen.draw(ctx);
      screen.drawTerrain(ctx);
      screen.drawUser(ctx, pos1, user1.trail(), false, 1);
      if (mode === Heli.Mode.HOST || mode === Heli.Mode.CLIENT) {
        screen.drawUser(ctx, pos2, user2.trail(), false, 2);
        if (user1.collided())
          screen.drawTarget(ctx, pos1, _tick - died);
        if (user2.collided())
          screen.drawTarget(ctx, pos2, _tick - died);
      } else
        screen.drawTarget(ctx, pos1, _tick - died);
    }

    drawScore();
  }


  function drawScore() {

    ctx.font = "12px silkscreen";

    var recordText = "Best: " + user1.bestDistance() + "m",
      distText = "Distance: " + user1.distance() + "m",
      tokenText = "Host Token: " + hostToken,
      textWidth = ctx.measureText(recordText).width,
      textY = screen.height() + 15;

    ctx.fillStyle = Heli.Color.FOOTER_BG;
    ctx.fillRect(0, screen.height(), screen.width(), Heli.FOOTER_HEIGHT);

    ctx.fillStyle = Heli.Color.FOOTER_TEXT;
    ctx.fillText(distText, 5, textY);
    if (hostToken != null)
      ctx.fillText(tokenText, (screen.width() / 2) - (ctx.measureText(tokenText).width / 2), textY);
    ctx.fillText(recordText, screen.width() - (textWidth + 5), textY);
  }

  function init(wrapper, root, url) {
    if (url != null) {
      passcode = prompt("Enter the passcode", "heli");

      var socketParams = {
        "url": url,
        "passcode": passcode,
        "gameEventHandler": gameEventHandler,
        "onHostReady": onHostReady,
        "onDeclined": onDeclined,
        "onReady": onReady
      };
      socket = new Heli.Socket(socketParams);
      socket.init();
    }

    var width = wrapper.offsetWidth,
      height = (width / 4) * 3,
      canvas = document.createElement("canvas");

    canvas.setAttribute("width", width + "px");
    canvas.setAttribute("height", (height + 20) + "px");

    wrapper.appendChild(canvas);

    ctx = canvas.getContext('2d');

    audio = new Heli.Audio({
      "soundDisabled": soundDisabled
    });
    screen = new Heli.Screen({
      "tick": tick,
      "width": width,
      "height": height
    });
    user1 = new Heli.User({
      "tick": tick,
      "label": 1
    });
    user2 = new Heli.User({
      "tick": tick,
      "label": 2
    });

    screen.init();
    screen.draw(ctx);

    dialog("Loading ...");

    // disable sound while it sucks
    if (typeof localStorage.soundDisabled === "undefined") {
      localStorage.soundDisabled = true;
    }

    var ext = Modernizr.audio.ogg ? 'ogg' : 'mp3';

    var audio_files = [
      ["start", root + "/audio/motor." + ext],
      ["crash", root + "/audio/crash." + ext]
    ];

    load(audio_files, function() {
      loaded();
    });
  }

  function load(arr, loaded) {

    if (arr.length === 0) {
      loaded();
    } else {
      var x = arr.pop();
      audio.load(x[0], x[1], function() {
        load(arr, loaded);
      });
    }
  }

  function startScreen() {

    screen.draw(ctx);
    screen.drawTerrain(ctx);

    drawScore();

    ctx.fillStyle = Heli.Color.HOME_TEXT;
    ctx.font = "58px silkscreenbold";

    var text = "helicopter";
    var textWidth = ctx.measureText(text).width,
      x = (screen.width() - textWidth) / 2,
      y = screen.height() / 3;

    ctx.fillText(text, x, y);

    ctx.font = "12px silkscreen";

    dialog("Press enter or click mouse to start");
    //ctx.fillText(t, (screen.width() / 2) - (ctx.measureText(t).width / 2), screen.height() / 2);

    ctx.font = "12px silkscreen";
    x = 50;
    y = screen.height() - 150;
    ctx.fillText("Credits:", x, y);

    ctx.font = "16px silkscreen";

    y += 20;
    ctx.fillText("Dale Harvey", x, y);

    y += 20;
    ctx.fillText("Varunkumar Nagarajan", x, y);
  }


  function loaded() {
    document.addEventListener("keydown", keyDown, true);
    document.addEventListener("keyup", keyUp, true);
    document.addEventListener("mousedown", mouseDown, true);
    document.addEventListener("mouseup", mouseUp, true);

    startScreen();
  }

  return {
    "init": init
  };
}());