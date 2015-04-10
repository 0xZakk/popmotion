/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!*****************************!*\
  !*** ./src/utils/global.js ***!
  \*****************************/
/***/ function(module, exports, __webpack_require__) {

	window.redshift = __webpack_require__(/*! ../redshift.js */ 1);

/***/ },
/* 1 */
/*!*************************!*\
  !*** ./src/redshift.js ***!
  \*************************/
/***/ function(module, exports, __webpack_require__) {

	/*
	    Redshift core object
	    
	    Exposes methods to create new classes and define new modules
	*/
	"use strict";
	
	var Action = __webpack_require__(/*! ./action/action.js */ 2),
	    Input = __webpack_require__(/*! ./input/input.js */ 3),
	    Process = __webpack_require__(/*! ./process/process.js */ 4),
	    presets = __webpack_require__(/*! ./action/presets.js */ 5),
	    easing = __webpack_require__(/*! ./utils/easing.js */ 6),
	    calc = __webpack_require__(/*! ./utils/calc.js */ 7);
	    
	// Check if we need to shim indexOf and requireAnimationFrame
	__webpack_require__(/*! ./utils/shim.js */ 8)();   
	
	module.exports = {
	
	    /*
	        Create a new Action controller
	        
	        @return [Action]: Newly-created Action
	    */
	    newAction: function () {
	        return new Action(arguments[0], arguments[1]);
	    },
	    
	    /*
	        Create a new Input controller
	        
	        @return [Input]: Newly-created Input
	    */
	    newInput: function () {
	        return new Input(arguments[0], arguments[1]);
	    },
	    
	    /*
	        Create a new process
	        
	        @param [function]: Function to run every frame
	        @param: Scope
	        @return [Process]
	    */
	    newProcess: function () {
	        return new Process(arguments[0], arguments[1]);
	    },
	    
	    /*
	        Define a new Action preset
	        
	        Syntax
	        
	            .definePreset(name, preset)
	                @param [string]: Name of preset
	                @param [object]: Preset options/properties
	                
	            .definePreset(presets)
	                @param [object]: Multiple presets as named object
	                
	        @return [Redshift]
	    */
	    addPreset: function () {
	        presets.define.apply(presets, arguments);
	        
	        return this;
	    },
	
	    /*
	        Add bezier curve function
	        
	        Add the specified bezier curve the EasingFunction's available easings
	        My favourite bezier curve generator is Lea Verou's excellent http://cubic-bezier.com/
	        
	        @param [string]: Name of the new easing function 
	        @params [number]: x/y coordinates of handles
	    */
	    addBezier: function () {
	        easing.addBezier.apply(easing, arguments);
	        
	        return this;
	    },
	    
	    /*
	        Add value route
	        
	        The default values object is .values, however any provided object
	        will be parsed into values and given a .route property that is the name of
	        its original object. For instance providing
	        
	            example: {
	                test: 20
	            }
	            
	        will be parsed into
	        
	            values: {
	                test: {
	                    current: 20,
	                    route: 'example'
	                }
	            }
	            
	        If we provide a custom route with this name, we can custom-parse values
	        on the way in, and also on the way out.
	    */
	    addRoute: function () {
	        route.add.apply(route, arguments);
	        
	        return this;
	    },
	    
	    //defineSimulation: function () {},
	    
	    calc: calc
	};

/***/ },
/* 2 */
/*!******************************!*\
  !*** ./src/action/action.js ***!
  \******************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var parseArgs = __webpack_require__(/*! ./parse-args.js */ 9),
	    Value = __webpack_require__(/*! ../types/value.js */ 10),
	    Repo = __webpack_require__(/*! ../types/repo.js */ 11),
	    Queue = __webpack_require__(/*! ./queue.js */ 12),
	    Process = __webpack_require__(/*! ../process/process.js */ 4),
	    filters = __webpack_require__(/*! ../filters/filters.js */ 13),
	    processor = __webpack_require__(/*! ./processor.js */ 14),
	    routes = __webpack_require__(/*! ./routes.js */ 15),
	    defaultProps = __webpack_require__(/*! ../opts/action.js */ 16),
	    calc = __webpack_require__(/*! ../utils/calc.js */ 7),
	    utils = __webpack_require__(/*! ../utils/utils.js */ 17),
	    styler = __webpack_require__(/*! ../routes/css/styler.js */ 21),
	    
	    linkToAngleDistance = { link: 'AngleAndDistance' },
	
	    namespace = function (key, space) {
	        return (space && space !== routes.defaultRoute) ? key + '.' + space : key;
	    },
	
	    Action = function () {
	        var self = this;
	        
	        // Create value repo
	        self.values = {};
	        
	        // Create new property manager
	        defaultProps.scope = this;
	        self.props = new Repo();
	        self.props(defaultProps);
	
	        // Create data store
	        self.data = new Repo();
	        
	        // Register process wth cycl
	        self.process = new Process(function (framestamp, frameDuration) {
		        if (self.active) {
	                processor(self, framestamp, frameDuration);
		        }
	        });
	        
	        self.queue = new Queue();
	
	        self.set(parseArgs.generic.apply(self, arguments));
	    };
	
	Action.prototype = {
	
	    // [number]: Progress represented in a range of 0 - 1
	    progress: 0,
	    
	    // [number]: Time elapsed in ms
	    elapsed: 0,
	
	    // [number]: Number of frames action has been inactive
	    inactiveFrames: 0,
	    
	    // [number]: 1 = forward, -1 = backwards
	    playDirection: 1,
	
	    /*
	        Play the provided actions as animations
	        
	        Syntax
	            .play(playlist, [override])
	                @param [string]: Playlist of presets
	                @param [object]: (optional) Override object
	                
	            .play(params)
	                @param [object]: Action properties
	                
	            .play(params, [duration, easing, onEnd])
	                @param [object]: Action props
	                @param [number]: Duration in ms
	                @param [string]: Easing function to apply
	                @param [function]: Function to run on end
	                
	        @return [Action]
	    */
	    play: function () {
	        var props = parseArgs.play.apply(this, arguments);
	
	        if (!this.isActive()) {
	            this.set(props, 'to');
	            this.playDirection = 1;
	            this.start('Play');
	        } else {
	            this.queue.add.apply(this.queue, arguments);
	        }
	
	        return this;
	    },
	
	    /*
	        Run Action indefinitely
	        
	        Syntax
	            .run(preset, [override])
	                @param [string]: Name of preset
	                @param [object]: (optional) Override object
	                
	            .run(params)
	                @param [object]: Action properties
	                
	        @return [Action]
	    */
	    run: function () {
	        this.set(parseArgs.generic.apply(this, arguments));
	        return this.start('Run');
	    },
	    
	    /*
	        Track values to mouse, touch or custom Input
	        
	        Syntax
	            .track(preset, [override], input)
	                @param [string]: Name of preset
	                @param [object]: (optional) Override object
	                @param [event || Input]: Input or event to start tracking
	                
	            .track(params, input)
	                @param [object]: Action properties
	                @param [event || Input]: Input or event to start tracking
	                
	        @return [Action]
	    */
	    track: function () {
	        this.set(parseArgs.track.apply(this, arguments));
	        return this.start('Track');
	    },
	    
	    /*
	        Activate for one frame and set values to current
	        
	        @return [Action]
	    */
	    fire: function () {
	        this.set(parseArgs.generic.apply(this, arguments));
	        return this.start('Fire');
	    },
	    
	    /*
	        Set Action values and properties
	        
	        Syntax
	            .set(params)
	                @param [object]: Action properties
	            
	        @return [Action]
	    */
	    set: function (props, defaultProp) {
	        var self = this,
	            values = self.values;
	        
	        // Update current properties
	        self.props(props);
	        
	        // Set default property to current if it isn't set
	        defaultProp = defaultProp || 'current';
	        
	        // Loop over values and update
	        routes.shard(function (route, routeValues) {
	            var preprocessedValues = {},
	                valueBase = {},
	                value,
	                base = {
	                    route: route.name
	                };
	
	            for (var key in routeValues) {
	                if (routeValues.hasOwnProperty(key)) {
	                    value = routeValues[key];
	                    
	                    if (!utils.isObj(value)) {
	                        valueBase = { name: key };
	                        valueBase[defaultProp] = value;
	                    } else {
	                        valueBase = value;
	                        valueBase.name = key;
	                    }
	                    
	                    valueBase = utils.merge(base, valueBase);
	
	                    // If no preprocess step, assign directly
	                    if (!route.preprocess) {
	                        self.setValue(key, valueBase, props, route.name);
	                        
	                    // Else preprocess and add each returned value
	                    } else {
	                        preprocessedValues = route.preprocess(key, valueBase, self, props);
	                        
	                        for (var subKey in preprocessedValues) {
	                            self.setValue(key, preprocessedValues[subKey], props, route.name);
	                        }
	                    }
	                }
	            }
	        }, props);
	        
	        // Create radialX and radialY if we're tracking angle and distance
	        if (values['angle'] && values['distance']) {
	            self.setValue('radialX', linkToAngleDistance)
	                .setValue('radialY', linkToAngleDistance);
	        }
	        
	        self.resetOrigins();
	
	        return self;
	    },
	    
	    /*
	        Loop through all values and create origin points
	    */
	    resetOrigins: function () {
	        var values = this.values,
	            key = '';
	
	        for (key in values) {
	            if (values.hasOwnProperty(key)) {
	                values[key].origin = values[key].current;
	            }
	        }
	    },
	
	    /*
	        Start Action
	
	        @param [string]: Name of processing type to use
	        @return [Action]
	    */
	    start: function (processType) {
		    var self = this;
	
	        self.resetProgress();
	        
	        if (processType) {
	            self.props('rubix', processType);
	        }
	
	        self.isActive(true);
	        self.started = utils.currentTime() + self.props('delay');
	        self.framestamp = self.started;
	        self.firstFrame = true;
	        
	        // Apply filters
	        if (self.props('motionBlur')) {
	            filters.apply(self);
	        }
	        
	        self.process.start();
	
	        return self;
	    },
	    
	    /*
	        Stop current Action process
	    */
	    stop: function () {
	        this.queue.clear();
	        this.pause();
	
	        // Apply filters
	        if (props.motionBlur) {
	            filters.remove(this);
	        }
	
	        return this;
	    },
	    
	    /*
	        Pause current Action
	    */
	    pause: function () {
		    var self = this,
		        input = this.getProp('input');
	
	        self.isActive(false);
	        self.process.stop();
	
	        if (input && input.stop) {
	            input.stop();
	        }
	
	        return self;
	    },
	    
	    /*
	        Resume a paused Action
	    */
	    resume: function () {
		    var self = this;
		    
	        self.started = utils.currentTime();
	        self.framestamp = self.started;
	        self.isActive(true);
	        
	        self.process.start();
	        
	        return self;
	    },
	    
	    /*
	        Reset Action progress and values
	    */
	    reset: function () {
		    var self = this,
		        values = self.values;
	
	        self.resetProgress();
	        
	        for (var key in values) {
	            values[key].reset();
	        }
	        
	        return self;
	    },
	    
	    /*
		    Reset Action progress
	    */
	    resetProgress: function () {
		    var self = this;
	
	        self.progress = 0;
	        self.elapsed = (self.playDirection === 1) ? 0 : self.props('duration');
	        self.started = utils.currentTime();
	        
	        return self;
	    },
	    
	    /*
		    Reverse Action progress and values
	    */
	    reverse: function () {
	        var values = this.values;
	
	        this.playDirection *= -1;
	        
	        for (var key in values) {
	            if (values.hasOwnProperty(key)) {
	                values[key].retarget();
	            }
	        }
	
	        return this;
	    },
	    
	    /*
	        Swap value origins and to
	    */
	    flip: function () {
		    var self = this,
		        values = self.values;
		    
		    self.progress = calc.difference(self.progress, 1);
	        self.elapsed = calc.difference(self.elapsed, self.props('duration'));
	        
	        for (var key in values) {
	            values[key].flip();
	        }
	
	        return self;
	    },
	    
	    toggle: function () {
	        if (this.isActive()) {
	            this.pause();
	        } else {
	            this.resume();
	        }
	        
	        return this;
	    },
	    
	    /*
	        Check for next steps and perform, stop if not
	    */
	    next: function () {
	        var self = this,
	            nexts = [{
	                key: 'loop',
	                callback: self.reset
	            }, {
	                key: 'yoyo',
	                callback: self.reverse
	            }, {
	                key: 'flip',
	                callback: self.flip
	            }],
	            possibles = nexts.length,
	            hasNext = false;
	            
	        for (var i = 0; i < possibles; ++i) {
	            if (self.checkNextStep(nexts[i].key, nexts[i].callback)) {
	                hasNext = true;
	                break;
	            }
	        }
	
	        if (!hasNext && !self.playNext()) {
	            self.stop();
	        } else {
	            self.isActive(true);
	        }
	        
	        return self;
	    },
	    
	    /*
	        Check next step
	        
	        @param [string]: Name of step ('yoyo' or 'loop')
	        @param [callback]: Function to run if we take this step
	    */
	    checkNextStep: function (key, callback) {
	        var COUNT = 'Count',
	            stepTaken = false,
	            step = this.props(key),
	            count = this.props(key + COUNT),
	            forever = (step === true);
	
	        if (forever || utils.isNum(step)) {
	            ++count;
	            this.props(key + COUNT, count);
	            if (forever || count <= step) {
	                callback.call(this);
	                stepTaken = true;
	            }
	        }
	
	        return stepTaken;
	    },
	    
	    /*
	        Next in playlist
	    */
	    playNext: function () {
	        var stepTaken = false,
	            nextInQueue = this.queue.next(this.playDirection);
	
	        if (utils.isArray(nextInQueue)) {
	            this.set(parseArgs.generic.apply(this, nextInQueue), 'to')
	                .reset();
	
	            stepTaken = true;
	        }
	
	        return stepTaken;
	    },
	    
	    setValue: function (key, value, inherit, space) {
	        var existing = this.getValue(key, space);
	        
	        key = namespace(key, space);
	
	        // Update if value exists
	        if (existing) {
	            existing.set(value, inherit);
	
	        // Or create new if it doesn't
	        } else {
	            this.values[key] = new Value(key, value, inherit, this);
	        }
	
	        return this;
	    },
	    
	    
	    getValue: function (key, space) {
	        key = namespace(key, space);
	
	        return this.values[key];
	    },
	    
	    
	    setProp: function (key, value) {
	        this.props(key, value);
	        
	        return this;
	    },
	    
	    
	    getProp: function (key) {
	        return this.props(key);
	    },
	    
	    /*
	        Is Action active?
	        
	        @param [boolean] (optional): If provided, will set action to active/inactive
	        @return [boolean]: Active status
	    */
	    isActive: function (active) {
	        return this.active = (active !== undefined) ? active : this.active;
	    },
	    
	    /*
	        Update order of value keys
	        
	        @param [string]: Key of value
	        @param [boolean]: Whether to move value to back
	        @param [string] (optional): Name of order array (if not default)
	    */
	    updateOrder: function (key, moveToBack, orderName) {
	        var props = this.props(),
	            pos, order;
	        
	        orderName = orderName || 'order';
	        order = props[orderName] = props[orderName] || [];
	        pos = order.indexOf(key);
	        
	        if (pos === -1 || moveToBack) {
	            order.push(key);
	            
	            if (pos !== -1) {
	                order.splice(pos, 1);
	            }
	        }
	    },
	    
	    /*
	        Style our dom element
	    */
	    style: function (prop) {
	        var dom = this.props('dom'),
	            returnVal;
	        
	        if (dom) {
	            returnVal = styler(dom, prop);
	        }
	        
	        return returnVal == styler ? this : returnVal;
	    }
	    
	};
	
	module.exports = Action;

