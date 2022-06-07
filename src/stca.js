import Matter from "matter-js";
import LatLon, { Cartesian, Vector3d, Dms } from 'geodesy/latlon-ellipsoidal.js';
import LatLonNvectorSpherical from 'geodesy/latlon-nvector-spherical.js';
import { createVelocityVector, knotsToMs, nmToMeters } from "./utils.js";


 const stcaParams = {
    alertDistanceUpper: nmToMeters(4.5),
    alertDistanceLower: nmToMeters(2.75),
    alertUpperLowerBoundary: 19500,
    alertVerticalThreshold: 750,
    lookAhead: 60*2,
    speedThreshold: 70,
    inclusionPolyon: [ new LatLonNvectorSpherical(51.32717924,-9.71191406), new LatLonNvectorSpherical(50.35044453,8.91222954), 
                       new LatLonNvectorSpherical(40.47208969,9.14543152), new LatLonNvectorSpherical(41.95993687,-6.92868233) ]
}

const airplaneBodiesParams = { isSensor: true, friction: 0, frictionAir: 0 }
    
export var performStca = function(planes, callback) {
    var detectedStca = []
    var arrOfAirplaneBodies = []
    
    planes.forEach(function(element){
    
        var geoTester = new LatLonNvectorSpherical(element.lat, element.lon);
        
        //
        // Filter out targets as much as possible 
        //
        var useTarget = element.groundspeed >= stcaParams.speedThreshold && 
                        geoTester.isEnclosedBy(stcaParams.inclusionPolyon) &&
                        !element.squawk.startsWith("70");
    
        if (useTarget) {
            var cart = new LatLon(element.lat, element.lon).toCartesian();
    
            // Create the body
            var airBody = Matter.Bodies.circle(cart.y, cart.x, stcaParams.alertDistanceUpper/2, airplaneBodiesParams);
        
            // Set the velocity of the body
            Matter.Body.setVelocity(airBody, createVelocityVector(knotsToMs(element.groundspeed), element.heading));

            airBody.callsign = element.callsign;
            airBody.orig_altitude = element.altitude;
            airBody.altitude = element.altitude;
            airBody.vz = element.vz;

            arrOfAirplaneBodies.push(airBody);
        }
    });
    
    
    // create an engine
    var engine = Matter.Engine.create({gravity: {x: 0, y: 0}});

    // Simulation runs at x1000 speed
    engine.timing.timeScale = 100;
 
    // add all of the bodies to the world
    Matter.Composite.add(engine.world, arrOfAirplaneBodies);
    
    // create runner
    var runner = Matter.Runner.create();
    
    Matter.Events.on(engine, 'collisionStart', function(event) {
        var pairs = event.pairs;
            
        for (var i = 0, j = pairs.length; i != j; ++i) {
            var pair = pairs[i];
    
            if (!pair.bodyB.isSensor || !pair.bodyA.isSensor)
                continue

            // No need to alert if separate by level
            if (Math.abs(pair.bodyA.altitude-pair.bodyB.altitude) > stcaParams.alertVerticalThreshold)
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
        // Update the altitude of all the bodies according to vertical speed
        Matter.Composite.allBodies(engine.world).forEach((body) => {
            body.altitude = body.orig_altitude + (body.vz/60)*(event.timestamp/1000);
        });
        // Stop the simulation upon reaching time
        if (event.timestamp >= stcaParams.lookAhead*1000) {
            Matter.Runner.stop(runner)
            callback(detectedStca);
        }
    });

        
    // run the engine
    Matter.Runner.run(runner, engine);
}

