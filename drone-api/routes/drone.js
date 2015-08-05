// routing for drone api commands


var RollingSpider = require('rolling-spider');
var rollingSpider;

var drone_data = {
  Bluetooth_uuid:"auto",
  signal_strength:"0",
  flying:false,
  battery:0,
  speed:0,
  steps:0
};

function connectDrone( cb ){
    
}

function get_data_from_drone( cb ){
    var error = false;
    console.log("getting data from drone");
    rollingSpider.signalStrength(function(err, rssi){
        if(err) error = err;
        drone_data.signal_strength = rssi;
    });
    drone_data.battery = rollingSpider.status.battery;
    drone_data.flying = rollingSpider.status.flying;
    if(error){
        console.log("error getting data from drone");
    }
//    if(cb){
        return cb(error); 
//    }
}

var init_running = true;
exports.init_drone = function(uuid, cb ){
    var error = false;
    //connect and setup drone
    rollingSpider = new RollingSpider(uuid);
    if(uuid) drone_data.Bluetooth_uuid = uuid;
    rollingSpider.connect(function(err){
        if(err){ 
            error = err;
            console.log('error connecting to drone ' + uuid);
        } else {
            console.log('connected to drone ' + uuid);
            rollingSpider.setup(function(err) {
                if(err){
                    error = err;
                    console.log('error setting up drone ' + uuid);
                } else {
                    rollingSpider.calibrate(); 
                    rollingSpider.startPing();
                    get_data_from_drone(function(e){if(e)throw e;});
                    //rollingSpider.signalStrength(function(err, rssi){
                    //    if(err) throw err;
                    //    drone_data.signal_strength = rssi;
                    //});
                    //drone_data.battery = rollingSpider.status.battery;
                    //drone_data.flying = rollingSpider.status.flying;
                    console.log('setup drone ' + uuid);
                    rollingSpider.on('battery', function(){
                        drone_data.battery = rollingSpider.status.battery;
                    });
                }
                return cb(error);
            });
        }
    });
    init_running = false;
    //return cb(error);
};

exports.getDroneData = function(req, res, next){
    console.log('sending data for drone');
    get_data_from_drone(function(err){
       if(err){
            throw err; 
            res.json(500, { "error":"error getting data from drone" });
       } else {
            res.json(drone_data);
       }    
    });
    return next();
};

exports.droneCalibrate = function(req, res, next){
    console.log('calibrating the drone');
    rollingSpider.calibrate(function(err) {
        if(err){
            throw err;
            console.log('error calibrating drone');   
            res.json(500, { "error":"an error occured executing calibrate"});
        } else {
            res.json({"message":"calibrating drone trim for stability"});
        }
    });
    return next();
};

exports.droneTakeOff = function(req, res, next) {
    console.log('making drone take off');
    rollingSpider.calibrate(function(err){
        if(err) throw err;
        var cmdTimeout = setTimeout(function(){
            res.send(500, {"error":"takeoff command taking too long"});
            return next();
        }, 8000);
        rollingSpider.takeOff(function(){
            console.log('drone took off, now hovering');
            clearTimeout(cmdTimeout);
            //get_data_from_drone(function(e){if(e)throw e;});
            //return res.send({"message":"drone took off, now hovering"});
            res.send({"message":"drone took off, now hovering"});
            //rollingSpider.calibrate();   
            return next();
        });
        
    });
    //next();
    return next();
};

exports.droneLand = function(req, res, next) {
    console.log('making drone land');
    rollingSpider.calibrate(function(err){
        if(err)throw err;
        var cmdTimeout = setTimeout(function(){
            res.send(500, {"error":"land command taking too long"});
            return next();
        }, 8000);
        rollingSpider.land(function(){
            console.log('drone has landed');
            clearTimeout(cmdTimeout);
            //get_data_from_drone(function(e){if(e)throw e;});
            //return res.send({"message":"drone has landed"});
            res.send({"message":"drone has landed"});
            //return next();
        });
        
    });
//    next();
    return next();
};

exports.droneEmergency = function(req, res, next) {
    console.log('sending emergency command');
    rollingSpider.emergency(function(){
        console.log('drone executed emergency command');
        res.send({"message":"drone executed emergency command"});
    });
    return next(); 
};

/*
 * cmdDetails = {
 *  cmd_func: function(cb){ rs_func(cb); },
 *  cmd_name: <funcname>,
 * };
 */
function singleCmd(req, res, next, cmdDetails) {
    //executes single command without options
    console.log('calling singleCmd with ' + cmdDetails.cmd_name);
    console.log('sending ' + cmdDetails.cmd_name + ' command');
    cmdDetails.cmd_func(function() {
        console.log('drone executed ' + cmdDetails.cmd_name + ' command');
        return res.json({"message":"drone executed an amazing "
                                + cmdDetails.cmd_name });
    });
    next();

}

exports.droneFrontFlip = function(req, res, next) {
    console.log('called path to frontFlip function');
    var details = {
        cmd_func: function(cb){ rollingSpider.frontFlip(cb); },
        cmd_name: 'frontFlip'
    };
    singleCmd(req, res, next, details);
    return next();
};

exports.droneBackFlip = function(req, res, next) {
    console.log('called path to backFlip function');
    var details = {
        cmd_func: function(cb){ rollingSpider.backFlip(cb); },
        cmd_name: 'backFlip'
    };
    singleCmd(req, res, next, details);
    return next();
};