/***/ },
/* 3 */
/*!****************************!*\
  !*** ./src/input/input.js ***!
  \****************************/
/***/ function(module, exports, __webpack_require__) {

	/*
	    Input controller
	*/
	"use strict";
	
	var calc = __webpack_require__(/*! ../utils/calc.js */ 7),
	    utils = __webpack_require__(/*! ../utils/utils.js */ 17),
	    History = __webpack_require__(/*! ../utils/history.js */ 18),
	
	    /*
	        Input constructor
	        
	            Syntax
	                newInput(name, value[, poll])
	                    @param [string]: Name of to track
	                    @param [number]: Initial value
	                    @param [function] (optional): Function to poll Input data
	                    
	                newInput(props[, poll])
	                    @param [object]: Object of values
	                    @param [function] (optional): Function to poll Input data
	
	        @return [Input]
	    */
	    Input = function () {
	        var pollPos = arguments.length - 1;
	
	        this.current = {};
	        this.offset = {};
	        this.velocity = {};
	        this.history = new History();
	        this.update(arguments[0], arguments[1]);
	        
	        if (utils.isFunc(arguments[pollPos])) {
	            this.poll = arguments[pollPos];
	        }
	    };
	
	Input.prototype = {
	    
	    // [number]: Number of frames of inactivity before velocity is turned to 0
	    maxInactiveFrames: 2,
	    
	    // [number]: Number of frames input hasn't been updated
	    inactiveFrames: 0,
	    
	    /*
	        Get latest input values
	        
	        @param [string] (optional): Name of specific property to return
	        @return [object || number]: Latest input values or, if specified, single value
	    */
	    get: function (prop) {
	        var latest = this.history.get(),
	            val = (prop !== undefined) ? latest[prop] : latest;
	        
	        return val;
	    },
	
	    /*
	        Update the input values
	        
	        Syntax
	            input.update(name, value)
	                @param [string]: Name of to track
	                @param [number]: Initial value
	                
	            input.update(props)
	                @param [object]: Object of values
	                
	        @return [Input]
	    */
	    update: function (arg0, arg1) {
	        var values = {};
	
	        if (utils.isNum(arg1)) {
	            values[arg0] = arg1;
	        } else {
	            values = arg0;
	        }
	
	        this.history.add(utils.merge(this.current, values));
	        
	        return this;
	    },
	    
	    /*
	        Check for input movement and update pointer object's properties
	        
	        @param [number]: Timestamp of frame
	        @return [Input]
	    */
	    onFrame: function (timestamp) {
	        var latest, hasChanged;
	        
	        // Check provided timestamp against lastFrame timestamp and return input has already been updated
	        if (timestamp === this.lastFrame) {
	            return;
	        }
	        
	        latest = (this.poll) ? this.poll() : this.history.get();
	        hasChanged = utils.hasChanged(this.current, latest);
	
	        // If input has changed between frames  
	        if (hasChanged) {
	            this.velocity = calc.offset(this.current, latest);
	            this.current = latest;
	            this.inactiveFrames = 0;
	
	        // Or it hasn't moved and our frame limit has been reached
	        } else if (this.inactiveFrames >= this.maxInactiveFrames) {
	            this.velocity = calc.offset(this.current, this.current);
	        
	        // Or input hasn't changed
	        } else {
	            this.inactiveFrames++;
	        }
	        
	        this.lastFrame = timestamp;
	        
	        return this;
	    }
	    
	};
	
	module.exports = Input;

/***/ },
/* 4 */
/*!********************************!*\
  !*** ./src/process/process.js ***!
  \********************************/
/***/ function(module, exports, __webpack_require__) {

	/*
	    Process
	*/
	"use strict";
	
	var manager = __webpack_require__(/*! ./manager.js */ 19),
	
	    /*
	        Process constructor
	        
	        Syntax
	            var process = new Process(scope, callback);
	            var process = new Process(callback);
	    */
	    Process = function (arg0, arg1) {
	        var hasScope = (arg1 !== undefined),
	            callback = hasScope ? arg1 : arg0,
	            scope = hasScope ? arg0 : this;
	
	        this.setCallback(callback);
	        this.setScope(scope);
	
	        this.setId(manager.register(this));
	    };
	    
	Process.prototype = {
	    
	    /*
	        [boolean]: Is this process currently active?
	    */
	    isActive: false,
	    
	    /*
	        [boolean]: Has this process been killed?
	    */
	    isKilled: false,
	
	    /*
	        Fire callback
	        
	        @param [timestamp]: Timestamp of currently-executed frame
	        @param [number]: Time since last frame
	    */
	    fire: function (timestamp, elapsed) {
	        // Check timers
	        if (this.isActive) {
	            this.callback.call(this.scope, timestamp, elapsed);
	        }
	        
	        if (this.isInterval) {
	            this.deactivate();
	        }
	    },
	    
	    /*
	        Set process callback
	        
	        @param [function]: Function to fire per frame
	        @return [this]
	    */
	    setCallback: function (callback) {
	        this.callback = callback;
	        
	        return this;
	    },
	    
	    /*
	        Set callback scope
	        
	        @param [function]: Fire callback in this context
	        @return [this]
	    */
	    setScope: function (scope) {
	        this.scope = scope;
	        
	        return this;
	    },
	    
	    /*
	        Start process
	        
	        @param [int]: Duration of process in ms, 0 if indefinite
	        @return [this]
	    */
	    start: function (duration) {
	        var self = this;
	        
	        self.reset();
	        self.activate();
	        
	        if (duration) {
	            self.stopTimer = setTimeout(function () {
	                self.stop();
	            }, duration);
	        }
	
	        return self;
	    },
	    
	    /*
	        Stop process
	        
	        @return [this]
	    */
	    stop: function () {
	        this.reset();
	        this.deactivate();
	        
	        return this;
	    },
	    
	    /*
	        Activate process
	        
	        @return [this]
	    */
	    activate: function () {
	        if (!this.isKilled) {
	            this.isActive = true;
	            manager.activate(this.id);
	        }
	
	        return this;
	    },
	    
	    /*
	        Deactivate process
	        
	        @return [this]
	    */
	    deactivate: function () {
	        this.isActive = false;
	        manager.deactivate(this.id);
	        
	        return this;
	    },
	    
	    /*
	        Fire process every x ms
	        
	        @param [int]: Number of ms to wait between refiring process.
	        @return [this]
	    */
	    every: function (interval) {
		    var self = this;
	
	        self.reset();
	
	        self.isInterval = true;
	
	        self.intervalTimer = setInterval(function () {
	            self.activate();
	        }, interval);
	    },
	    
	    /*
	        Clear all timers
	        
	        @param 
	    */
	    reset: function () {
	        this.isInterval = false;
	        clearTimeout(this.stopTimer);
	        clearInterval(this.intervalTimer);
	        
	        return this;
	    },
	    
	    /*
	        Kill function in manager, release for garbage collection
	    */
	    kill: function () {
	        this.stop();
	        this.isKilled = true;
	        manager.kill(this.id);
	    },
	    
	    setId: function (id) {
	        this.id = id;
	    }
	};
	
	module.exports = Process;

/***/ },
/* 5 */
/*!*******************************!*\
  !*** ./src/action/presets.js ***!
  \*******************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var utils = __webpack_require__(/*! ../utils/utils.js */ 17),
	    
	    generateKeys = function (key) {
	        var keys = key.split(DOT),
	            keysLength = keys.length,
	            lastKey = keys[0],
	            i = 1;
	        
	        for (; i < keysLength; i++) {
	            keys[i] = lastKey += DOT + keys[i];
	        }
	        
	        return keys;
	    },
	
	    presetStore = {},
	    DOT = '.',
	    Presets = function () {};
	
	Presets.prototype = {
	
	    /*
	        Define a new Action preset
	        
	        Syntax
	        
	            .define(name, preset)
	                @param [string]: Name of preset
	                @param [object]: Preset options/properties
	                
	            .define(presets)
	                @param [object]: Multiple presets as named object
	                
	        @return [Redshift]
	    */
	    define: function (name, preset) {
	        var presets = {},
	            key = '';
	
	        if (utils.isObj(name)) {
	            presets = name;
	        } else {
	            presets[name] = preset;
	        }
	
	        for (key in presets) {
	            if (presets.hasOwnProperty(key)) {
	                presetStore[key] = presets[key];
	            }
	        }
	    },
	    
	    
	    /*
	        Get defined action
	        
	        @param [string]: The name of the predefined action
	    */
	    getDefined: function (key) {
	        var props = {},
	            thisProp = {},
	            keys = generateKeys(key),
	            keysLength = keys.length,
	            i = 0;
	
	        for (; i < keysLength; i++) {
	            thisProp = presetStore[keys[i]];
	
	            if (thisProp) {
	                props = utils.merge(props, thisProp);
	            }
	        }
	        
	        return props;
	    }
	    
	};
	
	module.exports = new Presets();

/***/ },
/* 6 */
/*!*****************************!*\
  !*** ./src/utils/easing.js ***!
  \*****************************/
/***/ function(module, exports, __webpack_require__) {

	/*
	    Easing functions
	    ----------------------------------------
	    
	    Generates and provides easing functions based on baseFunction definitions
	    
	    A call to easingFunction.get('functionName') returns a function that can be passed:
	        @param [number]: Progress 0-1
	        @param [number] (optional): Amp modifier, only accepted in some easing functions
	                                    and is used to adjust overall strength
	        @return [number]: Eased progress
	        
	    We can generate new functions by sending an easing function through easingFunction.extend(name, method).
	    Which will make nameIn, nameOut and nameInOut functions available to use.
	        
	    Easing functions from Robert Penner
	    http://www.robertpenner.com/easing/
	        
	    Bezier curve interpretor created from Gaëtan Renaudeau's original BezierEasing  
	    https://github.com/gre/bezier-easing/blob/master/index.js  
	    https://github.com/gre/bezier-easing/blob/master/LICENSE
	*/
	"use strict";
	
	var calc = __webpack_require__(/*! ./calc.js */ 7),
	    Bezier = __webpack_require__(/*! ../types/bezier.js */ 20),
	    
	    // Constants
	    INVALID_EASING = ": Not defined",
	    EASE_IN = 'In',
	    EASE_OUT = 'Out',
	    EASE_IN_OUT = EASE_IN + EASE_OUT,
	    
	    // Base power ease names
	    powerEasing = ['ease', 'cubic', 'quart', 'quint'],
	    
	    // Generate easing function with provided power
	    generatePowerEasing = function (power) {
	        return function (progress) {
	            return Math.pow(progress, power);
	        }
	    },
	
	    /*
	        Each of these base functions is an easeIn
	        
	        On init, we use EasingFunction.mirror and .reverse to generate easeInOut and
	        easeOut functions respectively.
	    */
	    baseEasing = {
	        circ: function (progress) {
	            return 1 - Math.sin(Math.acos(progress));
	        },
	        back: function (progress) {
	            var strength = 1.5;
	
	            return (progress * progress) * ((strength + 1) * progress - strength);
	        }
	    },
	    
	    /*
	        Mirror easing
	        
	        Mirrors the provided easing function, used here for mirroring an
	        easeIn into an easeInOut
	        
	        @param [number]: Progress, from 0 - 1, of current shift
	        @param [function]: The easing function to mirror
	        @returns [number]: The easing-adjusted delta
	    */
	    mirrorEasing = function (progress, method) {
	        return (progress <= 0.5) ? method(2 * progress) / 2 : (2 - method(2 * (1 - progress))) / 2;
	    },
	            
	    /*
	        Reverse easing
	        
	        Reverses the output of the provided easing function, used for flipping easeIn
	        curve to an easeOut.
	        
	        @param [number]: Progress, from 0 - 1, of current shift
	        @param [function]: The easing function to reverse
	        @returns [number]: The easing-adjusted delta
	    */
	    reverseEasing = function (progress, method) {
	        return 1 - method(1 - progress);
	    },
	    
	    /*
	        Add new easing function
	        
	        Takes name and generates nameIn, nameOut, nameInOut, and easing functions to match
	        
	        @param [string]: Base name of the easing functions to generate
	        @param [function]: Base easing function, as an easeIn, from which to generate Out and InOut
	    */
	    generateVariations = function (name, method, isBaseIn) {
	        var easeIn = name + EASE_IN,
	            easeOut = name + EASE_OUT,
	            easeInOut = name + EASE_IN_OUT,
	            baseName = isBaseIn ? easeIn : easeOut,
	            reverseName = isBaseIn ? easeOut : easeIn;
	
	        // Create the In function
	        easing[baseName] = method;
	
	        // Create the Out function by reversing the transition curve
	        easing[reverseName] = function (progress) {
	            return reverseEasing(progress, easing[baseName]);
	        };
	        
	        // Create the InOut function by mirroring the transition curve
	        easing[easeInOut] = function (progress) {
	            return mirrorEasing(progress, easing[baseName]);
	        };
	    },
	    
	    easing = {
	    
	        /*
	            Get the named easing function
	            
	            @param [string]: Name of the easing function to get 
	            @return [function || boolean]: Easing function or false if function undefined
	        */
	        get: function (name) {
	            var easing = this[name];
	            
	            if (!easing) {
	                throw name + INVALID_EASING;
	            }
	    
	            return easing;
	        },
	        
	        
	        /*
	            Add Bezier Curve easing
	            
	            @param [string]: Name of new easing
	            @parma [number]: X of coordinate 1
	            @parma [number]: Y of coordinate 1
	            @parma [number]: X of coordinate 2
	            @parma [number]: Y of coordinate 2
	        */
	        addBezier: function (name, x1, y1, x2, y2) {
	            if (!this[name]) {
	                this[name] = new Bezier(x1, y1, x2, y2);
	            }
	        },
	        
	        
	        /*
	            Ease value within ranged parameters
	            
	            @param [number]: Progress between 0 and 1
	            @param [number]: Value of 0 progress
	            @param [number]: Value of 1 progress
	            @param [string]: Easing to use
	            @param [number]: Amplify progress out of specified range
	            @return [number]: Value of eased progress in range
	        */  
	        withinRange: function (progress, from, to, ease, escapeAmp) {
	            var progressLimited = calc.restricted(progress, 0, 1);
	    
	            if (progressLimited !== progress && escapeAmp) {
	                ease = 'linear';
	                progressLimited = progressLimited + (calc.difference(progressLimited, progress) * escapeAmp);
	            }
	    
	            return calc.valueEased(progressLimited, from, to, this.get(ease));
	        },
	            
	        /*
	            Linear easing adjustment
	            
	            The default easing method, not added with .extend as it has no Out or InOut
	            variation.
	            
	            @param [number]: Progress, from 0-1
	            @return [number]: Unadjusted progress
	        */
	        linear: function (progress) {
	            return progress;
	        }
	    };
	
	
	// Initialise Easing  
	(function () {
	    var i = 0,
	        key = '';
	        
	    // Generate power easing functions
	    for (; i < 4; i++) {
	        baseEasing[powerEasing[i]] = generatePowerEasing(i + 2);
	    }
	    
	    // Generate in/out/inOut easing variations
	    for (key in baseEasing) {
	        if (baseEasing.hasOwnProperty(key)) {
	            generateVariations(key, baseEasing[key], true);
	        }
	    }
	})();
	
	module.exports = easing;


/***/ },
/* 7 */
/*!***************************!*\
  !*** ./src/utils/calc.js ***!
  \***************************/
