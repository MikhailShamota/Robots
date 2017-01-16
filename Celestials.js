function Celestial(pos, mass) {

    MatObj.apply( this, arguments );

    //this.mass = mass;
}

extend( Celestial, MatObj );

Celestial.prototype.mesh = function( color ) {

    var radius = Math.cbrt( this.mass );

    var m = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 32, 32),
        new THREE.MeshLambertMaterial({color: color, side: 2, shading: THREE.FlatShading})
    );

    return this.initMesh( m );
    //m.position.copy( this.pos );
    //m.userData = this;

    //return m;
};

//Celestial.prototype = Object.create( MatObj.prototype );

function Asteroid(pos, mass) {

    Celestial.apply( this, arguments );
}

extend( Asteroid, Celestial );

function Planet(pos, mass) {

    Celestial.apply( this, arguments );
}

extend( Planet, Celestial );

function Sun(pos, mass, color) {

    Celestial.apply( this, arguments );
}

extend( Sun, Celestial );