function MatObj(pos, mass) {

    this.pos = pos;
    this.mass = mass;
    this.velocity = null;
    //this.mesh = null;
}

MatObj.prototype.velocityDelta = function( f, dt ) {
    
    return f.clone().multiplyScalar( dt / this.mass );
};

MatObj.prototype.posDelta = function( dt ) {

    return this.velocity.clone().multiplyScalar( dt );
};

MatObj.prototype.gravity = function(obj) {

    var r = obj.pos.clone().sub( this.pos );
    var rSq = r.lengthSq();

    return r.normalize().multiplyScalar( 50.0 * this.mass * obj.mass / rSq );
};

MatObj.prototype.dive = function(obj2, depth) {

    if ( !this.velocity )//immovable
        return;

    var vNorm = obj2.pos.clone().sub( this.pos ).normalize();//from this to obj2

    var d = obj2.velocity ? depth * obj2.mass / (this.mass + obj2.mass) : depth;

    return vNorm.multiplyScalar( -d );
};

MatObj.prototype.bounce = function(obj2) {

    var vNorm = obj2.pos.clone().sub( this.pos ).normalize();//from this to obj2

    var v1n = vNorm.dot( this.velocity || V3_ZERO );//scalar value = velocity 1 projected on normal vector
    var v2n = vNorm.dot( obj2.velocity || V3_ZERO );//scalar value = velocity 2 projected on normal vector

    var v1Norm = vNorm.clone().multiplyScalar( v1n );//project velocity before collision onto normal
    var v1Tangent = this.velocity.clone().sub( v1Norm );//tangent velocity

    var v = (v1n * (this.mass - obj2.mass) + (2 * obj2.mass * v2n)) / (this.mass + obj2.mass);

    var newVelocity = vNorm.multiplyScalar( v );

    return newVelocity.add( v1Tangent );
};

function Celestial(pos, mass) {

    MatObj.apply( this, arguments );

    this.mass = mass;
}

extend( Celestial, MatObj );

Celestial.prototype.mesh = function(radius, color) {

        var m = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 32, 32),
            new THREE.MeshLambertMaterial({color: color, side: 2, shading: THREE.FlatShading})
        );

        m.position.copy( this.pos );
        m.userData = this;

        return m;
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

    //this.mesh.material = new THREE.MeshBasicMaterial( {color: color} );
}

extend( Sun, Celestial );

function extend(Child, Parent) {

    var F = function() { };
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.superclass = Parent.prototype;
}