/***/ function(module, exports, __webpack_require__) {

	/*
	    Calculators
	    ----------------------------------------
	    
	    Simple I/O snippets
	*/
	"use strict";
	
	var utils = __webpack_require__(/*! ./utils.js */ 17),
	
	    calc = {
	        /*
	            Angle between points
	            
	            Translates the hypothetical line so that the 'from' coordinates
	            are at 0,0, then return the angle using .angleFromCenter()
	            
	            @param [object]: X and Y coordinates of from point
	            @param [object]: X and Y cordinates of to point
	            @return [radian]: Angle between the two points in radians
	        */
	        angle: function (pointA, pointB) {
	            var from = pointB ? pointA : {x: 0, y: 0},
	                to = pointB || pointA,
	                point = {
	                    x: difference(from.x, to.x),
	                    y: difference(from.y, to.y)
	                };
	            
	            return this.angleFromCenter(point.x, point.y);
	        },
	    
	    
	        /*
	            Angle from center
	            
	            Returns the current angle, in radians, of a defined point
	            from a center (assumed 0,0)
	            
	            @param [number]: X coordinate of second point
	            @param [number]: Y coordinate of second point
	            @return [radian]: Angle between 0, 0 and point in radians
	        */
	        angleFromCenter: function (x, y) {
	            return Math.atan2(y, x);
	        },
	        
	        /*
	            Convert degrees to radians
	            
	            @param [number]: Value in degrees
	            @return [number]: Value in radians
	        */
	        degreesToRadians: function (degrees) {
	            return degrees * Math.PI / 180;
	        },
	        
	        /*
	            Difference
	            
	            Returns the difference between a and b by subtracting b from a.
	            Useful in calcualting the zero-normalised position of b, or the
	            difference something has travelled between the two points
	            
	            @param [number]: Value a
	            @param [number]: Value b
	            @return [number]: Difference between value a and value b
	        */
	        difference: function (a, b) {
	            return b - a;
	        },
	        
	        /*
	            Dilate
	            
	            Change the progression between a and b according to dilation.
	            
	            So dilation = 0.5 would change
	            
	            a --------- b
	            
	            to
	            
	            a ---- b
	            
	            @param [number]: Previous value
	            @param [number]: Current value
	            @param [number]: Dilate progress by x
	            @return [number]: Previous value plus the dilated difference
	        */
	        dilate: function (a, b, dilation) {
	            return a + ((b - a) * dilation);
	        },
	            
	        /*
	            Distance
	            
	            Returns the distance between (0,0) and pointA, unless pointB
	            is provided, then we return the difference between the two.
	            
	            @param [object/number]: x and y or just x of point A
	            @param [object/number]: (optional): x and y or just x of point B
	            @return [number]: The distance between the two points
	        */
	        distance: function (pointA, pointB) {
	            return (typeof pointA === "number") ? this.distance1D(pointA, pointB) : this.distance2D(pointA, pointB);
	        },
	    
	    
	        /*
	            Distance 1D
	            
	            Returns the distance between point A and point B
	            
	            @param [number]: Point A
	            @param [number]: (optional): Point B
	            @return [number]: The distance between the two points
	        */
	        distance1D: function (pointA, pointB) {
	            var bIsNum = (typeof pointB === 'number'),
	                from = bIsNum ? pointA : 0,
	                to = bIsNum ? pointB : pointA;
	    
	            return absolute(difference(from, to));
	        },
	    
	      
	        /*
	            Distance 2D
	            
	            Returns the distance between (0,0) and point A, unless point B
	            is provided, then we return the difference between the two.
	            
	            @param [object]: x and y of point A
	            @param [object]: (optional): x and y of point B
	            @return [number]: The distance between the two points
	        */
	        distance2D: function (pointA, pointB) {
	            var bIsObj = (typeof pointB === "object"),
	                from = bIsObj ? pointA : {x: 0, y: 0},
	                to = bIsObj ? pointB : pointA,
	                point = {
	                    x: absolute(difference(from.x, to.x)),
	                    y: absolute(difference(from.y, to.y))
	                };
	                
	            return this.hypotenuse(point.x, point.y);
	        },
	            
	        /*
	            Hypotenuse
	            
	            Returns the hypotenuse, side C, given the lengths of sides A and B.
	            
	            @param [number]: Length of A
	            @param [number]: Length of B
	            @return [number]: Length of C
	        */
	        hypotenuse: function (a, b) {
	            var a2 = a * a,
	                b2 = b * b,
	                c2 = a2 + b2;
	                
	            return Math.sqrt(c2);
	        },
	        
	        /*
	            Offset between two inputs
	            
	            Calculate the difference between two different inputs
	            
	            @param [Point]: First input
	            @param [Point]: Second input
	            @return [Offset]: Distance metrics between two points
	        */
	        offset: function (a, b) {
	            var offset = {};
	    
	            for (var key in b) {
	                if (b.hasOwnProperty(key)) {
	                    if (a.hasOwnProperty(key)) {
	                        offset[key] = difference(a[key], b[key]);
	                    } else {
	                        offset[key] = 0;
	                    }
	                } 
	            }
	            
	            if (isNum(offset.x) && isNum(offset.y)) {
	                offset.angle = this.angle(a, b);
	                offset.distance = this.distance2D(a, b);
	            }
	                
	            return offset;
	        },
	        
	        /*
	            Point from angle and distance
	            
	            @param [object]: 2D point of origin
	            @param [number]: Angle from origin
	            @param [number]: Distance from origin
	            @return [object]: Calculated 2D point
	        */
	        pointFromAngleAndDistance: function (origin, angle, distance) {
	            var point = {};
	    
	    		point.x = distance * Math.cos(angle) + origin.x;
	            point.y = distance * Math.sin(angle) + origin.y;
	    
	            return point;
	        },
	    
	        /*
	            Progress within given range
	            
	            Given a lower limit and an upper limit, we return the progress
	            (expressed as a number 0-1) represented by the given value, and
	            limit that progress to within 0-1.
	            
	            @param [number]: Value to find progress within given range
	            @param [number]: Lower limit if full range given, upper if not
	            @param [number] (optional): Upper limit of range
	            @return [number]: Progress of value within range as expressed 0-1
	        */
	        progress: function (value, limitA, limitB) {
	            var bIsNum = (typeof limitB === 'number'),
	                from = bIsNum ? limitA : 0,
	                to = bIsNum ? limitB : limitA,
	                range = difference(from, to),
	                progress = (value - from) / range;
	    
	            return progress;
	        },
	        
	        /*
	            Convert radians to degrees
	            
	            @param [number]: Value in radians
	            @return [number]: Value in degrees
	        */
	        radiansToDegrees: function (radians) {
	            return radians * 180 / Math.PI;
	        },
	        
	        /*
	            Return random number between range
	            
	            @param [number] (optional): Output minimum
	            @param [number] (optional): Output maximum
	            @return [number]: Random number within range, or 0 and 1 if none provided
	        */
	        random: function (min, max) {
	            min = isNum(min) ? min : 0;
	            max = isNum(max) ? max : 1;
	            return Math.random() * (max - min) + min;
	        },
	    
	        
	        /*
	            Calculate relative value
	            
	            Takes the operator and value from a string, ie "+=5", and applies
	            to the current value to resolve a new target.
	            
	            @param [number]: Current value
	            @param [string]: Relative value
	            @return [number]: New value
	        */
	        relativeValue: function (current, rel) {
	            var newValue = current,
	                equation = rel.split('='),
	                operator = equation[0],
	                splitVal = utils.splitValUnit(equation[1]);
	    
	            switch (operator) {
	                case '+':
	                    newValue += splitVal.value;
	                    break;
	                case '-':
	                    newValue -= splitVal.value;
	                    break;
	                case '*':
	                    newValue *= splitVal.value;
	                    break;
	                case '/':
	                    newValue /= splitVal.value;
	                    break;
	            }
	            
	            if (splitVal.unit) {
	                newValue += splitVal.unit;
	            }
	    
	            return newValue;
	        },
	    
	    
	        /*
	            Restrict value to range
	            
	            Return value within the range of lowerLimit and upperLimit
	            
	            @param [number]: Value to keep within range
	            @param [number]: Lower limit of range
	            @param [number]: Upper limit of range
	            @return [number]: Value as limited within given range
	        */
	        restricted: function (value, min, max) {
	            var restricted = (min !== undefined) ? Math.max(value, min) : value;
	            restricted = (max !== undefined) ? Math.min(restricted, max) : restricted;
	    
	            return restricted;
	        },
	    
	        /*
	            Convert x per second to per frame velocity based on fps
	            
	            @param [number]: Unit per second
	            @param [number]: Frame duration in ms
	        */
	        speedPerFrame: function (xps, frameDuration) {
	            return (isNum(xps)) ? xps / (1000 / frameDuration) : 0;
	        },
	    
	        /*
	            Convert velocity into velicity per second
	            
	            @param [number]: Unit per frame
	            @param [number]: Frame duration in ms
	        */
	        speedPerSecond: function (velocity, frameDuration) {
	            return velocity * (1000 / frameDuration);
	        },
	        
	    
	        /*
	            Time remaining
	            
	            Return the amount of time remaining from the progress already made
	            
	            @param [number]: Progress through time limit between 0-1
	            @param [number]: Duration
	        */
	        timeRemaining: function (progress, duration) {
	            return (1 - progress) * duration;
	        },
	    
	     
	        /*
	            Value in range from progress
	            
	            Given a lower limit and an upper limit, we return the value within
	            that range as expressed by progress (a number from 0-1)
	            
	            @param [number]: The progress between lower and upper limits expressed 0-1
	            @param [number]: Lower limit of range, or upper if limit2 not provided
	            @param [number] (optional): Upper limit of range
	            @return [number]: Value as calculated from progress within range (not limited within range)
	        */
	        value: function (progress, limitA, limitB) {
	            var bIsNum = (typeof limitB === 'number'),
	                from = bIsNum ? limitA : 0,
	                to = bIsNum ? limitB : limitA;
	    
	            return (- progress * from) + (progress * to) + from; 
	        },
	    
	    
	        /*
	            Eased value in range from progress
	            
	            Given a lower limit and an upper limit, we return the value within
	            that range as expressed by progress (a number from 0-1)
	            
	            @param [number]: The progress between lower and upper limits expressed 0-1
	            @param [number]: Lower limit of range, or upper if limit2 not provided
	            @param [number]: Upper limit of range
	            @param [function]: Easing to apply to value
	            @return [number]: Value as calculated from progress within range (not limited within range)
	        */
	        valueEased: function (progress, from, to, easing) {
	            var easedProgress = easing(progress);
	            
	            return this.value(easedProgress, from, to);
	        }
	    },
	
	    /*
	        Caching functions used multiple times to reduce filesize and increase performance
	    */
	    isNum = utils.isNum,
	    difference = calc.difference,
	    absolute = Math.abs;
	    
	module.exports = calc;

/***/ },
/* 8 */
/*!***************************!*\
  !*** ./src/utils/shim.js ***!
  \***************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var checkRequestAnimationFrame = function () {
	        /*
	            requestAnimationFrame polyfill
	            
	            For IE8/9 Flinstones
	        
	            Taken from Paul Irish. We've stripped out cancelAnimationFrame checks because we don't fox with that
	            
	            http://paulirish.com/2011/requestanimationframe-for-smart-animating/
	            http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
	             
	            requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
	             
	            MIT license
	        */
	        var lastTime = 0,
	            vendors = ['ms', 'moz', 'webkit', 'o'],
	            vendorsLength = vendors.length;
	        
	        // Check for prefixed implementations
	        for (var x = 0; x < vendorsLength && !window.requestAnimationFrame; x++) {
	            window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
	        }
	        
	        // If there is, fo absolute shizzle, no rAF implementations, make one out of setTimeout and putty
	        if (!window.requestAnimationFrame) {
	            window.requestAnimationFrame = function (callback) {
	                var currTime = new Date().getTime(),
	                    timeToCall = Math.max(0, 16 - (currTime - lastTime)),
	                    id = window.setTimeout(function () {
	                            callback(currTime + timeToCall);
	                        }, timeToCall);
	                
	                lastTime = currTime + timeToCall;
	                
	                return id;
	            }
	        }
	    },
	    checkIndexOf = function () {
	        /*
	            indexOf polyfill
	            
	            For IE8 troglodites
	            
	            Taken from http://stackoverflow.com/questions/3629183/why-doesnt-indexof-work-on-an-array-ie8
	        */
	        if (!Array.prototype.indexOf) {
	            Array.prototype.indexOf = function (elt /*, from*/) {
	                var len = this.length >>> 0,
	                    from = Number(arguments[1]) || 0;
	                    
	                from = (from < 0) ? Math.ceil(from) : Math.floor(from);
	                
	                if (from < 0) {
	                    from += len;
	                }
	                
	                for (; from < len; from++) {
	                    if (from in this && this[from] === elt) {
	                        return from;
	                    }
	                }
	                
	                return -1;
	            }
	        }
	    };
	
	module.exports = function () {
	    checkRequestAnimationFrame();
	    checkIndexOf();
	};

/***/ },
/* 9 */
/*!**********************************!*\
  !*** ./src/action/parse-args.js ***!
  \**********************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var utils = __webpack_require__(/*! ../utils/utils.js */ 17),
	    presets = __webpack_require__(/*! ./presets.js */ 5),
	    Pointer = __webpack_require__(/*! ../input/pointer.js */ 22),
	
	    STRING = 'string',
	    NUMBER = 'number',
	    OBJECT = 'object',
	    
	    /*
	        Generic argument parsing
	        
	        Checks first argument to be a string and loads preset,
	        merges in next object as override
	    */
	    generic = function () {
	        var props = {},
	            playlist = [],
	            base = arguments[0],
	            override = arguments[1],
	            playlistLength = 0,
	            argsAsArray = [].slice.call(arguments),
	            i = 0;
	
	        if (typeof base == STRING) {
	            playlist = base.split(' ');
	            playlistLength = playlist.length;
	            props = presets.getDefined(playlist[0]);
	
	            // If we've had multiple presets, loop through and add each to the queue
	            if (playlistLength > 1) {
	                for (; i < playlistLength; i++) {
	                    argsAsArray.shift();
	                    argsAsArray.unshift(playlist[i]);
	                    this.queue.add.apply(this.queue, argsAsArray);
	                }
	            }
	            
	            if (typeof override == OBJECT) {
	                props = utils.merge(props, override);
	            }
	        // If object, assign directly
	        } else if (typeof base == OBJECT) {
	            props = base;
	
	            if (this.isActive()) {
	                this.queue.add.apply(this.queue, argsAsArray);
	            }
	        }
	        
	        return props;
	    };
	
	module.exports = {
	    
	    /*
	        Parse play arguments
	        
	        Syntax
	            .play(preset [,override, duration, easing, onEnd])
	            .play(properties [, duration, easing, onEnd])
	    */
	    play: function () {
	        var props = generic.apply(this, arguments),
	            argsLength = arguments.length,
	            i = 0,
	            arg,
	            typeofArg = '';
	        
	        // Play specific properties
	        props.loopCount = props.yoyoCount = props.flipCount = 0;
	        
	        for (; i < argsLength; i++) {
	            arg = arguments[i];
	            typeofArg = typeof arg;
	            
	            // Easing if string and not first index
	            if (typeofArg == STRING && i !== 0) {
	                props.ease = arg;
	            
	            // Duration if number
	            } else if (typeofArg == NUMBER) {
	                props.duration = arg;
	                
	            // Callback if function
	            } else if (utils.isFunc(arg)) {
	                props.onEnd = arg;
	            }
	        }
	
	        return props;
	    },
	    
	    /*
	        Parse track arguments
	        
	        Syntax
	            .track(preset [, override], event/Input)
	            .track(properties, event/Input)
	    */
	    track: function () {
	        var props = {},
	            argsLength = arguments.length,
	            inputIndex = argsLength - 1,
	            input = arguments[inputIndex];
	        
	        // Loop until inputIndex
	        for (var i = 0; i < inputIndex; i++) {
	            
	            // Preset if string
	            if (typeof arguments[i] === STRING) {
	                props = presets.getDefined(arguments[i]);
	                
	            // Or override
	            } else {
	                props = utils.merge(props, arguments[i]);
	            }
	        }
	        
	        // Create Pointer if this isn't an Input
	        input = (!input.current) ? new Pointer(input) : input;
	        
	        // Append input
	        props.input = input;
	        props.inputOrigin = input.get();
	        
	        return props;
	    },
	    
	    generic: generic
	};

