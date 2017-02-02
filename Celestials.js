function Celestial (pos, mass, color) {

    MatObj.apply( this, arguments );

    var radius = Math.cbrt( this.mass );

    this.mesh.geometry = new THREE.SphereGeometry(radius, 32, 32);
    this.mesh.material = new THREE.MeshLambertMaterial({color: color, side: 2, shading: THREE.FlatShading});

    //this.rOrbit = pos.length();
}

extend( Celestial, MatObj );

/*
Celestial.prototype.gravityTangentVelocity() {

     var r = this.parent.pos.clone().sub( this.pos );
     var rLen = r.length();
     r.normalize();

     var vn = r.dot( this.v );
     var nV = r.clone().multiplyScalar( vn );//normal velocity
     var tV = this.v.clone().sub( nV );//tangent velocity
     var vt = tV.length();//tangent velocity scalar

     return r.multiplyScalar( this.mass * vt * vt / rLen ).add( nV.negate().multiplyScalar( this.mass ) );//add negate normal - to contradict fly away effect
}
*/

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