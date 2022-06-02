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
    alertDistanceUpper: nmToMeters(4.8),
    alertDistanceLower: nmToMeters(2.8),
    alertUpperLowerBoundary: 19500,
    lookAhead: 30*2,
    speedThreshold: 70
}

export const knotsToMs = function(speed) {
    return speed*0.514444;
}