import Matter from "matter-js";
import LatLon, { Cartesian, Vector3d, Dms } from 'geodesy/latlon-ellipsoidal.js';
import LatLonNvectorSpherical from 'geodesy/latlon-nvector-spherical.js';
import { stcaParams, createVelocityVector, knotsToMs, toRadians } from "./utils.js";

const france_polygon = [ new LatLonNvectorSpherical(51.32717924,-9.71191406), new LatLonNvectorSpherical(50.35044453,8.91222954), 
    new LatLonNvectorSpherical(40.47208969,9.14543152), new LatLonNvectorSpherical(41.95993687,-6.92868233) ];

const airplaneBodiesParams = {
        isSensor: true, 
        friction: 0, 
        frictionAir: 0
    }
    
export var performStca = function(planes, callback) {
    var detectedStca = []

    var arrOfAirplaneBodies = []
    
    planes.forEach(function(element){
    
        // Project the targets to cartesian
        var geoTester = new LatLonNvectorSpherical(element.lat, element.lon);
        
        //
        // Filter out targets as much as possible 
        //
        var useTarget = element.groundspeed >= stcaParams.speedThreshold && 
                        geoTester.isEnclosedBy(france_polygon);
    
        if (useTarget) {
            var geo = new LatLon(element.lat, element.lon);
            var cart = geo.toCartesian();
    
            // Create the body
            var airBody = Matter.Bodies.circle(cart.y, cart.x, stcaParams.alertDistanceUpper/2, airplaneBodiesParams);
        
            // Set the velocity of the body
            Matter.Body.setVelocity(airBody, createVelocityVector(knotsToMs(element.groundspeed), element.heading));
            airBody.callsign = element.callsign;
        
            arrOfAirplaneBodies.push(airBody);
        }
    });
    
    
    // create an engine
    var engine = Matter.Engine.create({gravity: {x: 0, y: 0}});
    engine.timing.timeScale = 1000;
 
    // add all of the bodies to the world
    Matter.Composite.add(engine.world, arrOfAirplaneBodies);
    
    // create runner
    var runner = Matter.Runner.create();
    
    // run the engine
    Matter.Runner.run(runner, engine);
    
    Matter.Events.on(engine, 'collisionStart', function(event) {
        var pairs = event.pairs;
            
        for (var i = 0, j = pairs.length; i != j; ++i) {
            var pair = pairs[i];
    
            if (!pair.bodyB.isSensor || !pair.bodyA.isSensor)
                continue
    
            // Add to STCA list
            if (!detectedStca.includes(pair.bodyA.callsign))
                detectedStca.push(pair.bodyA.callsign)
            if (!detectedStca.includes(pair.bodyB.callsign))
                detectedStca.push(pair.bodyB.callsign)
        }
    });
    
    Matter.Events.on(engine, 'collisionEnd', function(event) {
        // TODO: Something
    });
    
    Matter.Events.on(runner, "afterTick", function(event){
        if (event.timestamp >= stcaParams.lookAhead*1000) {
            Matter.Runner.stop(runner)
            callback(detectedStca);
        }
    });

    //Matter.Engine.update(engine, delta, correction)
    
    // This is a fake renderer
    //var render = Matter.Render.create({engine: engine });
    
    //Matter.Render.tick
    // run the renderer
    //Matter.Render.run(render);
}