/***/ },
/* 10 */
/*!****************************!*\
  !*** ./src/types/value.js ***!
  \****************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var defaults = __webpack_require__(/*! ../opts/values.js */ 23),
	    resolve = __webpack_require__(/*! ../utils/resolve.js */ 24),
	    utils = __webpack_require__(/*! ../utils/utils.js */ 17),
	
	    CURRENT = 'current',
	    ORIGIN = 'origin',
	    FORCE_NUMBER = [CURRENT, ORIGIN, 'to', 'start'],
	    
	    /*
	        Parse setter arguments
	    */
	    parseSetArgs = function (arg0, arg1) {
	        var newProps = {};
	
	        // If we've just got a value, set default
	        if (arguments.length === 1) {
	            newProps[CURRENT] = arg0;
	            
	        // Or we've got key/value args
	        } else {
	            newProps[arg0] = arg1;
	        }
	        
	        return newProps;
	    },
	
	    /*
	        Value constructor
	    */
	    Value = function (key, props, inherit, action) {
	        this.key = key;
	        this.action = action;
	        this.scope = action.getProp('scope');
	
	        if (props.start) {
	            props.current = props.start;
	        }
	
	        this.set(props, inherit);
	    };
	    
	Value.prototype = {
	    
	    /*
	        Set value properties
	        
	        Syntax
	            .set('key', value) // Set specific value
	            .set({ key: value }) // Set multiple values
	            .set({ key: value }, { key: value2 }) // Set multiple with inherit
	            .set(value) // Set .current
	    */
	    set: function () {
	        var self = this,
	            args = arguments,
	            multiVal = utils.isObj(args[0]),
	            newProps = multiVal ? args[0] : parseSetArgs.apply(self, args),
	            newProp,
	            inherit = multiVal ? args[1] : false,
	            key = '';
	        
	        for (key in defaults) {
	            newProp = undefined;
	
	            if (inherit && inherit.hasOwnProperty(key)) {
	                newProp = inherit[key];
	            }
	            
	            if (newProps.hasOwnProperty(key)) {
	                newProp = newProps[key];
	            }
	            
	            if (newProp !== undefined) {
	                self[key] = resolve(newProp, self[key], self, self.scope);
	                
	                if (FORCE_NUMBER.indexOf(key) > -1) {
	                    self[key] = parseFloat(self[key]);
	                }
	    
	            } else if (self[key] === undefined) {
	                self[key] = defaults[key];
	            }
	            
	            if (key === 'to') {
	                self.target = self.to;
	            }
	        }
	        
	        // Set hasRange to true if min and max are numbers
	        self.hasRange = (utils.isNum(self.min) && utils.isNum(self.max)) ? true : false;
	        
	        // Update Action value process order
	        self.action.updateOrder(self.key, utils.isString(self.link));
	        
	        return self;
	    },
	    
	    /*
	        Set current value to origin
	    */
	    reset: function () {
	        this.set('to', this.target);
	        return this.set(CURRENT, this[ORIGIN]);
	    },
	    
	    /*
	        Swap current target and origin
	    */
	    flip: function () {
	        var newTo = this[ORIGIN],
	            newOrigin = (this.target !== undefined) ? this.target : this[CURRENT];
	
	        return this.set({
	            to: newTo,
	            origin: newOrigin
	        });
	    },
	    
	    retarget: function (target) {
	        target = (target !== undefined) ? target : this.target;
	        return this.set('to', target);
	    }
	};
	
	module.exports = Value;

/***/ },
/* 11 */
/*!***************************!*\
  !*** ./src/types/repo.js ***!
  \***************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var utils = __webpack_require__(/*! ../utils/utils.js */ 17),
	
	    /*
	        Get data with specified key
	        
	        @param [string]: Name of property to access
	        @returns [var]: Data found
	    */
	    get = function (key) {
	        return (key !== undefined) ? this[key] : this;
	    },
	            
	    /*
	        Set data either has object or key/value pair
	        
	        Syntax
	            .set(data)
	                @param [object]: Data to store
	                
	            .set(key, value)
	                @param [string]: Name of data
	                @param [val]: Data to store
	    */
	    set = function (data, prop) {
	        var multiArg = (arguments.length > 1),
	            toSet = multiArg ? {} : data,
	            key = '';
	        
	        // If this is a key/value setter, add to toSet
	        if (multiArg) {
	            toSet[data] = prop;
	        }
	        
	        // Loop over toSet and assign to our data store
	        for (key in toSet) {
	            if (toSet.hasOwnProperty(key)) {
	                this[key] = toSet[key];
	            }
	        }
	    },
	
	    /*
	        Repo class
	    */
	    Repo = function (context) {
	        var store = {};
	
	        /*
	            Determine whether call is getter or setter
	        */
	        return function () {
	            var argsLength = arguments.length;
	
	            // If this is a getter, return value
	            if ((!argsLength || (argsLength === 1 && utils.isString(arguments[0])))) {
	                return get.apply(store, arguments);
	
	            // Or this is a setter, return this
	            } else {
	                set.apply(store, arguments);
	                return context;
	            }
	        };
	    };
	
	module.exports = Repo;

/***/ },
/* 12 */
/*!*****************************!*\
  !*** ./src/action/queue.js ***!
  \*****************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var Queue = function () {
	        this.clear();
	    };
	
	Queue.prototype = {
	    
	    /*
	        Add a set of arguments to queue
	    */
	    add: function () {
	        this.queue.push([].slice.call(arguments));
	    },
	    
	    /*
	        Get next set of arguments from queue
	    */
	    next: function (direction) {
	        var queue = this.queue,
	            returnVal = false,
	            index = this.index;
	            
	        direction = (arguments.length) ? direction : 1;
	        
	        // If our index is between 0 and the queue length, return that item
	        if (index >= 0 && index < queue.length) {
	            returnVal = queue[index];
	            this.index = index + direction;
	        
	        // Or clear
	        } else {
	            this.clear();
	        }
	        
	        return returnVal;
	    },
	
	    /*
	        Replace queue with empty array
	    */
	    clear: function () {
	        this.queue = [];
	        this.index = 0;
	    }
	};
	
	module.exports = Queue;

/***/ },
/* 13 */
/*!********************************!*\
  !*** ./src/filters/filters.js ***!
  \********************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var svgAddress = "http://www.w3.org/2000/svg",
	    filterIdPrefix = 'redshift-filters',
	    filterCounter = 0,
	    filterNodes = {},
	    filters = {},
	    
	    filterContainer,
	    
	    generateFilterContainer = function () {
	        var svgWrapper = document.createElementNS(svgAddress, 'svg'),
	            def = document.createElementNS(svgAddress, 'def');
	
	        svgWrapper.setAttribute('class', filterIdPrefix);
	        svgWrapper.style.width = '0';
	        svgWrapper.style.height = '0';
	        svgWrapper.style.overflow = 'hidden';
	            
	        svgWrapper.appendChild(def);
	        
	        document.body.insertBefore(svgWrapper, document.body.firstChild);
	        
	        return def;
	    },
	    
	    generateFilter = function (type) {
	        // Generate SVG and defs tags if not present
	        if (!filterContainer) {
	            filterContainer = generateFilterContainer();
	        }
	        
	        // Generate filter tag if not defined
	        if (!filterNodes[type]) {
	            filterNodes[type] = generateFilterNode(type);
	        }
	        
	        return filterNodes[type].cloneNode(true);
	    },
	    
	    generateFilterNode = function (type) {
	        var filter = document.createElementNS(svgAddress, 'filter'),
	            blur = document.createElementNS(svgAddress, 'feGaussianBlur');
	            
	        blur.setAttribute('in', 'SourceGraphic');
	        blur.setAttribute('stdDeviation', '0,0');
	            
	        filter.appendChild(blur);
	        
	        return filter;
	    },
	    
	    /*
	        Get new filter ID and increment counter
	        
	        @return [string]: New filter ID
	    */
	    getFilterId = function () {
	        var filterId = filterIdPrefix + filterCounter;
	        
	        filterCounter++;
	        
	        return filterId;
	    };
	
	module.exports = {
	    
	    /*
	        Apply filter to DOM
	    */
	    apply: function (action) {
	        var filter,
	        	props = action.props();
	        
	        // Generate a filter if none exists  - move this to movement start
	        if (!props.filterId) {
	            props.filterId = getFilterId();
	            
	            // Generate filter
	            filter = generateFilter('motionBlur');
	            
	            filter.setAttribute('id', props.filterId);
	            
	            // Add filter to svg tag
	            filterContainer.appendChild(filter);
	
	            // Apply filter as CSS rule
	            action.style({
	                filter: 'url("#' + props.filterId + '")'
	            });
	            
	            filters[props.filterId] = filter;
	        }
	    },
	    
	    
	    update: function (action) {
	        var props = action.props(),
	        	values = action.values,
	        	link = props.motionBlur,
	            velocity = values[link].velocity / 60,
	            strength = props.motionBlurStrength || 1,
	            filter = filters[props.filterId],
	            isX = (props.motionBlurAxis === 'x'),
	            amount = Math.abs(velocity * strength),
	            blur = {
	                x: isX ? amount : 0,
	                y: isX ? 0 : amount
	            };
	
	        filter.firstChild.setAttribute('stdDeviation', blur.x + ',' + blur.y);
	    },
	    
	    remove: function (action) {
	        var filterId = action.props('filterId'),
	            filter = document.getElementById(filterId);
	
	        if (filter) {
	            delete filters[filterId];
	            document.body.removeChild(filter);
	        }
	    }
	    
	};

/***/ },
/* 14 */
/*!*********************************!*\
  !*** ./src/action/processor.js ***!
  \*********************************/
/***/ function(module, exports, __webpack_require__) {

	/*
	    Process actions
	*/
	"use strict";
	
	var Rubix = __webpack_require__(/*! ./rubix.js */ 25),
	    routes = __webpack_require__(/*! ./routes.js */ 15),
	    calc = __webpack_require__(/*! ../utils/calc.js */ 7),
	    filters = __webpack_require__(/*! ../filters/filters.js */ 13),
	    
	    ANGLE_DISTANCE = 'AngleAndDistance';
	
	module.exports = function (action, framestamp, frameDuration) {
	    var props = action.props(),
	        data = action.data(),
	        values = action.values,
	        rubix = Rubix[props.rubix],
	        valueRubix = rubix,
	        hasChanged = false,
	        defaultRoute = routes.getName(),
	        i = 0,
	        order = props.order = props.order || [],
	        orderLength = order.length,
	        key = '', value, output;
	    
	    action.output = {
	        values: {}
	    };
	    
	    // Update elapsed
	    if (rubix.updateInput) {
	        rubix.updateInput(action, props, frameDuration);
	    }
	
	    // Fire onStart if first frame
	    if (action.firstFrame) {
	        routes.onStart(action.output, action, values, props, data);
	        
	        action.firstFrame = false;
	    }
	    
	    // Update Input if available
	    if (props.input) {
	        action.output.input = props.input.onFrame(framestamp);
	    }
	
	    // Update values
	    for (; i < orderLength; i++) {
	        // Get value and key
	        key = order[i];
	        value = values[key];
	
	        // Load rubix for this value
	        valueRubix = rubix;
	        if (value.link) {
	            valueRubix = (value.link !== ANGLE_DISTANCE) ? Rubix['Link'] : Rubix[ANGLE_DISTANCE];
	        }
	        
	        // Calculate new value
	        output = valueRubix.process(key, value, values, props, action, frameDuration);
	        
	        // Limit if range set
	        if (valueRubix.limit) {
	            output = valueRubix.limit(output, value);
	        }
	        
	        // Round value if rounding set to true
	        if (value.round) {
	            output = Math.round(output);
	        }
	        
	        // Update velocity
	        value.velocity = calc.speedPerSecond(calc.difference(value.current, output), frameDuration);
	        
	        // Check if changed and update
	        if (value.current != output) {
	            hasChanged = true;
	        }
	
	        // Set current and add unit (if any) for output
	        value.current = output;
	        action.output[value.route] = action.output[value.route] || {};
	        action.output[defaultRoute] = action.output[defaultRoute] || {};
	        action.output[defaultRoute][key] = action.output[value.route][value.name] = (value.unit) ? output + value.unit : output;
	    }
	
	    // Shard onFrame and onChange
	    routes.shard(function (route, output) {
	        // Fire onFrame every frame
	        if (route.onFrame) {
	            route.onFrame(output, action, values, props, data);
	        }
	        
	        // Fire onChanged if values have changed
	        if (hasChanged && route.onChange) {
	            route.onChange(output, action, values, props, data);
	        }
	    }, action.output);
	    
	    // Update filter
	    if (props.filterId) {
	        filters.update(action);
	    }
	
	    // Fire onEnd if ended
	    if (rubix.hasEnded(action, hasChanged)) {
	        action.isActive(false);
	
	        routes.onEnd(action.output, action, values, props, data);
	        
	        if (!action.isActive() && props.rubix === 'Play') {
	            action.next();
	        }
	    }
	    
	    action.framestamp = framestamp;
	};

/***/ },
/* 15 */
/*!******************************!*\
  !*** ./src/action/routes.js ***!
  \******************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var defaultRoute = __webpack_require__(/*! ../routes/values.js */ 26),
	    cssRoute = __webpack_require__(/*! ../routes/css.js */ 27),
	    attrRoute = __webpack_require__(/*! ../routes/attr.js */ 28),
	    svgPathRoute = __webpack_require__(/*! ../routes/path.js */ 29),
	
	    routes = {},
	    routeKeys = [],
	    numRoutes,
	    processes = ['preprocess', 'onStart', 'onEnd'],
	    
	    has = function (name) {
	        return (routeKeys.indexOf(name) > -1) ? true : false;
	    },
	    
	    process = function (processName) {
	        return function (sourceValues, action, values, props, data) {
	            var routeName = '',
	                route,
	                i = 0;
	    
	            for (; i < numRoutes; i++) {
	                routeName = routeKeys[i];
	                route = routes[routeName];
	    
	                if (route.makeDefault || (route[processName] && props[processName])) {
	                    route[processName](sourceValues[routeName], action, values, props, data);
	                }
	            }
	        };
	    },
	    
	    manager = {
	        
	        /*
	            Add route
	            
	            @param [string]: Name of route
	            @param [object]: Object of route functions
	                Valid functions
	                    .parse
	                    .onStart
	                    .onFrame
	                    .onChange
	                    .onEnd
	        */
	        add: function (route) {
	            routeKeys.push(route.name);
	            numRoutes = routeKeys.length;
	            
	            if (route.makeDefault) {
	                this.defaultRoute = route.name;
	            }
	            
	            routes[route.name] = route;
	            
	            return this;
	        },
	        
	        /*
	            Run callback once for each route, provide route as argument
	            
	            @param [function]: Function to run for each route
	            @param [object] (optional): Root object to check if route name exists
	        */
	        shard: function (callback, props) {
	            var key = '',
	                i = 0;
	
	            for (; i < numRoutes; i++) {
	                key = routeKeys[i];
	
	                if ((props && props[key]) || !props) {
	                    callback(routes[key], props[key]);
	                }
	            }
	        },
	        
	        getName: function (name) {
	            return (name !== undefined && has(name)) ? name : this.defaultRoute;
	        }
	    };
	    
	/*
	    Add manager processes
	*/
	(function () {
	    var processesLength = processes.length,
	        processName = '',
	        i = 0;
	        
	    for (; i < processesLength; i++) {
	        processName = processes[i];
	        manager[processName] = process(processName);
	    }
	    
	    manager
	        .add(defaultRoute)
	        .add(cssRoute)
	        .add(attrRoute)
	        .add(svgPathRoute);
	})();
	
	module.exports = manager; 

