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

    grid: function( x, size ) {

        return Math.round( x / size ) * size;
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
    },

    getUrlVars: function() {

        var vars = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,
        function( m, key, value ) {

            vars[key] = value;
        });
        return vars;
    }
};

