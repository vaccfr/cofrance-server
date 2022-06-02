export const nmToMeters = function(nm) {
    return nm*1852;
}

export const toRadians = function (angle) {
    return angle * (Math.PI / 180);
}

export const createVelocityVector = function(speed, bearing) {
    var Xvel = Math.cos(toRadians(bearing-90)) * speed
    var Yvel = Math.sin(toRadians(bearing-90)) * speed
    return {x: Xvel, y: Yvel}
}

export const stcaParams = {
    alertDistanceUpper: nmToMeters(10),
    alertDistanceLower: nmToMeters(2.8),
    alertUpperLowerBoundary: 19500,
    lookAhead: 60*2,
    speedThreshold: 70
}

// Not actual meters per second but more like meters per 100 miliseconds
export const knotsToMs = function(speed) {
    return speed*0.00514444;
}