/***/ },
/* 16 */
/*!****************************!*\
  !*** ./src/opts/action.js ***!
  \****************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	module.exports = {
	    
	    // Is this action active
	    active: false,
	    
	    // What to use to process this aciton
	    rubix: 'Play',
	    
	    // Multiply output value by
	    amp: 1,
	    
	    // Multiply output value outside min/max by
	    escapeAmp: 0,
	    
	    // Delay this action by x ms
	    delay: 0,
	    
	    // Time of animation (if animating) in ms
	    duration: 400,
	    
	    // Ease animation
	    ease: 'easeInOut',
	    
	    // 
	    dilate: 1,
	    
	    // Number of times animation has looped
	    loopCount: 0,
	    
	    // Number of times animation has yoyoed
	    yoyoCount: 0,
	    
	    // Number of times animation has flipped
	    flipCount: 0,
	    
	    maxInactiveFrames: 3,
	    
	    /*
	        
	        Recognised values with either false or undefined as default
	    
	        // Order of values
	        order: undefined,
	        
	        progress: undefined,
	        
	        // The object we're checking
	        input: undefined,
	        
	        // Input origin on tracking start
	        inputOrigin: undefined,
	        
	        // Use the progress of this property of linked input
	        link: undefined,
	        
	        // Loop animation x number of times (true for ETERNALLY)
	        loop: false,
	        
	        // Play animation and reverse x number of times (true for forever)
	        yoyo: false,
	        
	        // Run this callback on action start
	        onStart: undefined,
	        
	        // Run this on action end
	        onEnd: undefined,
	        
	        // Run this every frame
	        onFrame: undefined,
	        
	        // Run this when action changes
	        onChange: undefined,
	        
	        output: undefined
	        
	    */
	};

/***/ },
/* 17 */
/*!****************************!*\
  !*** ./src/utils/utils.js ***!
  \****************************/
/***/ function(module, exports, __webpack_require__) {

	/*
	    Utility functions
	*/
	"use strict";
	
	var protectedProperties = ['scope',  'dom'],
	    
	    isProtected = function (key) {
	        return (protectedProperties.indexOf(key) !== -1);
	    };
	
	module.exports = {
	    
	    /*
	        Has one object changed from the other
	        
	        Compares the two provided inputs and returns true if they are different
	        
	        @param [object]: Input A
	        @param [object]: Input B
	        @return [boolean]: True if different
	    */
	    hasChanged: function (a, b) {
	        var hasChanged = false;
	
	        for (var key in b) {
	            if (a.hasOwnProperty(key) && b.hasOwnProperty(key)) {
	                if (a[key] !== b[key]) {
	                    hasChanged = true;
	                }
	            } else {
	                hasChanged = true;
	            }
	        }
	    
	        return hasChanged;
	    },
	    
	    /*
	        Is this var a number?
	        
	        @param: Variable to test
	        @return [boolean]: Returns true if typeof === 'number'
	    */
	    isNum: function (num) {
	        return (typeof num === 'number');
	    },
	    
	    /*
	        Is this var an object?
	        
	        @param: Variable to test
	        @return [boolean]: Returns true if typeof === 'object'
	    */
	    isObj: function (obj) {
	        return (typeof obj === 'object');
	    },
	    
	    /*
	        Is this var a function ? 
	        
	        @param: Variable to test
	        @return [boolean]: Returns true if this.varType === 'Function'
	    */
	    isFunc: function (obj) {
	        return (this.varType(obj) === 'Function'); 
	    },
	    
	    /*
	        Is this var a string ? 
	        
	        @param: Variable to test
	        @return [boolean]: Returns true if typeof str === 'string'
	    */
	    isString: function (str) {
	        return (typeof str === 'string'); 
	    },
	
	
	    /*
	        Is this a relative value assignment?
	        
	        @param [string]: Variable to test
	        @return [boolean]: If this looks like a relative value assignment
	    */
	    isRelativeValue: function (value) {
	        return (value && value.indexOf && value.indexOf('=') > 0);
	    },
	    
	    /*
	        Is this var an array ? 
	        
	        @param: Variable to test
	        @return [boolean]: Returns true if this.varType === 'Array'
	    */
	    isArray: function (arr) {
	        return (this.varType(arr) === 'Array');
	    },
	    
	    /*
	        Is this value within the given range?
	        
	        @param [number]: Value to test
	        @param [number]: Minimum range limit
	        @param [number]: Maximum range limit
	        @return [boolean]: True if value is within range
	    */
	    isInRange: function (value, min, max) {
	        return (value >= min && value <= max);
	    },
	    
	    /*
	        Copy object or array
	        
	        Checks whether base is an array or object and makes
	        appropriate copy
	        
	        @param [array || object]: Array or object to copy
	        @param [array || object]: New copy of array or object
	    */
	    copy: function (base) {
	        return (this.isArray(base)) ? this.copyArray(base) : this.copyObject(base);
	    },
	    
	    /*
	        Deep copy an object
	        
	        Iterates over an object and creates a new copy of every item,
	        deep copying if it finds any objects/arrays
	        
	        @param [object]: Object to copy
	        @param [object]: New copy of object
	    */
	    copyObject: function (base) {
	        var newObject = {};
	        
	        for (var key in base) {
	            if (base.hasOwnProperty(key)) {
	                newObject[key] = (this.isObj(base[key]) && !isProtected(key)) ? this.copy(base[key]) : base[key];
	            }
	        }
	        
	        return newObject;
	    },
	    
	    /*
	        Deep copy an array
	        
	        Loops through an array and creates a new copy of every item,
	        deep copying if it finds any objects/arrays
	        
	        @param [array]: Array to copy
	        @param [array]: New copy of array
	    */
	    copyArray: function (base) {
	        var newArray = [],
	            length = base.length,
	            i = 0;
	        
	        for (var i = 0; i < length; i++) {
	            newArray[i] = (this.isObj(base[i])) ? this.copy(base[i]) : base[i];
	        }
	        
	        return newArray;
	    },
	    
	    /*
	        Non-destructive merge of object or array
	        
	        @param [array || object]: Array or object to use as base
	        @param [array || object]: Array or object to overwrite base with
	        @return [array || object]: New array or object
	    */
	    merge: function (base, overwrite) {
	        return (this.isArray(base)) ? this.copyArray(overwrite) : this.mergeObject(base, overwrite);
	    },
	    
	    /*
	        Non-destructive merge of object
	        
	        @param [object]: Object to use as base
	        @param [object]: Object to overwrite base with
	        @return [object]: New object
	    */
	    mergeObject: function (base, overwrite) {
	        var hasBase = this.isObj(base),
	            newObject = hasBase ? this.copy(base) : this.copy(overwrite),
	            key = '';
	
	        if (hasBase) {
	            for (key in overwrite) {
	                if (overwrite.hasOwnProperty(key)) {
	                    newObject[key] = (this.isObj(overwrite[key]) && !isProtected(key)) ? this.merge(base[key], overwrite[key]) : overwrite[key];
	                }
	            }
	        }
	        return newObject;
	    },
	    
	    /*
	        Split a value into a value/unit object
	        
	            "200px" -> { value: 200, unit: "px" }
	            
	        @param [string]: Value to split
	        @return [object]: Object with value and unit props
	    */
	    splitValUnit: function (value) {
	        var splitVal = value.match(/(-?\d*\.?\d*)(.*)/);
	
	        return {
	            value: parseFloat(splitVal[1]),
	            unit:  splitVal[2]
	        };
	    },
	
	    /*
	        Create stepped version of progress
	        
	        @param [number]: Value
	        @param [number]: Max range
	        @param [int]: Number of steps
	        @return [number]: Stepped value
	    */
	    stepProgress: function (value, max, steps) {
	        var stepped = 0,
	            segment = max / steps;
	            
	        for (var i = 0; i <= steps; i++) {
	            stepped = i * segment;
	
	            if ((i + 1) * segment > value) {
	                break;
	            }
	        }
	        
	        return stepped;
	    },
	
	    /*
	        Get var type as string
	        
	        @param: Variable to test
	        @return [string]: Returns, for instance 'Object' if [object Object]
	    */
	    varType: function (variable) {
	        return Object.prototype.toString.call(variable).slice(8, -1);
	    },
	    
	    /*
	        Generate current timestamp
	        
	        @return [timestamp]: Current UNIX timestamp
	    */
	    currentTime: function () {
	        return new Date().getTime();
	    }
	    
	};

/***/ },
/* 18 */
/*!******************************!*\
  !*** ./src/utils/history.js ***!
  \******************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var // [number]: Default max size of history
	    maxHistorySize = 3,
	    
	    /*
	        History constructor
	        
	        @param [var]: Variable to store in first history slot
	        @param [int] (optional): Maximum size of history
	    */
	    History = function (obj, max) {
	        this.max = max || maxHistorySize;
	        this.entries = [];
	        this.add(obj);
	    };
	    
	History.prototype = {
	    
	    /*
	        Push new var to history
	        
	        Shift out oldest entry if we've reached maximum capacity
	        
	        @param [var]: Variable to push into history.entries
	    */
	    add: function (obj) {
	        var currentSize = this.getSize();
	        
	        this.entries.push(obj);
	        
	        if (currentSize >= this.max) {
	            this.entries.shift();
	        }
	    },
	    
	    /*
	        Get variable at specified index
	
	        @param [int]: Index
	        @return [var]: Var found at specified index
	    */
	    get: function (i) {
	        i = (typeof i === 'number') ? i : this.getSize() - 1;
	
	        return this.entries[i];
	    },
	    
	    /*
	        Get the second newest history entry
	        
	        @return [var]: Entry found at index size - 2
	    */
	    getPrevious: function () {
	        return this.get(this.getSize() - 2);
	    },
	    
	    /*
	        Get current history size
	        
	        @return [int]: Current length of entries.length
	    */
	    getSize: function () {
	        return this.entries.length;
	    }
	    
	};
	
	module.exports = History;

/***/ },
/* 19 */
/*!********************************!*\
  !*** ./src/process/manager.js ***!
  \********************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var theLoop = __webpack_require__(/*! ./loop.js */ 30),
	    ProcessManager = function () {
	        this.all = {};
	        this.active = [];
	        this.deactivateQueue = [];
	        theLoop.setCallback(this, this.fireActive);
	    };
	    
	ProcessManager.prototype = {
	    
	    /*
	        [int]: Used for process ID
	    */
	    processCounter: 0,
	    
	    /*
	        [int]: Number of active processes
	    */
	    activeCount: 0,
	    
	    /*
	        Get the process with a given index
	        
	        @param [int]: Index of process
	        @return [Process]
	    */
	    getProcess: function (i) {
	        return this.all[i];
	    },
	    
	    /*
	        Get number of active processes
	        
	        @return [int]: Number of active processes
	    */
	    getActiveCount: function () {
	        return this.activeCount;
	    },
	    
	    /*
	        Get active tokens
	
	        @return [array]: Active tokens
	    */
	    getActive: function () {
	        return this.active;
	    },
	    
	    /*
	        Get the length of the deactivate queue
	        
	        @return [int]: Length of queue
	    */
	    getQueueLength: function () {
	        return this.deactivateQueue.length;
	    },
	    
	    /*
	        Fire all active processes
	        
	        @param [int]: Timestamp of executing frames
	        @param [int]: Time since previous frame
	        @return [boolean]: True if active processes found
	    */
	    fireActive: function (framestamp, elapsed) {
	        var process,
	            activeCount = 0,
	            activeProcesses = [];
	
	        // Purge and check active count before execution
	        this.purge();
	        activeCount = this.getActiveCount();
	        activeProcesses = this.getActive();
	        
	        // Loop through active processes and fire callback
	        for (var i = 0; i < activeCount; i++) {
	            process = this.getProcess(activeProcesses[i]);
	            
	            if (process) {
	                process.fire(framestamp, elapsed);
	            }
	        }
	
	        // Repurge and recheck active count after execution
	        this.purge();
	        activeCount = this.getActiveCount();
	        
	        return activeCount ? true : false;
	    },
	    
	    /*
	        Register a new process
	        
	        @param [Process]
	        @return [int]: Index of process to be used as ID
	    */
	    register: function (process) {
	        var id = this.processCounter;
	
	        this.all[id] = process;
	        
	        this.processCounter++;
	        
	        return id;
	    },
	    
	    /*
	        Activate a process
	        
	        @param [int]: Index of active process
	    */
	    activate: function (i) {
	        var queueIndex = this.deactivateQueue.indexOf(i),
	            isQueued = (queueIndex > -1),
	            isActive = (this.active.indexOf(i) > -1);
	        
	        // Remove from deactivateQueue if in there
	        if (isQueued) {
	            this.deactivateQueue.splice(queueIndex, 1);
	        }
	        
	        // Add to active processes array if not already in there
	        if (!isActive) {
	            this.active.push(i);
	            this.activeCount++;
	            theLoop.start(this);
	        }
	    },
	    
	    /*
	        Deactivate a process
	        
	        @param [int]: Index of process to add to deactivate queue
	    */
	    deactivate: function (i) {
	        this.deactivateQueue.push(i);
	    },
	    
	    /*
	        Purge the deactivate queue
	    */
	    purge: function () {
	        var activeIndex,
	            queueLength = this.getQueueLength();
	        
	        while (queueLength--) {
	            activeIndex = this.active.indexOf(this.deactivateQueue[queueLength]);
	            
	            // If process in active list deactivate
	            if (activeIndex > -1) {
	                this.active.splice(activeIndex, 1);
	                this.activeCount--;
	            }
	        }
	        
	        this.deactivateQueue = [];
	    },
	    
	    /*
	        Remove the provided id and reindex remaining processes
	    */
	    kill: function (id) {
	        delete this.all[id];
	    }
	    
	};
	
	module.exports = new ProcessManager();

