import { Engine, Render, Runner, Bodies, Composite, Body, Events } from "matter-js";
import LatLon, { Cartesian, Vector3d, Dms } from 'geodesy/latlon-ellipsoidal.js';
import { testTrafficData } from "./traffic_data"
import { stcaParams, createVelocityVector, knotsToMs, toRadians } from "./utils";

var colorA = '#f55a3c', colorB = '#f5d259';

var detectedStca = []

var airplaneBodiesParams = {
    isSensor: true, 
    friction: 0, 
    frictionAir: 0,
    render: {
        strokeStyle: colorB,
        fillStyle: 'transparent',
        lineWidth: 100,
        text: { content: "FN", color: "black", size: 15 }
    }
}

// create an engine
var engine = Engine.create({gravity: {x: 0, y: 0}});
engine.timing.timeScale = 1;

var arrOfAirplaneBodies = []

testTrafficData.forEach(function(element){
    
    // Project the targets to cartesian
    var geo = new LatLon(element.lat, element.lon);
    var cart = geo.toCartesian();

    // Create the body
    var airBody = Bodies.circle(cart.x, cart.y, stcaParams.alertDistanceUpper/2, airplaneBodiesParams);

    // Set the velocity of the body
    Body.setVelocity(airBody, createVelocityVector(knotsToMs(element.groundspeed), element.heading));
    airBody.callsign = element.callsign;

    arrOfAirplaneBodies.push(airBody);
});

// add all of the bodies to the world
Composite.add(engine.world, arrOfAirplaneBodies);

//Body.setVelocity(boxA, {x: 2,y: 1});

// create runner
var runner = Runner.create();

// run the engine
Runner.run(runner, engine);

Events.on(engine, 'collisionStart', function(event) {
    var pairs = event.pairs;
        
    for (var i = 0, j = pairs.length; i != j; ++i) {
        var pair = pairs[i];

        pair.bodyB.render.strokeStyle = colorA;
        pair.bodyA.render.strokeStyle = colorA;
        
        // Add to STCA list
        detectedStca.push([pair.bodyB.callsign, pair.bodyA.callsign])
        console.log(detectedStca);
    }
});

Events.on(engine, 'collisionEnd', function(event) {
    var pairs = event.pairs;
        
    for (var i = 0, j = pairs.length; i != j; ++i) {
        var pair = pairs[i];

        pair.bodyB.render.strokeStyle = colorB;
        pair.bodyA.render.strokeStyle = colorB;
    }
});

Events.on(runner, "afterTick", function(event){
    if (event.timestamp >= stcaParams.lookAhead*1000)
        Render.stop(render)
});


// This is the rendering stuff for debug
// create a renderer
var render = Render.create({
    element: document.body,
    engine: engine,
    options: {wireframes: false, width: 800, height:800}
});

Render.lookAt(render, arrOfAirplaneBodies);

Render.tick
// run the renderer
Render.run(render);