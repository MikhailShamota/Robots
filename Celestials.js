function Celestial (pos, mass, color) {

    MatObj.apply( this, arguments );

    var radius = Math.cbrt( this.mass );

    this.mesh.geometry = new THREE.SphereGeometry(radius, 32, 32);
    this.mesh.material = new THREE.MeshLambertMaterial({color: color, side: 2, shading: THREE.FlatShading});

    this.rWorld = 0;

    this.parent = null;
}

extend( Celestial, MatObj );

function Asteroid(pos, mass, color) {

    Celestial.apply( this, arguments );
}

extend( Asteroid, Celestial );

function Planet(pos, mass, color) {

    Celestial.apply( this, arguments );
}

extend( Planet, Celestial );

//override
Celestial.prototype.newPos = function(dt) {

    if ( !this.parent )
        return;

    var r = this.pos.clone().sub( this.parent.pos );

    return r.applyAxisAngle( V3_UNIT_Y, 0.1 * dt ).add( this.parent.pos );
};

function Sun(pos, mass, color) {

    Celestial.apply( this, arguments );
}

extend( Sun, Celestial );