/***/ },
/* 20 */
/*!*****************************!*\
  !*** ./src/types/bezier.js ***!
  \*****************************/
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {/*
	    Bezier function generator
	        
	    Gaëtan Renaudeau's BezierEasing
	    https://github.com/gre/bezier-easing/blob/master/index.js  
	    https://github.com/gre/bezier-easing/blob/master/LICENSE
	    You're a hero
	    
	    Use
	    
	        var easeOut = new Bezier(.17,.67,.83,.67),
	            x = easeOut(0.5); // returns 0.627...
	*/
	"use strict";
	
	var NEWTON_ITERATIONS = 8,
	    NEWTON_MIN_SLOPE = 0.001,
	    SUBDIVISION_PRECISION = 0.0000001,
	    SUBDIVISION_MAX_ITERATIONS = 10,
	    K_SPLINE_TABLE_SIZE = 11,
	    K_SAMPLE_STEP_SIZE = 1.0 / (K_SPLINE_TABLE_SIZE - 1.0),
	    FLOAT_32_SUPPORTED = 'Float32Array' in global,
	    
	    A = function (a1, a2) {
	        return 1.0 - 3.0 * a2 + 3.0 * a1;
	    },
	    
	    B = function (a1, a2) {
	        return 3.0 * a2 - 6.0 * a1;
	    },
	    
	    C = function (a1) {
	        return 3.0 * a1;
	    },
	
	    getSlope = function (t, a1, a2) {
	        return 3.0 * A(a1, a2) * t * t + 2.0 * B(a1, a2) * t + C(a1);
	    },
	
	    calcBezier = function (t, a1, a2) {
	        return ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t;
	    },
	    
	    /*
	        Bezier constructor
	    */
	    Bezier = function (mX1, mY1, mX2, mY2) {
	        var sampleValues = FLOAT_32_SUPPORTED ? new Float32Array(K_SPLINE_TABLE_SIZE) : new Array(K_SPLINE_TABLE_SIZE),
	            _precomputed = false,
	    
	            binarySubdivide = function (aX, aA, aB) {
	                var currentX, currentT, i = 0;
	
	                do {
	                    currentT = aA + (aB - aA) / 2.0;
	                    currentX = calcBezier(currentT, mX1, mX2) - aX;
	                    if (currentX > 0.0) {
	                        aB = currentT;
	                    } else {
	                        aA = currentT;
	                    }
	                } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
	
	                return currentT;
	            },
	        
	            newtonRaphsonIterate = function (aX, aGuessT) {
	                var i = 0,
	                    currentSlope = 0.0,
	                    currentX;
	                
	                for (; i < NEWTON_ITERATIONS; ++i) {
	                    currentSlope = getSlope(aGuessT, mX1, mX2);
	                    
	                    if (currentSlope === 0.0) {
	                        return aGuessT;
	                    }
	                    
	                    currentX = calcBezier(aGuessT, mX1, mX2) - aX;
	                    aGuessT -= currentX / currentSlope;
	                }
	                
	                return aGuessT;
	            },
	            
	            
	            calcSampleValues = function () {
	                for (var i = 0; i < K_SPLINE_TABLE_SIZE; ++i) {
	                    sampleValues[i] = calcBezier(i * K_SAMPLE_STEP_SIZE, mX1, mX2);
	                }
	            },
	            
	            
	            getTForX = function (aX) {
	                var intervalStart = 0.0,
	                    currentSample = 1,
	                    lastSample = K_SPLINE_TABLE_SIZE - 1,
	                    dist = 0.0,
	                    guessForT = 0.0,
	                    initialSlope = 0.0;
	                    
	                for (; currentSample != lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
	                    intervalStart += K_SAMPLE_STEP_SIZE;
	                }
	                
	                --currentSample;
	                
	                dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample+1] - sampleValues[currentSample]);
	                guessForT = intervalStart + dist * K_SAMPLE_STEP_SIZE;
	                
	                initialSlope = getSlope(guessForT, mX1, mX2);
	                
	                // If slope is greater than min
	                if (initialSlope >= NEWTON_MIN_SLOPE) {
	                    return newtonRaphsonIterate(aX, guessForT);
	                // Slope is equal to min
	                } else if (initialSlope === 0.0) {
	                    return guessForT;
	                // Slope is less than min
	                } else {
	                    return binarySubdivide(aX, intervalStart, intervalStart + K_SAMPLE_STEP_SIZE);
	                }
	            },
	            
	            precompute = function () {
	                _precomputed = true;
	                if (mX1 != mY1 || mX2 != mY2) {
	                    calcSampleValues();
	                }
	            },
	            
	            /*
	                Generated function
	                
	                Returns value 0-1 based on X
	            */
	            f = function (aX) {
	                var returnValue;
	
	                if (!_precomputed) {
	                    precompute();
	                }
	                
	                // If linear gradient, return X as T
	                if (mX1 === mY1 && mX2 === mY2) {
	                    returnValue = aX;
	                    
	                // If at start, return 0
	                } else if (aX === 0) {
	                    returnValue = 0;
	                    
	                // If at end, return 1
	                } else if (aX === 1) {
	                    returnValue = 1;
	
	                } else {
	                    returnValue = calcBezier(getTForX(aX), mY1, mY2);
	                }
	                
	                return returnValue;
	            }
	            
	            return f;
	    };
	
	module.exports = Bezier;
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 21 */
/*!**********************************!*\
  !*** ./src/routes/css/styler.js ***!
  \**********************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var cssStyler = function () {
		var testElement = document.getElementsByTagName('body')[0],
			prefixes = ['Webkit','Moz','O','ms', ''],
			prefixesLength = prefixes.length,
			cache = {},
			
			/*
				Test style property for prefixed version
				
				@param [string]: Style property
				@return [string]: Cached property name
			*/
			testPrefix = function (key) {
				cache[key] = key;
	
				for (var i = 0; i < prefixesLength; i++) {
					var prefixed = prefixes[i] + key.charAt(0).toUpperCase() + key.slice(1);
	
					if (testElement.style.hasOwnProperty(prefixed)) {
						cache[key] = prefixed;
					}
				}
				
				return cache[key];
			};
			
		/*
			Stylee function call
			
			Syntax
				
				Get property
					style(element, 'property');
					
				Set property
					style(element, {
						foo: 'bar'
					});
		*/
		return function (element, prop) {
			// If prop is a string, we're requesting a property
			if (typeof prop === 'string') {
				return window.getComputedStyle(element, null)[cache[prop] || testPrefix(prop)];
			
			// If it's an object, we're setting
			} else {
				
				for (var key in prop) {
					if (prop.hasOwnProperty(key)) {
						element.style[cache[key] || testPrefix(key)] = prop[key];
					}
				}
				
				return this;
			}
		}
	};
	
	module.exports = new cssStyler();

/***/ },
/* 22 */
/*!******************************!*\
  !*** ./src/input/pointer.js ***!
  \******************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var Input = __webpack_require__(/*! ./input.js */ 3),
	    currentPointer, // Sort this out for multitouch
	    
	    TOUCHMOVE = 'touchmove',
	    MOUSEMOVE = 'mousemove',
	    
	    doc = document.documentElement,
	
	    /*
	        Convert event into point
	        
	        Scrape the x/y coordinates from the provided event
	        
	        @param [event]: Original pointer event
	        @param [boolean]: True if touch event
	        @return [object]: x/y coordinates of event
	    */
	    eventToPoint = function (event, isTouchEvent) {
	        var touchChanged = isTouchEvent ? event.changedTouches[0] : false;
	        
	        return {
	            x: touchChanged ? touchChanged.clientX : event.screenX,
	            y: touchChanged ? touchChanged.clientY : event.screenY
	        }
	    },
	    
	    /*
	        Get actual event
	        
	        Checks for jQuery's .originalEvent if present
	        
	        @param [event | jQuery event]
	        @return [event]: The actual JS event  
	    */
	    getActualEvent = function (event) {
	        return event.originalEvent || event;
	    },
	
	    
	    /*
	        Pointer constructor
	    */
	    Pointer = function (e) {
	        var event = getActualEvent(e), // In case of jQuery event
	            isTouch = (event.touches) ? true : false,
	            startPoint = eventToPoint(event, isTouch);
	        
	        this.update(startPoint);
	        this.isTouch = isTouch;
	        this.bindEvents();
	    };
	
	Pointer.prototype = new Input();
	
	/*
	    Bind move event
	*/
	Pointer.prototype.bindEvents = function () {
	    this.moveEvent = this.isTouch ? TOUCHMOVE : MOUSEMOVE;
	    
	    currentPointer = this;
	    
	    doc.addEventListener(this.moveEvent, this.onMove);
	};
	
	/*
	    Unbind move event
	*/
	Pointer.prototype.unbindEvents = function () {
	    doc.removeEventListener(this.moveEvent, this.onMove);
	};
	
	/*
	    Pointer onMove event handler
	    
	    @param [event]: Pointer move event
	*/
	Pointer.prototype.onMove = function (e) {
	    var newPoint = eventToPoint(e, currentPointer.isTouch);
	    e = getActualEvent(e);
	    e.preventDefault();
	    currentPointer.update(newPoint);
	};
	
	Pointer.prototype.stop = function () {
	    this.unbindEvents();
	};
	
	module.exports = Pointer;

/***/ },
/* 23 */
/*!****************************!*\
  !*** ./src/opts/values.js ***!
  \****************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	module.exports = {
	    // [number]: The canonical value
	    current: 0,
	    
	    // [number]: The value to start from
	    start: 0,
	
	    // [number]: Current target value
	    to: undefined,
	
	    // [number]: Maximum permitted value during .track and .run
	    min: undefined,
	    
	    // [number]: Minimum permitted value during .track and .run
	    max: undefined,
	    
	    // [number]: Origin
	    origin: 0,
	    
	    // [boolean]: Set to true when both min and max detected
	    hasRange: false,
	
	    // [boolean]: Round output if true
	    round: false,
	    
	    // [string]: Route
	    route: 'values',
	    
	    // [string]: Non-namespaced output value
	    name: '',
	    
	    // [string]: Unit string to append to value on ourput
	    unit: undefined,
	    
	    parent: '',
	    
	    unitName: '',
	
	    /*
	        Link properties
	    */
	
	    // [string]: Name of value to listen to
	    link: undefined,
	    
	    // [array]: Linear range of values (eg [-100, -50, 50, 100]) of linked value to map to .mapTo
	    mapLink: undefined,
	    
	    // [array]: Non-linear range of values (eg [0, 1, 1, 0]) to map to .mapLink - here the linked value being 75 would result in a value of 0.5
	    mapTo: undefined,
	
	
	    /*
	        .run() properties
	    */
	
	    // [string]: Simulation to .run
	    simulate: 'velocity',
	    
	    // [number]: Current velocity of value, in units per second
	    velocity: 0,
	    
	    // [number]: Deceleration to apply to value, in units per second
	    deceleration: 0,
	    
	    // [number]: Acceleration to apply to value, in units per second
	    acceleration: 0,
	    
	    // [number]: Gravity acceleration to apply to value, in units per second
	    gravity: 30,
	    
	    // [number]: Factor to multiply velocity by on bounce
	    bounce: 0,
	    
	    // [number]: Friction factor to apply per frame (TODO: Figure out per second factor)
	    friction: 0,
	    
	    // [number]: Spring strength during 'string'
	    spring: 0.03,
	
	
	    /*
	        .play() properties
	    */
	
	    // [number]: Duration of animation in ms
	    duration: 400,
	    
	    // [number]: Duration of delay in ms
	    delay: 0,
	    
	    // [number]: Stagger delay as factor of duration (ie 0.2 with duration of 1000ms = 200ms)
	    stagger: 0,
	    
	    // [string]: Easing to apply
	    ease: 'easeInOut',
	    
	    // [number]: Number of steps to execute animation
	    steps: 0,
	    
	
	    /*
	        .track() properties
	    */
	
	    // [number]: Factor of movement outside of maximum range (ie 0.5 will move half as much as 1)
	    escapeAmp: 0
	};

/***/ },
/* 24 */
/*!******************************!*\
  !*** ./src/utils/resolve.js ***!
  \******************************/
/***/ function(module, exports, __webpack_require__) {

	/*
	    Property resolver
	    -------------------------------------
	    
	    Checks if a property being set is
	        a) a function
	        b) a relative value
	        c) a value as a unit
	    and returns the resolved value
	        
	    @param [number || string || function]: New property value
	    @param [number || string] (optional): Current property value
	    @param [object] (optional): Parent property
	    @param [object] (optional): Scope to resolve first argument if provided
	    @returns [number || string]: Resolved value
	*/
	"use strict";
	
	var calc = __webpack_require__(/*! ./calc.js */ 7),
	    utils = __webpack_require__(/*! ./utils.js */ 17);
	
	module.exports = function (newValue, currentValue, parent, scope) {
	    var splitValueUnit = {};
	    
	    currentValue = currentValue || 0;
	
	    // Run function if this is a function
	    if (typeof newValue == 'function') {
	        newValue = newValue.call(scope, currentValue);
	    }
	    
	    // Check if value is relative ie '+=10' - could have been returned from function
	    if (newValue.indexOf && newValue.indexOf('=') > 0) {
	        newValue = calc.relativeValue(currentValue, newValue);
	    }
	    
	    // If value is still string it might have a unit property
	    if (typeof newValue === 'string') {
	        splitValueUnit = utils.splitValUnit(newValue);
	
	        if (!isNaN(splitValueUnit.value)) {
	            newValue = splitValueUnit.value;
	            parent.unit = splitValueUnit.unit;
	        }
	    }
	
	    return newValue;
	};

/***/ },
/* 25 */
/*!*****************************!*\
  !*** ./src/action/rubix.js ***!
  \*****************************/
