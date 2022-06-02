import { Common, Engine, Render, Runner, Bodies, Composite, Body, Events } from "matter-js";
import LatLon, { Cartesian, Vector3d, Dms } from 'geodesy/latlon-ellipsoidal.js';
import LatLonNvectorSpherical from 'geodesy/latlon-nvector-spherical.js';
import { stcaParams, createVelocityVector, knotsToMs, toRadians } from "./utils";

const test_data = require("./test_data.json")
const france = require("./france.json")



var colorA = '#f55a3c', colorB = '#f5d259';

var detectedStca = []

var airplaneBodiesParams = {
    isSensor: true, 
    friction: 0, 
    frictionAir: 0,
    render: {
        fillStyle: colorB
    }
}



const france_polygon = [ new LatLonNvectorSpherical(51.32717924,-9.71191406), new LatLonNvectorSpherical(50.35044453,8.91222954), 
                        new LatLonNvectorSpherical(40.47208969,9.14543152), new LatLonNvectorSpherical(41.95993687,-6.92868233) ];

var arrOfAirplaneBodies = []

test_data.pilots.forEach(function(element){

    // Project the targets to cartesian
    var geoTester = new LatLonNvectorSpherical(element.latitude, element.longitude);
    
    //if (geoTester.isEnclosedBy(france_polygon)) {
        var geo = new LatLon(element.latitude, element.longitude);
        var cart = geo.toCartesian();

        // Create the body
        var airBody = Bodies.circle(cart.y, cart.x, stcaParams.alertDistanceUpper/2, airplaneBodiesParams);
    
        // Set the velocity of the body
        Body.setVelocity(airBody, createVelocityVector(knotsToMs(element.groundspeed), element.heading));
        airBody.callsign = element.callsign;
    
        arrOfAirplaneBodies.push(airBody);
    //}
});


// create an engine
var engine = Engine.create({gravity: {x: 0, y: 0}});
engine.timing.timeScale = 1;

Common.setDecomp(require('poly-decomp'))

//
// Loading the background for debug
//
var france_cartesian = []
france.forEach(point => {
    var g = new LatLon(point[1], point[0])
    var c = g.toCartesian()
    france_cartesian.push(Bodies.circle(c.y, c.x, 5000, {isStatic: true, isSensor: false, render: {fillStyle: "#ccc"}}))
    //france_cartesian.push({x: c.y-first_france.y, y: c.x-first_france.x})
})

//var france_body = Bodies.fromVertices(first_france.y, first_france.x, france_cartesian, {isStatic: true, isSensor:false, render: { fillStyle: "#ccc", opacity: 0.2}})

Composite.add(engine.world, france_cartesian);

// add all of the bodies to the world
Composite.add(engine.world, arrOfAirplaneBodies);



// create runner
var runner = Runner.create();

// run the engine
Runner.run(runner, engine);

Events.on(engine, 'collisionStart', function(event) {
    var pairs = event.pairs;
        
    for (var i = 0, j = pairs.length; i != j; ++i) {
        var pair = pairs[i];

        if (!pair.bodyB.isSensor || !pair.bodyA.isSensor)
            continue

        pair.bodyB.render.fillStyle = colorA;
        pair.bodyA.render.fillStyle = colorA;
        
        // Add to STCA list
        detectedStca.push([pair.bodyB.callsign, pair.bodyA.callsign])
    }
});

Events.on(engine, 'collisionEnd', function(event) {
    var pairs = event.pairs;
        
    for (var i = 0, j = pairs.length; i != j; ++i) {
        var pair = pairs[i];

        if (!pair.bodyB.isSensor || !pair.bodyA.isSensor)
            continue

        pair.bodyB.render.fillStyle = colorB;
        pair.bodyA.render.fillStyle = colorB;
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
    options: {wireframes: false, width: 1000, height:800}
});

Render.lookAt(render, france_cartesian);

Render.tick
// run the renderer
Render.run(render);