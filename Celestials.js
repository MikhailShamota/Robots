function Celestial(pos, mass, color) {

    MatObj.apply( this, arguments );

    var radius = Math.cbrt( this.mass );

    this.mesh.geometry = new THREE.SphereGeometry(radius, 32, 32);
    this.mesh.material = new THREE.MeshLambertMaterial({color: color, side: 2, shading: THREE.FlatShading});
}

extend( Celestial, MatObj );

/*
Celestial.prototype.mesh = function( color ) {



    return this.initMesh( m );
    //m.position.copy( this.pos );
    //m.userData = this;

    //return m;
};
*/

//Celestial.prototype = Object.create( MatObj.prototype );

function Asteroid(pos, mass, color) {

    Celestial.apply( this, arguments );
}

extend( Asteroid, Celestial );

function Planet(pos, mass, color) {

    Celestial.apply( this, arguments );
}

extend( Planet, Celestial );

function Sun(pos, mass, color) {

    Celestial.apply( this, arguments );
}

extend( Sun, Celestial );