/***/ function(module, exports, __webpack_require__) {

	/*
	    Rubix modules
	    ----------------------------------------
	    
	    Rubix are collections of optional processors. Which rubix to
	    use is decided programmatically. If [LINK] is defined, Link is used.
	    Otherwise values use Time, Input and Run based on whether .play, 
	    .track or .run are running.
	*/
	
	"use strict";
	
	var calc = __webpack_require__(/*! ../utils/calc.js */ 7),
	    utils = __webpack_require__(/*! ../utils/utils.js */ 17),
	    easing = __webpack_require__(/*! ../utils/easing.js */ 6),
	    simulate = __webpack_require__(/*! ./simulate.js */ 31),
	    
	    // Commonly used properties
	    CURRENT = 'current',
	    HAS_ENDED = 'hasEnded',
	    INPUT_OFFSET = 'inputOffset',
	    LINK = 'link';
	
	module.exports = {
	    Fire: {
	        /*
	            Return set current
	        */
	        process: function (key, value) {
	            return value[CURRENT];
	        },
	        
	        /*
	            Return true to fire for just one frame
	            
	            @return [boolean]: True
	        */
	        hasEnded: function () {
	            return true;
	        }
	    },
	
	    Play: {
	
	        /*
	            Update Action elapsed time
	            
	            @param [Action]
	            @param [object]: Action properties
	            @param [number]: Timestamp of current frame
	        */
	        updateInput: function (action, props, frameDuration) {
	            action.elapsed += (frameDuration * props.dilate) * action.playDirection;
	            action[HAS_ENDED] = true;
	        },
	
	        /*
	            Calculate progress of value based on time elapsed,
	            value delay/duration/stagger properties
	
	            @param [string]: Key of current value
	            @param [Value]: Current value
	            @param [object]: Collection of all Action values
	            @param [object]: Action properties
	            @param [Action]: Current Action
	            @param [number]: Duration of frame in ms
	            @return [number]: Calculated value
	        */
	        process: function (key, value, values, props, action) {
	            var target = value.to,
	                newValue = value[CURRENT],
	                progress, progressTarget;
	            
	            // If we have a target, process
	            if (target !== undefined) {
	
	                progress = calc.restricted(calc.progress(action.elapsed - value.delay, value.duration) - value.stagger, 0, 1);
	                progressTarget = (action.playDirection === 1) ? 1 : 0;
	                
	                // Mark Action as not ended if still in progress
	                if (progress !== progressTarget) {
	                    action[HAS_ENDED] = false;
	                
	                // Or clear value target
	                } else {
	                    value.to = undefined;
	                }
	                
	                // Step progress if we're stepping
	                progress = (value.steps) ? utils.stepProgress(progress, 1, value.steps) : progress;
	                
	                // Ease value with progress
	                newValue = easing.withinRange(progress, value.origin, target, value.ease);
	
	            }
	            
	            return newValue;
	        },
	        
	        /*
	            Return hasEnded property
	            
	            @param [boolean]: Have all Values hit 1 progress?
	        */
	        hasEnded: function (action) {
	            return action[HAS_ENDED];
	        }
	    },
	    
	    Track: {
	    
	        /*
	            Update Input
	            
	            @param [Action]
	            @param [object]: Action properties
	        */
	        updateInput: function (action, props) {
	            action[INPUT_OFFSET] = calc.offset(props.inputOrigin, props.input[CURRENT]);
	        },
	        
	        /*
	            Move Value relative to Input movement
	            
	            @param [string]: Key of current value
	            @param [Value]: Current value
	            @param [object]: Collection of all Action values
	            @param [object]: Action properties
	            @param [Action]: Current Action
	            @return [number]: Calculated value
	        */
	        process: function (key, value, values, props, action) {
	            return (action[INPUT_OFFSET].hasOwnProperty(key)) ? value.origin + action[INPUT_OFFSET][key] : value[CURRENT];
	        },
	        
	        /*
	            Has this Action ended? 
	            
	            @return [boolean]: False to make user manually finish .track()
	        */
	        hasEnded: function () {
	            return false;
	        }
	    },
	    
	    Run: {
	    
	        /*
	            Simulate the Value's per-frame movement
	            
	            @param [string]: Key of current value
	            @param [Value]: Current value
	            @param [object]: Collection of all Action values
	            @param [object]: Action properties
	            @param [Action]: Current Action
	            @param [number]: Duration of frame in ms
	            @return [number]: Calculated value
	        */
	        process: function (key, value, values, props, action, frameDuration) {
	            return value[CURRENT] + calc.speedPerFrame(simulate[value.simulate](value, frameDuration), frameDuration);
	        },
	        
	        /*
	            Has this action ended?
	            
	            Use a framecounter to see if Action has changed in the last x frames
	            and declare ended if not
	            
	            @param [Action]
	            @param [boolean]: Has Action changed?
	            @return [boolean]: Has Action ended?
	        */
	        hasEnded: function (action, hasChanged) {
	            action.inactiveFrames = hasChanged ? 0 : action.inactiveFrames + 1;
	            return (action.inactiveFrames > action.getProp('maxInactiveFrames'));
	        },
	        
	        /*
	            Limit output to value range, if any
	            
	            If velocity is at or more than range, and value has a bounce property,
	            run the bounce simulation
	            
	            @param [number]: Calculated output
	            @param [Value]: Current Value
	            @return [number]: Limit-adjusted output
	        */
	        limit: function (output, value) {
	            output = calc.restricted(output, value.min, value.max);
	            
	            // Bounce if outside of range
	            value.velocity = (value.bounce && (output <= value.min || output >= value.max))
	                ? simulate.bounce(value) : value.velocity;
	            
	            return output;
	        }
	    },
	    
	    /*
	        Link
	        ---------------------------
	        
	        Link the calculations of one value into the output of another.
	        
	        Activate by setting the link property of one value with the name
	        of another value or Input property.
	        
	        Map the linked value with mapLink and provide a corressponding mapTo
	        to translate values from one into the other. For instance:
	        
	        {
	            link: 'x'
	            mapLink: [0, 100, 200]
	            mapTo: [-100, 0, -100]
	        }
	        
	        An output value of 50 for 'x' would translate to -50
	    */
	    Link: {
	        
	        /*
	            Process linked value
	            
	            First check if link exists within Action values, if not check
	            within Input (if exists)
	            
	            @param [string]: Key of current value
	            @param [Value]: Current value
	            @param [object]: Collection of all Action values
	            @param [object]: Action properties
	            @param [Action]: Current Action
	            @return [number]: Calculated value
	        */
	        process: function (key, value, values, props, action) {
	            var newValue = value[CURRENT],
	                mapLink = value.mapLink,
	                mapTo = value.mapTo,
	                mapLength = (mapLink !== undefined) ? mapLink.length : 0,
	                newValue;
	
	            // First look at values in Action
	            if (values[value[LINK]]) {
	                newValue = values[value[LINK]][CURRENT];
	
	            // Then check values in Input
	            } else if (action[INPUT_OFFSET] && action[INPUT_OFFSET].hasOwnProperty(value[LINK])) {
	                newValue = value.origin + action[INPUT_OFFSET][value[LINK]];
	            }
	            
	            for (var i = 1; i < mapLength; i++) {
	                if (newValue < mapLink[i] || i === mapLength - 1) {
	                    newValue = calc.value( calc.restricted( calc.progress(newValue, mapLink[i - 1], mapLink[i]), 0, 1), mapTo[i - 1], mapTo[i]);
	                    break;
	                }
	            }
	            
	            return newValue;
	        }
	    },
	    
	    /*
	        Angle and Distance
	    */
	    AngleAndDistance: {
	        /*
	            Currently inefficient as this gets called once each for
	            radialX and radialY, which could be cut down
	            
	            @param [string]: Key of current value
	            @param [Value]: Current value
	            @param [object]: Collection of all Action values
	            @param [object]: Action properties
	            @param [Action]: Current Action
	            @return [number]: Calculated value
	        */
	        process: function (key, value, values) {
	            var origin = {
	                    x: (values.x) ? values.x.get(CURRENT) : 0,
	                    y: (values.y) ? values.y.get(CURRENT) : 0
	                },
	                point = calc.pointFromAngleAndDistance(origin, values.angle.get(CURRENT), values.distance.get(CURRENT)),
	                newValue = {
	                    radialX: point.x,
	                    radialY: point.y
	                };
	            
	            return newValue[key];
	        }
	    }
	};

/***/ },
/* 26 */
/*!******************************!*\
  !*** ./src/routes/values.js ***!
  \******************************/
/***/ function(module, exports, __webpack_require__) {

	/*
	    Values route (Redshift default)
	    
	    Handles raw values and outputs to user-defined callbacks
	*/
	"use strict";
	
	var fireCallback = function (name, bucket, action, values, props, data) {
	        if (props[name]) {
	            props[name].call(props.scope, bucket, data);
	        }
	    };
	
	module.exports = {
	    
	    makeDefault: true,
	    
	    name: 'values',
	    
	    onStart: function (action, values, props, data) {
	        if (props.start) {
	            props.start.call(props.scope, data);
	        }
	    },
	    
	    onFrame: function (bucket, action, values, props, data) {
	        fireCallback('onFrame', bucket, action, values, props, data);
	    },
	    
	    onChange: function (bucket, action, values, props, data) {
	        fireCallback('onChange', bucket, action, values, props, data);
	    },
	    
	    onEnd: function (bucket, action, values, props, data) {
	        fireCallback('onEnd', bucket, action, values, props, data);
	    }
	    
	};

/***/ },
/* 27 */
/*!***************************!*\
  !*** ./src/routes/css.js ***!
  \***************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var build = __webpack_require__(/*! ./css/build.js */ 32),
	    split = __webpack_require__(/*! ./css/split.js */ 33),
	    
	    css = 'css',
	    cssOrder = css + 'Order',
	    cssCache = css + 'Cache';
	
	module.exports = {
	    
	    name: css,
	    
	    preprocess: function (key, value, action) {
	        var values = split(key, value);
	        
	        action.updateOrder(key, false, cssOrder);
	        
	        return values;
	    },
	    
	    onChange: function (output, action, values, props) {
	        props[cssCache] = props[cssCache] || {};
	        action.style(build(output, props[cssOrder],  props[cssCache], values));
	    }
	    
	};

/***/ },
/* 28 */
/*!****************************!*\
  !*** ./src/routes/attr.js ***!
  \****************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	module.exports = {
	    
	    name: 'attr',
	    
	    onChange: function (output, action, values, props) {
	        var dom = props.dom;
	
	        if (dom) {
	            for (var key in output) {
	                dom.setAttribute(key, output[key]);
	            }
	        }
	    }
	};

/***/ },
/* 29 */
/*!****************************!*\
  !*** ./src/routes/path.js ***!
  \****************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var createStyles = __webpack_require__(/*! ./path/builder.js */ 34);
	
	module.exports = {
	    
	    name: 'svgPath',
	    
	    onStart: function (output, action, values, props) {
	        if (props.dom) {
	            props.pathLength = props.dom.getTotalLength();
	        }
	    },
	    
	    onChange: function (output, action, values, props) {
	        action.style(createStyles(output, props.pathLength));
	    }
	};

/***/ },
/* 30 */
/*!*****************************!*\
  !*** ./src/process/loop.js ***!
  \*****************************/
/***/ function(module, exports, __webpack_require__) {

	/*
	    The loop
	*/
	"use strict";
	
	var Timer = __webpack_require__(/*! ./timer.js */ 35),
	    Loop = function () {
	        this.timer = new Timer();
	    };
	    
	Loop.prototype = {
	    
	    /*
	        [boolean]: Current status of animation loop
	    */
	    isRunning: false,
	    
	    /*
	        Fire all active processes once per frame
	    */
	    frame: function () {
	        var self = this;
	        
	        requestAnimationFrame(function () {
	            var framestamp = self.timer.update(), // Currently just measuring in ms - will look into hi-res timestamps
	                isActive = self.callback.call(self.scope, framestamp, self.timer.getElapsed());
	
	            if (isActive) {
	                self.frame(true);
	            } else {
	                self.stop();
	            }
	        });
	    },
	    
	    /*
	        Start loop
	    */
	    start: function () {
	        // Make sure we're not already running a loop
	        if (!this.isRunning) {
	            this.timer.clock();
	            this.isRunning = true;
	            this.frame();
	        }
	    },
	    
	    /*
	        Stop the loop
	    */
	    stop: function () {
	        this.isRunning = false;
	    },
	    
	    /*
	        Set the callback to run every frame
	        
	        @param [Object]: Execution context
	        @param [function]: Callback to fire
	    */
	    setCallback: function (scope, callback) {
	        this.scope = scope;
	        this.callback = callback;
	    }
	 
	};
	
	module.exports = new Loop();

/***/ },
/* 31 */
/*!********************************!*\
  !*** ./src/action/simulate.js ***!
  \********************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var frictionStopLimit = .2,
	    calc = __webpack_require__(/*! ../utils/calc.js */ 7),
	    speedPerFrame = calc.speedPerFrame;
	
	module.exports = {
	    
	    /*
	        Velocity
	        
	        The default .run() simulation.
	        
	        Applies any set deceleration and acceleration to existing velocity
	    */
	    velocity: function (value, duration) {
	        return value.velocity - speedPerFrame(value.deceleration, duration) + speedPerFrame(value.acceleration, duration);
	    },
	
	    /*
	        Gravity
	        
	        TODO: neaten this effect (due to rounding issues) and add clause that reduces velocity to 0
	        
	        @param [Value]
	        @returns [number]: New velocity
	    */
	    gravity: function (value, duration) {
	        return value.velocity + speedPerFrame(value.gravity, duration);
	    },
	    
	    /*
	        Friction
	        
	        @param [Value]
	        @returns [number]: New velocity
	    */
	    friction: function (value, duration) {
	        var newVelocity = speedPerFrame(value.velocity, duration) * (1 - value.friction);
	        return (newVelocity < frictionStopLimit && newVelocity > -frictionStopLimit) ? 0 : calc.speedPerSecond(newVelocity, duration);
	    },
	    
	    /*
	        Spring
	        
	        @param [Value]
	        @returns [number]: New velocity
	    */
	    spring: function (value, duration) {
	        var distance = value.to - value.current;
	
	        value.velocity += distance * speedPerFrame(value.spring, duration);
	            
	        return this.friction(value, duration);
	    },
	    
	    /*
	        Bounce
	        
	        Invert velocity and reduce by provided fraction
	        
	        @param [Value]
	        @return [number]: New velocity
	    */
	    bounce: function (value) {
	        return value.velocity *= -value.bounce;
	    }
	};

/***/ },
/* 32 */
/*!*********************************!*\
  !*** ./src/routes/css/build.js ***!
  \*********************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var dictionary = __webpack_require__(/*! ./dictionary.js */ 36),
	    templates = __webpack_require__(/*! ./templates.js */ 37),
	    lookup = __webpack_require__(/*! ./lookup.js */ 38),
	    
	    TRANSFORM = 'transform',
	    TRANSLATE_Z = 'translateZ',
	    
	    /*
	        Generate a CSS rule with the available template
	    */
	    generateRule = function (key, output, transformProp) {
	        var templateKey = transformProp ? TRANSFORM : lookup[key],
	            template = templates[templateKey];
	
	        return template ? template(key, output) : output[key];
	    };
	    
	
	module.exports = function (output, order, cache) {
	    var css = {},
	        numRules = order.length,
	        hasZ = false,
	        transformProp = dictionary.transformProps,
	        i = 0,
	        rule = '',
	        key = '',
	        transform = '';
	    
	    for (; i < numRules; i++) {
	        key = order[i],
	        rule = generateRule(key, output, transformProp[key]);
	
	        if (transformProp[key]) {
	            transform += rule + ' ';
	            hasZ = (key === TRANSLATE_Z) ? true : hasZ;
	
	        } else if (cache[key] !== rule) {
	            css[key] = rule;
	            cache[key] = rule;
	        }
	    }
	    
	    // check for filters and remove z
	    
	    if (transform != '' && transform != cache[TRANSFORM]) {
	        if (!hasZ) {
	            //transform += ' ' + TRANSLATE_Z + '(0px)';
	        }
	        
	        css[TRANSFORM] = cache[TRANSFORM] = transform;
	    }
	
	    return css;
	};

/***/ },
/* 33 */
/*!*********************************!*\
  !*** ./src/routes/css/split.js ***!
  \*********************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var defaultProperty = __webpack_require__(/*! ./default-property.js */ 39),
	    dictionary = __webpack_require__(/*! ./dictionary.js */ 36),
	    splitLookup = __webpack_require__(/*! ./lookup.js */ 38),
	    splitters = __webpack_require__(/*! ./splitters.js */ 40),
	    
	    utils = __webpack_require__(/*! ../../utils/utils.js */ 17),
	    
	    valueProperties = dictionary.valueProps,
	    valuePropertyCount = valueProperties.length,
	    
	    /*
	        Build a property
	    */
	    buildProperty = function (value, parentKey, unitKey, parent, assignDefault) {
	        var property = defaultProperty[parentKey + unitKey]
	            || defaultProperty[unitKey]
	            || defaultProperty[parentKey]
	            || defaultProperty.base;
	        
	        assignDefault = assignDefault || valueProperties[0];
	         
	        if (parent) {
	            property = utils.merge(parent, property);
	        }
	        
	        if (utils.isObj(value)) {
	            property = utils.merge(property, value);
	
	        } else {
	            property[assignDefault] = value;
	        }
	
	        // If we have a unitKey, name property parentKey + unitKey
	        property.name = unitKey ? parentKey + unitKey : parentKey;
	        
	        return property;
	    },
	
	    /*
	        Split value with provided splitterID
	    */
	    split = function (key, value, splitter) {
	        var splitValue = {},
	            splitProperty = {},
	            newValue = {},
	            valueKey = '',
	            unitKey = '',
	            i = 0;
	            
	        if (utils.isObj(value)) {
	            for (; i < valuePropertyCount; i++) {
	                valueKey = valueProperties[i];
	                
	                if (value.hasOwnProperty(valueKey)) {
	                    splitProperty = splitter(value[valueKey]);
	                    
	                    for (unitKey in splitProperty) {
	                        splitValue[unitKey] = splitValue[unitKey] || {};
	                        splitValue[unitKey][valueKey] = splitProperty[unitKey];
	                    }
	                }
	            }
	        } else {
	            splitValue = splitter(value);
	        }
	        
	        for (unitKey in splitValue) {
	            newValue[key + unitKey] = buildProperty(splitValue[unitKey], key, unitKey, value);
	        }
	        
	        return newValue;
	    };
	
	/*
	    Split CSS property into individual, tweenable values
	    
	    @param [string]: Name of CSS property
	    @param [string || number]: Value of CSS property
	*/
	module.exports = function (key, value) {
	    var splitterID = splitLookup[key],
	        splitter = splitters[splitterID],
	        values = (splitter) ? split(key, value, splitter) : {};
	
	    // If we don't have a splitter, assign the property directly
	    if (!splitter) {
	        values[key] = buildProperty(value, key);
	    }
	    
	    return values;
	};

