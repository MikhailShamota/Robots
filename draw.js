const WORLD_SIZE = 1000;
const V3_ZERO = new THREE.Vector3(0, 0, 0);
const V3_UNIT_X = new THREE.Vector3(1, 0, 0);
const V3_UNIT_Y = new THREE.Vector3(0, 1, 0);
const V3_UNIT_Z = new THREE.Vector3(0, 0, 1);
const MSEC_IN_SEC = 1000;

var V2_RESOLUTION;

var MathHelper = {
    // Get a value between two values
    clamp: function (value, min, max) {

        if (value < min) {
            return min;
        }
        else if (value > max) {
            return max;
        }

        return value;
    },
    //Get the linear interpolation between two value
    lerp: function (value1, value2, amount) {
        amount = amount < 0 ? 0 : amount;
        amount = amount > 1 ? 1 : amount;
        return value1 + (value2 - value1) * amount;
    },

    //smooth step function between min and max by value
    smoothstep: function (min, max, value) {

        var x = Math.max(0, Math.min(1, (value-min)/(max-min)));
        return x*x*(3 - 2*x);
    },

    //makes new random vector with length
    v3Random: function (length) {

        return V3_UNIT_X.clone().applyEuler(
            new THREE.Euler(
                Math.random() * 2 * Math.PI,
                Math.random() * 2 * Math.PI,
                Math.random() * 2 * Math.PI,
                'XYZ')
        ).multiplyScalar(length);
    },

    //random between min and max
    rand: function (min, max) {

        return Math.random() * (max - min) + min;
    }

};


Scene.init();
Scene.paint();

PeerServer.open( function ( id ){

    document.getElementById('MyPeerId').innerHTML = id;
});