exports.droneLeftFlip = function(req, res, next) {
    console.log('called path to leftFlip function');
    var details = {
        cmd_func: function(cb){ rollingSpider.leftFlip(cb); },
        cmd_name: 'leftFlip'
    };
    singleCmd(req, res, next, details);
    return next();
};

exports.droneRightFlip = function(req, res, next) {
    console.log('called path to rightFlip function');
    var details = {
        cmd_func: function(cb){ rollingSpider.rightFlip(cb); },
        cmd_name: 'rightFlip'
    };
    singleCmd(req, res, next, details);
    return next();
};


/*
 * cmdDetails = {
 *  cmd_func: function(opt,cb){ rs_func(opt,cb); },
 *  cmd_name: <funcname>,
 *  options: {
 *      speed: <speed>,
 *      steps: <steps>
 *  }
 * };
 * */
function driveCmd(req, res, next, cmdDetails) {
    //executes a drive type command with options
    console.log('calling driveCmd with ' + cmdDetails.cmd_name);
    Object.keys(cmdDetails.options).forEach(function(key){
        var item = cmdDetails.options[key];
        if( typeof item !== "number" ){
            console.log(item + ' is not a number!');
            return res.json(400, {"error": "\"" + item + "\"" 
                                    + " is not a number!"});
        } else if (!((item >= 0) && (item <= 100))){
            console.log(item + " is not in range 0-100!");
            return res.json(400, {"error": item + " is not in range 0-100!"});  
        }
    });
    console.log('sending ' + cmdDetails.cmd_name + ' command');
    
    cmdDetails.cmd_func(cmdDetails.options, function (){
        console.log('drone executed ' + cmdDetails.cmd_name + ' command');
        return res.json({"message":"drone executed " 
                            + cmdDetails.cmd_name
                            + " command"});
    });
    next();

}

exports.droneForward = function(req, res, next) {
    //var json_options = req.params;
    console.log('called path to forward function');
    var details = {
        cmd_func: function(opt, cb){ rollingSpider.forward(opt,cb); },
        cmd_name: "forward",
        options: {
            speed: req.params.speed,
            steps: req.params.steps 
        }
    }; 
    driveCmd(req, res, next, details);
    return next();
};

exports.droneBackward = function(req, res, next) {
    console.log('called path to backward function');
    var details = {
        cmd_func: function(opt, cb){ rollingSpider.backward(opt,cb); },
        cmd_name: "backward",
        options: {
            speed: req.params.speed,
            steps: req.params.steps 
        }
    }; 
    driveCmd(req, res, next, details);
    return next();
};

exports.droneUp = function(req, res, next) {
    console.log('called path to up function');
    var details = {
        cmd_func: function(opt, cb){ rollingSpider.up(opt,cb); },
        cmd_name: "up",
        options: {
            speed: req.params.speed,
            steps: req.params.steps 
        }
    }; 
    driveCmd(req, res, next, details);
    return next();
};

exports.droneDown = function(req, res, next) {
    console.log('called path to down function');
    var details = {
        cmd_func: function(opt, cb){ rollingSpider.down(opt,cb); },
        cmd_name: "down",
        options: {
            speed: req.params.speed,
            steps: req.params.steps 
        }
    }; 
    driveCmd(req, res, next, details);
    return next();
};

exports.droneLeft = function(req, res, next) {
    console.log('called path to left function');
    var details = {
        cmd_func: function(opt, cb){ rollingSpider.left(opt,cb); },
        cmd_name: "left",
        options: {
            speed: req.params.speed,
            steps: req.params.steps 
        }
    }; 
    driveCmd(req, res, next, details);
    return next();
};

exports.droneRight = function(req, res, next) {
    console.log('called path to right function');
    var details = {
        cmd_func: function(opt, cb){ rollingSpider.right(opt,cb); },
        cmd_name: "right",
        options: {
            speed: req.params.speed,
            steps: req.params.steps 
        }
    }; 
    driveCmd(req, res, next, details);
    return next();
};

exports.droneTiltLeft = function(req, res, next) {
    console.log('called path to tiltLeft function');
    var details = {
        cmd_func: function(opt, cb){ rollingSpider.tiltLeft(opt,cb); },
        cmd_name: "tiltLeft",
        options: {
            speed: req.params.speed,
            steps: req.params.steps 
        }
    }; 
    driveCmd(req, res, next, details);
    return next();
};

exports.droneTiltRight = function(req, res, next) {
    console.log('called path to tiltRight function');
    var details = {
        cmd_func: function(opt, cb){ rollingSpider.tiltRight(opt,cb); },
        cmd_name: "tiltRight",
        options: {
            speed: req.params.speed,
            steps: req.params.steps 
        }
    }; 
    driveCmd(req, res, next, details);
    return next();
};

exports.droneTurnLeft = function(req, res, next) {
    console.log('called path to turnLeft function');
    var details = {
        cmd_func: function(opt, cb){ rollingSpider.turnLeft(opt,cb); },
        cmd_name: "turnLeft",
        options: {
            speed: req.params.speed,
            steps: req.params.steps 
        }
    }; 
    driveCmd(req, res, next, details);
    return next();
};

exports.droneTurnRight = function(req, res, next) {
    console.log('called path to turnRight function');
    var details = {
        cmd_func: function(opt, cb){ rollingSpider.turnRight(opt,cb); },
        cmd_name: "turnRight",
        options: {
            speed: req.params.speed,
            steps: req.params.steps 
        }
    }; 
    driveCmd(req, res, next, details);
    return next();
};