/***/ },
/* 34 */
/*!************************************!*\
  !*** ./src/routes/path/builder.js ***!
  \************************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var lookup = __webpack_require__(/*! ./lookup.js */ 41),
	
	    /*
	        Convert percentage to pixels
	        
	        @param [number]: Percentage of total length
	        @param [number]: Total length
	    */
	    percentToPixels = function (percentage, length) {
	        return (parseFloat(percentage) / 100) * length + 'px';
	    };
	
	/*
	    Create styles
	    
	    @param [object]: SVG Path properties
	    @param [object]: Length of path
	    @returns [object]: Key/value pairs of valid CSS properties
	*/
	module.exports = function (props, pathLength) {
	    var hasArray = false,
	        svgProperty = '',
	        arrayStyles = {
	            length: 0,
	            spacing: pathLength + 'px'
	        },
	        pathStyles = {};
	
	    // Loop over each property and create related css property
	    for (var key in props) {
	        if (props.hasOwnProperty(key)) {
	            svgProperty = lookup[key];
	            
	            switch (key) {
	                case 'length':
	                case 'spacing':
	                    hasArray = true;
	                    arrayStyles[key] = percentToPixels(props[key], pathLength);
	                    break;
	                case 'offset':
	                    pathStyles[svgProperty] = percentToPixels(-props[key], pathLength);
	                    break;
	                default:
	                   pathStyles[svgProperty] = props[key]; 
	            }
	        }
	    }
	    
	    if (hasArray) {
	        pathStyles[lookup.length] = arrayStyles.length + ' ' + arrayStyles.spacing;
	    }
	    
	    console.log(pathStyles['stroke-dashoffset']);
	    
	    return pathStyles;
	};

/***/ },
/* 35 */
/*!******************************!*\
  !*** ./src/process/timer.js ***!
  \******************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var utils = __webpack_require__(/*! ../utils/utils.js */ 17),
	
	    maxElapsed = 33,
	    Timer = function () {
	        this.elapsed = 16.7;
	        this.current = utils.currentTime();
	        this.update();
	    };
	
	Timer.prototype = {
	    update: function () {
	        this.prev = this.current;
	        this.current = utils.currentTime();
	        this.elapsed = Math.min(this.current - this.prev, maxElapsed);
	
	        return this.current;
	    },
	
	    getElapsed: function () {
	        return this.elapsed;
	    },
	    
	    clock: function () {
	        this.current = utils.currentTime();
	    }
	};
	
	module.exports = Timer;

/***/ },
/* 36 */
/*!**************************************!*\
  !*** ./src/routes/css/dictionary.js ***!
  \**************************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var X = 'X',
	    Y = 'Y',
	    TRANSFORM_PERSPECTIVE = 'transformPerspective',
	    SCALE = 'scale',
	    ROTATE = 'rotate',
	
	    terms = {
	        colors: ['Red', 'Green', 'Blue', 'Alpha'],
	        positions: [X, Y, 'Z'],
	        dimensions: ['Top', 'Right', 'Bottom', 'Left'],
	        shadow: [X, Y, 'Radius', 'Spread', 'Color'],
	        valueProps: ['current', 'to', 'start', 'min', 'max'],
	        transformFuncs: ['translate', SCALE, ROTATE, 'skew', TRANSFORM_PERSPECTIVE],
	        transformProps: {} // objects are faster at direct lookups
	    };
	
	// Create transform terms
	(function () {
	    var transformFuncs = terms.transformFuncs,
	        transformProps = terms.transformProps,
	        numOfTransformFuncs = transformFuncs.length,
	        i = 0,
	
	        createProps = function (funcName) {
	            var typeTerms = terms.positions,
	                j = 0;
	
	            if (typeTerms) {
	                for (; j < typeTerms.length; j++) {
	                    transformProps[funcName + typeTerms[j]] = true;
	                }
	            }
	        };
	    
	    // Manually add skew and transform perspective  
	    transformProps[ROTATE] = transformProps[SCALE] = transformProps[TRANSFORM_PERSPECTIVE] = true;
	    
	    // Loop over each function name and create function/property terms
	    for (; i < numOfTransformFuncs; i++) {
	        createProps(transformFuncs[i]);
	    }
	})();
	
	module.exports = terms;

/***/ },
/* 37 */
/*!*************************************!*\
  !*** ./src/routes/css/templates.js ***!
  \*************************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var dictionary = __webpack_require__(/*! ./dictionary.js */ 36),
	
	    defaultValues = {
	        Alpha: 1
	    },
	
	    functionCreate = function (value, prefix) {
	        return prefix + '(' + value + ')';
	    },
	
	    createSpaceDelimited = function (key, object, terms) {
	        return createDelimitedString(key, object, terms, ' ');
	    },
	    
	    createCommaDelimited = function (key, object, terms) {
	        return createDelimitedString(key, object, terms, ', ').slice(0, -2);
	    },
	    
	    createDelimitedString = function (key, object, terms, delimiter) {
	        var string = '',
	            propKey = '',
	            termsLength = terms.length;
	        
	        for (var i = 0; i < termsLength; i++) {
	            propKey = key + terms[i];
	
	            if (object[propKey] !== undefined) {
	                string += object[propKey];
	            } else {
	                if (defaultValues[terms[i]] !== undefined) {
	                    string += defaultValues[terms[i]];
	                }
	            }
	            
	            string += delimiter;
	        }
	    
	        return string;
	    },
	
	    templates = {
	        
	        colors: function (key, values) {
	            return functionCreate(createCommaDelimited(key, values, dictionary.colors), 'rgba');
	        },
	        
	        dimensions: function (key, values) {
	            return createSpaceDelimited(key, values, dictionary.dimensions);
	        },
	        
	        positions: function (key, values) {
	            return createSpaceDelimited(key, values, dictionary.positions);
	        },
	        
	        shadow: function (key, values) {
	            var shadowTerms = dictionary.shadow.slice(0,4);
	            
	            return createSpaceDelimited(key, values, shadowTerms) + templates.colors(key, values);
	        },
	        
	        transform: function (key, values) {
	            return key + '(' + values[key] +')';
	        }
	    };
	
	module.exports = templates;

/***/ },
/* 38 */
/*!**********************************!*\
  !*** ./src/routes/css/lookup.js ***!
  \**********************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var COLOR = 'colors',
	    POSITIONS = 'positions',
	    TRANSFORM = 'transform',
	    DIMENSIONS = 'dimensions',
	    SHADOW = 'shadow';
	
	module.exports = {
	    // Color properties
	    color: COLOR,
	    backgroundColor: COLOR,
	    borderColor: COLOR,
	    borderTopColor: COLOR,
	    borderRightColor: COLOR,
	    borderBottomColor: COLOR,
	    borderLeftColor: COLOR,
	    outlineColor: COLOR,
	    fill: COLOR,
	    stroke: COLOR,
	
	    // Dimensions
	    margin: DIMENSIONS,
	    padding: DIMENSIONS,
	
	    // Positions
	    backgroundPosition: POSITIONS,
	    perspectiveOrigin: POSITIONS,
	    transformOrigin: POSITIONS,
	    
	    // Transform functions
	    skew: TRANSFORM,
	    translate: TRANSFORM,
	    rotate: TRANSFORM,
	    scale: TRANSFORM,
	    
	    // Shadows
	    textShadow: SHADOW,
	    boxShadow: SHADOW
	};

/***/ },
/* 39 */
/*!********************************************!*\
  !*** ./src/routes/css/default-property.js ***!
  \********************************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var color = {
	        min: 0,
	        max: 255,
	        round: true
	    },
	    opacity = {
	        min: 0,
	        max: 1
	    },
	    angle = {
	        unit: 'deg'
	    },
	    scale = {},
	    defaults = {
	        base: {
	            unit: 'px'
	        },
	        
	        color: color,
	        Red: color,
	        Green: color,
	        Blue: color,
	    
	        Alpha: opacity,
	        opacity: opacity,
	        
	        scale: scale,
	        scaleX: scale,
	        scaleY: scale,
	        scaleZ: scale,
	        
	        skew: angle,
	        skewX: angle,
	        skewY: angle,
	        rotate: angle,
	        rotateX: angle,
	        rotateY: angle,
	        rotateZ: angle
	    };
	    
	module.exports = defaults;

/***/ },
/* 40 */
/*!*************************************!*\
  !*** ./src/routes/css/splitters.js ***!
  \*************************************/
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var dictionary = __webpack_require__(/*! ./dictionary.js */ 36),
	    utils = __webpack_require__(/*! ../../utils/utils.js */ 17),
	
	    /*
	        Split comma delimited into array
	        
	        Converts 255, 0, 0 -> [255, 0, 0]
	        
	        @param [string]: CSS comma delimited function
	    */
	    splitCommaDelimited = function (value) {
	        return utils.isString(value) ? value.split(/,\s*/) : [value];
	    },
	    
	    splitSpaceDelimited = function (value) {
	        return utils.isString(value) ? value.split(' ') : [value];
	    },
	    
	    /*
	        Break values out of css functional statement
	        
	        Converts rgba(255, 0, 0) -> "255, 0, 0"
	    */
	    functionBreak = function (value) {
	        return value.substring(value.indexOf('(') + 1, value.lastIndexOf(')'));
	    },
	    
	    /*
	        Convert hex into array of RGBA values
	        
	        @param [string]: Hex string
	            "#F00" -> [255, 0, 0]
	            "#FF0000" -> [255, 0, 0]
	            
	        @return [array]: RGBA values
	    */
	    hex = function (prop) {
	        var r, g, b;
	                    
	        // If we have 6 chacters, ie #FF0000
	        if (prop.length > 4) {
	            r = prop.substr(1, 2);
	            g = prop.substr(3, 2);
	            b = prop.substr(5, 2);
	
	        // Or 3 characters, ie #F00
	        } else {
	            r = prop.substr(1, 1);
	            g = prop.substr(2, 1);
	            b = prop.substr(3, 1);
	            r += r;
	            g += g;
	            b += b;
	        }
	            
	        return [
	            parseInt(r, 16),
	            parseInt(g, 16),
	            parseInt(b, 16),
	            1
	        ];
	    },
	    
	    /*
	        Test if string is color property
	        
	        @param [string]: Color property
	        @return [boolean]: True if color property
	    */
	    isColor = function (prop) {
	        return (prop.indexOf('#') > -1 || prop.indexOf('rgb') > -1);
	    },
	
	    /*
	        Public splitters
	        
	        Each splitter takes a string containing certain values and
	        splits them into an object containing key/value pairs, ie
	        color will return Red/Green/Blue/[Alpha] values
	    */
	    splitters = {
	        
	        /*
	            Split arbitarily-long array (for instance matrix property) into object
	            
	            @param [string]: Array values
	                "1, 1, 2, 4" -> {1, 1, 2, 4}
	                "1 1 2 4" -> {1, 1, 2, 4}
	                
	            @return [object]: Object with a metric for every array item,
	                named after its index
	        */
	        array: function (prop) {
	            var list = (prop.indexOf(',') > -1) ? splitCommaDelimited(prop) : splitSpaceDelimited(prop),
	                listLength = list.length,
	                i = 0,
	                arrayProps = {};
	                
	            for (; i < listLength; i++) {
	                arrayProps[i] = list[i];
	            }
	            
	            return arrayProps;
	        },
	        
	        /*
	            Convert color property into R/G/B/[A] object
	            
	            @param [string]: Color value has #, rgba, rgb, // hsl, hsla
	                "#f00" -> {255, 0, 0}
	                "#ff0000" -> {255, 0, 0}
	                "rgb(255, 0, 0)" -> {255, 0, 0}
	                "rgba(255, 0, 0, 1)" -> {255, 0, 0, 1}
	                //"hsl(0, 100%, 50%)" -> {255, 0, 0}
	                //"hsla(0, 100%, 50%, 1)" -> {255, 0, 0, 1}
	                
	            @return [object]: Object with metric for each 
	        */
	        colors: function (prop) {
	            var colors = (prop.indexOf('#') > -1) ? hex(prop) : splitCommaDelimited(functionBreak(prop)),
	                numColors = colors.length,
	                terms = dictionary.colors,
	                i = 0,
	                rgba = {};
	
	            for (; i < numColors; i++) {
	                rgba[terms[i]] = colors[i];
	            }
	            
	            return rgba;
	        },
	    
	        /*
	            Split dimensions in format "Top Right Bottom Left"
	            
	            @param [string]: Dimension values
	                "20px 0 30px 40px" -> {20px, 0, 30px, 40px}
	                "20px 0 30px" -> {20px, 0, 30px, 0}
	                "20px 0" -> {20px, 0, 20px, 0}
	                "20px" -> {20px, 20px, 20px, 20px}
	            
	            @return [object]: Object with T/R/B/L metrics
	        */
	        dimensions: function (prop) {
	            var dimensions = splitSpaceDelimited(prop),
	                numDimensions = dimensions.length,
	                terms = dictionary.dimensions,
	                jumpBack = (numDimensions !== 1) ? 2 : 1,
	                i, j = i = 0,
	                dimensionProps = {};
	            
	            for (; i < 4; i++) {
	                dimensionProps[terms[i]] = dimensions[j];
	                
	                // Jump back counter j if we've reached the end of our set values
	                j++;
	                j = (j === numDimensions) ? j - jumpBack : j;
	            }
	            
	            return dimensionProps;
	        },
	        
	        /*
	            Split positions in format "X Y Z"
	            
	            @param [string]: Position values
	                "20% 30% 0" -> {20%, 30%, 0}
	                "20% 30%" -> {20%, 30%}
	                "20%" -> {20%, 20%}
	        */
	        positions: function (prop) {
	            var positions = splitSpaceDelimited(prop),
	                numPositions = positions.length,
	                positionProps = {
	                    X: positions[0],
	                    Y: (numPositions > 1) ? positions[1] : positions[0]
	                };
	                
	            if (numPositions > 2) {
	                positionProps.Z = positions[2];
	            }
	            
	            return positionProps;
	        },
	        
	        /*
	            Split shadow properties "X, Y, Radius, Spread, Color"
	            
	            @param [string]: Shadow property
	            @return [object]
	        */
	        shadow: function (prop) {
	            var bits = splitSpaceDelimited(prop),
	                bitsLength = bits.length,
	                terms = dictionary.shadow,
	                reachedColor,
	                colorProp = '',
	                bit, color,
	                i = 0, unit,
	                shadowProps = {};
	                
	            for (; i< bitsLength; i++) {
	                bit = bits[i];
	                
	                // If we've reached the color property, append to color string
	                if (reachedColor || isColor(bit)) {
	                    reachedColor = true;
	                    colorProp += bit;
	
	                } else {
	                    shadowProps[terms[i]] = bit;
	                }
	            }
	            
	            color = splitters.colors(colorProp);
	            
	            for (var unit in color) {
	                shadowProps[unit] = color[unit];
	            }
	            
	            return shadowProps;
	        },
	        
	        perspective: function (prop) {
	            return this.array(prop);
	        }
	    };
	
	module.exports = splitters;

/***/ },
/* 41 */
/*!***********************************!*\
  !*** ./src/routes/path/lookup.js ***!
  \***********************************/
/***/ function(module, exports, __webpack_require__) {

	var STROKE = 'stroke',
	    DASH = STROKE + '-dash', // stoke-width
	    DASH_ARRAY = DASH + 'array'
	
	module.exports = {
	    opacity: STROKE + '-opacity',
	    width: STROKE + '-width',
	    offset: DASH + 'offset',
	    length: DASH_ARRAY,
	    spacing: DASH_ARRAY,
	    miterlimit: STROKE + '-miterlimit'
	};

/***/ }
/******/ ]);
//# sourceMappingURL=redshift.global.js.map